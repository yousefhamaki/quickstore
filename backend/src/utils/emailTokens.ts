/**
 * Deliberately plain `{{token}}` regex replacement — NOT Handlebars. This
 * text (subjects, block text, etc.) is merchant-authored, so it must not be
 * able to execute template logic/partials the way a real Handlebars compile
 * would allow. Kept as its own side-effect-free module (rather than living
 * in emailService.ts) so campaign code can use it without pulling in
 * emailService.ts's Resend-client initialization.
 */
export function interpolateTokens(text: string, vars: Record<string, string>): string {
    if (!text) return '';
    return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => (key in vars ? vars[key] : ''));
}
