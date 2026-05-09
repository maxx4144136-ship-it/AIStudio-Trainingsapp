const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/\\n\\nconst /g, '\n\nconst ');
fs.writeFileSync('App.tsx', code);
