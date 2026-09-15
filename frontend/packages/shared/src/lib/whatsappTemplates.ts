export type WhatsAppMessageType = 'orderConfirmation' | 'orderStatusChanged' | 'marketing';

/**
 * Mirrors backend/src/services/whatsapp/whatsappTemplates.ts's
 * DEFAULT_WHATSAPP_TEMPLATES exactly (same copy) — used to pre-fill a
 * fresh settings editor and power its "Reset to original" button. Keep
 * both files in sync if the default copy ever changes.
 */
export const DEFAULT_WHATSAPP_TEMPLATES: Record<WhatsAppMessageType, string> = {
    orderConfirmation:
        "Hi {{customerName}}! 👋\n\nThanks for your order at *{{storeName}}*.\nOrder #{{orderNumber}} — {{total}} EGP.\n\nWe'll message you again as soon as it ships.",
    orderStatusChanged:
        'Hi {{customerName}},\n\nYour order #{{orderNumber}} from *{{storeName}}* is now: *{{status}}*.\n\nTrack it any time on our website.',
    marketing: 'Hi {{customerName}}, we have something new at *{{storeName}}*!'
};

export function getDefaultWhatsAppTemplate(type: WhatsAppMessageType): string {
    return DEFAULT_WHATSAPP_TEMPLATES[type];
}
