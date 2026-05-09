const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/\{\\n  const \{ /g, '{\n  const { ');
fs.writeFileSync('App.tsx', code);
