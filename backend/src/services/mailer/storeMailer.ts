import nodemailer, { Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { IStore } from '../../models/Store';
import { decrypt } from '../../utils/crypto';

const DEFAULT_FROM = 'Buildora <no-reply@quickstore.live>';

let resendInstance: Resend | null = null;
function getResendClient(): Resend {
    if (!resendInstance) {
        const apiKey = process.env.RESEND_API_KEY;
        resendInstance = new Resend(apiKey || 'placeholder');
    }
    return resendInstance;
}

export type ResolvedSender =
    | { mode: 'custom'; transporter: Transporter; fromAddress: string }
    | { mode: 'buildora' };

type StoreForSending = Pick<IStore, 'name' | 'settings'>;

/**
 * Decides how a store's outgoing customer email should actually be sent.
 * Custom SMTP is only used once the merchant has both configured AND
 * successfully tested it (`verified === true`) — a saved-but-untested
 * config falls back to Buildora's sender rather than risking a blind send
 * through credentials that were never actually confirmed to work.
 */
export async function resolveStoreSender(store: StoreForSending): Promise<ResolvedSender> {
    const sender = store.settings?.emailSender;
    const smtp = sender?.smtp;

    if (
        sender?.mode === 'custom' &&
        sender.verified === true &&
        smtp?.host &&
        smtp?.port &&
        smtp?.username &&
        smtp?.passwordEncrypted
    ) {
        try {
            const transporter = nodemailer.createTransport({
                host: smtp.host,
                port: smtp.port,
                secure: !!smtp.secure,
                auth: { user: smtp.username, pass: decrypt(smtp.passwordEncrypted) },
                connectionTimeout: 10000,
                socketTimeout: 10000
            });
            const fromEmail = sender.fromEmail || smtp.username;
            const fromName = sender.fromName || store.name;
            return { mode: 'custom', transporter, fromAddress: `"${fromName}" <${fromEmail}>` };
        } catch (error) {
            console.error('[storeMailer] Failed to build custom SMTP transporter, falling back to Buildora sender:', error);
        }
    }

    return { mode: 'buildora' };
}

export interface SendableMessage {
    to: string;
    subject: string;
    html: string;
    replyTo?: string;
}

export interface SendResult {
    ok: boolean;
    provider: 'custom-smtp' | 'resend';
    error?: string;
}

/**
 * Sends via whichever sender resolveStoreSender picked. Never throws — a
 * broken merchant SMTP config falls back to Buildora's own Resend sender
 * rather than silently dropping a customer email; only a Resend failure
 * (both legs exhausted) is reported back as ok:false.
 */
export async function sendViaResolvedSender(resolved: ResolvedSender, msg: SendableMessage): Promise<SendResult> {
    if (resolved.mode === 'custom') {
        try {
            await resolved.transporter.sendMail({
                from: resolved.fromAddress,
                to: msg.to,
                subject: msg.subject,
                html: msg.html,
                replyTo: msg.replyTo
            });
            return { ok: true, provider: 'custom-smtp' };
        } catch (error: any) {
            console.error('[storeMailer] Custom SMTP send failed, falling back to Buildora sender:', error?.message || error);
            // fall through to the Resend leg below
        }
    }

    try {
        await getResendClient().emails.send({
            from: DEFAULT_FROM,
            to: msg.to,
            subject: msg.subject,
            html: msg.html,
            ...(msg.replyTo ? { reply_to: msg.replyTo } : {})
        });
        return { ok: true, provider: 'resend' };
    } catch (error: any) {
        console.error('[storeMailer] Resend send failed:', error?.message || error);
        return { ok: false, provider: 'resend', error: error?.message || 'Failed to send email' };
    }
}

/** Convenience one-shot: resolve the store's sender, then send through it. */
export async function sendStoreEmail(store: StoreForSending, msg: SendableMessage): Promise<SendResult> {
    const resolved = await resolveStoreSender(store);
    return sendViaResolvedSender(resolved, msg);
}
