// Patches the static output of `expo export -p web` with the meta tags iOS
// Safari needs for "Add to Home Screen" to behave like a standalone app,
// and copies over the PWA icon/manifest files. Needed because this
// project's web.bundler/output is "single" (a plain SPA index.html), which
// — unlike Expo Router's "static" output mode — does not run app/+html.tsx
// or copy a public/ directory; those mechanisms simply have no effect
// here, so the meta tags/icons must be injected as a post-build step.
//
// Run: node scripts/postbuild-web-pwa.js   (after `expo export -p web`)
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PUBLIC = path.join(__dirname, '..', 'public');

// Must match app.json's expo.experiments.baseUrl — every path this build's
// own assets are served under.
const BASE = '/mobile-app';

const PWA_HEAD_TAGS = `
    <meta name="theme-color" content="#2563EB" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Buildora" />
    <link rel="apple-touch-icon" href="${BASE}/apple-touch-icon.png" />
    <link rel="manifest" href="${BASE}/manifest.json" />
  `;

function patchIndexHtml() {
    const indexPath = path.join(DIST, 'index.html');
    let html = fs.readFileSync(indexPath, 'utf8');
    if (html.includes('apple-mobile-web-app-capable')) return; // already patched
    html = html.replace('</head>', `${PWA_HEAD_TAGS}</head>`);
    fs.writeFileSync(indexPath, html);
}

function copyPwaAssets() {
    for (const file of ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']) {
        fs.copyFileSync(path.join(PUBLIC, file), path.join(DIST, file));
    }
    const manifest = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'manifest.json'), 'utf8'));
    manifest.start_url = `${BASE}/`;
    manifest.icons = manifest.icons.map((icon) => ({ ...icon, src: `${BASE}${icon.src}` }));
    fs.writeFileSync(path.join(DIST, 'manifest.json'), JSON.stringify(manifest, null, 2));
}

if (!fs.existsSync(DIST)) {
    console.error('dist/ not found — run `expo export -p web` first.');
    process.exit(1);
}
patchIndexHtml();
copyPwaAssets();
console.log('Patched dist/index.html with PWA meta tags and copied manifest/icons.');
