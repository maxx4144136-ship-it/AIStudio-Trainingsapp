const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// TrainingView Weight
code = code.replace(
    /<div className="flex-1 flex items-center justify-center gap-1">\s*<input type="number" step=\{\(ex\.h && ex\.h !== 0 && ex\.h !== "0"\) \? "4\.5" : "0\.5"\} value=\{s\.w\} onChange=\{e => \{\s*const ns = JSON\.parse\(JSON\.stringify\(activeSession\)\);\s*ns\.exercises\[id\]\.sets\[idx\]\.w = parseFloat\(e\.target\.value\);\s*updateSession\(ns\);\s*\}\} className="w-20 bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0" \/>\s*<span className="text-\[10px\] font-label font-bold text-on-surface-variant uppercase">\{isCardio \? 'MIN' : 'KG'\}<\/span>\s*<\/div>/,
    `<div className="flex-1 flex items-center justify-center gap-1">
                                            <NumberStepper 
                                                value={s.w} 
                                                step={(ex.h && ex.h !== 0 && ex.h !== "0") ? 4.5 : 0.5} 
                                                isDecimal={true} 
                                                label={isCardio ? 'MIN' : 'KG'} 
                                                onChange={(val: number) => {
                                                    const ns = JSON.parse(JSON.stringify(activeSession));
                                                    ns.exercises[id].sets[idx].w = val;
                                                    updateSession(ns);
                                                }}
                                                className="w-[72px] bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0 leading-none h-8"
                                            />
                                        </div>`
);

// TrainingView Reps
code = code.replace(
    /<div className="flex-1 flex items-center justify-center gap-1">\s*<input type="number" value=\{s\.r\} onChange=\{e => \{\s*const ns = JSON\.parse\(JSON\.stringify\(activeSession\)\);\s*ns\.exercises\[id\]\.sets\[idx\]\.r = parseInt\(e\.target\.value\);\s*updateSession\(ns\);\s*\}\} className="w-12 bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0" \/>\s*<span className="text-\[10px\] font-label font-bold text-on-surface-variant uppercase">x<\/span>\s*<\/div>/,
    `<div className="flex-1 flex items-center justify-center gap-1">
                                                    <NumberStepper 
                                                        value={s.r} 
                                                        step={1} 
                                                        isDecimal={false} 
                                                        label="x" 
                                                        onChange={(val: number) => {
                                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                                            ns.exercises[id].sets[idx].r = Math.round(val);
                                                            updateSession(ns);
                                                        }}
                                                        className="w-12 bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0 leading-none h-8"
                                                    />
                                                </div>`
);

// TrainingView RIR
code = code.replace(
    /<div className="flex-1 flex items-center justify-center gap-1">\s*<input type="number" step="0\.5" value=\{s\.rpe !== undefined \? s\.rpe : ''\} onChange=\{e => \{\s*const ns = JSON\.parse\(JSON\.stringify\(activeSession\)\);\s*ns\.exercises\[id\]\.sets\[idx\]\.rpe = parseFloat\(e\.target\.value\);\s*updateSession\(ns\);\s*\}\} className="w-12 bg-transparent text-center font-headline font-black text-2xl text-primary-container outline-none border-none p-0 focus:ring-0" placeholder="-" \/>\s*<span className="text-\[10px\] font-label font-bold text-on-surface-variant uppercase">RIR<\/span>\s*<\/div>/,
    `<div className="flex-1 flex items-center justify-center gap-1">
                                                    <NumberStepper 
                                                        value={s.rpe !== undefined ? s.rpe : NaN} 
                                                        step={0.5} 
                                                        isDecimal={true} 
                                                        label="RIR" 
                                                        onChange={(val: number) => {
                                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                                            ns.exercises[id].sets[idx].rpe = isNaN(val) ? undefined : val;
                                                            updateSession(ns);
                                                        }}
                                                        className="w-12 bg-transparent text-center font-headline font-black text-2xl text-primary-container outline-none border-none p-0 focus:ring-0 leading-none h-8"
                                                    />
                                                </div>`
);

fs.writeFileSync('App.tsx', code);
console.log('Replaced numeric inputs in TrainingView');
