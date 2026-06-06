const fs = require('fs');
const src = 'C:/Users/Home/Documents/GitHub/QuickStore/frontend/src_backup/app/[locale]/globals.css';
const dest1 = 'C:/Users/Home/Documents/GitHub/QuickStore/frontend/apps/saas-portal/src/app/[locale]/globals.css';
const dest2 = 'C:/Users/Home/Documents/GitHub/QuickStore/frontend/apps/merchant-dashboard/src/app/[locale]/globals.css';

const txt = fs.readFileSync(src, 'utf-8');
const newTxt = txt.replace('@import "tw-animate-css";', '@import "tw-animate-css";\n@source "../../../../../packages/shared/src";');

fs.writeFileSync(dest1, newTxt);
fs.writeFileSync(dest2, newTxt);
console.log('Fixed CSS successfully.');
