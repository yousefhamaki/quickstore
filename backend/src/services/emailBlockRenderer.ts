import { IEmailBlock, IEmailTemplate } from '../models/Store';
import { interpolateTokens } from '../utils/emailTokens';

/** Minimal shape needed by getCampaignBlocks — avoids importing the full Campaign model here. */
export interface ICampaignLike {
    blocks?: IEmailBlock[];
    content?: string;
}

const ESCAPE_MAP: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
};

function escapeHtml(text: string): string {
    return (text || '').replace(/[&<>"']/g, (ch) => ESCAPE_MAP[ch]);
}

/** Interpolates {{token}}s into merchant text, THEN HTML-escapes the result — so a customer name/order number can never itself inject markup, and neither can a merchant's template text. */
function safeText(text: string | undefined, vars: Record<string, string>): string {
    return escapeHtml(interpolateTokens(text || '', vars));
}

const ALIGN_CSS: Record<string, string> = { left: 'left', center: 'center', right: 'right' };

/**
 * Renders a merchant's no-code block list into real HTML — used by both
 * the transactional store-templated emails (order confirmation/status/
 * marketing) and bulk marketing campaigns, so they share one visual
 * language and one non-removable "Powered by Buildora" footer (added by
 * the store_generic.html wrapper this output gets fed into, NOT by this
 * function — see emailService.ts's sendStoreTemplatedEmail and
 * campaignDispatchService.ts).
 *
 * Every block type except 'html' runs its text through safeText() (token
 * interpolation + HTML-escaping) — 'html' is a legacy passthrough for
 * pre-block-editor raw content (old Campaign.content, old Store template
 * body strings) and is trusted/rendered verbatim, exactly as it always was
 * before this feature existed.
 *
 * Keep in sync with frontend/packages/shared/src/lib/emailBlockRenderer.ts
 * (a hand-written client-side mirror used ONLY to drive the live-preview
 * iframe — backend/ and frontend/ are separate Node projects with no
 * shared module boundary, so this logic necessarily lives twice).
 */
export function renderBlocksToHtml(blocks: IEmailBlock[] | undefined, vars: Record<string, string>): string {
    if (!blocks || blocks.length === 0) return '';

    return blocks
        .map((block) => {
            switch (block.type) {
                case 'heading': {
                    const tag = block.level === 'h2' ? 'h2' : 'h1';
                    const size = block.level === 'h2' ? '20px' : '26px';
                    return `<${tag} class="title" style="text-align:${ALIGN_CSS[block.align] || 'center'};color:${block.color || '#1a202c'};font-size:${size};">${safeText(block.text, vars)}</${tag}>`;
                }
                case 'text':
                    return `<p class="description" style="white-space:pre-line;text-align:${ALIGN_CSS[block.align] || 'left'};color:${block.color || '#4a5568'};">${safeText(block.text, vars)}</p>`;
                case 'image': {
                    const img = `<img src="${escapeHtml(block.imageUrl)}" alt="${safeText(block.altText, vars)}" style="max-width:100%;border-radius:12px;display:inline-block;" />`;
                    const wrapped = block.link ? `<a href="${escapeHtml(block.link)}">${img}</a>` : img;
                    return `<div style="text-align:center;margin:16px 0;">${wrapped}</div>`;
                }
                case 'button': {
                    const bg = block.backgroundColor || '#2d3748';
                    const fg = block.textColor || '#ffffff';
                    return `<div style="text-align:${ALIGN_CSS[block.align] || 'center'};margin:20px 0;"><a href="${escapeHtml(block.url)}" class="btn" style="background-color:${bg};color:${fg} !important;display:inline-block;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">${safeText(block.text, vars)}</a></div>`;
                }
                case 'divider':
                    return `<hr style="border:none;border-top:1px solid ${block.color || '#edf2f7'};margin:24px 0;" />`;
                case 'spacer': {
                    const height = Math.min(96, Math.max(4, block.height || 24));
                    return `<div style="height:${height}px;line-height:${height}px;">&nbsp;</div>`;
                }
                case 'html':
                    // Trusted legacy passthrough — see the module doc-comment above.
                    return block.rawHtml || '';
                default:
                    return '';
            }
        })
        .join('\n');
}

/**
 * Migration shim for the small handful of email templates saved before
 * this feature existed (plain {heading, body} strings, no blocks) — no
 * batch migration script needed since no real merchant relied on the
 * short-lived heading/body shape. Synthesizes a heading+text block pair
 * from the legacy fields so old data renders instead of crashing.
 * Mirrored client-side (frontend/packages/shared/src/lib/emailBlockRenderer.ts)
 * so the settings form doesn't choke on old data either.
 */
export function normalizeEmailTemplate(
    raw?: Partial<IEmailTemplate> & { heading?: string; body?: string }
): { subject?: string; blocks: IEmailBlock[] } {
    if (!raw) return { blocks: [] };
    if (raw.blocks && raw.blocks.length > 0) return { subject: raw.subject, blocks: raw.blocks };

    const blocks: IEmailBlock[] = [];
    if (raw.heading) blocks.push({ id: 'legacy-heading', type: 'heading', text: raw.heading, level: 'h1', align: 'center' });
    if (raw.body) blocks.push({ id: 'legacy-body', type: 'text', text: raw.body, align: 'center' });
    return { subject: raw.subject, blocks };
}

/**
 * Read-time shim for legacy campaigns saved before the block editor
 * existed (Campaign.content as raw HTML, no Campaign.blocks) — wraps the
 * old content as a single trusted 'html' passthrough block rather than
 * requiring a batch migration of potentially-live campaign data.
 */
export function getCampaignBlocks(campaign: ICampaignLike): IEmailBlock[] {
    if (campaign.blocks && campaign.blocks.length > 0) return campaign.blocks;
    if (campaign.content) return [{ id: 'legacy-content', type: 'html', rawHtml: campaign.content }];
    return [];
}

// ============================================================================
// Store-aware default templates — a store that has never customized a
// template should still see (and send) a REAL starting template, not an
// empty one: the store's own logo (when it has one) plus sensible
// heading/body copy. This is what a brand-new store's Emails settings page
// pre-fills the editor with, what "Reset to original" restores, and what
// actually gets sent if the merchant never touches the editor at all.
// Mirrored client-side in frontend/packages/shared/src/lib/emailBlockRenderer.ts
// (same store.logo/store.name inputs — keep both in sync).
// ============================================================================

export type StoreEmailTemplateType = 'orderConfirmation' | 'orderStatusChanged' | 'marketing';

interface StoreForDefaultTemplate {
    name: string;
    logo?: { url?: string };
}

const DEFAULT_TEMPLATE_SUBJECTS: Record<StoreEmailTemplateType, string> = {
    orderConfirmation: 'Your order #{{orderNumber}} has been received',
    orderStatusChanged: 'Your order #{{orderNumber}} is now {{status}}',
    marketing: 'News from {{storeName}}',
};

const DEFAULT_TEMPLATE_CONTENT: Record<StoreEmailTemplateType, { heading: string; body: string }> = {
    orderConfirmation: {
        heading: 'Thank you for your order!',
        body: "Hi {{customerName}},\n\nWe've received your order #{{orderNumber}} for {{total}} EGP. We'll email you again as soon as its status changes.\n\nThanks for shopping with {{storeName}}!",
    },
    orderStatusChanged: {
        heading: 'Order Update',
        body: 'Hi {{customerName}},\n\nYour order #{{orderNumber}} from {{storeName}} has been updated to: {{status}}.\n\nYou can check the latest details any time on our track-order page.',
    },
    marketing: {
        heading: '{{storeName}} Update',
        body: 'Hi {{customerName}},\n\nWe have something new to share with you!',
    },
};

export function getDefaultTemplateSubject(type: StoreEmailTemplateType): string {
    return DEFAULT_TEMPLATE_SUBJECTS[type];
}

/**
 * Builds the real starting block list for a template — the store's own
 * logo up top (skipped if the store hasn't uploaded one) followed by a
 * heading and body block. Used at send time as the fallback when a store
 * never customized a template (see resolveStoreEmailTemplate in
 * emailService.ts), AND by the frontend to pre-fill a fresh editor / power
 * its "Reset to original" button, so what a merchant sees while editing is
 * exactly what a never-customized store would actually send.
 */
export function buildDefaultTemplateBlocks(store: StoreForDefaultTemplate, type: StoreEmailTemplateType): IEmailBlock[] {
    const content = DEFAULT_TEMPLATE_CONTENT[type];
    const blocks: IEmailBlock[] = [];
    if (store.logo?.url) {
        blocks.push({ id: 'default-logo', type: 'image', imageUrl: store.logo.url, altText: store.name });
    }
    blocks.push({ id: 'default-heading', type: 'heading', text: content.heading, level: 'h1', align: 'center' });
    blocks.push({ id: 'default-body', type: 'text', text: content.body, align: 'center' });
    return blocks;
}
