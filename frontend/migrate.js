const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const appsDir = path.join(root, 'apps');
const packagesDir = path.join(root, 'packages');
const sharedDir = path.join(packagesDir, 'shared');

const saasPortal = path.join(appsDir, 'saas-portal');
const merchantDashboard = path.join(appsDir, 'merchant-dashboard');

const dirsToCreate = [
    appsDir, packagesDir, sharedDir, saasPortal, merchantDashboard,
    path.join(saasPortal, 'src', 'app', '[locale]'),
    path.join(merchantDashboard, 'src', 'app', '[locale]'),
    path.join(sharedDir, 'src'),
];

dirsToCreate.forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

const sharedPackageJson = {
    name: "@shared",
    version: "1.0.0",
    main: "index.js",
    private: true
};
fs.writeFileSync(path.join(sharedDir, 'package.json'), JSON.stringify(sharedPackageJson, null, 2));

const copyDirObj = (src, dest) => {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    
    fs.readdirSync(src).forEach(file => {
        const srcFile = path.join(src, file);
        const destFile = path.join(dest, file);
        if (fs.lstatSync(srcFile).isDirectory()) {
            copyDirObj(srcFile, destFile);
        } else {
            fs.copyFileSync(srcFile, destFile);
        }
    });
};

const moveDirObj = (src, dest) => {
    if (!fs.existsSync(src)) return;
    copyDirObj(src, dest);
    // keeping delete separate for safety later if wanted, but standard move acts like this
};

// Copy all base files of src/ (components, hooks, lib, types, etc. to shared)
['components', 'config', 'context', 'hooks', 'i18n', 'lib', 'types', 'services', 'providers', 'messages', 'public', 'styles'].forEach(f => {
    const from = path.join(root, 'src', f);
    if (fs.existsSync(from)) {
        copyDirObj(from, path.join(sharedDir, 'src', f));
    }
});

// Setup App locales
const srcLocaleDir = path.join(root, 'src', 'app', '[locale]');

// Move Saas Routes
['about', 'contact', 'features', 'pricing', 'privacy', 'terms', 'support', 'store', 'preview'].forEach(route => {
    moveDirObj(path.join(srcLocaleDir, route), path.join(saasPortal, 'src', 'app', '[locale]', route));
});

// Move Merchant Routes
['auth', 'dashboard', 'merchant', 'admin', 'verify-email'].forEach(route => {
    moveDirObj(path.join(srcLocaleDir, route), path.join(merchantDashboard, 'src', 'app', '[locale]', route));
});

// Copy root app files layout, globals, page to both
if (fs.existsSync(srcLocaleDir)) {
    const localeFiles = fs.readdirSync(srcLocaleDir).filter(f => fs.lstatSync(path.join(srcLocaleDir, f)).isFile());
    localeFiles.forEach(f => {
        fs.copyFileSync(path.join(srcLocaleDir, f), path.join(saasPortal, 'src', 'app', '[locale]', f));
        fs.copyFileSync(path.join(srcLocaleDir, f), path.join(merchantDashboard, 'src', 'app', '[locale]', f));
    });
}

// Copy App root layout/files
const srcAppDir = path.join(root, 'src', 'app');
if (fs.existsSync(srcAppDir)) {
    const baseAppFiles = fs.readdirSync(srcAppDir).filter(f => fs.lstatSync(path.join(srcAppDir, f)).isFile());
    baseAppFiles.forEach(f => {
        fs.copyFileSync(path.join(srcAppDir, f), path.join(saasPortal, 'src', 'app', f));
        fs.copyFileSync(path.join(srcAppDir, f), path.join(merchantDashboard, 'src', 'app', f));
    });
}

// Ensure middleware.ts is copied properly (needs parent dir)
['middleware.ts', 'middleware.ts.backup'].forEach(f => {
    ['saas-portal', 'merchant-dashboard'].forEach(app => {
        if (fs.existsSync(path.join(root, 'src', f))) {
            fs.copyFileSync(path.join(root, 'src', f), path.join(root, 'apps', app, 'src', f));
        }
    });
});

console.log("Migration structure created.");
