const fs = require('fs');
const file = 'web-admin/src/lib/rentalOps.ts';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/number \| string/g, 'string').replace(/string \| number/g, 'string');
fs.writeFileSync(file, content);
console.log('Cleanup done in ' + file);
