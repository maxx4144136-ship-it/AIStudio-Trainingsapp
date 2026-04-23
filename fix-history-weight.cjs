const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
    /<input type="number" step=\{\(exDef\?\.h && exDef\?\.h !== 0 && exDef\?\.h !== "0"\) \? "4\.5" : "0\.5"\} value=\{s\.w\} onChange=\{e=>\{\s*const ns = \{\.\.\.localLog\};\s*ns\.s\[id\]\.sets\[sIdx\]\.w = parseFloat\(e\.target\.value\);\s*setLocalLog\(ns\);\s*\}\} className=\{`\$\{isCardio \? 'w-20' : 'w-14'\} px-0 bg-surface-container-highest border-0 border-b border-white\/10 text-on-surface font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors`\}\/>/,
    `<NumberStepper 
                                                value={s.w} 
                                                step={(exDef?.h && exDef?.h !== 0 && exDef?.h !== "0") ? 4.5 : 0.5} 
                                                isDecimal={true} 
                                                hideArrows={true}
                                                onChange={(val: number) => {
                                                    const ns = {...localLog};
                                                    ns.s[id].sets[sIdx].w = val;
                                                    setLocalLog(ns);
                                                }}
                                                className={\`\${isCardio ? 'w-16' : 'w-12'} px-0 bg-surface-container-highest border-0 border-b border-white/10 text-on-surface font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors\`}
                                            />`
);

fs.writeFileSync('App.tsx', code);
console.log('Fixed HistoryView weight');
