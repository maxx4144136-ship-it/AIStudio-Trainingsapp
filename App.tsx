import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Calendar, Zap, BarChart2, User, Settings, 
  Dumbbell, Copy, RefreshCw, Plus, Trash2, Activity,
  Trophy, BrainCircuit, Scale, History, PlayCircle, BarChart3, Edit3,
  ArrowUp, ArrowDown, Check, CheckCircle2, Circle
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { AppData, ExerciseDef, SetLog, WorkoutLog, GitHubConfig, ActiveSession, BodyLog, MuscleGroup } from './types';
import { FALLBACK_DATA, CAT_ORDER } from './constants';
import { calculateProgression, calculateWarmup, generateSnapshotHTML } from './utils/logic';
import { fetchFromGitHub, saveToGitHub } from './services/github';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ComposedChart, Bar } from 'recharts';

// --- COMPONENTS ---

const Header = ({ title, showBack, onBack, onSnapshot }: { title: string, showBack: boolean, onBack: () => void, onSnapshot: () => void }) => (
  <div className="fixed top-0 left-0 w-full h-16 glass-panel z-50 flex items-center justify-between px-4 border-b border-white/5">
    {showBack ? (
      <button onClick={onBack} className="bg-blue-600/20 text-blue-400 border border-blue-500/50 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
        ‹ ZURÜCK
      </button>
    ) : <div className="w-10" />}
    <h1 className="text-sm font-black tracking-[0.2em] text-white uppercase drop-shadow-[0_0_10px_rgba(0,209,178,0.8)]">
      {title}
    </h1>
    <button onClick={onSnapshot} className="text-xl p-2 hover:bg-white/10 rounded-full transition-colors">
      💾
    </button>
  </div>
);

const TabBar = ({ currentView, nav }: { currentView: string, nav: (id: string) => void }) => {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'plan', icon: Calendar, label: 'Plan' },
    { id: 'selection', icon: Zap, label: 'Start' },
    { id: 'stats', icon: BarChart2, label: 'Stats' },
    { id: 'profile', icon: User, label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full h-[80px] glass-panel z-50 flex justify-around items-start pt-3 border-t border-white/10 pb-safe">
      {tabs.map(t => (
        <button 
          key={t.id}
          onClick={() => nav(t.id)}
          className={`flex flex-col items-center w-1/5 transition-all active:scale-95 ${currentView === t.id ? 'text-[#00d1b2] -translate-y-1' : 'text-zinc-600'}`}
        >
          <t.icon size={22} strokeWidth={currentView === t.id ? 2.5 : 2} />
          <span className="text-[9px] font-black uppercase mt-1 tracking-wider">{t.label}</span>
        </button>
      ))}
    </div>
  );
};

// --- MAIN APP ---

