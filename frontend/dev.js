const { spawn } = require('child_process');

const args = process.argv.slice(2);
let workspace = 'merchant-dashboard'; // Default workspace

if (args.includes('--saas-portal') || process.env.npm_config_saas_portal || process.env['npm_config_saas-portal']) {
  workspace = 'saas-portal';
} else if (args.includes('--merchant-dashboard') || process.env.npm_config_merchant_dashboard || process.env['npm_config_merchant-dashboard']) {
  workspace = 'merchant-dashboard';
}

console.log(`Starting dev server for workspace: ${workspace}`);

const child = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'dev', '--workspace=' + workspace], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', code => {
  process.exit(code);
});
