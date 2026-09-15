/**
 * Rewrites a Cloudinary delivery URL to request an on-the-fly resized,
 * auto-format, auto-quality version instead of the original upload.
 *
 * Every image URL stored in the database today is the raw upload URL (no
 * transform segment) — meaning a thumbnail-sized product card was
 * downloading the same full-resolution file as a hero banner. Cloudinary
 * applies transforms via a URL segment inserted right after `/upload/`
 * (e.g. `/upload/w_400,q_auto,f_auto/v123/...`), so this never touches
 * the stored asset — it's a free, per-request resize/reformat/CDN-cache
 * done by Cloudinary, not a new asset to manage.
 *
 * Safe no-op for any non-Cloudinary URL (falls back to the original),
 * so it's safe to wrap every image URL in the app with this unconditionally.
 */
export function optimizedImageUrl(
    url: string | undefined | null,
    opts: { width?: number; height?: number; crop?: 'fill' | 'fit' | 'thumb' | 'scale' } = {}
): string {
    if (!url) return '';
    const marker = '/upload/';
    const idx = url.indexOf(marker);
    if (idx === -1 || !url.includes('res.cloudinary.com')) return url;

    const { width, height, crop = 'fill' } = opts;
    const parts = ['f_auto', 'q_auto'];
    if (width) parts.push(`w_${width}`);
    if (height) parts.push(`h_${height}`);
    if (width || height) parts.push(`c_${crop}`);

    const insertAt = idx + marker.length;
    return `${url.slice(0, insertAt)}${parts.join(',')}/${url.slice(insertAt)}`;
}

/** Common presets so call sites don't hand-pick sizes ad hoc. */
export const imagePreset = {
    thumbnail: (url: string | undefined | null) => optimizedImageUrl(url, { width: 100, height: 100, crop: 'fill' }),
    card: (url: string | undefined | null) => optimizedImageUrl(url, { width: 500, height: 500, crop: 'fill' }),
    detail: (url: string | undefined | null) => optimizedImageUrl(url, { width: 900, crop: 'fit' }),
    hero: (url: string | undefined | null) => optimizedImageUrl(url, { width: 1600, crop: 'fit' }),
    logo: (url: string | undefined | null) => optimizedImageUrl(url, { width: 200, crop: 'fit' }),
};
