const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Modify NumberStepper to optionally hide arrows and stack horizontally or keep vertical
code = code.replace(
    /const NumberStepper = \(\{ value, onChange, step, label, isDecimal, className \}: any\) => \{/,
    'const NumberStepper = ({ value, onChange, step, label, isDecimal, className, hideArrows = false }: any) => {'
);

code = code.replace(
    /<div className="flex flex-col items-center justify-center">([\s\S]*?)<\/div>\s*<\/div>\s*\);\s*\};/,
    `<div className={\`flex flex-col items-center justify-center \${hideArrows ? 'pb-1' : ''}\`}>
            { !hideArrows && <button onClick={() => applyStep(1)} className="w-8 flex items-center justify-center text-on-surface-variant hover:text-[#3b82f6] active:scale-95 py-1 min-h-[24px]">
                <span className="material-symbols-outlined text-[20px] leading-none">keyboard_arrow_up</span>
            </button> }
            <div className={\`flex \${label && hideArrows ? 'flex-col' : 'items-baseline'} gap-1 \${!hideArrows ? 'my-[-4px]' : ''}\`}>
                <input 
                    type="text" 
                    inputMode={isDecimal ? "decimal" : "numeric"}
                    value={localStr}
                    onChange={handleChange}
                    className={className || "w-16 bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0 leading-none h-8"} 
                    placeholder="-"
                />
                {label && <span className="text-[10px] font-label font-bold text-on-surface-variant uppercase">{label}</span>}
            </div>
            { !hideArrows && <button onClick={() => applyStep(-1)} className="w-8 flex items-center justify-center text-on-surface-variant hover:text-[#3b82f6] active:scale-95 py-1 min-h-[24px]">
                <span className="material-symbols-outlined text-[20px] leading-none">keyboard_arrow_down</span>
            </button> }
        </div>
    );
};`
);

// Modify HistoryView weight
code = code.replace(
    /<input type="number" step=\{\(exDef\?\.h && exDef\?\.h !== 0 && exDef\?\.h !== "0"\) \? "4\.5" : "0\.5"\} value=\{s\.w\} onChange=\{e=>\{\s*const ns = \{\.\.\.localLog\};\s*ns\.s\[id\]\.sets\[sIdx\]\.w = parseFloat\(e\.target\.value\);\s*setLocalLog\(ns\);\s*\}\} className="\{`\$\{isCardio \? 'w-20' : 'w-14'\}.*?\/>\s*<span.*?>\{isCardio \? 'MIN' : 'KG'\}<\/span>/s,
    `<NumberStepper 
                                                value={s.w} 
                                                step={(exDef?.h && exDef?.h !== 0 && exDef?.h !== "0") ? 4.5 : 0.5} 
                                                isDecimal={true} 
                                                hideArrows={true}
                                                label={isCardio ? 'MIN' : 'KG'} 
                                                onChange={(val: number) => {
                                                    const ns = {...localLog};
                                                    ns.s[id].sets[sIdx].w = val;
                                                    setLocalLog(ns);
                                                }}
                                                className={\`\${isCardio ? 'w-16' : 'w-12'} px-0 bg-surface-container-highest border-0 border-b border-white/10 text-on-surface font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors\`}
                                            />`
);

// Modify HistoryView Reps
code = code.replace(
    /<input type="number" value=\{s\.r\} onChange=\{e=>\{\s*const ns = \{\.\.\.localLog\};\s*ns\.s\[id\]\.sets\[sIdx\]\.r = parseInt\(e\.target\.value\);\s*setLocalLog\(ns\);\s*\}\} className="w-10.*?\/>\s*<span.*?>REPS<\/span>/s,
    `<NumberStepper 
                                                value={s.r} 
                                                step={1} 
                                                isDecimal={false} 
                                                hideArrows={true}
                                                label="REPS" 
                                                onChange={(val: number) => {
                                                    const ns = {...localLog};
                                                    ns.s[id].sets[sIdx].r = Math.round(val);
                                                    setLocalLog(ns);
                                                }}
                                                className="w-10 px-0 bg-surface-container-highest border-0 border-b border-white/10 text-on-surface font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors"
                                            />`
);

// Modify HistoryView RIR
code = code.replace(
    /<input type="number" step="0\.5" value=\{s\.rpe !== undefined \? s\.rpe : ''\} onChange=\{e=>\{\s*const ns = \{\.\.\.localLog\};\s*ns\.s\[id\]\.sets\[sIdx\]\.rpe = parseFloat\(e\.target\.value\);\s*setLocalLog\(ns\);\s*\}\}.*?placeholder="-".*?\/>\s*<span.*?>RIR<\/span>/s,
    `<NumberStepper 
                                                value={s.rpe !== undefined ? s.rpe : NaN} 
                                                step={0.5} 
                                                isDecimal={true} 
                                                hideArrows={true}
                                                label="RIR" 
                                                onChange={(val: number) => {
                                                    const ns = {...localLog};
                                                    ns.s[id].sets[sIdx].rpe = isNaN(val) ? undefined : val;
                                                    setLocalLog(ns);
                                                }}
                                                className="w-10 px-0 bg-surface-container-highest border-0 border-b border-white/10 text-primary-container font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors"
                                            />`
);

fs.writeFileSync('App.tsx', code);
console.log('Modified HistoryView steppers');
