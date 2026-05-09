const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(/};\n\\n\\nconst /g, '};\n\nconst ');
code = code.replace(/};\n\\nconst /g, '};\n\nconst ');
code = code.replace(/};\n\\n\\nconst MainApp/g, '};\n\nconst MainApp');
fs.writeFileSync('App.tsx', code);
