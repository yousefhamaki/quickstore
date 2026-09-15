const { spawn } = require('child_process');

const args = process.argv.slice(2);
let workspace = 'saas-portal'; // Default workspace — merchant-dashboard was merged into saas-portal

if (args.includes('--admin-dashboard') || process.env.npm_config_admin_dashboard || process.env['npm_config_admin-dashboard']) {
  workspace = 'admin-dashboard';
} else if (args.includes('--saas-portal') || process.env.npm_config_saas_portal || process.env['npm_config_saas-portal']) {
  workspace = 'saas-portal';
}

console.log(`Starting dev server for workspace: ${workspace}`);

const child = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'dev', '--workspace=' + workspace], {
  stdio: 'inherit',
  shell: true
});

child.on('exit', code => {
  process.exit(code);
});
