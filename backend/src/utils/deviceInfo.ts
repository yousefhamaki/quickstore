import { UAParser } from 'ua-parser-js';

/**
 * Turns a raw User-Agent header into a short, human-readable label for the
 * Active Sessions / Login History UI — e.g. "Chrome on Windows",
 * "Safari on iPhone". Falls back gracefully for anything ua-parser-js
 * can't confidently identify (curl, bots, custom clients).
 */
export function getDeviceLabel(userAgent: string | undefined): string {
    if (!userAgent) return 'Unknown device';

    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const os = parser.getOS();

    const browserName = browser.name || 'Unknown browser';
    const osName = os.name || 'Unknown OS';

    return `${browserName} on ${osName}`;
}

/** Best-effort client IP extraction, respecting a reverse proxy (Vercel/Render both set x-forwarded-for). */
export function getClientIp(req: { headers: Record<string, unknown>; socket?: { remoteAddress?: string } }): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || '';
}
