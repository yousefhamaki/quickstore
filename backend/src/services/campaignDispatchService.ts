import mongoose from 'mongoose';
import CampaignRun from '../models/CampaignRun';
import CampaignRecipient from '../models/CampaignRecipient';
import EmailEvent from '../models/EmailEvent';
import Store from '../models/Store';
import { CampaignQuotaService } from './CampaignQuotaService';
import { getCampaignBlocks, renderBlocksToHtml } from './emailBlockRenderer';
import { renderTemplate } from './emailService';
import { resolveStoreSender, sendViaResolvedSender } from './mailer/storeMailer';

/**
 * Initiates the asynchronous email sending loop for a campaign run in the background
 */
export const triggerCampaignDispatch = async (runId: string | mongoose.Types.ObjectId): Promise<void> => {
    // 1. Atomically claim the run for sending (concurrency state guard)
    const run = await CampaignRun.findOneAndUpdate(
        { _id: runId, status: 'queued' },
        { status: 'sending', startedAt: new Date() },
        { new: true }
    ).populate('campaignId');

    if (!run) {
        console.log(`[CampaignDispatcher] Run ${runId} is not in 'queued' state. Skipping.`);
        return;
    }

    const campaign = run.campaignId as any;
    if (!campaign) {
        console.error(`[CampaignDispatcher] Campaign template not found for run ${runId}`);
        await CampaignRun.updateOne({ _id: runId }, { status: 'failed', errorMessage: 'Campaign template missing' });
        await CampaignQuotaService.releaseCredits(run.storeId, runId);
        return;
    }

    console.log(`[CampaignDispatcher] Starting execution for run ${runId} of campaign: ${campaign.name} (${run.totalRecipients} target recipients)`);

    try {
        const store = await Store.findById(run.storeId);
        if (!store) {
            throw new Error('Store not found for this campaign run');
        }

        // Resolve the sender ONCE per run (builds/connects the SMTP
        // transporter a single time when a custom sender is configured,
        // rather than reconnecting per recipient) and render the campaign's
        // blocks into HTML once too, since it's identical for every
        // recipient — this is the same visual language + non-removable
        // "Powered by Buildora" footer used by transactional store emails
        // (see emailService.ts's sendStoreTemplatedEmail), via the shared
        // store_generic.html wrapper.
        const resolvedSender = await resolveStoreSender(store);
        const bodyHtml = renderBlocksToHtml(getCampaignBlocks(campaign), { storeName: store.name });
        const html = renderTemplate('store_generic.html', { storeName: store.name, subject: campaign.subject, bodyHtml });

        // Fetch all pending recipients for this run
        const pendingRecipients = await CampaignRecipient.find({
            campaignRunId: run._id,
            status: 'pending'
        });

        let successfullySent = 0;
        let bouncedOrFailed = 0;

        for (const recipient of pendingRecipients) {
            // Double-send protection: claim recipient atomically
            const claimed = await CampaignRecipient.findOneAndUpdate(
                { _id: recipient._id, status: 'pending' },
                { status: 'sent', sentAt: new Date() }, // optimistic status update
                { new: true }
            );

            if (!claimed) {
                // Already processed/sent by another execution thread
                continue;
            }

            try {
                const result = await sendViaResolvedSender(resolvedSender, {
                    to: recipient.email,
                    subject: campaign.subject,
                    html
                });

                if (!result.ok) {
                    throw new Error(result.error || 'Email provider error');
                }

                const providerMessageId = `${result.provider}-${new mongoose.Types.ObjectId().toString()}`;

                // Update recipient status and provider message ID
                claimed.providerMessageId = providerMessageId;
                await claimed.save();

                // Record sent email event in ledger/telemetry
                await EmailEvent.create({
                    storeId: run.storeId,
                    campaignRunId: run._id,
                    contactId: recipient.contactId,
                    recipientEmail: recipient.email,
                    event: 'sent',
                    provider: result.provider,
                    providerMessageId,
                    timestamp: new Date()
                });

                successfullySent++;
                // Increment emailsDispatched incrementally on CampaignRun
                await CampaignRun.updateOne({ _id: run._id }, { $inc: { emailsDispatched: 1 } });
            } catch (err: any) {
                console.error(`[CampaignDispatcher] Failed sending email to ${recipient.email}:`, err);

                claimed.status = 'failed';
                claimed.errorMessage = err.message || 'Transmission error';
                await claimed.save();

                // Create bounce/failure event
                await EmailEvent.create({
                    storeId: run.storeId,
                    campaignRunId: run._id,
                    contactId: recipient.contactId,
                    recipientEmail: recipient.email,
                    event: 'bounce',
                    provider: resolvedSender.mode === 'custom' ? 'custom-smtp' : 'resend',
                    providerMessageId: 'failed-' + new mongoose.Types.ObjectId().toString(),
                    deliveryMetadata: {
                        smtpStatusCode: 500,
                        bounceType: 'hard',
                        diagnosticCode: err.message || 'Connection timeout'
                    },
                    timestamp: new Date()
                });

                bouncedOrFailed++;
                // Increment emailsBounced incrementally on CampaignRun
                await CampaignRun.updateOne({ _id: run._id }, { $inc: { emailsBounced: 1 } });
            }
        }

        // 2. Finalize credits settlement. We settle based on successfully sent emails.
        // Unsent/failed credits are refunded atomically to the store's email balance.
        await CampaignQuotaService.settleCredits(run.storeId, run._id, successfullySent);

        // 3. Complete the execution run
        run.status = 'completed';
        run.completedAt = new Date();
        await run.save();

        console.log(`[CampaignDispatcher] Completed execution run ${run._id}. Sent: ${successfullySent}, Failed: ${bouncedOrFailed}`);
    } catch (dispatchError: any) {
        console.error(`[CampaignDispatcher] Critical failure during campaign dispatch run ${run._id}:`, dispatchError);
        
        // Release any remaining reserved credits
        try {
            await CampaignQuotaService.releaseCredits(run.storeId, run._id);
        } catch (releaseErr) {
            console.error('[CampaignDispatcher] Failed to release credits during crash reconciliation:', releaseErr);
        }

        run.status = 'failed';
        run.errorMessage = `Critical dispatcher crash: ${dispatchError.message}`;
        await run.save();
    }
};
