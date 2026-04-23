const fs = require('fs');

const replacementView = `
const BodyView = ({ data, saveData, showToast }: { data: AppData, saveData: (d: AppData) => void, showToast: (m: string) => void }) => {
    const [w, setW] = React.useState("");
    const [s, setS] = React.useState("");
    const [dateInput, setDateInput] = React.useState(() => {
        const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().split('T')[0];
    });

    const add = () => {
        if(!w && !s) return;
        const newLogs = [...(data.bodyLogs || [])];
        const exist = newLogs.find(l => l.d === dateInput);
        if(exist) {
            exist.w = w || exist.w;
            exist.s = s || exist.s;
        } else {
            newLogs.unshift({d: dateInput, w, s});
        }
        setW(""); setS("");
        saveData({...data, bodyLogs: newLogs.sort((a,b)=>b.d.localeCompare(a.d))});
        showToast("Gespeichert! 💾");
    };
    
    const remove = (d: string) => {
        saveData({...data, bodyLogs: data.bodyLogs.filter(l => l.d !== d)});
        showToast("Gelöscht 🗑️");
    };
    
    const updateEntry = (d: string, field: 'w'|'s', val: string) => {
         const newLogs = [...data.bodyLogs];
         const exist = newLogs.find(l => l.d === d);
         if(exist) exist[field] = val;
         saveData({...data, bodyLogs: newLogs});
    };

    const last7 = (data.bodyLogs || []).slice(0, 7);
    const chartData = last7.map(l => ({ name: new Date(l.d).toLocaleDateString('de-DE', {weekday:'short'}), Weight: l.w ? parseFloat(l.w.replace(',','.')) : null })).reverse();

    return (
        <main className="pb-24 pt-6 px-4 animate-fade-in relative max-w-lg mx-auto">
            <h2 className="font-headline font-black text-3xl mb-8 tracking-tight text-on-surface">Gewicht & Activity</h2>
            
            <section className="animate-slide-up" style={{animationDelay: '0.1s'}}>
                <div className="bg-surface-container border border-white/5 p-6 rounded-3xl shadow-2xl relative mb-6">
                  <div className="flex items-center gap-2 mb-6">
                      <span className="material-symbols-outlined text-[#3b82f6]">monitor_weight</span>
                      <h3 className="font-headline font-bold text-lg text-on-surface">Eintrag hinzufügen</h3>
                  </div>
                  <div className="mb-4">
                      <input type="date" value={dateInput} onChange={e=>setDateInput(e.target.value)} className="w-full bg-surface-container-highest p-4 rounded-2xl text-on-surface font-label font-bold outline-none border border-white/5 focus:border-[#3b82f6] transition-colors"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] text-[#3b82f6] font-label font-black uppercase tracking-widest block mb-2">Gewicht (KG)</label>
                          <input type="text" inputMode="decimal" placeholder="00.0" value={w} onChange={e=>setW(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full bg-surface-container-highest p-4 rounded-2xl text-2xl font-headline font-black text-[#3b82f6] outline-none border border-white/5 focus:border-[#3b82f6] shadow-inner transition-colors"/>
                      </div>
                      <div>
                          <label className="text-[10px] text-[#10b981] font-label font-black uppercase tracking-widest block mb-2">Steps</label>
                          <input type="text" inputMode="decimal" placeholder="10k" value={s} onChange={e=>setS(e.target.value.replace(/[^0-9.,]/g, ''))} className="w-full bg-surface-container-highest p-4 rounded-2xl text-2xl font-headline font-black text-[#10b981] outline-none border border-white/5 focus:border-[#10b981] shadow-inner transition-colors"/>
                      </div>
                  </div>
                  <button onClick={add} className="w-full mt-6 py-4 bg-primary-container text-on-primary rounded-2xl font-label font-bold shadow-[0_0_20px_rgba(234,179,8,0.2)] text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[18px]">save</span> Speichern</button>
              </div>

              {chartData.length > 1 && (
                  <div className="h-72 w-full bg-surface-container rounded-3xl p-4 border border-white/5 shadow-2xl overflow-hidden mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                              <YAxis domain={['auto', 'auto']} stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} width={40} />
                              <Area type="monotone" dataKey="Weight" stroke="#3b82f6" fill="rgba(59,130,246,0.1)" strokeWidth={3} dot={{fill: "#3b82f6", r:4, strokeWidth:2, stroke:"#111"}} activeDot={{r:6, strokeWidth:0}}/>
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              )}
              
              <div className="space-y-3">
                   {last7.map(l => (
                       <div key={l.d} className="bg-surface-container border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-lg">
                           <div className="text-xs font-label font-bold text-on-surface-variant w-16">{new Date(l.d).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</div>
                           <div className="flex gap-2 flex-1 justify-end items-center">
                               <div className="relative">
                                   <input type="text" inputMode="decimal" value={l.w || ''} onChange={(e) => updateEntry(l.d, 'w', e.target.value.replace(/[^0-9.,]/g, ''))} className="w-16 bg-surface-container-highest border border-[#3b82f6]/30 rounded-xl py-2 text-center text-sm font-headline font-black text-[#3b82f6] outline-none focus:border-[#3b82f6] transition-colors" placeholder="kg" />
                               </div>
                               <div className="relative">
                                   <input type="text" inputMode="decimal" value={l.s || ''} onChange={(e) => updateEntry(l.d, 's', e.target.value.replace(/[^0-9.,]/g, ''))} className="w-16 bg-surface-container-highest border border-[#10b981]/30 rounded-xl py-2 text-center text-sm font-headline font-black text-[#10b981] outline-none focus:border-[#10b981] transition-colors" placeholder="steps" />
                               </div>
                               <button onClick={() => remove(l.d)} className="p-2 text-on-surface-variant hover:text-error transition-colors rounded-full hover:bg-error-container/20 flex items-center justify-center w-8 h-8"><span className="material-symbols-outlined text-[16px]">delete</span></button>
                           </div>
                       </div>
                   ))}
              </div>
          </section>
      </main>
    );
};

// ================= TRAINING VIEW RECOVERY =================
const TrainingView = ({ data, saveData, activeSession, updateSession, nav, showToast }: any) => {
    // If no start time, redirect or show message. But wait, normally TrainingView just shows the current activeSession.
    
    if (!activeSession || !activeSession.start) {
        return (
            <main className="pb-24 pt-6 px-4 text-center">
                 <h2 className="font-headline font-black text-2xl text-on-surface mt-8 mb-4">Kein aktives Training</h2>
                 <button onClick={() => nav('plan')} className="px-6 py-3 bg-primary-container text-on-primary rounded-full font-bold">Zum Plan</button>
            </main>
        );
    }
    
    const exIds = Object.keys(activeSession.exercises).sort((a,b) => activeSession.exercises[a].order - activeSession.exercises[b].order);
    
    const addSet = (id: string, defReps: number = 10, isCardio: boolean) => {
        const ns = JSON.parse(JSON.stringify(activeSession));
        const prevSets = ns.exercises[id].sets;
        const lastSet = prevSets.length > 0 ? prevSets[prevSets.length-1] : null;
        ns.exercises[id].sets.push({
            w: lastSet ? lastSet.w : 0,
            r: isCardio ? 0 : (lastSet ? lastSet.r : defReps),
            type: 'W'
        });
        updateSession(ns);
    };

    const removeSet = (id: string, idx: number) => {
        const ns = JSON.parse(JSON.stringify(activeSession));
        ns.exercises[id].sets.splice(idx, 1);
        updateSession(ns);
    };

    const completeSession = () => {
        const hEntry: WorkoutLog = {
            d: new Date().toISOString(),
            s: activeSession
        };
        const updatedData = { ...data, h: [hEntry, ...(data.h || [])] };
        saveData(updatedData);
        updateSession({ start: null, exercises: {} });
        showToast("Training beendet! 💪");
        nav('home');
    };

    return (
        <main className="pb-32 pt-6 px-2 animate-fade-in relative max-w-lg mx-auto">
            <TimerDisplay startTime={activeSession.start} />
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="font-headline font-black text-3xl tracking-tight text-on-surface">Live Training</h2>
                <button onClick={() => {
                     if (confirm("Workout wirklich abbrechen?")) {
                         updateSession({ start: null, exercises: {} });
                         nav('home');
                     }
                }} className="text-error font-bold font-label text-xs uppercase tracking-widest bg-error-container/20 px-3 py-1.5 rounded-full hover:bg-error/20 transition-colors">Abbrechen</button>
            </div>
            
            <section className="space-y-4">
                {exIds.map(id => {
                    const exData = activeSession.exercises[id];
                    const exDef = data.db[id];
                    if (!exDef) return null;
                    const isCardio = exDef.t === 'cardio';
                    
                    return (
                        <div key={id} className="bg-surface-container border border-white/5 rounded-3xl p-4 shadow-xl">
                             <div className="flex items-center gap-3 mb-4">
                                  <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center flex-shrink-0 border border-white/10">
                                      <span className="font-label font-bold text-on-surface-variant text-xs">{exDef.m.substring(0,3).toUpperCase()}</span>
                                  </div>
                                  <div className="flex-1">
                                      <h3 className="font-headline font-black text-lg text-on-surface leading-tight">{exDef.n}</h3>
                                  </div>
                                  <input 
                                      type="number" 
                                      value={exData.order} 
                                      onChange={(e) => {
                                          const ns = {...activeSession};
                                          ns.exercises[id].order = parseInt(e.target.value) || 0;
                                          updateSession(ns);
                                      }}
                                      className="w-10 h-10 bg-surface-container-highest text-on-surface font-mono font-black text-center rounded-xl focus:outline-none border border-white/10 p-0"
                                  />
                             </div>
                             
                             <div className="space-y-2">
                                  {exData.sets.map((s: any, idx: number) => (
                                      <div key={idx} className="relative flex items-center gap-1 p-2 rounded-2xl border border-white/5 bg-surface-container-highest">
                                          <button onClick={() => {
                                              const ns = JSON.parse(JSON.stringify(activeSession));
                                              ns.exercises[id].sets[idx].type = s.type === 'W' ? 'A' : 'W';
                                              updateSession(ns);
                                          }} className={\`w-10 h-10 rounded-xl font-headline font-black text-xs flex items-center justify-center flex-shrink-0 \${s.type==='W'?'bg-surface-container-highest border border-white/10 text-on-surface-variant':'bg-primary-container text-on-primary'}\`}>{s.type}</button>
                                          
                                          <div className="flex-1 flex items-center justify-center gap-1">
                                              <NumberStepper 
                                                  value={s.w} 
                                                  step={(exDef.h && exDef.h !== 0 && exDef.h !== "0") ? 4.5 : 0.5} 
                                                  isDecimal={true} 
                                                  label={isCardio ? 'MIN' : 'KG'} 
                                                  onChange={(val: number) => {
                                                      const ns = JSON.parse(JSON.stringify(activeSession));
                                                      ns.exercises[id].sets[idx].w = val;
                                                      updateSession(ns);
                                                  }}
                                                  className="w-[72px] bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0 leading-none h-8"
                                              />
                                          </div>
                                          
                                          {isCardio ? null : (
                                              <>
                                                  <div className="flex-1 flex items-center justify-center gap-1">
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
                                                  </div>

                                                  <div className="flex-1 flex items-center justify-center gap-1">
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
                                                  </div>
                                              </>
                                          )}
                                          
                                          <button onClick={() => removeSet(id, idx)} className="w-8 h-10 flex items-center justify-center text-on-surface-variant hover:text-error transition-colors flex-shrink-0 active:scale-95">
                                              <span className="material-symbols-outlined text-[16px]">close</span>
                                          </button>
                                      </div>
                                  ))}
                             </div>
                             
                             <button onClick={() => addSet(id, 10, isCardio)} className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed border-white/10 text-on-surface-variant font-label font-bold text-xs uppercase tracking-widest hover:border-primary-container hover:text-primary-container hover:bg-primary-container/10 transition-all flex items-center justify-center gap-2">
                                  <span className="material-symbols-outlined text-[18px]">add</span> {isCardio ? 'Zeit Hinzufügen' : 'Set Hinzufügen'}
                             </button>
                        </div>
                    );
                })}
            </section>
            
            <div className="fixed bottom-20 left-0 w-full px-4 z-40 pointer-events-none">
                <div className="max-w-lg mx-auto pointer-events-auto">
                    <button onClick={completeSession} className="w-full py-5 bg-[#10b981] text-black font-headline font-black rounded-3xl shadow-[0_0_30px_rgba(16,185,129,0.3)] text-lg uppercase tracking-wider hover:bg-[#0ea5e9] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined font-black">check_circle</span>
                        Training Abschließen
                    </button>
                </div>
            </div>
            
        </main>
    );
};
`;

let code = fs.readFileSync('App.tsx', 'utf8');
code = code.replace(
    /(\/\/ --- MAIN APP ---)/,
    replacementView + '\n\n$1'
);
fs.writeFileSync('App.tsx', code);
console.log('Restored BodyView and TrainingView');
