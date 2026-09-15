import { IEmailBlock, EmailBlockType } from '../models/Store';

const MAX_BLOCKS = 40;
const MAX_TEXT_LENGTH = 5000;
const KNOWN_TYPES: EmailBlockType[] = ['heading', 'text', 'image', 'button', 'divider', 'spacer', 'html'];

/**
 * Only http(s) URLs are allowed in a block's imageUrl/link/url fields —
 * rejects `javascript:`/`data:`/anything else that could turn a "safe"
 * structured block into an XSS vector when rendered into real HTML by
 * emailBlockRenderer's renderBlocksToHtml.
 */
export function isSafeHttpUrl(url: unknown): boolean {
    if (typeof url !== 'string' || !url) return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function isNonEmptyString(v: unknown): v is string {
    return typeof v === 'string' && v.length <= MAX_TEXT_LENGTH;
}

/**
 * Validates a merchant-submitted blocks array before it's persisted (store
 * email templates and campaign content both go through this). Never
 * throws — returns a result the caller turns into a 400 response.
 */
export function validateEmailBlocks(blocks: unknown): { valid: boolean; error?: string } {
    if (blocks === undefined) return { valid: true }; // optional field, nothing to validate
    if (!Array.isArray(blocks)) return { valid: false, error: 'blocks must be an array' };
    if (blocks.length > MAX_BLOCKS) return { valid: false, error: `A maximum of ${MAX_BLOCKS} blocks is allowed` };

    for (const block of blocks as IEmailBlock[]) {
        if (!block || typeof block !== 'object') return { valid: false, error: 'Each block must be an object' };
        if (!KNOWN_TYPES.includes((block as any).type)) {
            return { valid: false, error: `Unknown block type: ${(block as any).type}` };
        }

        switch (block.type) {
            case 'heading':
            case 'text':
                if (!isNonEmptyString(block.text)) return { valid: false, error: `${block.type} block text is too long or missing` };
                break;
            case 'image':
                if (!isSafeHttpUrl(block.imageUrl)) return { valid: false, error: 'image block imageUrl must be a valid http(s) URL' };
                if (block.link && !isSafeHttpUrl(block.link)) return { valid: false, error: 'image block link must be a valid http(s) URL' };
                if (block.altText && !isNonEmptyString(block.altText)) return { valid: false, error: 'image block altText is too long' };
                break;
            case 'button':
                if (!isNonEmptyString(block.text)) return { valid: false, error: 'button block text is too long or missing' };
                if (!isSafeHttpUrl(block.url)) return { valid: false, error: 'button block url must be a valid http(s) URL' };
                break;
            case 'divider':
                break;
            case 'spacer':
                if (typeof block.height !== 'number' || block.height < 4 || block.height > 96) {
                    return { valid: false, error: 'spacer block height must be a number between 4 and 96' };
                }
                break;
            case 'html':
                // Legacy passthrough only — never accepted from the "Add
                // block" UI, but a saved campaign that already has one
                // (via getCampaignBlocks' read-time shim) must still pass
                // validation on its next save.
                if (!isNonEmptyString((block as any).rawHtml)) return { valid: false, error: 'html block rawHtml is too long or missing' };
                break;
        }
    }

    return { valid: true };
}
