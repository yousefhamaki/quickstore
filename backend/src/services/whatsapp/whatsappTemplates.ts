import { IStore } from '../../models/Store';
import { interpolateTokens } from '../../utils/emailTokens';

export type WhatsAppMessageType = 'orderConfirmation' | 'orderStatusChanged' | 'marketing';

const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppMessageType, string> = {
    orderConfirmation:
        "Hi {{customerName}}! 👋\n\nThanks for your order at *{{storeName}}*.\nOrder #{{orderNumber}} — {{total}} EGP.\n\nWe'll message you again as soon as it ships.",
    orderStatusChanged:
        'Hi {{customerName}},\n\nYour order #{{orderNumber}} from *{{storeName}}* is now: *{{status}}*.\n\nTrack it any time on our website.',
    marketing: 'Hi {{customerName}}, we have something new at *{{storeName}}*!'
};

/**
 * Resolves a store's saved WhatsApp message override (if any) for a given
 * type, falling back to a sensible default — mirrors emailService.ts's
 * resolveStoreEmailTemplate, minus the blocks/subject concepts (WhatsApp
 * messages are one plain-text body, no separate subject line).
 */
export function resolveWhatsAppTemplate(
    store: Pick<IStore, 'settings'>,
    type: WhatsAppMessageType
): string {
    const custom = store.settings?.whatsappNotifications?.templates?.[type]?.body?.trim();
    return custom || DEFAULT_WHATSAPP_TEMPLATES[type];
}

export function getDefaultWhatsAppTemplate(type: WhatsAppMessageType): string {
    return DEFAULT_WHATSAPP_TEMPLATES[type];
}

export { interpolateTokens };
