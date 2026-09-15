import { getSocket } from './connectionManager';
import WhatsAppConnection from '../../models/WhatsAppConnection';

export type WhatsAppMessageCategory = 'utility' | 'marketing';

export interface SendWhatsAppMessageParams {
    to: string; // phone number, digits only or with a leading +, any country code
    category: WhatsAppMessageCategory;
    body: string;
}

export interface WhatsAppSendResult {
    ok: boolean;
    provider: 'baileys' | 'meta_cloud';
    error?: string;
}

/** Converts a phone number in any reasonable format to a Baileys JID (E.164 digits + "@s.whatsapp.net"). */
function toJid(phone: string): string {
    const digits = phone.replace(/[^\d]/g, '');
    return `${digits}@s.whatsapp.net`;
}

/**
 * The stable, provider-agnostic entry point for sending a WhatsApp
 * message — mirrors services/mailer/storeMailer.ts's shape for email.
 * Every caller (the gated message service, and eventually campaigns) goes
 * through this function, never touches a Baileys socket or a future Meta
 * Cloud client directly. Adding a MetaCloudProvider later is a matter of
 * branching on `connection.provider` here — no caller changes.
 *
 * Hard-refuses `category:'marketing'` on the Baileys provider — a
 * code-enforced guardrail, not a UI checkbox: bulk/marketing-style sends
 * are exactly the pattern most likely to get an unofficial WhatsApp
 * connection banned, so this path is never reachable regardless of what a
 * merchant saves in their marketing template. Only lifted once a store is
 * migrated to a real Meta Cloud connection (Phase 2, not built yet).
 */
export async function sendWhatsAppMessage(
    storeId: string,
    params: SendWhatsAppMessageParams
): Promise<WhatsAppSendResult> {
    const connection = await WhatsAppConnection.findOne({ storeId });

    if (!connection || connection.status !== 'connected') {
        return { ok: false, provider: connection?.provider || 'baileys', error: 'WhatsApp is not connected for this store' };
    }

    if (connection.provider === 'baileys' && params.category === 'marketing') {
        return { ok: false, provider: 'baileys', error: 'Marketing/broadcast messages are not permitted over the unofficial WhatsApp connection' };
    }

    if (connection.provider === 'meta_cloud') {
        // Not built yet — see plan's Phase 2. Fail closed rather than
        // silently no-op, so this is loud/obvious if a store is ever
        // flipped to this provider before it's implemented.
        return { ok: false, provider: 'meta_cloud', error: 'Meta Cloud sending is not yet implemented' };
    }

    const sock = getSocket(storeId);
    if (!sock) {
        return { ok: false, provider: 'baileys', error: 'WhatsApp connection is not currently live (try again shortly)' };
    }

    try {
        await sock.sendMessage(toJid(params.to), { text: params.body });
        return { ok: true, provider: 'baileys' };
    } catch (error: any) {
        console.error('[whatsappSender] Send failed:', error?.message || error);
        return { ok: false, provider: 'baileys', error: error?.message || 'Failed to send WhatsApp message' };
    }
}
