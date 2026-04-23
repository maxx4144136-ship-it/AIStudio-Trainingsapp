const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Fix Line 213 area
code = code.replace(
`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:space-y-0">
                   <h3 className="text-on-surface-variant font-label font-bold text-[10px] uppercase tracking-widest pl-2 mb-4">Letzte 7 Tage</h3>`,
`<h3 className="text-on-surface-variant font-label font-bold text-[10px] uppercase tracking-widest pl-2 mb-4">Letzte 7 Tage</h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">`
);

// Fix Line 385 (sets map grid)
code = code.replace(
`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:space-y-0">
                                {sets.map((s: any, idx) => {`,
`<div className="space-y-3">
                                {sets.map((s: any, idx) => {`
);

// Fix Line 960 (just remove md:space-y-0 to be clean)
code = code.replace(
`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:space-y-0">
                      {data.userSupps.map((s, i) => (`,
`<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {data.userSupps.map((s, i) => (`
);

fs.writeFileSync('App.tsx', code);
console.log("Fixed space-y-3 reversions.");
