import { Response } from 'express';
import mongoose from 'mongoose';
import Campaign from '../models/Campaign';
import CampaignRun from '../models/CampaignRun';
import CampaignRecipient from '../models/CampaignRecipient';
import Customer from '../models/Customer';
import Store from '../models/Store';
import { AuthRequest } from '../middleware/authMiddleware';
import { CampaignQuotaService } from '../services/CampaignQuotaService';
import { triggerCampaignDispatch } from '../services/campaignDispatchService';

/**
 * @desc    Get all campaigns for a merchant's store(s)
 * @route   GET /api/campaigns
 * @access  Private/Merchant
 */
export const getCampaigns = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const { storeId } = req.query;

        let query: any = {};

        if (storeId) {
            // Verify store belongs to merchant
            const store = await Store.findOne({ _id: storeId, ownerId: userId });
            if (!store) {
                return res.status(404).json({ message: 'Store not found or unauthorized' });
            }
            query.storeId = storeId;
        } else {
            // Get all stores owned by merchant
            const stores = await Store.find({ ownerId: userId });
            const storeIds = stores.map(store => store._id);
            query.storeId = { $in: storeIds };
        }

        const campaigns = await Campaign.find(query)
            .sort({ createdAt: -1 });

        res.json({ campaigns });
    } catch (error) {
        console.error('Get Campaigns Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Get a single campaign by ID with execution history
 * @route   GET /api/campaigns/:id
 * @access  Private/Merchant
 */
export const getCampaignById = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Verify store belongs to merchant
        const store = await Store.findOne({ _id: campaign.storeId, ownerId: userId });
        if (!store) {
            return res.status(403).json({ message: 'Unauthorized access to campaign data' });
        }

        // Fetch execution runs history
        const runs = await CampaignRun.find({ campaignId: campaign._id })
            .sort({ createdAt: -1 });

        res.json({ campaign, runs });
    } catch (error) {
        console.error('Get Campaign By ID Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Create a new campaign template definition
 * @route   POST /api/campaigns
 * @access  Private/Merchant
 */
export const createCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const { storeId, name, subject, content, segmentFilters } = req.body;

        // Verify store belongs to merchant
        const store = await Store.findOne({ _id: storeId, ownerId: userId });
        if (!store) {
            return res.status(404).json({ message: 'Store not found or unauthorized' });
        }

        const campaign = await Campaign.create({
            storeId,
            name,
            subject,
            content,
            status: 'draft',
            segmentFilters: segmentFilters || { consentStatus: 'subscribed' }
        });

        res.status(201).json(campaign);
    } catch (error) {
        console.error('Create Campaign Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Update a campaign template definition
 * @route   PUT /api/campaigns/:id
 * @access  Private/Merchant
 */
export const updateCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const { name, subject, content, segmentFilters, status } = req.body;

        const campaign = await Campaign.findById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Verify store belongs to merchant
        const store = await Store.findOne({ _id: campaign.storeId, ownerId: userId });
        if (!store) {
            return res.status(403).json({ message: 'Unauthorized access to campaign data' });
        }

        // Sent/scheduled campaigns are read-only to prevent audit drift
        if (campaign.status === 'sent') {
            return res.status(400).json({ message: 'Sent campaigns cannot be updated' });
        }

        campaign.name = name || campaign.name;
        campaign.subject = subject || campaign.subject;
        campaign.content = content || campaign.content;
        campaign.segmentFilters = segmentFilters || campaign.segmentFilters;
        if (status && ['draft', 'scheduled', 'archived'].includes(status)) {
            campaign.status = status;
        }

        await campaign.save();
        res.json(campaign);
    } catch (error) {
        console.error('Update Campaign Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Delete a campaign template definition
 * @route   DELETE /api/campaigns/:id
 * @access  Private/Merchant
 */
export const deleteCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Verify store belongs to merchant
        const store = await Store.findOne({ _id: campaign.storeId, ownerId: userId });
        if (!store) {
            return res.status(403).json({ message: 'Unauthorized access to campaign data' });
        }

        if (campaign.status === 'sent') {
            return res.status(400).json({ message: 'Sent campaigns cannot be physically deleted' });
        }

        await campaign.deleteOne();
        res.json({ message: 'Campaign deleted successfully' });
    } catch (error) {
        console.error('Delete Campaign Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};

/**
 * @desc    Verify quotas, snapshot recipients, and launch execution run
 * @route   POST /api/campaigns/:id/send
 * @access  Private/Merchant
 */
export const sendCampaign = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user._id;
        const campaign = await Campaign.findById(req.params.id);

        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }

        // Verify store belongs to merchant
        const store = await Store.findOne({ _id: campaign.storeId, ownerId: userId });
        if (!store) {
            return res.status(403).json({ message: 'Unauthorized access to campaign data' });
        }

        // 1. Construct target customer query based on template segment filters
        const consentStatus = campaign.segmentFilters?.consentStatus || 'subscribed';
        const query: any = {
            storeId: campaign.storeId,
            consentStatus: consentStatus
        };

        if (campaign.segmentFilters?.tags && campaign.segmentFilters.tags.length > 0) {
            query.tags = { $in: campaign.segmentFilters.tags };
        }

        // 2. Count target matching contacts
        const count = await Customer.countDocuments(query);
        if (count === 0) {
            return res.status(400).json({ 
                message: 'No active subscribers match the selected segment filters. Cannot send empty campaign.' 
            });
        }

        // 3. Create initial CampaignRun in 'quota_reserved' status
        const run = await CampaignRun.create({
            campaignId: campaign._id,
            storeId: campaign.storeId,
            status: 'quota_reserved',
            totalRecipients: count
        });

        // 4. Reserve quotas atomically using CampaignQuotaService
        try {
            await CampaignQuotaService.reserveCredits(campaign.storeId, run._id, count);
        } catch (quotaError: any) {
            // Update CampaignRun to failed status with error message
            run.status = 'failed';
            run.errorMessage = quotaError.message || 'Insufficient credit balance';
            await run.save();

            return res.status(402).json({
                message: 'Insufficient email credits. Please recharge your balance or upgrade your subscription plan.',
                error: quotaError.message
            });
        }

        // 5. Generate CampaignRecipient Snapshot (preparing recipients)
        run.status = 'preparing_recipients';
        await run.save();

        try {
            const matchingCustomers = await Customer.find(query).select('_id email');
            const recipientSnapshots = matchingCustomers.map(cust => ({
                storeId: campaign.storeId,
                campaignRunId: run._id,
                contactId: cust._id,
                email: cust.email,
                status: 'pending'
            }));

            // Bulk insert recipients into the snapshot collection
            if (recipientSnapshots.length > 0) {
                await CampaignRecipient.insertMany(recipientSnapshots);
            }
        } catch (snapshotError: any) {
            // If snapshot insertion fails, release credit reservation and mark run failed
            await CampaignQuotaService.releaseCredits(campaign.storeId, run._id);
            
            run.status = 'failed';
            run.errorMessage = `Recipient snapshot creation failed: ${snapshotError.message}`;
            await run.save();

            return res.status(500).json({
                message: 'Failed to snapshot campaign target recipients.',
                error: snapshotError.message
            });
        }

        // 6. Transition run state to 'queued' and trigger async dispatching
        run.status = 'queued';
        run.startedAt = new Date();
        await run.save();

        // Update campaign status to sent (since execution has been triggered)
        campaign.status = 'sent';
        await campaign.save();

        // Fire and forget background worker dispatch
        triggerCampaignDispatch(run._id).catch(err => {
            console.error(`[CampaignController] Async dispatch trigger failed for run ${run._id}:`, err);
        });

        res.json({
            message: 'Campaign execution run successfully queued.',
            campaignRunId: run._id,
            totalRecipients: count
        });
    } catch (error) {
        console.error('Send Campaign Error:', error);
        res.status(500).json({ message: 'Server Error', error });
    }
};
