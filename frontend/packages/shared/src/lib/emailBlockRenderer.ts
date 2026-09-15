import { EmailBlock, EmailTemplate } from '../types/store';

/**
 * Client-side mirror of backend/src/services/emailBlockRenderer.ts's
 * renderBlocksToHtml — used ONLY to drive the EmailBlockEditor's live
 * preview iframe. backend/ and frontend/ are separate Node projects with
 * no shared module boundary, so this logic necessarily lives twice; the
 * real email that actually gets sent always goes through the backend
 * copy. Keep both in sync when adding/changing a block type.
 */

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

/** Same deliberately-plain {{token}} replacement as backend/src/utils/emailTokens.ts — not real templating, so merchant text can't execute logic. */
export function interpolateTokens(text: string, vars: Record<string, string>): string {
    if (!text) return '';
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => (key in vars ? vars[key] : ''));
}

function safeText(text: string | undefined, vars: Record<string, string>): string {
    return escapeHtml(interpolateTokens(text || '', vars));
}

const ALIGN_CSS: Record<string, string> = { left: 'left', center: 'center', right: 'right' };

export function renderBlocksToHtml(blocks: EmailBlock[] | undefined, vars: Record<string, string>): string {
    if (!blocks || blocks.length === 0) return '';

    return blocks
        .map((block) => {
            switch (block.type) {
                case 'heading': {
                    const tag = block.level === 'h2' ? 'h2' : 'h1';
                    const size = block.level === 'h2' ? '20px' : '26px';
                    return `<${tag} style="text-align:${ALIGN_CSS[block.align] || 'center'};color:${block.color || '#1a202c'};font-size:${size};margin:0 0 16px;">${safeText(block.text, vars)}</${tag}>`;
                }
                case 'text':
                    return `<p style="white-space:pre-line;text-align:${ALIGN_CSS[block.align] || 'left'};color:${block.color || '#4a5568'};margin:0 0 16px;">${safeText(block.text, vars)}</p>`;
                case 'image': {
                    const img = `<img src="${escapeHtml(block.imageUrl)}" alt="${safeText(block.altText, vars)}" style="max-width:100%;border-radius:12px;display:inline-block;" />`;
                    const wrapped = block.link ? `<a href="${escapeHtml(block.link)}">${img}</a>` : img;
                    return `<div style="text-align:center;margin:16px 0;">${wrapped}</div>`;
                }
                case 'button': {
                    const bg = block.backgroundColor || '#2d3748';
                    const fg = block.textColor || '#ffffff';
                    return `<div style="text-align:${ALIGN_CSS[block.align] || 'center'};margin:20px 0;"><a href="${escapeHtml(block.url)}" style="background-color:${bg};color:${fg};display:inline-block;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">${safeText(block.text, vars)}</a></div>`;
                }
                case 'divider':
                    return `<hr style="border:none;border-top:1px solid ${block.color || '#edf2f7'};margin:24px 0;" />`;
                case 'spacer': {
                    const height = Math.min(96, Math.max(4, block.height || 24));
                    return `<div style="height:${height}px;line-height:${height}px;">&nbsp;</div>`;
                }
                case 'html':
                    return block.rawHtml || '';
                default:
                    return '';
            }
        })
        .join('\n');
}

/** Mirrors backend's normalizeEmailTemplate — so the settings form doesn't choke on templates saved before the block editor existed. */
export function normalizeEmailTemplate(raw?: Partial<EmailTemplate>): { subject?: string; blocks: EmailBlock[] } {
    if (!raw) return { blocks: [] };
    if (raw.blocks && raw.blocks.length > 0) return { subject: raw.subject, blocks: raw.blocks };

    const blocks: EmailBlock[] = [];
    if (raw.heading) blocks.push({ id: 'legacy-heading', type: 'heading', text: raw.heading, level: 'h1', align: 'center' });
    if (raw.body) blocks.push({ id: 'legacy-body', type: 'text', text: raw.body, align: 'center' });
    return { subject: raw.subject, blocks };
}

/** Mirrors backend's getCampaignBlocks — a campaign saved before the block editor existed only has `content` (raw HTML), so wrap it as a single trusted passthrough block instead of showing nothing. */
export function getCampaignBlocksClient(campaign: { blocks?: EmailBlock[]; content?: string }): EmailBlock[] {
    if (campaign.blocks && campaign.blocks.length > 0) return campaign.blocks;
    if (campaign.content) return [{ id: 'legacy-content', type: 'html', rawHtml: campaign.content }];
    return [];
}

/** A fresh, stable-enough id for a newly added block — same shape convention already used by HeroSliderEditor.tsx. */
export function generateBlockId(): string {
    return `block_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Sensible starting defaults for each addable block type, keyed by the "Add block" UI. */
export function createDefaultBlock(type: EmailBlock['type']): EmailBlock {
    const id = generateBlockId();
    switch (type) {
        case 'heading':
            return { id, type: 'heading', text: 'New heading', level: 'h1', align: 'center' };
        case 'text':
            return { id, type: 'text', text: 'Write your message here…', align: 'left' };
        case 'image':
            return { id, type: 'image', imageUrl: '', altText: '' };
        case 'button':
            return { id, type: 'button', text: 'Click here', url: '', backgroundColor: '#2d3748', textColor: '#ffffff', align: 'center' };
        case 'divider':
            return { id, type: 'divider', color: '#edf2f7' };
        case 'spacer':
            return { id, type: 'spacer', height: 24 };
        case 'html':
        default:
            return { id, type: 'html', rawHtml: '' };
    }
}

/** Realistic placeholder token values so the live preview looks like a real email instead of blank/empty tokens. */
export const PREVIEW_SAMPLE_VARS: Record<string, string> = {
    customerName: 'Jane Doe',
    orderNumber: '1042',
    total: '450',
    status: 'Shipped',
    storeName: 'Your Store'
};