const App = () => {
  // State
  const [data, setData] = useState<AppData>(FALLBACK_DATA);
  const [view, setView] = useState<string>('home');
  const [activeSession, setActiveSession] = useState<ActiveSession>({ start: null, exercises: {} });
  const [ghConfig, setGhConfig] = useState<GitHubConfig>({ token: '', owner: '', repo: '', path: 'data.json' });
  const [toast, setToast] = useState<string | null>(null);
  const [timerStr, setTimerStr] = useState("00:00:00");
  const [analyticsEx, setAnalyticsEx] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [editingLogIdx, setEditingLogIdx] = useState<number | null>(null);

  // Central Routing Function
  const nav = (id: string) => {
      // Clear analytics selection when leaving stats
      if(id !== 'stats') setAnalyticsEx(null);
      if(id !== 'edit_workout') setEditingLogIdx(null);
      setView(id);
      window.scrollTo(0,0);
  };

  // Load Initial Data
  useEffect(() => {
    const localData = localStorage.getItem('tm_data');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        // Deep merge to ensure new fields (dob, goals) exist
        setData(prev => ({
            ...prev,
            ...parsed,
            goals: parsed.goals || prev.goals,
            calTargets: parsed.calTargets || prev.calTargets,
            dob: parsed.dob || prev.dob
        }));
      } catch(e) {
        saveData(FALLBACK_DATA);
      }
    } else {
      saveData(FALLBACK_DATA);
    }
    
    const savedGh = localStorage.getItem('tm_gh_config');
    if (savedGh) setGhConfig(JSON.parse(savedGh));

    const savedSession = localStorage.getItem('tm_session');
    if (savedSession) setActiveSession(JSON.parse(savedSession));
  }, []);

  // Timer Effect
  useEffect(() => {
    let int: ReturnType<typeof setInterval>;
    if (activeSession.start) {
      int = setInterval(() => {
        const diff = Date.now() - (activeSession.start || 0);
        const date = new Date(diff);
        setTimerStr(date.toISOString().substr(11, 8));
      }, 1000);
    }
    return () => clearInterval(int);
  }, [activeSession.start]);

  // Helpers
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const saveData = (newData: AppData) => {
    setData(newData);
    localStorage.setItem('tm_data', JSON.stringify(newData));
  };

  const updateSession = (newSession: ActiveSession) => {
    setActiveSession(newSession);
    localStorage.setItem('tm_session', JSON.stringify(newSession));
  };

  const handleSnapshot = () => {
    const htmlContent = generateSnapshotHTML(data);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRAINING_MASTER_V14_BACKUP_${new Date().toISOString().split('T')[0]}.html`;
    a.click();
    showToast("Backup generiert! 💾");
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        const txt = ev.target?.result as string;
        try {
            // Logic to parse legacy HTML Snapshot format (h1, h2, ... variables)
            let fullH = "";
            const hRegex = /const h(\d+) = `(.*?)`;/g;
            let match;
            const hParts: string[] = [];
            while ((match = hRegex.exec(txt)) !== null) { hParts[parseInt(match[1])] = match[2]; }
            if(hParts.length > 0) fullH = hParts.join("");

            // Helper to extract JSON vars
            const extractJSON = (varName: string) => {
                const r = new RegExp(`const ${varName} = (.*?);`);
                const m = txt.match(r);
                try { return m ? JSON.parse(m[1]) : null; } catch { return null; }
            };

            const d = extractJSON('d'); 
            const b = extractJSON('b'); 
            const sup = extractJSON('sup'); 
            const p = extractJSON('p') || extractJSON('userProfile'); 

            // Fallback: Try straight JSON parse if it was a json file
            if(!d && !fullH) {
                const json = JSON.parse(txt);
                if(json.h || json.db) {
                     saveData({...FALLBACK_DATA, ...json});
                     showToast("JSON Import erfolgreich! ✅");
                     return;
                }
            }

            if(d || fullH) {
                // Legacy HTML Import
                const newH = fullH ? JSON.parse(fullH) : (data.h || []);
                const newData = {
                    ...FALLBACK_DATA, // Base structure
                    db: d || data.db || FALLBACK_DATA.db,
                    h: newH,
                    bodyLogs: b || data.bodyLogs || [],
                    userSupps: sup || data.userSupps || FALLBACK_DATA.userSupps,
                    userProfile: typeof p === 'string' ? p : (p?.userProfile || FALLBACK_DATA.userProfile)
                };
                saveData(newData);
                showToast(`Wiederhergestellt: ${newH.length} Trainings! 🚀`);
            } else {
                showToast("Format nicht erkannt. ❌");
            }
        } catch(err) {
            console.error(err);
            showToast("Import Fehler: Datei beschädigt?");
        }
    };
    reader.readAsText(file);
  };

  const handleGitHubSync = async () => {
    showToast("Verbinde mit GitHub...");
    const newData = await fetchFromGitHub(ghConfig);
    if (newData) {
      saveData(newData);
      showToast("Daten erfolgreich geladen! ☁️");
    } else {
      const success = await saveToGitHub(ghConfig, data);
      showToast(success ? "Gespeichert auf GitHub! ☁️" : "Verbindungsfehler! Prüfe Token.");
    }
  };

  // --- LOGIC HELPERS ---
  const getWeeklyVolume = () => {
    const startOfWeek = new Date(); 
    startOfWeek.setDate(startOfWeek.getDate() - (startOfWeek.getDay() || 7) + 1); 
    startOfWeek.setHours(0,0,0,0);
    
    const vol: Record<string, number> = {};
    data.h.filter(w => w.d >= startOfWeek.getTime()).forEach(w => {
      Object.keys(w.s).forEach(exId => {
        const ex = data.db[exId];
        if (ex && ex.c !== 'Tennis') {
            vol[ex.c] = (vol[ex.c] || 0) + w.s[exId].sets.filter(s => s.type === 'A').length;
        }
      });
    });
    return vol;
  };

  // --- VIEWS ---

  const HomeView = () => {
    const vol = getWeeklyVolume();
    const bodyWeight = data.bodyLogs.length > 0 ? data.bodyLogs[0].w : "--";
    
    return (
      <div className="pt-20 pb-28 px-4 space-y-6 animate-fade-in">
        {/* HERO STATUS CARD */}
        <div className={`glass-panel rounded-[24px] p-1 relative overflow-hidden`}>
           <div className="bg-zinc-900/80 backdrop-blur rounded-[20px] p-5">
              <div className="flex justify-between items-end mb-4">
                 <div>
                    <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Wochenfortschritt</div>
                    <div className="text-xl font-black text-white italic">GOALS</div>
                 </div>
                 <div onClick={() => nav('body')} className="text-right cursor-pointer">
                    <div className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase mb-1">Gewicht</div>
                    <div className="text-2xl font-black text-[#00d1b2]">{bodyWeight} <span className="text-xs text-zinc-500">KG</span></div>
                 </div>
              </div>
              
              {/* Dynamic Progress Bars */}
              <div className="space-y-2">
                 {CAT_ORDER.map(cat => {
                    const done = vol[cat] || 0;
                    const target = data.goals[cat as MuscleGroup] || 20;
                    const pct = Math.min((done / target) * 100, 100);
                    const isDone = done >= target;
                    
                    return (
                        <div key={cat} className="flex flex-col gap-1">
                           <div className="flex justify-between text-[10px] font-bold text-zinc-400">
                               <span>{cat}</span>
                               <span className={isDone ? 'text-yellow-400' : ''}>{done} / {target}</span>
                           </div>
                           <div className={`h-2 w-full rounded-full bg-zinc-800 border border-white/5`}>
                               <div 
                                 className={`h-full rounded-full transition-all duration-1000 ${isDone ? 'bg-yellow-400 shadow-[0_0_10px_#facc15]' : 'bg-[#00d1b2]'}`} 
                                 style={{width: `${pct}%`}}
                               ></div>
                           </div>
                        </div>
                    );
                 })}
              </div>
           </div>
        </div>

        {/* MAIN ACTION */}
        <button 
            onClick={() => nav('selection')} 
            className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-white text-xl shadow-lg shadow-blue-900/40 hover:scale-[1.01] active:scale-95 transition-all flex items-center justify-center gap-3"
        >
            <Zap className="fill-white" size={24} /> WORKOUT STARTEN
        </button>

        {/* FEATURE GRID */}
        <div className="grid grid-cols-2 gap-3">
             <button onClick={() => nav('history')} className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2">
                 <History className="text-orange-400" size={28}/>
                 <span className="text-xs font-bold text-zinc-300">HISTORIE</span>
             </button>
             <button onClick={() => nav('stats')} className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2">
                 <Activity className="text-purple-400" size={28}/>
                 <span className="text-xs font-bold text-zinc-300">ANALYSE</span>
             </button>
             <button onClick={() => nav('body')} className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2">
                 <Scale className="text-emerald-400" size={28}/>
                 <span className="text-xs font-bold text-zinc-300">KÖRPERDATEN</span>
             </button>
             <button onClick={() => nav('profile')} className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2">
                 <User className="text-pink-400" size={28}/>
                 <span className="text-xs font-bold text-zinc-300">PROFIL & SUPPS</span>
             </button>
             <button onClick={() => nav('tennis')} className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2">
                 <Trophy className="text-yellow-400" size={28}/>
                 <span className="text-xs font-bold text-zinc-300">TENNIS MATCH</span>
             </button>
             <button onClick={() => nav('ai')} className="bg-zinc-800/50 p-4 rounded-2xl border border-white/5 hover:bg-zinc-800 transition-colors flex flex-col items-center gap-2">
                 <BrainCircuit className="text-cyan-400" size={28}/>
                 <span className="text-xs font-bold text-zinc-300">AI BRIDGE</span>
             </button>
        </div>

        {/* SYSTEM */}
        <button onClick={() => nav('settings')} className="w-full py-4 glass-panel rounded-xl text-zinc-400 text-xs font-bold flex items-center justify-center gap-2">
             <Settings size={14}/> SYSTEM & GITHUB
        </button>
      </div>
    );
  };

  const PlanView = () => {
     // Week Plan Logic
     const days = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
     
     const updateGoal = (cat: MuscleGroup, val: number) => {
         saveData({ ...data, goals: { ...data.goals, [cat]: val } });
     };

     const generateDayWorkout = (dayIndex: number, focus: string) => {
         const vol = getWeeklyVolume();
         const sessionsLeft = 7 - dayIndex; 
         const targetCats: MuscleGroup[] = [];
         if(focus.toLowerCase().includes('push')) targetCats.push('Brust', 'Schultern', 'Arme'); 
         else if(focus.toLowerCase().includes('pull')) targetCats.push('Rücken', 'Arme'); 
         else if(focus.toLowerCase().includes('beine')) targetCats.push('Beine', 'Arme');
         else if(focus.toLowerCase().includes('arms')) targetCats.push('Arme');

         const newExercises = { ...activeSession.exercises };
         let order = Object.keys(newExercises).length + 1;

         targetCats.forEach(cat => {
             const goal = data.goals[cat] || 20;
             const done = vol[cat] || 0;
             const remaining = Math.max(0, goal - done);
             const setsToday = Math.ceil(remaining / Math.max(1, (sessionsLeft / 2))); 
             
             const pool = Object.values(data.db).filter(e => e.c === cat);
             pool.sort((a,b) => (a.prio||99) - (b.prio||99));
             
             let setsAdded = 0;
             let exIdx = 0;
             while(setsAdded < setsToday && exIdx < pool.length) {
                 const ex = pool[exIdx];
                 if(!newExercises[ex.id]) {
                     newExercises[ex.id] = { sets: [], order: order++ };
                 }
                 const needed = Math.min(3, setsToday - setsAdded); 
                 for(let k=0; k<needed; k++) {
                     newExercises[ex.id].sets.push({w: ex.defW, r: 10, type: 'A'});
                 }
                 setsAdded += needed;
                 exIdx++;
             }
         });
         
         updateSession({ ...activeSession, exercises: newExercises });
         showToast("Training generiert! 🎲");
         nav('selection');
     };

     return (
       <div className="pt-20 pb-28 px-4 space-y-6">
          <div className="glass-panel p-6 rounded-3xl">
             <h2 className="text-xl font-black text-white mb-4">WOCHENZIELE (SÄTZE)</h2>
             <div className="grid grid-cols-2 gap-4">
                 {CAT_ORDER.map(cat => (
                     <div key={cat}>
                         <label className="text-[10px] text-zinc-500 font-bold uppercase">{cat}</label>
                         <input 
                            type="number" 
                            value={data.goals[cat as MuscleGroup] || 20} 
                            onChange={(e) => updateGoal(cat as MuscleGroup, parseInt(e.target.value))}
                            className="w-full bg-zinc-900 border border-white/10 rounded-lg p-2 font-bold text-center"
                         />
                     </div>
                 ))}
             </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl">
             <h2 className="text-xl font-black text-white mb-4">TAGESPLANER</h2>
             <p className="text-xs text-zinc-400 mb-4">Wähle einen Fokus, um ein Training basierend auf deinem offenen Volumen zu generieren.</p>
             <div className="space-y-3">
                {days.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl">
                        <div className="w-8 font-black text-zinc-500">{d}</div>
                        <div className="flex-1 grid grid-cols-3 gap-1">
                            <button onClick={() => generateDayWorkout(i, 'Push')} className="text-[10px] font-bold bg-blue-900/30 text-blue-400 py-2 rounded hover:bg-blue-600 hover:text-white">PUSH</button>
                            <button onClick={() => generateDayWorkout(i, 'Pull')} className="text-[10px] font-bold bg-green-900/30 text-green-400 py-2 rounded hover:bg-green-600 hover:text-white">PULL</button>
                            <button onClick={() => generateDayWorkout(i, 'Legs/Arms')} className="text-[10px] font-bold bg-red-900/30 text-red-400 py-2 rounded hover:bg-red-600 hover:text-white">L/A</button>
                        </div>
                    </div>
                ))}
             </div>
          </div>
       </div>
     );
  };

  const HistoryView = () => {
      const deleteWorkout = (idx: number, e: React.MouseEvent) => {
          e.stopPropagation();
          if(confirm("Wirklich löschen?")) {
              const newH = [...data.h];
              newH.splice(idx, 1);
              saveData({...data, h: newH});
          }
      };

      const openEdit = (idx: number) => {
          setEditingLogIdx(idx);
          nav('edit_workout');
      };

      return (
          <div className="pt-20 pb-28 px-4">
             <h2 className="text-xl font-black text-white mb-6 pl-2">TRAININGS HISTORIE</h2>
             <div className="space-y-3">
                {data.h.length === 0 ? <div className="text-zinc-500 text-center mt-10">Keine Trainings gefunden.</div> : 
                 data.h.map((log, i) => (
                    <div key={i} onClick={() => openEdit(i)} className="glass-panel p-4 rounded-2xl border-l-4 border-l-blue-500 relative cursor-pointer active:scale-95 transition-transform">
                       <div className="flex justify-between items-start mb-2">
                          <div>
                              <div className="text-white font-black text-lg">{new Date(log.d).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                              <div className="text-blue-400 text-xs font-bold">{log.t}</div>
                          </div>
                          <button onClick={(e) => deleteWorkout(i, e)} className="text-zinc-600 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                       </div>
                       <div className="flex flex-wrap gap-1 mt-2">
                          {Object.keys(log.s).map(exId => {
                             const ex = data.db[exId];
                             const setC = log.s[exId].sets.filter(s => s.type === 'A').length;
                             return ex ? (
                                <span key={exId} className="px-2 py-1 bg-white/5 rounded text-[10px] text-zinc-300 border border-white/5">
                                   {ex.n} <span className="text-blue-400">x{setC}</span>
                                </span>
                             ) : null;
                          })}
                       </div>
                       {log.note && <div className="mt-3 text-xs text-zinc-500 italic border-t border-white/5 pt-2">"{log.note}"</div>}
                    </div>
                 ))
                }
             </div>
          </div>
      );
  };

  const EditWorkoutView = () => {
      if (editingLogIdx === null || !data.h[editingLogIdx]) { nav('history'); return null; }
      
      const [log, setLog] = useState<WorkoutLog>(JSON.parse(JSON.stringify(data.h[editingLogIdx]))); // Deep Clone
      const [dateStr, setDateStr] = useState(new Date(log.d).toISOString().split('T')[0]);

      const saveEdits = () => {
          const newH = [...data.h];
          newH[editingLogIdx] = { ...log, d: new Date(dateStr).getTime() };
          saveData({ ...data, h: newH });
          showToast("Änderungen gespeichert! ✅");
          nav('history');
      };

      const updateSet = (exId: string, sIdx: number, field: keyof SetLog, val: number) => {
          const newS = { ...log.s };
          // @ts-ignore
          newS[exId].sets[sIdx][field] = val;
          setLog({ ...log, s: newS });
      };

      const removeSet = (exId: string, sIdx: number) => {
          const newS = { ...log.s };
          newS[exId].sets.splice(sIdx, 1);
          if (newS[exId].sets.length === 0) delete newS[exId];
          setLog({ ...log, s: newS });
      };

      const addSetToEx = (exId: string) => {
          const newS = { ...log.s };
          newS[exId].sets.push({ w: 0, r: 0, rpe: 0, type: 'A' });
          setLog({ ...log, s: newS });
      };

      return (
          <div className="pt-20 pb-28 px-4 space-y-6">
              <div className="glass-panel p-6 rounded-3xl">
                  <h2 className="text-xl font-black text-white mb-4">TRAINING EDITIEREN</h2>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                          <label className="text-[10px] text-zinc-500 font-bold">DATUM</label>
                          <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className="w-full bg-zinc-900 p-2 rounded text-white font-bold"/>
                      </div>
                      <div>
                          <label className="text-[10px] text-zinc-500 font-bold">DAUER</label>
                          <input type="text" value={log.t} onChange={e => setLog({...log, t: e.target.value})} className="w-full bg-zinc-900 p-2 rounded text-white font-bold"/>
                      </div>
                  </div>
                  <textarea className="w-full bg-zinc-900 rounded p-2 text-xs mb-4 text-zinc-300" value={log.note} onChange={e => setLog({...log, note: e.target.value})} placeholder="Notiz..."/>
              </div>

              {Object.keys(log.s).map(exId => {
                  const ex = data.db[exId];
                  if(!ex) return null;
                  return (
                      <div key={exId} className="glass-panel p-4 rounded-2xl">
                          <h3 className="text-blue-400 font-black text-sm mb-2">{ex.n}</h3>
                          <div className="space-y-2">
                              {log.s[exId].sets.map((set, sIdx) => (
                                  <div key={sIdx} className="grid grid-cols-[20px_1fr_1fr_1fr_20px] gap-2 items-center">
                                      <span className="text-zinc-500 text-xs font-bold">{sIdx+1}</span>
                                      <input type="number" value={set.w} onChange={e => updateSet(exId, sIdx, 'w', parseFloat(e.target.value))} className="bg-zinc-800 rounded p-1 text-center font-bold text-sm"/>
                                      <input type="number" value={set.r} onChange={e => updateSet(exId, sIdx, 'r', parseFloat(e.target.value))} className="bg-zinc-800 rounded p-1 text-center font-bold text-sm"/>
                                      <input type="number" value={set.rpe} onChange={e => updateSet(exId, sIdx, 'rpe', parseFloat(e.target.value))} className="bg-zinc-800 rounded p-1 text-center font-bold text-sm"/>
                                      <button onClick={() => removeSet(exId, sIdx)} className="text-red-500">✕</button>
                                  </div>
                              ))}
                          </div>
                          <button onClick={() => addSetToEx(exId)} className="mt-3 w-full py-2 bg-white/5 rounded text-xs font-bold">+ SATZ</button>
                      </div>
                  );
              })}
              
              <button onClick={saveEdits} className="w-full py-4 bg-green-600 rounded-xl font-black text-white shadow-lg">SPEICHERN</button>
          </div>
      );
  };

  const AIBridgeView = () => {
     // ... (Existing implementation)
     const [startDate, setStartDate] = useState(new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]);
     const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

     const runAnalysis = async () => {
         setAiLoading(true);
         setAiResponse("");
         
         const startTs = new Date(startDate).getTime();
         const endTs = new Date(endDate).getTime() + 86400000; // End of day
         
         const relevantH = data.h.filter(w => w.d >= startTs && w.d < endTs);
         const relevantB = data.bodyLogs.filter(b => new Date(b.d).getTime() >= startTs && new Date(b.d).getTime() < endTs);
         
         const context = `
            ROLE: Sportwissenschaftler & Coach.
            USER: Geboren ${data.dob} (${new Date().getFullYear() - parseInt(data.dob.split('-')[0])} Jahre), Ziel: Hypertrophie.
            KALORIEN STATUS: ${data.userCalStatus.toUpperCase()} (Target: ${data.calTargets[data.userCalStatus as 'cut'|'bulk'|'main']} kcal).
            SUPPLEMENTE: ${JSON.stringify(data.userSupps)}.
            GOALS (Sets/Week): ${JSON.stringify(data.goals)}.
            
            DATEN (${startDate} bis ${endDate}):
            Trainings: ${JSON.stringify(relevantH)}
            Body: ${JSON.stringify(relevantB)}
            
            AUFGABE:
            1. Analysiere das Volumen pro Muskelgruppe vs Ziel.
            2. Bewerte die Progression (Gewicht/Reps) in den Hauptübungen.
            3. Gib konkrete Empfehlungen für die nächste Woche.
            4. Halte dich kurz und prägnant. Formatierung mit Markdown.
         `;

         if(process.env.API_KEY) {
             try {
                 const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
                 const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: context,
                 });
                 setAiResponse(response.text || "Keine Antwort erhalten.");
             } catch (e) {
                 setAiResponse("Fehler bei der API Anfrage. Prüfe Key/Internet.");
                 console.error(e);
             }
         } else {
             navigator.clipboard.writeText(context);
             setAiResponse("API Key fehlt im Environment. Daten wurden in die Zwischenablage kopiert! Bitte manuell in Gemini einfügen.");
         }
         setAiLoading(false);
     };

     const setRange = (days: number) => {
         const end = new Date();
         const start = new Date();
         start.setDate(end.getDate() - days);
         setEndDate(end.toISOString().split('T')[0]);
         setStartDate(start.toISOString().split('T')[0]);
     };

     return (
         <div className="pt-20 pb-28 px-4">
             <div className="glass-panel p-6 rounded-3xl space-y-4 border border-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]">
                 <div className="flex items-center gap-3 mb-4">
                    <BrainCircuit className="text-purple-400" size={32}/>
                    <h2 className="text-xl font-black text-white">AI BRIDGE</h2>
                 </div>
                 
                 <div className="grid grid-cols-3 gap-2 mb-4">
                     <button onClick={() => setRange(7)} className="bg-white/5 py-2 rounded-lg text-[10px] font-bold hover:bg-purple-500/20">Letzte Woche</button>
                     <button onClick={() => setRange(28)} className="bg-white/5 py-2 rounded-lg text-[10px] font-bold hover:bg-purple-500/20">4 Wochen</button>
                     <button onClick={() => setRange(60)} className="bg-white/5 py-2 rounded-lg text-[10px] font-bold hover:bg-purple-500/20">2 Monate</button>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="text-[10px] text-zinc-500 font-bold">START</label>
                         <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-zinc-900 p-2 rounded text-xs text-white"/>
                     </div>
                     <div>
                         <label className="text-[10px] text-zinc-500 font-bold">ENDE</label>
                         <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-zinc-900 p-2 rounded text-xs text-white"/>
                     </div>
                 </div>

                 <button onClick={runAnalysis} disabled={aiLoading} className="w-full py-4 bg-purple-600 rounded-xl font-bold text-white shadow-lg shadow-purple-900/40 mt-4 flex justify-center items-center gap-2">
                     {aiLoading ? <RefreshCw className="animate-spin"/> : <Zap fill="white" size={18}/>} ANALYSE STARTEN
                 </button>

                 {aiResponse && (
                     <div className="mt-4 p-4 bg-zinc-900 rounded-xl text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap border border-white/10 max-h-[300px] overflow-y-auto">
                         {aiResponse}
                     </div>
                 )}
             </div>
         </div>
     );
  };

  const ProfileView = () => {
    const updateSupp = (idx: number, field: string, val: string) => {
      const newSupps = [...data.userSupps];
      // @ts-ignore
      newSupps[idx][field] = val;
      saveData({ ...data, userSupps: newSupps });
    };
    const addSupp = () => { saveData({ ...data, userSupps: [...data.userSupps, { n: "", val: "", unit: "" }] }); };
    const removeSupp = (idx: number) => { const s = [...data.userSupps]; s.splice(idx,1); saveData({...data, userSupps: s}); };

    return (
      <div className="pt-20 pb-28 px-4 space-y-6">
        <div className="glass-panel p-6 rounded-3xl">
          <h2 className="text-xl font-black text-white mb-4">MEIN PROFIL</h2>
          
          <div className="mb-4">
              <label className="text-[10px] text-zinc-500 font-bold">GEBURTSDATUM</label>
              <input type="date" value={data.dob || "1978-05-01"} onChange={e => saveData({...data, dob: e.target.value})} className="w-full bg-zinc-900 p-3 rounded-xl mt-1 text-white font-bold"/>
          </div>

          <label className="text-[10px] text-zinc-500 font-bold">KALORIEN ZIELE (KCAL)</label>
          <div className="grid grid-cols-3 gap-2 mb-4 mt-1">
              <div>
                  <div className="text-[9px] text-center mb-1 text-blue-400">CUT</div>
                  <input type="number" value={data.calTargets.cut} onChange={e => saveData({...data, calTargets: {...data.calTargets, cut: parseInt(e.target.value)}})} className="w-full bg-zinc-900 p-2 rounded text-center text-xs font-bold"/>
              </div>
              <div>
                  <div className="text-[9px] text-center mb-1 text-green-400">MAINT</div>
                  <input type="number" value={data.calTargets.main} onChange={e => saveData({...data, calTargets: {...data.calTargets, main: parseInt(e.target.value)}})} className="w-full bg-zinc-900 p-2 rounded text-center text-xs font-bold"/>
              </div>
              <div>
                  <div className="text-[9px] text-center mb-1 text-red-400">BULK</div>
                  <input type="number" value={data.calTargets.bulk} onChange={e => saveData({...data, calTargets: {...data.calTargets, bulk: parseInt(e.target.value)}})} className="w-full bg-zinc-900 p-2 rounded text-center text-xs font-bold"/>
              </div>
          </div>

          <label className="text-[10px] text-zinc-500 font-bold">AKTUELLER STATUS</label>
          <select 
             value={data.userCalStatus} 
             onChange={(e) => saveData({...data, userCalStatus: e.target.value})}
             className="w-full bg-zinc-900 rounded-lg p-3 mt-1 font-bold border border-white/10 uppercase"
          >
             <option value="bulk">Bulk ({data.calTargets.bulk} kcal)</option>
             <option value="cut">Cut ({data.calTargets.cut} kcal)</option>
             <option value="main">Maintain ({data.calTargets.main} kcal)</option>
          </select>
        </div>

        <div className="glass-panel p-6 rounded-3xl">
           <div className="flex justify-between items-center mb-4">
             <h2 className="text-xl font-black text-white">SUPPLEMENTE</h2>
             <button onClick={addSupp} className="bg-blue-600 p-2 rounded-full"><Plus size={16}/></button>
           </div>
           <div className="space-y-2">
             {data.userSupps.map((s, idx) => (
               <div key={idx} className="flex gap-2 items-center bg-white/5 p-2 rounded-xl border border-white/5">
                 <input className="bg-transparent w-full text-sm font-bold" placeholder="Name" value={s.n} onChange={(e) => updateSupp(idx, 'n', e.target.value)} />
                 <input className="bg-transparent w-16 text-right text-sm text-[#00d1b2] font-bold" placeholder="Val" value={s.val} onChange={(e) => updateSupp(idx, 'val', e.target.value)} />
                 <input className="bg-transparent w-10 text-xs text-zinc-500" placeholder="Unit" value={s.unit} onChange={(e) => updateSupp(idx, 'unit', e.target.value)} />
                 <button onClick={() => removeSupp(idx)} className="text-red-500"><Trash2 size={14}/></button>
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  };

  const AnalyticsView = () => {
    if (analyticsEx) {
        const ex = data.db[analyticsEx];
        // STRICT SORTING BY DATE ASCENDING TO FIX CHART LOOPING
        const relevantLogs = data.h
            .filter(log => log.s[analyticsEx] && log.s[analyticsEx].sets.some(s => s.type === 'A'))
            .sort((a, b) => a.d - b.d); 

        const chartData = relevantLogs.map(log => {
                const sets = log.s[analyticsEx].sets.filter(s => s.type === 'A');
                const maxW = Math.max(...sets.map(s => s.w));
                const maxR = Math.max(...sets.map(s => s.r)); 
                return {
                    date: new Date(log.d).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'}),
                    weight: maxW,
                    reps: maxR
                };
            });

        // Reverse for table (Newest first)
        const tableData = [...relevantLogs].reverse().slice(0, 5).map(log => {
             const sets = log.s[analyticsEx].sets.filter(s => s.type === 'A');
             return {
                 d: new Date(log.d).toLocaleDateString('de-DE'),
                 w: Math.max(...sets.map(s => s.w)),
                 r: Math.max(...sets.map(s => s.r))
             };
        });

        return (
            <div className="pt-20 pb-28 px-4 h-screen flex flex-col">
                <h2 className="text-xl font-black text-[#00d1b2] uppercase text-center mb-6">{ex.n}</h2>
                <div className="h-64 glass-panel rounded-2xl p-2 mb-4">
                    {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <XAxis dataKey="date" stroke="#666" tick={{fontSize: 10}} label={{ value: 'Datum', position: 'insideBottom', offset: -5 }} />
                            <YAxis yAxisId="left" stroke="#007aff" tick={{fontSize: 10}} width={30} label={{ value: 'KG', angle: -90, position: 'insideLeft' }}/>
                            <YAxis yAxisId="right" orientation="right" stroke="#00d1b2" tick={{fontSize: 10}} width={30} label={{ value: 'Reps', angle: 90, position: 'insideRight' }}/>
                            <Tooltip contentStyle={{backgroundColor: '#1c1c1e', border: 'none', borderRadius: '10px'}} />
                            <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#007aff" strokeWidth={3} dot={{r:4}} />
                            <Line yAxisId="right" type="monotone" dataKey="reps" stroke="#00d1b2" strokeWidth={2} strokeDasharray="5 5" />
                        </ComposedChart>
                    </ResponsiveContainer>
                    ) : <div className="flex items-center justify-center h-full text-zinc-500">Keine Daten verfügbar</div>}
                </div>
                <div className="glass-panel rounded-2xl p-4">
                    <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase">Letzte 5 Einheiten</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs font-bold text-zinc-400 border-b border-white/10 pb-2 mb-2">
                        <span>Datum</span><span>Max KG</span><span>Max Reps</span>
                    </div>
                    {tableData.map((row, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 text-sm text-white mb-2">
                            <span>{row.d}</span>
                            <span className="text-blue-400">{row.w} kg</span>
                            <span className="text-[#00d1b2]">{row.r}</span>
                        </div>
                    ))}
                </div>
                <button onClick={() => setAnalyticsEx(null)} className="mt-6 py-3 bg-zinc-800 rounded-xl font-bold">Zurück zur Liste</button>
            </div>
        );
    }
    const freq: Record<string, number> = {};
    data.h.forEach(w => Object.keys(w.s).forEach(id => freq[id] = (freq[id] || 0) + 1));
    return (
        <div className="pt-20 pb-28 px-4 space-y-6">
            {CAT_ORDER.map(cat => (
                <div key={cat}>
                    <h3 className="text-xs font-black text-[#00d1b2] uppercase mb-2 ml-2">{cat}</h3>
                    <div className="space-y-2">
                        {(Object.values(data.db) as ExerciseDef[]).filter(ex => ex.c === cat).sort((a,b) => (freq[b.id]||0) - (freq[a.id]||0)).map(ex => (
                            <div key={ex.id} onClick={() => setAnalyticsEx(ex.id)} className="p-4 bg-white/5 rounded-2xl flex justify-between items-center cursor-pointer hover:bg-white/10">
                                <span className="font-bold text-sm">{ex.n}</span>
                                <span className="text-xs font-black text-zinc-500">{freq[ex.id] || 0}x</span>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
  };

  // Re-implementing BodyView with Dual Axis Chart and Sorted Data
  const BodyView = () => {
    const [weight, setWeight] = useState("");
    const [steps, setSteps] = useState("");
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);

    const addLog = () => {
       const newLog: BodyLog = { d: dateInput, w: weight, s: steps };
       const filteredLogs = data.bodyLogs.filter(l => l.d !== dateInput); // Overwrite same day
       saveData({ ...data, bodyLogs: [newLog, ...filteredLogs] });
       setWeight(""); setSteps(""); showToast("Eintrag gespeichert");
    };
    
    // Sort Ascending for Chart to fix looping
    const chartData = [...data.bodyLogs]
        .sort((a,b) => new Date(a.d).getTime() - new Date(b.d).getTime())
        .map(l => ({ date: l.d.substring(5), weight: parseFloat(l.w || "0"), steps: parseInt(l.s || "0") }))
        .filter(d => d.weight > 0 || d.steps > 0);

    return (
      <div className="pt-20 pb-28 px-4 space-y-6">
         <div className="glass-panel p-6 rounded-3xl">
            <h2 className="text-xl font-black text-white mb-4">NEUER EINTRAG</h2>
            <input type="date" value={dateInput} onChange={e => setDateInput(e.target.value)} className="w-full bg-zinc-900 p-2 rounded text-white font-bold mb-4"/>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-[10px] text-zinc-500 font-bold">GEWICHT (KG)</label><input type="number" value={weight} onChange={e => setWeight(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl mt-1 text-xl font-bold text-[#00d1b2] border border-white/10" /></div>
               <div><label className="text-[10px] text-zinc-500 font-bold">SCHRITTE</label><input type="number" value={steps} onChange={e => setSteps(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl mt-1 text-xl font-bold border border-white/10" /></div>
            </div>
            <button onClick={addLog} className="w-full mt-4 py-3 bg-blue-600 rounded-xl font-black">SPEICHERN</button>
         </div>
         {chartData.length > 0 && (<div className="h-64 glass-panel p-4 rounded-3xl">
             <ResponsiveContainer width="100%" height="100%">
                 <ComposedChart data={chartData}>
                     <XAxis dataKey="date" stroke="#555" tick={{fontSize:10}} />
                     <YAxis yAxisId="left" domain={['dataMin - 1', 'dataMax + 1']} stroke="#00d1b2" tick={{fontSize:10}} width={30} label={{ value: 'KG', angle: -90, position: 'insideLeft' }}/>
                     <YAxis yAxisId="right" orientation="right" stroke="#555" tick={{fontSize:10}} width={30} label={{ value: 'Steps', angle: 90, position: 'insideRight' }}/>
                     <Tooltip contentStyle={{backgroundColor: '#1c1c1e', border: 'none', borderRadius: '10px'}} />
                     <Bar yAxisId="right" dataKey="steps" fill="rgba(255,255,255,0.1)" barSize={10} />
                     <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#00d1b2" strokeWidth={3} dot={{r:3}} />
                 </ComposedChart>
             </ResponsiveContainer>
         </div>)}
         <div className="glass-panel p-4 rounded-3xl space-y-2">{data.bodyLogs.sort((a,b) => new Date(b.d).getTime() - new Date(a.d).getTime()).map((log, i) => (<div key={i} className="flex justify-between items-center text-sm p-2 border-b border-white/5 last:border-0"><span className="text-zinc-400">{log.d}</span><div className="flex gap-4">{log.w && <span className="font-bold text-white">{log.w} kg</span>}{log.s && <span className="font-bold text-blue-400">{log.s} steps</span>}</div></div>))}</div>
      </div>
    );
  };

  const SelectionView = () => {
    const toggleExercise = (ex: ExerciseDef) => {
      const newSession = { ...activeSession };
      if (newSession.exercises[ex.id]) {
        // REMOVE: Delete and Re-index to close gaps
        delete newSession.exercises[ex.id];
        const remaining = Object.keys(newSession.exercises).sort((a,b) => newSession.exercises[a].order - newSession.exercises[b].order);
        remaining.forEach((id, index) => {
            newSession.exercises[id].order = index + 1;
        });
      } else {
        // ADD: Append to end
        const currentCount = Object.keys(newSession.exercises).length;
        newSession.exercises[ex.id] = { sets: [], order: currentCount + 1 };
      }
      updateSession(newSession);
    };

    const startWorkout = () => {
      if (Object.keys(activeSession.exercises).length === 0) {
        showToast("Wähle mindestens eine Übung!");
        return;
      }
      if (!activeSession.start) {
        updateSession({ ...activeSession, start: Date.now() });
      }
      nav('training');
    };

    return (
      <div className="pt-20 pb-28 px-4 space-y-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-white">ÜBUNGSAUSWAHL</h2>
            {Object.keys(activeSession.exercises).length > 0 && (
                <span className="bg-blue-600 text-xs font-bold px-2 py-1 rounded-full">
                    {Object.keys(activeSession.exercises).length}
                </span>
            )}
        </div>
        
        {CAT_ORDER.map(cat => (
            <div key={cat} className="glass-panel p-4 rounded-2xl mb-4">
                <h3 className="text-blue-400 font-black uppercase mb-3 text-sm">{cat}</h3>
                <div className="grid grid-cols-1 gap-2">
                    {Object.values(data.db).filter(ex => ex.c === cat).map(ex => {
                        const isSelected = !!activeSession.exercises[ex.id];
                        const order = isSelected ? activeSession.exercises[ex.id].order : null;
                        return (
                            <button 
                                key={ex.id}
                                onClick={() => toggleExercise(ex)}
                                className={`flex justify-between items-center p-3 rounded-xl border transition-all ${isSelected ? 'bg-blue-600/20 border-blue-500 text-white' : 'bg-zinc-900/50 border-white/5 text-zinc-400'}`}
                            >
                                <span className="font-bold text-sm text-left">{ex.n}</span>
                                {isSelected && (
                                    <div className="w-6 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6] flex items-center justify-center text-xs font-black text-white">
                                        {order}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        ))}
        
        <div className="fixed bottom-[90px] left-0 w-full px-4">
             <button 
                onClick={startWorkout}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-2xl font-black text-white text-xl shadow-lg shadow-emerald-900/40"
             >
                STARTEN
             </button>
        </div>
      </div>
    );
  };

  const TrainingView = () => {
      // Helper to ensure sets exist and calculate defaults if empty
      useEffect(() => {
          if(!activeSession.start) return;
          const newEx = { ...activeSession.exercises };
          let changed = false;
          
          Object.keys(newEx).forEach(id => {
              if(newEx[id].sets.length === 0) {
                  const exDef = data.db[id];
                  if(exDef) {
                      const prog = calculateProgression(exDef, data.h);
                      const warmupW = calculateWarmup(prog.w, exDef);
                      newEx[id].sets = [
                          { w: warmupW, r: 12, type: 'W', rpe: 0, completed: false },
                          { w: prog.w, r: prog.r, type: 'A', rpe: 8, completed: false },
                          { w: prog.w, r: prog.r, type: 'A', rpe: 8, completed: false }
                      ];
                      changed = true;
                  }
              }
          });
          
          if(changed) updateSession({ ...activeSession, exercises: newEx });
      }, []);

      const updateSet = (exId: string, setIdx: number, field: keyof SetLog, val: any) => {
          const newEx = { ...activeSession.exercises };
          // @ts-ignore
          newEx[exId].sets[setIdx][field] = val;
          updateSession({ ...activeSession, exercises: newEx });
      };
      
      const toggleSetType = (exId: string, setIdx: number) => {
          const newEx = { ...activeSession.exercises };
          newEx[exId].sets[setIdx].type = newEx[exId].sets[setIdx].type === 'W' ? 'A' : 'W';
          updateSession({ ...activeSession, exercises: newEx });
      };

      const toggleSetComplete = (exId: string, setIdx: number) => {
          const newEx = { ...activeSession.exercises };
          newEx[exId].sets[setIdx].completed = !newEx[exId].sets[setIdx].completed;
          updateSession({ ...activeSession, exercises: newEx });
      };

      const addSet = (exId: string) => {
           const newEx = { ...activeSession.exercises };
           const lastSet = newEx[exId].sets[newEx[exId].sets.length - 1] || { w: 0, r: 0 };
           newEx[exId].sets.push({ w: lastSet.w, r: lastSet.r, type: 'A', rpe: 8, completed: false });
           updateSession({ ...activeSession, exercises: newEx });
      };

      const removeSet = (exId: string, idx: number) => {
           const newEx = { ...activeSession.exercises };
           newEx[exId].sets.splice(idx, 1);
           updateSession({ ...activeSession, exercises: newEx });
      };

      const moveEx = (id: string, direction: -1 | 1) => {
          const newEx = { ...activeSession.exercises };
          const currentOrder = newEx[id].order;
          const swapTargetOrder = currentOrder + direction;
          const swapId = Object.keys(newEx).find(k => newEx[k].order === swapTargetOrder);

          if (swapId) {
              newEx[id].order = swapTargetOrder;
              newEx[swapId].order = currentOrder;
              updateSession({ ...activeSession, exercises: newEx });
          }
      };

      const finish = () => {
          if(confirm("Training beenden und speichern?")) {
              const log: WorkoutLog = {
                  d: activeSession.start || Date.now(),
                  t: timerStr,
                  note: "",
                  s: activeSession.exercises
              };
              saveData({ ...data, h: [log, ...data.h] });
              updateSession({ start: null, exercises: {} });
              nav('home');
              showToast("Training gespeichert! 💪");
          }
      };
      
      const cancel = () => {
          if(confirm("Training abbrechen? Fortschritt geht verloren.")) {
              updateSession({ start: null, exercises: {} });
              nav('home');
          }
      };

      // Sort by order
      const sortedIds = Object.keys(activeSession.exercises).sort((a,b) => activeSession.exercises[a].order - activeSession.exercises[b].order);

      return (
          <div className="pt-20 pb-32 px-4 space-y-6">
              <div className="fixed top-16 left-0 w-full bg-zinc-900/90 backdrop-blur border-b border-white/5 p-2 z-40 flex justify-between items-center px-6">
                  <div className="text-2xl font-black font-mono text-[#00d1b2]">{timerStr}</div>
                  <button onClick={finish} className="bg-green-600 px-4 py-2 rounded-lg font-bold text-xs">BEENDEN</button>
              </div>

              {sortedIds.map((id, index) => {
                  const ex = data.db[id];
                  if(!ex) return null;
                  const sets = activeSession.exercises[id].sets;
                  const prog = calculateProgression(ex, data.h);
                  
                  return (
                      <div key={id} className="glass-panel p-4 rounded-2xl relative">
                           <div className="flex justify-between items-start mb-4">
                               <div className="flex-1">
                                   <div className="flex items-center gap-2">
                                       <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-0.5 rounded font-black">#{activeSession.exercises[id].order}</span>
                                       <h3 className="text-lg font-black text-white">{ex.n}</h3>
                                   </div>
                                   <div className="text-xs text-zinc-500 font-bold mt-1">
                                       Ziel: <span className="text-[#00d1b2]">{prog.w}kg x {prog.r}</span> {prog.isIncrease && "🔥"}
                                   </div>
                               </div>
                               <div className="flex items-center gap-1">
                                   <div className="flex flex-col gap-1 mr-2">
                                       <button onClick={() => moveEx(id, -1)} disabled={index === 0} className="p-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30"><ArrowUp size={14}/></button>
                                       <button onClick={() => moveEx(id, 1)} disabled={index === sortedIds.length - 1} className="p-1 bg-white/5 rounded hover:bg-white/10 disabled:opacity-30"><ArrowDown size={14}/></button>
                                   </div>
                                   <button onClick={() => {
                                       const newEx = {...activeSession.exercises};
                                       delete newEx[id];
                                       updateSession({...activeSession, exercises: newEx});
                                   }} className="text-zinc-600 p-2"><Trash2 size={16}/></button>
                               </div>
                           </div>

                           <div className="space-y-3">
                               <div className="grid grid-cols-[40px_30px_1fr_1fr_1fr_30px] gap-2 text-[10px] text-zinc-500 font-bold text-center uppercase mb-1">
                                   <span>Done</span><span>Typ</span><span>KG</span><span>Reps</span><span>RPE</span><span></span>
                               </div>
                               {sets.map((s, idx) => (
                                   <div key={idx} className={`grid grid-cols-[40px_30px_1fr_1fr_1fr_30px] gap-2 items-center ${s.type === 'W' ? 'opacity-80' : ''} ${s.completed ? 'opacity-50 grayscale' : ''}`}>
                                       <button onClick={() => toggleSetComplete(id, idx)} className={`h-10 rounded flex items-center justify-center transition-all ${s.completed ? 'bg-green-500/20 text-green-500' : 'bg-zinc-800 text-zinc-600'}`}>
                                           {s.completed ? <CheckCircle2 size={20} fill="currentColor" className="text-green-500"/> : <Circle size={20} />}
                                       </button>
                                       <button onClick={() => toggleSetType(id, idx)} className={`h-8 rounded flex items-center justify-center font-bold text-xs ${s.type === 'W' ? 'bg-yellow-500/20 text-yellow-500' : 'bg-blue-600/20 text-blue-400'}`}>
                                           {s.type}
                                       </button>
                                       <input type="number" value={s.w} onChange={e => updateSet(id, idx, 'w', parseFloat(e.target.value))} className="h-10 bg-zinc-800 rounded text-center font-bold text-white"/>
                                       <input type="number" value={s.r} onChange={e => updateSet(id, idx, 'r', parseFloat(e.target.value))} className="h-10 bg-zinc-800 rounded text-center font-bold text-white"/>
                                       <input type="number" value={s.rpe} onChange={e => updateSet(id, idx, 'rpe', parseFloat(e.target.value))} className="h-10 bg-zinc-800 rounded text-center font-bold text-zinc-400"/>
                                       <button onClick={() => removeSet(id, idx)} className="text-red-500 flex justify-center"><Trash2 size={14}/></button>
                                   </div>
                               ))}
                           </div>
                           
                           <button onClick={() => addSet(id)} className="w-full py-3 bg-white/5 rounded-xl font-bold text-xs mt-4 flex items-center justify-center gap-2 hover:bg-white/10">
                               <Plus size={14}/> SATZ HINZUFÜGEN
                           </button>
                      </div>
                  );
              })}
              
              <div className="h-10"></div>
              <button onClick={cancel} className="w-full py-4 bg-red-900/20 text-red-500 font-bold rounded-xl">ABBRECHEN</button>
          </div>
      );
  };

  const TennisView = () => {
      const [duration, setDuration] = useState("01:00:00");
      const [note, setNote] = useState("");
      const [type, setType] = useState<string>("tennis_1"); // tennis_1 (Einzel) or tennis_2 (Doppel)

      const saveTennis = () => {
          const log: WorkoutLog = {
              d: Date.now(),
              t: duration,
              note: note,
              s: {
                  [type]: { sets: [{ w: 0, r: 0, type: 'A' }], order: 1 }
              }
          };
          saveData({ ...data, h: [log, ...data.h] });
          nav('home');
          showToast("Match gespeichert! 🎾");
      };

      return (
          <div className="pt-20 pb-28 px-4 space-y-6">
              <div className="glass-panel p-6 rounded-3xl text-center">
                  <Trophy size={48} className="text-yellow-400 mx-auto mb-4"/>
                  <h2 className="text-2xl font-black text-white mb-2">TENNIS MATCH</h2>
                  <p className="text-zinc-500 text-xs">Trage dein Match ein um die Aktivität zu tracken.</p>
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-4">
                   <div>
                       <label className="text-[10px] text-zinc-500 font-bold">DAUER</label>
                       <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl font-bold text-white border border-white/10"/>
                   </div>
                   
                   <div>
                       <label className="text-[10px] text-zinc-500 font-bold">TYP</label>
                       <div className="grid grid-cols-2 gap-2 mt-1">
                           <button onClick={() => setType('tennis_1')} className={`py-3 rounded-xl font-bold text-xs border ${type === 'tennis_1' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-900 border-white/10'}`}>EINZEL</button>
                           <button onClick={() => setType('tennis_2')} className={`py-3 rounded-xl font-bold text-xs border ${type === 'tennis_2' ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-zinc-900 border-white/10'}`}>DOPPEL</button>
                       </div>
                   </div>

                   <div>
                       <label className="text-[10px] text-zinc-500 font-bold">NOTIZ / ERGEBNIS</label>
                       <textarea value={note} onChange={e => setNote(e.target.value)} className="w-full bg-zinc-900 p-3 rounded-xl font-bold text-white border border-white/10 h-24" placeholder="6:4 6:2 gewonnen..."/>
                   </div>

                   <button onClick={saveTennis} className="w-full py-4 bg-yellow-500 rounded-xl font-black text-black shadow-lg shadow-yellow-900/20">
                       SPEICHERN
                   </button>
              </div>
          </div>
      );
  };

  const SettingsView = () => {
      const [localGh, setLocalGh] = useState(ghConfig);

      const saveGh = () => {
          setGhConfig(localGh);
          localStorage.setItem('tm_gh_config', JSON.stringify(localGh));
          showToast("Konfiguration gespeichert!");
      };

      return (
          <div className="pt-20 pb-28 px-4 space-y-6">
              <div className="glass-panel p-6 rounded-3xl">
                  <h2 className="text-xl font-black text-white mb-4">DATENVERWALTUNG</h2>
                  <p className="text-xs text-zinc-500 mb-4">Exportiere oder Importiere deine Daten als JSON Backup oder verbinde dich mit GitHub.</p>
                  
                  <div className="grid grid-cols-2 gap-3 mb-6">
                      <button onClick={handleSnapshot} className="py-3 bg-zinc-800 rounded-xl font-bold text-xs border border-white/10">BACKUP DOWNLOAD</button>
                      <label className="py-3 bg-zinc-800 rounded-xl font-bold text-xs border border-white/10 text-center cursor-pointer">
                          IMPORT JSON
                          <input type="file" onChange={handleFileImport} className="hidden" accept=".json,.html,.txt"/>
                      </label>
                  </div>
              </div>

              <div className="glass-panel p-6 rounded-3xl space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                      <Settings className="text-zinc-400" size={24}/>
                      <h2 className="text-xl font-black text-white">GITHUB SYNC</h2>
                  </div>
                  
                  <div>
                      <label className="text-[10px] text-zinc-500 font-bold">TOKEN</label>
                      <input type="password" value={localGh.token} onChange={e => setLocalGh({...localGh, token: e.target.value})} className="w-full bg-zinc-900 p-2 rounded text-xs text-white border border-white/10"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <div>
                          <label className="text-[10px] text-zinc-500 font-bold">OWNER</label>
                          <input type="text" value={localGh.owner} onChange={e => setLocalGh({...localGh, owner: e.target.value})} className="w-full bg-zinc-900 p-2 rounded text-xs text-white border border-white/10"/>
                      </div>
                      <div>
                          <label className="text-[10px] text-zinc-500 font-bold">REPO</label>
                          <input type="text" value={localGh.repo} onChange={e => setLocalGh({...localGh, repo: e.target.value})} className="w-full bg-zinc-900 p-2 rounded text-xs text-white border border-white/10"/>
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] text-zinc-500 font-bold">PATH</label>
                      <input type="text" value={localGh.path} onChange={e => setLocalGh({...localGh, path: e.target.value})} className="w-full bg-zinc-900 p-2 rounded text-xs text-white border border-white/10"/>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={saveGh} className="py-3 bg-zinc-800 rounded-xl font-bold text-xs">CONFIG SPEICHERN</button>
                      <button onClick={handleGitHubSync} className="py-3 bg-blue-600 rounded-xl font-bold text-xs text-white">SYNC NOW</button>
                  </div>
              </div>
              
              <div className="text-center text-[10px] text-zinc-600 font-mono mt-10">
                  TRAINING MASTER V14.2<br/>
                  (c) 2026
              </div>
          </div>
      );
  };

  // --- RENDER ---
  const activeViewTitle = {
      'home': 'DASHBOARD',
      'training': 'TRAINING',
      'selection': 'ÜBUNGSAUSWAHL',
      'stats': 'ANALYSE',
      'profile': 'PROFIL',
      'tennis': 'TENNIS MATCH',
      'ai': 'AI BRIDGE',
      'settings': 'SYSTEM',
      'plan': 'PLANUNG',
      'body': 'KÖRPERDATEN',
      'history': 'HISTORIE',
      'edit_workout': 'TRAINING BEARBEITEN'
  }[view] || 'APP';

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-blue-500/30">
      <Header 
        title={activeViewTitle} 
        showBack={view !== 'home'} 
        onBack={() => {
            if(analyticsEx) setAnalyticsEx(null);
            else if(view === 'edit_workout') nav('history');
            else nav('home');
        }} 
        onSnapshot={handleSnapshot}
      />
      
      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-[#00d1b2] text-black font-black px-6 py-3 rounded-full z-[100] shadow-[0_0_20px_rgba(0,209,178,0.6)] animate-bounce text-sm">
            {toast}
        </div>
      )}

      <main className="pb-safe">
        {view === 'home' && <HomeView />}
        {view === 'selection' && <SelectionView />}
        {view === 'training' && <TrainingView />}
        {view === 'stats' && <AnalyticsView />}
        {view === 'ai' && <AIBridgeView />}
        {view === 'tennis' && <TennisView />}
        {view === 'settings' && <SettingsView />}
        {view === 'profile' && <ProfileView />}
        {view === 'body' && <BodyView />}
        {view === 'plan' && <PlanView />}
        {view === 'history' && <HistoryView />}
        {view === 'edit_workout' && <EditWorkoutView />}
      </main>

      {/* Only show TabBar if not in specific modal-like views */}
      {['home', 'plan', 'selection', 'stats', 'profile'].includes(view) && (
        <TabBar currentView={view} nav={nav} />
      )}
    </div>
  );
};

export default App;