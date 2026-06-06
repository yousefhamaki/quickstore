const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const appsDir = path.join(root, 'apps');
const packagesDir = path.join(root, 'packages');
const sharedDir = path.join(packagesDir, 'shared');

const saasPortal = path.join(appsDir, 'saas-portal');
const merchantDashboard = path.join(appsDir, 'merchant-dashboard');

const rootPkgPath = path.join(root, 'package.json');
let rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));

// Configure Root Package JSON
rootPkg.workspaces = ["apps/*", "packages/*"];
fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));

const originalDeps = rootPkg.dependencies;
const originalDevDeps = rootPkg.devDependencies;

// App Package JSONs
const createAppPkg = (name, port) => ({
    name,
    version: "0.1.0",
    private: true,
    scripts: { dev: `next dev -p ${port}`, build: "next build", start: "next start", lint: "next lint" },
    dependencies: { ...originalDeps, "@shared": "workspace:*" },
    devDependencies: originalDevDeps
});

fs.writeFileSync(path.join(saasPortal, 'package.json'), JSON.stringify(createAppPkg('saas-portal', 3000), null, 2));
fs.writeFileSync(path.join(merchantDashboard, 'package.json'), JSON.stringify(createAppPkg('merchant-dashboard', 3001), null, 2));

// Copy configs
const configs = ['tsconfig.json', 'eslint.config.mjs', 'postcss.config.mjs', 'next.config.ts', 'components.json'];
configs.forEach(conf => {
    const src = path.join(root, conf);
    if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(saasPortal, conf));
        fs.copyFileSync(src, path.join(merchantDashboard, conf));
    }
});

// Create shared package.json
const sharedPkg = {
    name: "@shared",
    version: "1.0.0",
    main: "src/index.ts",
    private: true,
    dependencies: originalDeps
};
fs.writeFileSync(path.join(sharedDir, 'package.json'), JSON.stringify(sharedPkg, null, 2));

// Update TSConfig paths to resolve @shared inline for apps
const updateTsConfig = (appPath) => {
    const tsconfigPath = path.join(appPath, 'tsconfig.json');
    if (fs.existsSync(tsconfigPath)) {
        const tsconfig = fs.readFileSync(tsconfigPath, 'utf8');
        // Hacky regex but reliable for standard next.js tsconfig
        const updated = tsconfig.replace(/"paths"\s*:\s*\{/, `"paths": {"@shared/*": ["../../packages/shared/src/*"], `);
        fs.writeFileSync(tsconfigPath, updated);
    }
};

updateTsConfig(saasPortal);
updateTsConfig(merchantDashboard);

// Global Regex Replacement for imports
const dirsToRewrite = [saasPortal, merchantDashboard, sharedDir];

const rewriteImports = (dir) => {
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.lstatSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.next') rewriteImports(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx') || fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let updated = false;

            // Simple replace of @/components, @/lib, etc with @shared/
            const matchers = ['components', 'config', 'context', 'hooks', 'i18n', 'lib', 'types', 'services', 'providers'];
            matchers.forEach(m => {
                const regex = new RegExp(`@/${m}/`, 'g');
                if (regex.test(content)) {
                    content = content.replace(regex, `@shared/${m}/`);
                    updated = true;
                }
            });

            if (updated) {
                fs.writeFileSync(fullPath, content);
            }
        }
    });
};

dirsToRewrite.forEach(rewriteImports);

// Cleanup Root src (optional, safely move to backup)
const backupDir = path.join(root, 'src_backup');
if (!fs.existsSync(backupDir)) {
    fs.renameSync(path.join(root, 'src'), backupDir);
}

console.log("Finalization Complete.");
