const fs = require('fs');
let code = fs.readFileSync('types.ts', 'utf8');

code = code.replace(
`  calTargets: { cut: number, bulk: number, main: number }; // Absolute Kcal values
}`,
`  calTargets: { cut: number, bulk: number, main: number }; // Absolute Kcal values
  aiLogs?: { week: string, text: string, date: number }[];
}`
);

fs.writeFileSync('types.ts', code);
console.log("Updated types.ts");
