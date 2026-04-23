import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Zap, Trash2, Scale, History, BarChart3, Settings, X, Check, 
  Calendar, Pill, Activity, User, Cpu, Trophy, Edit3, Save, Copy, Upload, FileJson, Play, Square, CheckSquare, Search, CloudUpload
} from 'lucide-react';
import { AppData, ExerciseDef, GitHubConfig, ActiveSession, MuscleGroup, WorkoutLog } from './types';
import { FALLBACK_DATA, CAT_ORDER } from './constants';
import { calculateProgression, calculateWarmup, generateSnapshotHTML } from './utils/logic';
import { fetchFromGitHub, saveToGitHub } from './services/github';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid, LabelList, ComposedChart, Bar } from 'recharts';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { GoogleGenAI } from '@google/genai';
import Markdown from 'react-markdown';

const APP_VERSION = "V27.24 (STABLE)";

const THEME = {
  bg: "bg-background",
  card: "bg-surface-container",
  cardBorder: "border border-white/5",
  radius: "rounded-3xl",
  btnPrimary: "bg-primary-container text-on-primary",
};

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// --- COMPONENTS ---

const Header = ({ title, showBack, onBack, onSnapshot, view, userName, userPhoto }: { title: string, showBack: boolean, onBack: () => void, onSnapshot: () => void, view?: string, userName?: string, userPhoto?: string }) => {
  if (view === 'home') {
    return (
      <header className="fixed top-0 w-full z-50 glass-header border-b border-white/5 px-6 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img alt="Profile" className="w-10 h-10 rounded-full object-cover border-2 border-primary-container" src={userPhoto || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&h=100&fit=crop"}/>
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Welcome back</p>
              <h1 className="font-headline font-bold text-lg tracking-tight">{userName || 'Markus Kauderer'}</h1>
            </div>
          </div>
          <button onClick={onSnapshot} className="relative p-2 text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary-container rounded-full"></span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="fixed top-0 w-full z-50 glass-header border-b border-white/5 px-6 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {showBack ? (
          <button onClick={onBack} className="p-2 -ml-2 text-on-surface-variant hover:text-white transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
        ) : <div className="w-10" />}
        <h1 className="font-headline font-bold text-lg tracking-tight">{title}</h1>
        <button onClick={onSnapshot} className="p-2 -mr-2 text-primary-container hover:text-white transition-colors">
          <span className="material-symbols-outlined">save</span>
        </button>
      </div>
    </header>
  );
};

const TabBar = ({ currentView, nav }: { currentView: string, nav: (id: string) => void }) => {
  const tabs = [
    { id: 'home', icon: 'home', label: 'Home' },
    { id: 'selection', icon: 'fitness_center', label: 'Workout' },
    { id: 'stats', icon: 'analytics', label: 'Stats' },
    { id: 'profile', icon: 'person', label: 'Profile' },
  ];
  return (
    <nav className="fixed bottom-0 w-full z-50 glass-header border-t border-white/5 pb-safe">
      <div className="max-w-md mx-auto px-6 py-3 flex justify-between items-center">
        {tabs.map(t => {
          const isActive = currentView === t.id;
          return (
            <button key={t.id} onClick={() => nav(t.id)} className={`flex flex-col items-center gap-1 p-2 group transition-colors ${isActive ? 'text-primary-container' : 'text-on-surface-variant hover:text-white'}`}>
              <div className="relative">
                <span className={`material-symbols-outlined text-2xl group-hover:scale-110 transition-transform ${isActive ? 'fill-1' : ''}`}>{t.icon}</span>
                {isActive && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-container rounded-full"></div>}
              </div>
              <span className={`font-label text-[9px] uppercase tracking-widest ${isActive ? 'font-bold' : ''}`}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

// Isolated Timer Component to prevent re-renders of the entire view
const TimerDisplay = ({ startTime }: { startTime: number | null }) => {
    const [timerStr, setTimerStr] = useState("00:00:00");
    useEffect(() => {
        if (!startTime) return;
        const tick = () => {
            const diff = Date.now() - startTime;
            setTimerStr(new Date(diff).toISOString().substr(11, 8));
        };
        tick();
        const int = setInterval(tick, 1000);
        return () => clearInterval(int);
    }, [startTime]);

    return (
        <div className="fixed top-24 right-4 bg-primary-container text-on-primary font-headline font-bold px-4 py-2 rounded-full z-[40] shadow-lg pointer-events-none">
            {timerStr}
        </div>
    );
};

// --- EXTERNALIZED VIEWS ---

const BodyView = ({ data, saveData, showToast }: { data: AppData, saveData: (d: AppData) => void, showToast: (m: string) => void }) => {
    const [w, setW] = useState("");
    const [s, setS] = useState("");
    const [dateInput, setDateInput] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    });
    
    const add = () => { 
        if(!w && !s) return; 
        const existing = data.bodyLogs.find(l => l.d === dateInput);
        let newLogs;
        if (existing) {
             newLogs = data.bodyLogs.map(l => l.d === dateInput ? { ...l, w: w || l.w, s: s || l.s } : l);
        } else {
             newLogs = [{d: dateInput, w, s}, ...data.bodyLogs];
        }
        saveData({...data, bodyLogs: newLogs}); 
        setW(""); setS(""); 
        showToast("Daten gesichert! ✅"); 
    };

    const remove = (dateToDelete: string) => {
        if(confirm("Eintrag wirklich löschen?")) {
            const newLogs = data.bodyLogs.filter(l => l.d !== dateToDelete);
            saveData({...data, bodyLogs: newLogs});
            showToast("Gelöscht! 🗑️");
        }
    };

    const chartData = useMemo(() => {
        return [...data.bodyLogs]
            .sort((a,b) => a.d.localeCompare(b.d))
            .map(l => ({
                date: l.d.substring(5), // MM-DD
                weight: l.w ? parseFloat(l.w) : null,
                steps: l.s ? parseFloat(l.s) : null
            }))
            .filter(d => d.weight !== null || d.steps !== null);
    }, [data.bodyLogs]);

    const last7 = useMemo(() => {
        return [...data.bodyLogs].sort((a,b) => b.d.localeCompare(a.d)).slice(0, 7);
    }, [data.bodyLogs]);

    const updateEntry = (date: string, field: 'w'|'s', val: string) => {
        const newLogs = data.bodyLogs.map(l => l.d === date ? { ...l, [field]: val } : l);
        saveData({ ...data, bodyLogs: newLogs });
    };

    return (
      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32 pt-28 max-w-md mx-auto" id="main-content">
          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="bg-surface-container p-6 rounded-3xl border border-white/5 shadow-2xl mb-6">
                  <h2 className="text-xl font-headline font-black text-on-surface mb-6 uppercase tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-primary-container text-[24px]">monitor_weight</span> Gewicht & Steps</h2>
                  
                  <div className="mb-4">
                      <label className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest block mb-2">Datum</label>
                      <input type="date" value={dateInput} onChange={e=>setDateInput(e.target.value)} className="w-full bg-surface-container-highest p-3 rounded-xl text-on-surface font-bold border border-white/5 outline-none focus:border-primary-container transition-colors"/>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="text-[10px] text-[#3b82f6] font-label font-black uppercase tracking-widest block mb-2">Gewicht (KG)</label>
                          <input type="number" placeholder="00.0" value={w} onChange={e=>setW(e.target.value)} className="w-full bg-surface-container-highest p-4 rounded-2xl text-2xl font-headline font-black text-[#3b82f6] outline-none border border-white/5 focus:border-[#3b82f6] shadow-inner transition-colors"/>
                      </div>
                      <div>
                          <label className="text-[10px] text-[#10b981] font-label font-black uppercase tracking-widest block mb-2">Steps</label>
                          <input type="number" placeholder="10k" value={s} onChange={e=>setS(e.target.value)} className="w-full bg-surface-container-highest p-4 rounded-2xl text-2xl font-headline font-black text-[#10b981] outline-none border border-white/5 focus:border-[#10b981] shadow-inner transition-colors"/>
                      </div>
                  </div>
                  <button onClick={add} className="w-full mt-6 py-4 bg-primary-container text-on-primary rounded-2xl font-label font-bold shadow-[0_0_20px_rgba(234,179,8,0.2)] text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"><span className="material-symbols-outlined text-[18px]">save</span> Speichern</button>
              </div>

              {chartData.length > 1 && (
                  <div className="h-72 w-full bg-surface-container rounded-3xl p-4 border border-white/5 shadow-2xl overflow-hidden mb-6">
                      <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                              <XAxis dataKey="date" tick={{fontSize:10, fill:'#94a3b8', fontFamily: 'Inter'}} axisLine={false} tickLine={false} />
                              <YAxis yAxisId="left" domain={['dataMin - 1', 'dataMax + 1']} tick={{fontSize:10, fill:'#3b82f6', fontFamily: 'Inter'}} axisLine={false} tickLine={false} width={40} />
                              <YAxis yAxisId="right" orientation="right" tick={{fontSize:10, fill:'#10b981', fontFamily: 'Inter'}} axisLine={false} tickLine={false} width={40} />
                              <Tooltip contentStyle={{backgroundColor:'#18181b', borderRadius:'16px', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontFamily: 'Inter'}} itemStyle={{fontSize:'12px', fontWeight:'bold'}}/>
                              <Bar yAxisId="right" dataKey="steps" fill="#10b981" barSize={8} radius={[4, 4, 0, 0]} fillOpacity={0.6} />
                              <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={2} dot={{r:3, fill:'#3b82f6', strokeWidth:2, stroke:'#18181b'}} connectNulls={true} animationDuration={1000} />
                          </ComposedChart>
                      </ResponsiveContainer>
                  </div>
              )}

              <div className="space-y-3">
                   <h3 className="text-on-surface-variant font-label font-bold text-[10px] uppercase tracking-widest pl-2 mb-4">Letzte 7 Tage</h3>
                   {last7.map(l => (
                       <div key={l.d} className="bg-surface-container border border-white/5 p-4 rounded-2xl flex items-center justify-between shadow-lg">
                           <div className="text-xs font-label font-bold text-on-surface-variant w-16">{new Date(l.d).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</div>
                           <div className="flex gap-2 flex-1 justify-end items-center">
                               <div className="relative">
                                   <input type="number" value={l.w || ''} onChange={(e) => updateEntry(l.d, 'w', e.target.value)} className="w-16 bg-surface-container-highest border border-[#3b82f6]/30 rounded-xl py-2 text-center text-sm font-headline font-black text-[#3b82f6] outline-none focus:border-[#3b82f6] transition-colors" placeholder="kg" />
                               </div>
                               <div className="relative">
                                   <input type="number" value={l.s || ''} onChange={(e) => updateEntry(l.d, 's', e.target.value)} className="w-16 bg-surface-container-highest border border-[#10b981]/30 rounded-xl py-2 text-center text-sm font-headline font-black text-[#10b981] outline-none focus:border-[#10b981] transition-colors" placeholder="steps" />
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

const TrainingView = ({ 
    data, saveData, activeSession, updateSession, nav, showToast 
  }: {
    data: AppData, saveData: (d: AppData)=>void, activeSession: ActiveSession, 
    updateSession: (s: ActiveSession)=>void, nav: (s:string)=>void, showToast: (s:string)=>void
  }) => {
      const [note, setNote] = useState("");
      const [confirmMode, setConfirmMode] = useState<'save' | 'abort' | null>(null);

      const performFinish = () => { 
          try {
            const finalDur = new Date(Date.now() - (activeSession.start||Date.now())).toISOString().substr(11,8);
            
            // Cleanup and sanitize data before saving to history
            const cleanExercises = JSON.parse(JSON.stringify(activeSession.exercises));
            Object.keys(cleanExercises).forEach(id => {
                cleanExercises[id].sets = cleanExercises[id].sets
                    .map((s: any) => {
                        delete s.completed;
                        
                        // Sanitize weight
                        const w = Number(s.w);
                        s.w = isNaN(w) ? 0 : w;
                        
                        // Sanitize reps
                        const r = Number(s.r);
                        s.r = isNaN(r) ? 0 : r;
                        
                        // Sanitize RPE
                        if (s.rpe === undefined || s.rpe === null || s.rpe === "") {
                            delete s.rpe;
                        } else {
                            const rpe = Number(s.rpe);
                            if (isNaN(rpe)) {
                                delete s.rpe;
                            } else {
                                s.rpe = rpe;
                            }
                        }
                        
                        return s;
                    })
                    // Filter out sets that are completely empty (0 weight and 0 reps)
                    .filter((s: any) => s.w > 0 || s.r > 0);
                
                // Remove the exercise completely if no valid sets remain
                if (cleanExercises[id].sets.length === 0) {
                    delete cleanExercises[id];
                }
            });

            // If no exercises are left after cleanup, we might not want to save an empty workout
            if (Object.keys(cleanExercises).length === 0) {
                updateSession({ start: null, exercises: {} }); 
                setConfirmMode(null);
                nav('home'); 
                showToast("Leeres Workout verworfen."); 
                return;
            }

            const newHistory = [{ d: activeSession.start || Date.now(), t: finalDur, note: note, s: cleanExercises }, ...data.h];
            saveData({ ...data, h: newHistory }); 
            
            updateSession({ start: null, exercises: {} }); 
            setConfirmMode(null);

            setTimeout(() => {
                nav('history'); 
                showToast("Sehr gut! 💪"); 
            }, 50);
          } catch(err) {
              alert("Fehler: " + err);
          }
      };

      const performAbort = () => {
          updateSession({start:null,exercises:{}});
          setConfirmMode(null);
          nav('home');
      };

      const sortedIds = Object.keys(activeSession.exercises).sort((a,b) => activeSession.exercises[a].order - activeSession.exercises[b].order);
      
      return (
          <div className="w-full relative">
            <TimerDisplay startTime={activeSession.start} />
            
            {/* Custom Confirmation Modal */}
            {confirmMode && (
                <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setConfirmMode(null)}>
                    <div className="bg-surface-container border border-white/10 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-headline font-black text-on-surface mb-2 uppercase italic tracking-tighter">
                            {confirmMode === 'save' ? 'Training beenden?' : 'Training abbrechen?'}
                        </h3>
                        <p className="text-on-surface-variant text-sm font-body mb-6">
                            {confirmMode === 'save' ? 'Die Einheit wird im Logbuch gespeichert.' : 'Alle Fortschritte dieser Einheit gehen verloren.'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmMode(null)} className="flex-1 py-4 bg-surface-container-high rounded-xl font-label font-bold text-xs uppercase text-on-surface-variant">Zurück</button>
                            <button 
                                onClick={confirmMode === 'save' ? performFinish : performAbort} 
                                className={`flex-1 py-4 rounded-xl font-label font-bold text-xs uppercase text-black ${confirmMode === 'save' ? 'bg-primary-container' : 'bg-red-500'}`}
                            >
                                {confirmMode === 'save' ? 'Speichern' : 'Löschen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="pt-28 pb-48 px-6 space-y-6 max-w-md mx-auto">
                <div className="mb-6">
                    <h2 className="text-4xl font-headline font-black text-on-surface tracking-tighter leading-tight uppercase">Heutiges <br/><span className="text-primary-container">Training</span></h2>
                    <p className="text-on-surface-variant font-label font-bold text-sm uppercase tracking-widest mt-2">Aktives Workout</p>
                </div>

                {sortedIds.map(id => {
                    const ex = data.db[id]; if(!ex) return null;
                    const sets = activeSession.exercises[id].sets;
                    const prog = calculateProgression(ex, data.h);
                    
                    // Count working sets
                    const workingSetsCount = sets.filter((s:any) => s.type === 'A').length;
                    
                    return (
                        <div key={id} className="bg-surface-container rounded-3xl p-6 border border-white/5 shadow-2xl">
                            <div className="mb-4">
                                <h3 className="font-headline font-black text-on-surface text-xl uppercase tracking-tighter flex items-center gap-2 flex-wrap">
                                    {ex.n}
                                    <label className="flex items-center gap-1 bg-primary-container/10 px-2 py-1 rounded-lg border border-transparent focus-within:border-primary-container/50 transition-colors">
                                        <span className="text-xs font-label font-bold text-primary-container uppercase tracking-widest leading-none">H:</span>
                                        <input 
                                            type="text" 
                                            value={ex.h !== undefined ? ex.h : ''} 
                                            onChange={e => {
                                                const nd = JSON.parse(JSON.stringify(data));
                                                nd.db[id].h = e.target.value;
                                                saveData(nd);
                                            }} 
                                            className="w-12 bg-transparent text-primary-container font-headline font-black text-sm outline-none border-none p-0 focus:ring-0" 
                                            placeholder="-" 
                                        />
                                    </label>
                                </h3>
                                <div className="text-on-surface-variant font-label font-bold text-xs uppercase tracking-widest mt-1 flex gap-2">
                                    <span>{workingSetsCount} {workingSetsCount === 1 ? 'SATZ' : 'SÄTZE'}</span>
                                    {ex.t !== 'cardio' && <span>• ZIEL: {prog.w}kg x {prog.r}</span>}
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                {sets.map((s: any, idx) => {
                                    const isCardio = ex.t === 'cardio';
                                    return (
                                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-2xl border transition-all ${s.completed ? 'bg-primary-container/10 border-primary-container/30' : 'bg-background border-white/5'}`}>
                                        <button onClick={() => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets[idx].type = s.type === 'W' ? 'A' : 'W';
                                            updateSession(ns);
                                        }} className={`w-10 h-10 rounded-xl font-headline font-black text-xs flex items-center justify-center flex-shrink-0 ${s.type==='W'?'bg-surface-container-high text-on-surface-variant':'bg-primary-container text-on-primary'}`}>{s.type}</button>
                                        
                                        <div className="flex-1 flex items-center justify-center gap-1">
                                            <input type="number" step={(ex.h && ex.h !== 0 && ex.h !== "0") ? "4.5" : "0.5"} value={s.w} onChange={e => {
                                                const ns = JSON.parse(JSON.stringify(activeSession));
                                                ns.exercises[id].sets[idx].w = parseFloat(e.target.value);
                                                updateSession(ns);
                                            }} className="w-20 bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0" />
                                            <span className="text-[10px] font-label font-bold text-on-surface-variant uppercase">{isCardio ? 'MIN' : 'KG'}</span>
                                        </div>
                                        
                                        {isCardio ? null : (
                                            <>
                                                <div className="flex-1 flex items-center justify-center gap-1">
                                                    <input type="number" value={s.r} onChange={e => {
                                                        const ns = JSON.parse(JSON.stringify(activeSession));
                                                        ns.exercises[id].sets[idx].r = parseInt(e.target.value);
                                                        updateSession(ns);
                                                    }} className="w-12 bg-transparent text-center font-headline font-black text-2xl text-on-surface outline-none border-none p-0 focus:ring-0" />
                                                    <span className="text-[10px] font-label font-bold text-on-surface-variant uppercase">x</span>
                                                </div>

                                                <div className="flex-1 flex items-center justify-center gap-1">
                                                    <input type="number" step="0.5" value={s.rpe !== undefined ? s.rpe : ''} onChange={e => {
                                                        const ns = JSON.parse(JSON.stringify(activeSession));
                                                        ns.exercises[id].sets[idx].rpe = parseFloat(e.target.value);
                                                        updateSession(ns);
                                                    }} className="w-12 bg-transparent text-center font-headline font-black text-2xl text-primary-container outline-none border-none p-0 focus:ring-0" placeholder="-" />
                                                    <span className="text-[10px] font-label font-bold text-on-surface-variant uppercase">RIR</span>
                                                </div>
                                            </>
                                        )}
                                        
                                        <button onClick={() => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets[idx].completed = !s.completed;
                                            updateSession(ns);
                                        }} className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors flex-shrink-0 ${s.completed ? 'bg-primary-container text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
                                            <span className="material-symbols-outlined text-[24px]">check</span>
                                        </button>
                                        
                                        <button onClick={() => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets.splice(idx,1);
                                            updateSession(ns);
                                        }} className="text-on-surface-variant hover:text-red-500 p-2 flex-shrink-0"><span className="material-symbols-outlined text-[16px]">close</span></button>
                                    </div>
                                )})}
                                <button onClick={() => {
                                    const ns = JSON.parse(JSON.stringify(activeSession));
                                    const lastSet = ns.exercises[id].sets.length > 0 ? ns.exercises[id].sets[ns.exercises[id].sets.length - 1] : null;
                                    const newWeight = lastSet ? lastSet.w : prog.w;
                                    ns.exercises[id].sets.push({w:newWeight,r:10,type:'A',rpe:8, completed: false}); 
                                    updateSession(ns);
                                }} className="w-full py-3 bg-surface-container-high rounded-2xl text-xs font-label font-bold text-on-surface-variant uppercase tracking-widest hover:bg-surface-container transition-colors">+ Satz hinzufügen</button>
                            </div>
                        </div>
                    );
                })}
                
                <div className="space-y-4 pt-6">
                    <button type="button" onClick={() => setConfirmMode('save')} className="w-full py-5 bg-primary-container text-on-primary rounded-[2rem] font-headline font-black text-xl glow-primary uppercase tracking-tighter flex items-center justify-center gap-2 active:scale-95 transition-transform">
                        <span className="material-symbols-outlined text-[28px]">check_circle</span> Training Abschließen
                    </button>

                    <div className="bg-surface-container p-4 rounded-2xl border border-white/5">
                        <textarea placeholder="Notizen zur Einheit..." value={note} onChange={e=>setNote(e.target.value)} className="w-full bg-background text-on-surface font-body text-sm p-4 rounded-xl border border-white/10 h-24 outline-none focus:border-primary-container" />
                    </div>
                    
                    <button type="button" onClick={() => setConfirmMode('abort')} className="w-full py-4 text-on-surface-variant font-label font-bold text-xs uppercase tracking-widest hover:text-red-500 transition-colors text-center">
                        Training vorzeitig beenden
                    </button>
                </div>
            </div>
          </div>
      );
  };

// --- MAIN APP ---

const mergeWithFallback = (parsed: any): AppData => {
    const localTimestamps = new Set(parsed.h?.map((l: any) => l.d) || []);
    const missingFromHardcoded = FALLBACK_DATA.h.filter(l => !localTimestamps.has(l.d));
    if (missingFromHardcoded.length > 0) {
        parsed.h = [...missingFromHardcoded, ...(parsed.h || [])].sort((a: any, b: any) => b.d - a.d);
    }
    
    if (parsed.bodyLogs) {
        const localBodyTimestamps = new Set(parsed.bodyLogs.map((l: any) => l.d));
        const missingBodyFromHardcoded = FALLBACK_DATA.bodyLogs.filter(l => !localBodyTimestamps.has(l.d));
        if (missingBodyFromHardcoded.length > 0) {
            parsed.bodyLogs = [...missingBodyFromHardcoded, ...parsed.bodyLogs].sort((a: any, b: any) => b.d - a.d);
        }
    } else {
        parsed.bodyLogs = FALLBACK_DATA.bodyLogs;
    }

    if (!parsed.userSupps) parsed.userSupps = FALLBACK_DATA.userSupps;
    if (!parsed.weekPlan) parsed.weekPlan = FALLBACK_DATA.weekPlan;
    if (!parsed.timeLimits) parsed.timeLimits = FALLBACK_DATA.timeLimits;
    if (!parsed.userProfile) parsed.userProfile = FALLBACK_DATA.userProfile;
    if (!parsed.db) parsed.db = FALLBACK_DATA.db;
    if (!parsed.userCalStatus) parsed.userCalStatus = FALLBACK_DATA.userCalStatus;
    if (!parsed.goals) parsed.goals = FALLBACK_DATA.goals;
    if (!parsed.calTargets) parsed.calTargets = FALLBACK_DATA.calTargets;
    if (!parsed.dob) parsed.dob = FALLBACK_DATA.dob;
    
    return parsed;
};

const MainApp = ({ user }: { user: FirebaseUser }) => {
  const [data, setData] = useState<AppData>(FALLBACK_DATA);
  const [view, setView] = useState<string>(() => localStorage.getItem('tm_view') || 'home');
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('tm_userName') || user.displayName || 'Markus Kauderer');
  const [userPhoto, setUserPhoto] = useState<string>(() => localStorage.getItem('tm_userPhoto') || user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100&h=100&fit=crop');
  const [showExportModal, setShowExportModal] = useState(false);
  // Initialized from localStorage to prevent loss on reload
  const [activeSession, setActiveSession] = useState<ActiveSession>(() => {
      try { 
        const saved = localStorage.getItem('tm_session');
        return saved ? JSON.parse(saved) : { start: null, exercises: {} }; 
      } catch { return { start: null, exercises: {} }; }
  });

  // Auto-load from Firebase on startup
  useEffect(() => {
      const unsub = onSnapshot(doc(db, `users/${user.uid}/data/appData`), (docSnap) => {
          if (docSnap.exists()) {
              const loaded = docSnap.data() as AppData;
              let merged = mergeWithFallback(loaded);
              
              // CRITICAL: Prevent Firebase from overwriting local data that hasn't synced yet
              // Merge local history with Firebase history to ensure no workouts are lost
              const localDataStr = localStorage.getItem('tm_data');
              if (localDataStr) {
                  try {
                      const localData = JSON.parse(localDataStr);
                      if (localData.h && localData.h.length > 0) {
                          // Combine histories and remove duplicates based on timestamp (d)
                          const combinedHistory = [...(localData.h || []), ...(merged.h || [])];
                          const uniqueHistoryMap = new Map();
                          combinedHistory.forEach(item => {
                              // If duplicate exists, prefer the one with more data or just keep the first encountered (local)
                              if (!uniqueHistoryMap.has(item.d)) {
                                  uniqueHistoryMap.set(item.d, item);
                              }
                          });
                          merged.h = Array.from(uniqueHistoryMap.values()).sort((a: any, b: any) => b.d - a.d);
                          
                          // If local had more workouts, push the merged result back to Firebase
                          if (localData.h.length > (loaded.h?.length || 0)) {
                              console.log("Local data has more workouts. Syncing merged data to Firebase...");
                              setDoc(doc(db, `users/${user.uid}/data/appData`), merged).catch(e => console.error("Sync back error", e));
                          }
                      }
                  } catch (e) {
                      console.error("Error merging local data", e);
                  }
              }

              setData(merged);
              localStorage.setItem('tm_data', JSON.stringify(merged));
              console.log("Auto-loaded and merged data from Firebase");
          }
      }, (err) => {
          console.error("Firebase sync error:", err);
      });
      return () => unsub();
  }, [user.uid]);

  const [toast, setToast] = useState<string | null>(null);
  const [analyticsEx, setAnalyticsEx] = useState<string | null>(null);
  const [editTimestamp, setEditTimestamp] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const nav = (id: string) => { 
      if(id !== 'stats') setAnalyticsEx(null);
      if(id !== 'history-edit') setEditTimestamp(null);
      setView(id); 
      localStorage.setItem('tm_view', id);
      window.scrollTo(0,0); 
  };

  useEffect(() => {
    // Checkpoint log
    console.log("V27.25 STABLE CHECKPOINT LOADED");
    
    const localData = localStorage.getItem('tm_data');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        const merged = mergeWithFallback(parsed);
        localStorage.setItem('tm_data', JSON.stringify(merged));
        setData(merged);
      } catch(e) {
        console.error("Local Storage Error", e);
        setData(FALLBACK_DATA);
      }
    } else {
        localStorage.setItem('tm_data', JSON.stringify(FALLBACK_DATA));
    }
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const saveData = (newData: AppData) => { 
      setData(newData); 
      localStorage.setItem('tm_data', JSON.stringify(newData)); 
      
      // Auto-Sync to Firebase
      setDoc(doc(db, `users/${user.uid}/data/appData`), newData)
      .then(() => {
          console.log("Firebase sync successful");
      })
      .catch(err => {
          console.error("Firebase save error:", err);
          showToast("Cloud-Sync Fehler! ⚠️");
      });
  };
  const updateSession = (newSession: ActiveSession) => { setActiveSession(newSession); localStorage.setItem('tm_session', JSON.stringify(newSession)); };

  const executeDelete = () => {
      if (confirmDeleteId !== null) {
          const newHistory = data.h.filter(l => l.d !== confirmDeleteId);
          saveData({ ...data, h: newHistory });
          setConfirmDeleteId(null);
          showToast("Eintrag gelöscht 🗑️");
      }
  };

  const getWeeklyVolume = () => {
    const start = new Date(); start.setDate(start.getDate() - (start.getDay()||7) + 1); start.setHours(0,0,0,0);
    const vol: Record<string, number> = {};
    data.h.filter(w => w.d >= start.getTime()).forEach(w => {
      Object.keys(w.s).forEach(exId => {
        const ex = data.db[exId];
        if (ex && ex.c !== 'Tennis') vol[ex.c] = (vol[ex.c] || 0) + w.s[exId].sets.filter(s => s.type === 'A').length;
      });
    });
    return vol;
  };

  const calculateExercisePriority = (exId: string) => {
      const ex = data.db[exId];
      if (ex && ex.prio !== undefined) {
          return ex.prio;
      }

      const threeWeeksAgo = new Date();
      threeWeeksAgo.setDate(threeWeeksAgo.getDate() - 21);
      threeWeeksAgo.setHours(0,0,0,0);
      
      let totalSets = 0;
      data.h.filter(w => w.d >= threeWeeksAgo.getTime()).forEach(w => {
          if (w.s[exId]) {
              totalSets += w.s[exId].sets.filter(s => s.type === 'A').length;
          }
      });
      // Higher sets = lower priority number (so it appears first)
      // If 0 sets, priority is 999
      return totalSets > 0 ? 100 - totalSets : 999;
  };

  /* --- VIEWS --- */

  const getSmartInsight = (d: AppData) => {
      const logs = d.h;
      if (!logs || logs.length === 0) {
          return "Willkommen! Starte dein erstes Workout, um hier Auswertungen zu sehen.";
      }

      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      now.setHours(0, 0, 0, 0);
      
      const uniqueDates = Array.from(new Set(logs.map(l => {
          const td = new Date(l.d);
          td.setMinutes(td.getMinutes() - td.getTimezoneOffset());
          td.setHours(0, 0, 0, 0);
          return td.getTime();
      }))).sort((a,b) => b - a);

      const oneDay = 24 * 60 * 60 * 1000;
      let streak = 0;

      if (uniqueDates.length > 0) {
          const diff = Math.round((now.getTime() - uniqueDates[0]) / oneDay);
          if (diff === 0 || diff === 1) {
              streak = 1;
              let currentTs = uniqueDates[0];
              for (let i = 1; i < uniqueDates.length; i++) {
                  const checkDiff = Math.round((currentTs - uniqueDates[i]) / oneDay);
                  if (checkDiff === 1) {
                      streak++;
                      currentTs = uniqueDates[i];
                  } else {
                      break;
                  }
              }
          }
      }

      const lastWorkoutDaysAgo = uniqueDates.length > 0 ? Math.round((now.getTime() - uniqueDates[0]) / oneDay) : -1;

      if (streak >= 3) {
          return `Du bist auf einer ${streak}-Tage Streak! Unglaubliche Konstanz. Weiter so!`;
      }
      if (streak === 2) {
          return "Zwei Tage in Folge trainiert! Starker Rhythmus, bleib dran.";
      }
      
      if (lastWorkoutDaysAgo === 0) {
          return "Heute schon abgeliefert! Vergiss nicht, Muskeln wachsen in der Regenerationsphase.";
      } 
      if (lastWorkoutDaysAgo === 1) {
          return "Gestern starkes Training absolviert! Wenn du dich fit fühlst, zieh den Plan heute weiter durch.";
      }
      if (lastWorkoutDaysAgo > 3) {
          return `Dein letztes Workout ist ${lastWorkoutDaysAgo} Tage her. Höchste Zeit, wieder anzugreifen!`;
      }
      
      const lastLog = logs.sort((a,b) => b.d - a.d)[0];
      const setsCount = Object.values(lastLog.s).reduce((acc: number, curr: any) => acc + curr.sets.length, 0);
      if (setsCount > 10) {
          return `Dein letztes Workout war ein echtes Volumen-Beast mit ${setsCount} absolvierten Sätzen. Top Leistung!`;
      }

      const quotes = [
          "Consistency is the ultimate separator. Keep pushing.",
          "Der schwerste Schritt ist oft der zur Hantelbank. Den Rest macht die Routine.",
          "Mache jeden Tag zu deinem Meisterstück."
      ];
      return quotes[Math.floor(Date.now() / oneDay) % quotes.length];
  };

  const HomeView = () => {
    const vol = getWeeklyVolume();
    const today = new Date().toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
    const time = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const insightText = getSmartInsight(data);
    
    return (
      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 pt-28 max-w-md mx-auto" id="main-content">
        {/* HERO SECTION */}
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <h2 className="font-headline font-black text-4xl tracking-tighter leading-[1.1] mb-2">
                Ready to<br/>
                <span className="text-primary-container relative inline-block">
                    dominate?
                    <span className="absolute -bottom-1 left-0 w-full h-1 bg-primary-container/30 rounded-full"></span>
                </span>
            </h2>
            <p className="font-label text-xs text-on-surface-variant uppercase tracking-widest flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                {today} • {time}
            </p>
        </section>

        {/* PRIMARY ACTION */}
        <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <button onClick={() => nav('selection')} className="w-full bg-primary-container text-on-primary py-5 rounded-3xl font-headline font-bold text-xl glow-primary hover:bg-[#e6a800] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 ease-in-out flex items-center justify-center gap-3 group relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                <span className="material-symbols-outlined fill-1 relative z-10">play_arrow</span>
                <span className="relative z-10 tracking-tight">START WORKOUT</span>
            </button>
        </section>

        {/* WEEKLY VOLUME BENTO GRID */}
        <section className="space-y-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="flex justify-between items-end mb-2">
                <h3 className="font-headline font-bold text-lg tracking-tight">Weekly Volume</h3>
                <button onClick={() => nav('stats')} className="text-[10px] font-label uppercase tracking-widest text-primary-fixed-dim flex items-center gap-1 hover:text-white transition-colors group">
                    Details <span className="material-symbols-outlined text-[12px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {CAT_ORDER.map((cat, index) => {
                    const current = vol[cat] || 0;
                    const goal = data.goals[cat as MuscleGroup] || 20;
                    const pct = Math.min(100, (current / goal) * 100);
                    const isFullWidth = index === CAT_ORDER.length - 1 && CAT_ORDER.length % 2 !== 0;

                    if (isFullWidth) {
                        return (
                            <div key={cat} className="col-span-2 bg-surface-container p-4 rounded-3xl border border-white/5 relative overflow-hidden flex items-center justify-between group hover:border-white/10 transition-colors cursor-pointer">
                                <div>
                                    <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{cat}</p>
                                    <div className="flex items-baseline gap-1">
                                        <span className="font-headline font-black text-2xl tracking-tighter">{current}</span>
                                        <span className="font-label text-xs text-on-surface-variant">/ {goal} sets</span>
                                    </div>
                                </div>
                                <div className="w-1/2 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-container rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}></div>
                                </div>
                            </div>
                        );
                    }

                    return (
                        <div key={cat} className="bg-surface-container p-4 rounded-3xl border border-white/5 relative overflow-hidden group hover:border-white/10 transition-colors cursor-pointer">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-4xl">fitness_center</span>
                            </div>
                            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1">{cat}</p>
                            <div className="flex items-baseline gap-1 mb-3">
                                <span className="font-headline font-black text-2xl tracking-tighter">{current}</span>
                                <span className="font-label text-xs text-on-surface-variant">/ {goal} sets</span>
                            </div>
                            <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                                <div className="h-full bg-primary-container rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%` }}></div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>

        {/* PERFORMANCE INSIGHT */}
        <section className="animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <div className="relative rounded-3xl overflow-hidden border border-white/10 p-6 min-h-[160px] flex flex-col justify-end group cursor-pointer">
                <img alt="Training Background" className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay transition-transform duration-700 group-hover:scale-105" src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&h=400&fit=crop"/>
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/80 to-transparent"></div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-primary-container text-sm">leaderboard</span>
                        <span className="font-label text-[10px] uppercase tracking-widest text-primary-container font-bold">Insight</span>
                    </div>
                    <p className="font-body text-sm text-on-surface leading-relaxed font-medium">
                        "{insightText}"
                    </p>
                </div>
            </div>
        </section>

        {/* QUICK LINKS */}
        <section className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
            <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => nav('tennis')} className="bg-surface-container p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high active:scale-95 transition-all group">
                    <span className="material-symbols-outlined text-[#10b981] group-hover:scale-110 transition-transform">sports_tennis</span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant group-hover:text-white transition-colors">Tennis Log</span>
                 </button>
                 <button onClick={() => nav('supps')} className="bg-surface-container p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high active:scale-95 transition-all group">
                    <span className="material-symbols-outlined text-[#a855f7] group-hover:scale-110 transition-transform">medication</span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant group-hover:text-white transition-colors">Supplements</span>
                 </button>
                 <button onClick={() => nav('history')} className="bg-surface-container p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high active:scale-95 transition-all group">
                    <span className="material-symbols-outlined text-[#f97316] group-hover:scale-110 transition-transform">history</span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant group-hover:text-white transition-colors">Logbuch</span>
                 </button>
                 <button onClick={() => nav('ai')} className="bg-surface-container p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high active:scale-95 transition-all group">
                    <span className="material-symbols-outlined text-[#3b82f6] group-hover:scale-110 transition-transform">smart_toy</span>
                    <span className="font-label text-[10px] uppercase tracking-widest text-[#3b82f6] transition-colors">AI Coach</span>
                 </button>
            </div>
        </section>
      </main>
    );
  };

  const PlanView = () => {
      const toggleDay = (idx: number) => {
          const types = ["Push", "Pull", "Legs/Arms", "Rest"];
          const current = data.weekPlan[idx];
          let next: string | null = types[0];
          if (current) {
              const i = types.indexOf(current);
              next = (i === -1 || i === types.length - 1) ? null : types[i+1];
          }
          const newPlan = [...data.weekPlan];
          newPlan[idx] = next;
          saveData({...data, weekPlan: newPlan});
      };

      const updateTime = (idx: number, val: number) => {
          const newLimits = [...data.timeLimits];
          newLimits[idx] = val;
          saveData({...data, timeLimits: newLimits});
      };

      const startPlannedSession = (dayIdx: number) => {
          const type = data.weekPlan[dayIdx];
          if (!type || type === 'Rest') return;

          // Auto-Generate Session
          const limit = data.timeLimits[dayIdx] || 90;
          const maxExercises = Math.floor(limit / 9); // Approx 9 min per exercise
          
          let targetTypes: string[] = [];
          if (type === 'Push') targetTypes = ['push'];
          else if (type === 'Pull') targetTypes = ['pull'];
          else if (type === 'Legs/Arms') targetTypes = ['beine', 'arme'];

          const pool = (Object.values(data.db) as ExerciseDef[])
            .filter(ex => targetTypes.includes(ex.t))
            .sort((a,b) => calculateExercisePriority(a.id) - calculateExercisePriority(b.id));
          
          const selected = pool.slice(0, maxExercises);
          const newSession: ActiveSession = { start: null, exercises: {} };
          
          selected.forEach((ex, idx) => {
              newSession.exercises[ex.id] = { sets: [], order: idx + 1 };
          });

          updateSession(newSession);
          nav('selection'); // Go to selection for ordering review
          showToast(`${type} Session vorbereitet! 📋`);
      };

      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-3 mb-6">
                      <span className="material-symbols-outlined text-primary-container text-3xl">calendar_month</span>
                      <h2 className="font-headline font-black text-2xl tracking-tighter">Wochenplanung</h2>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3">
                      {DAY_NAMES.map((day, i) => (
                          <div key={i} className={`p-4 rounded-3xl border border-white/5 flex justify-between items-center transition-all ${data.weekPlan[i] ? 'bg-surface-container hover:border-white/10' : 'bg-transparent border-dashed opacity-60'}`}>
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 font-headline font-bold text-on-surface-variant">{day}</div>
                                    <button onClick={() => toggleDay(i)} className={`px-4 py-1.5 rounded-full font-label text-[10px] uppercase tracking-widest min-w-[90px] text-center transition-colors ${!data.weekPlan[i] ? 'bg-error-container/20 text-error' : 'bg-primary-container text-on-primary'}`}>
                                        {data.weekPlan[i] || "REST"}
                                    </button>
                                </div>
                                {data.weekPlan[i] && (
                                    <div className="flex items-center gap-2 pl-11">
                                        <span className="material-symbols-outlined text-[14px] text-on-surface-variant">timer</span>
                                        <input type="number" value={data.timeLimits[i]} onChange={(e) => updateTime(i, parseInt(e.target.value))} className="w-12 bg-surface-container-highest rounded-lg text-center text-[12px] py-1 font-mono text-on-surface border-none focus:ring-1 focus:ring-primary-container" />
                                        <span className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest">MIN</span>
                                    </div>
                                )}
                              </div>
                              {data.weekPlan[i] && (
                                  <button onClick={() => startPlannedSession(i)} className="w-12 h-12 rounded-full bg-surface-container-highest flex items-center justify-center hover:bg-primary-container hover:text-on-primary transition-colors text-on-surface">
                                      <span className="material-symbols-outlined fill-1">play_arrow</span>
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </section>
          </main>
      );
  };

  const SuppsView = () => {
      const updateSupp = (idx: number, field: string, val: string) => {
          const newSupps = [...data.userSupps];
          (newSupps[idx] as any)[field] = val;
          saveData({...data, userSupps: newSupps});
      };
      const addSupp = () => saveData({...data, userSupps: [...data.userSupps, {n:"", val:"", unit:""}]});
      const removeSupp = (idx: number) => {
          const newSupps = data.userSupps.filter((_, i) => i !== idx);
          saveData({...data, userSupps: newSupps});
      }

      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-3 mb-6">
                      <span className="material-symbols-outlined text-[#a855f7] text-3xl">medication</span>
                      <h2 className="font-headline font-black text-2xl tracking-tighter">Supplemente</h2>
                  </div>
                  <div className="space-y-3">
                      {data.userSupps.map((s, i) => (
                          <div key={i} className="flex gap-2 items-center bg-surface-container p-3 rounded-2xl border border-white/5">
                              <input value={s.n} onChange={e=>updateSupp(i,'n',e.target.value)} placeholder="Name" className="flex-1 bg-transparent border-none px-2 py-2 text-sm font-bold text-on-surface focus:ring-0" />
                              <input value={s.val} onChange={e=>updateSupp(i,'val',e.target.value)} placeholder="Menge" className="w-16 bg-surface-container-highest border border-white/5 rounded-lg px-2 py-2 text-sm font-bold text-[#a855f7] text-center focus:ring-1 focus:ring-[#a855f7]" />
                              <input value={s.unit} onChange={e=>updateSupp(i,'unit',e.target.value)} placeholder="Einh." className="w-16 bg-surface-container-highest border border-white/5 rounded-lg px-2 py-2 text-sm font-bold text-on-surface-variant text-center focus:ring-1 focus:ring-on-surface-variant" />
                              <button onClick={() => removeSupp(i)} className="text-on-surface-variant hover:text-error p-2 transition-colors">
                                  <span className="material-symbols-outlined text-[20px]">close</span>
                              </button>
                          </div>
                      ))}
                  </div>
                  <button onClick={addSupp} className="w-full mt-4 py-4 bg-surface-container-highest rounded-2xl font-label font-bold text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[18px]">add</span>
                      Eintrag hinzufügen
                  </button>
              </section>
          </main>
      );
  };

  const TennisView = () => {
      const [res, setRes] = useState("");
      const [dur, setDur] = useState("60");
      const [outcome, setOutcome] = useState("Sieg");
      const [matchType, setMatchType] = useState("tennis_1");
      const [dateInput, setDateInput] = useState(() => {
          const d = new Date();
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          return d.toISOString().split('T')[0];
      });
      
      const saveMatch = () => {
          const [year, month, day] = dateInput.split('-').map(Number);
          const selectedDate = new Date(year, month - 1, day);
          const now = new Date();
          selectedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
          
          const log: any = {
              d: selectedDate.getTime(),
              t: new Date(parseInt(dur)*60000).toISOString().substr(11,8),
              note: `Tennis Match: ${res} (${outcome})`,
              s: { [matchType]: { sets: [{w: parseInt(dur), r: matchType === "tennis_1" ? 1 : 2, type: 'A'}] } }
          };
          saveData({...data, h: [log, ...data.h]});
          showToast("Match gespeichert! 🎾");
          nav('history');
      };

      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-3 mb-6">
                      <span className="material-symbols-outlined text-[#10b981] text-3xl">sports_tennis</span>
                      <h2 className="font-headline font-black text-2xl tracking-tighter">Tennis Log</h2>
                  </div>
                  <div className="space-y-4 bg-surface-container p-6 rounded-3xl border border-white/5">
                      <div>
                          <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Datum</label>
                          <input type="date" value={dateInput} onChange={e=>setDateInput(e.target.value)} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-4 text-on-surface font-bold focus:ring-1 focus:ring-[#10b981]" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Ergebnis</label>
                              <input value={res} onChange={e=>setRes(e.target.value)} placeholder="6:4, 6:2" className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-4 text-on-surface font-bold focus:ring-1 focus:ring-[#10b981]" />
                          </div>
                          <div>
                              <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Modus</label>
                              <select value={matchType} onChange={e=>setMatchType(e.target.value)} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-4 text-on-surface font-bold focus:ring-1 focus:ring-[#10b981] appearance-none">
                                  <option value="tennis_1">Einzel</option>
                                  <option value="tennis_2">Doppel</option>
                              </select>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Dauer (Min)</label>
                              <input type="number" value={dur} onChange={e=>setDur(e.target.value)} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-4 text-on-surface font-bold focus:ring-1 focus:ring-[#10b981]" />
                          </div>
                          <div>
                              <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Ausgang</label>
                              <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-4 text-on-surface font-bold focus:ring-1 focus:ring-[#10b981] appearance-none">
                                  <option>Sieg</option>
                                  <option>Niederlage</option>
                              </select>
                          </div>
                      </div>
                      <button onClick={saveMatch} className="w-full py-4 bg-[#10b981] text-black font-headline font-black rounded-2xl mt-4 shadow-lg hover:bg-[#0ea5e9] transition-colors flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined">save</span>
                          MATCH SPEICHERN
                      </button>
                  </div>
              </section>
          </main>
      );
  };

  const AIView = () => {
      const [startD, setStartD] = useState(() => { const d=new Date(); d.setDate(d.getDate()-14); return d.toISOString().split('T')[0]; });
      const [endD, setEndD] = useState(() => new Date().toISOString().split('T')[0]);
      const [analysis, setAnalysis] = useState<string | null>(null);
      const [loading, setLoading] = useState(false);

      const analyzeData = async () => {
          setLoading(true);
          setAnalysis(null);
          try {
              const sTs = new Date(startD).getTime();
              const eTs = new Date(endD).setHours(23,59,59,999);
              const relH = data.h.filter(l => l.d >= sTs && l.d <= eTs);
              const relB = data.bodyLogs.filter(l => new Date(l.d).getTime() >= sTs && new Date(l.d).getTime() <= eTs);
              
              const prompt = `Du bist ein professioneller Fitness-Coach. Analysiere die folgenden Trainings- und Körperdaten des Nutzers für den Zeitraum ${startD} bis ${endD}.
              
Nutzerprofil: ${data.userProfile}
Ernährungsstatus: ${data.userCalStatus}
Supplements: ${JSON.stringify(data.userSupps)}

Trainingsdaten (Logbuch):
${JSON.stringify(relH)}

Körperdaten (Gewicht, etc.):
${JSON.stringify(relB)}

Aufgabe: 
1. Analysiere den Trainingsfortschritt (Progression bei den Gewichten).
2. Bewerte das Trainingsvolumen und die Konsistenz.
3. Gib 2-3 konkrete, motivierende Tipps für die nächste Woche basierend auf den Zielen und dem Profil.
Bitte antworte auf Deutsch, sei direkt, motivierend und nutze Markdown für die Formatierung.`;

              const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
              const response = await ai.models.generateContent({
                  model: 'gemini-3.1-pro-preview',
                  contents: prompt,
              });
              
              setAnalysis(response.text || "Keine Antwort generiert.");
          } catch (error) {
              console.error("AI Analysis failed:", error);
              setAnalysis("Fehler bei der Analyse. Bitte versuche es später erneut.");
          } finally {
              setLoading(false);
          }
      };

      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="flex items-center gap-3 mb-6">
                      <span className="material-symbols-outlined text-[#3b82f6] text-3xl">smart_toy</span>
                      <h2 className="font-headline font-black text-2xl tracking-tighter">AI Coach</h2>
                  </div>
                  <div className="bg-surface-container p-6 rounded-3xl border border-white/5 space-y-4">
                      <p className="text-sm text-on-surface-variant mb-4">Wähle einen Zeitraum, um deine Trainings- und Körperdaten von Gemini analysieren zu lassen.</p>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Von</label>
                              <input type="date" value={startD} onChange={e=>setStartD(e.target.value)} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-3 text-on-surface text-sm focus:ring-1 focus:ring-[#3b82f6]" />
                          </div>
                          <div>
                              <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Bis</label>
                              <input type="date" value={endD} onChange={e=>setEndD(e.target.value)} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-3 text-on-surface text-sm focus:ring-1 focus:ring-[#3b82f6]" />
                          </div>
                      </div>
                      <button onClick={analyzeData} disabled={loading} className="w-full py-4 bg-[#3b82f6] text-white font-headline font-black rounded-2xl mt-4 shadow-lg hover:bg-[#2563eb] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                          {loading ? (
                              <span className="material-symbols-outlined animate-spin">sync</span>
                          ) : (
                              <span className="material-symbols-outlined">auto_awesome</span>
                          )}
                          {loading ? "ANALYSISIERE..." : "DATEN ANALYSIEREN"}
                      </button>
                  </div>
                  
                  {analysis && (
                      <div className="mt-8 bg-surface-container p-6 rounded-3xl border border-[#3b82f6]/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] animate-fade-in">
                          <h3 className="font-headline font-black text-xl text-[#3b82f6] mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined">insights</span>
                              Dein Feedback
                          </h3>
                          <div className="prose prose-invert prose-sm max-w-none text-on-surface-variant">
                              <Markdown>{analysis}</Markdown>
                          </div>
                      </div>
                  )}
              </section>
          </main>
      );
  };

  const ProfileView = () => {
      const bw = data.bodyLogs.length > 0 ? data.bodyLogs[0].w : "--";
      
      const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                  const base64 = reader.result as string;
                  setUserPhoto(base64);
                  localStorage.setItem('tm_userPhoto', base64);
              };
              reader.readAsDataURL(file);
          }
      };

      const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          setUserName(e.target.value);
          localStorage.setItem('tm_userName', e.target.value);
      };

      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              <section className="animate-slide-up flex flex-col items-center" style={{ animationDelay: '0.1s' }}>
                  <label className="w-24 h-24 bg-surface-container rounded-full mb-4 border-2 border-primary-container flex items-center justify-center overflow-hidden shadow-[0_0_20px_rgba(255,188,13,0.15)] relative cursor-pointer group">
                      {userPhoto ? (
                          <img src={userPhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                          <span className="material-symbols-outlined text-4xl text-on-surface-variant">person</span>
                      )}
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-white">photo_camera</span>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  <div className="bg-primary-container text-on-primary text-[10px] font-label font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-2 shadow-lg">ELITE MEMBER</div>
                  <input 
                      type="text" 
                      value={userName} 
                      onChange={handleNameChange}
                      className="font-headline font-black text-3xl tracking-tighter text-on-surface bg-transparent text-center outline-none border-b-2 border-transparent focus:border-primary-container transition-colors w-full"
                      placeholder="Dein Name"
                  />
                  <p className="font-label text-on-surface-variant font-bold mt-1">{bw} kg</p>
              </section>

              <section className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                  <button onClick={() => nav('ai')} className="w-full py-5 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/30 text-white rounded-3xl font-headline font-black text-sm shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-3">
                      <span className="material-symbols-outlined text-indigo-400">smart_toy</span>
                      KI Analyse Scope Generator
                  </button>
              </section>

              <section className="space-y-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
                  <button onClick={() => nav('settings')} className="w-full bg-surface-container p-5 rounded-3xl flex justify-between items-center border border-white/5 hover:bg-surface-container-high transition-colors group">
                      <div className="flex items-center gap-4">
                          <div className="bg-surface-container-highest p-3 rounded-xl text-on-surface-variant group-hover:text-primary-container transition-colors">
                              <span className="material-symbols-outlined">settings</span>
                          </div>
                          <span className="font-headline font-bold text-on-surface">System Einstellungen</span>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </button>
                  <button onClick={() => nav('ex-config')} className="w-full bg-surface-container p-5 rounded-3xl flex justify-between items-center border border-white/5 hover:bg-surface-container-high transition-colors group">
                      <div className="flex items-center gap-4">
                          <div className="bg-surface-container-highest p-3 rounded-xl text-on-surface-variant group-hover:text-primary-container transition-colors">
                              <span className="material-symbols-outlined">edit_square</span>
                          </div>
                          <span className="font-headline font-bold text-on-surface">Übungen Konfigurieren</span>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </button>
                  <button onClick={() => nav('body')} className="w-full bg-surface-container p-5 rounded-3xl flex justify-between items-center border border-white/5 hover:bg-surface-container-high transition-colors group">
                      <div className="flex items-center gap-4">
                          <div className="bg-surface-container-highest p-3 rounded-xl text-on-surface-variant group-hover:text-primary-container transition-colors">
                              <span className="material-symbols-outlined">monitor_weight</span>
                          </div>
                          <span className="font-headline font-bold text-on-surface">Biometrie & Ziele</span>
                      </div>
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:translate-x-1 transition-transform">chevron_right</span>
                  </button>
              </section>
          </main>
      );
  };

  const ExerciseConfigView = () => {
      const activeCategories = Array.from(new Set([
          ...CAT_ORDER,
          ...(Object.values(data.db) as ExerciseDef[]).map(ex => ex.c)
      ]));

      const addNew = () => {
          const id = "ex_" + Date.now();
          const nd = {...data};
          nd.db[id] = { id, n: "Neue Übung", c: "Brust", t: "push", h: "0", defW: 0 };
          saveData(nd);
      };

      const deleteEx = (id: string) => {
          if(!window.confirm("Übung wirklich löschen? Historie bleibt erhalten.")) return;
          const nd = {...data};
          delete nd.db[id];
          saveData(nd);
      };

      return (
      <main className="flex-1 overflow-y-auto px-6 py-8 space-y-8 pb-32 pt-28 max-w-md mx-auto" id="main-content">
          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary-container text-3xl">edit_square</span>
                      <h2 className="font-headline font-black text-2xl tracking-tighter">Übungs-Config</h2>
                  </div>
                  <button onClick={addNew} className="bg-primary-container text-on-primary p-2 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.3)] hover:scale-105 transition-transform flex items-center justify-center">
                      <span className="material-symbols-outlined">add</span>
                  </button>
              </div>
              <div className="space-y-4">
                  {(Object.values(data.db) as ExerciseDef[]).map(ex => (
                      <div key={ex.id} className="bg-surface-container p-4 rounded-3xl border border-white/5 flex flex-col gap-3">
                          <div className="flex justify-between items-start gap-2">
                              <input type="text" value={ex.n} onChange={e => {
                                  const nd = {...data}; nd.db[ex.id].n = e.target.value; saveData(nd);
                              }} className="font-headline font-bold text-on-surface bg-transparent border-b border-white/10 outline-none w-full pb-1 focus:border-primary-container transition-colors" placeholder="Übungsname"/>
                              
                              <button onClick={() => deleteEx(ex.id)} className="text-on-surface-variant hover:text-red-500 transition-colors p-1 flex-shrink-0">
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                          </div>
                          
                          <div className="flex gap-2">
                              <label className="flex flex-col flex-1">
                                  <span className="font-label text-[8px] text-on-surface-variant uppercase tracking-widest pl-1 mb-1">Kategorie</span>
                                  <input type="text" list="categories-list" value={ex.c} onChange={e => {
                                      const nd = {...data}; nd.db[ex.id].c = e.target.value; saveData(nd);
                                  }} className="font-label text-xs bg-surface-container-highest px-3 py-2 rounded-xl text-on-surface outline-none focus:ring-1 focus:ring-primary-container transition-shadow w-full"/>
                                  <datalist id="categories-list">
                                      {activeCategories.map(c => <option key={c} value={c} />)}
                                  </datalist>
                              </label>
                              
                              <label className="flex flex-col flex-1">
                                  <span className="font-label text-[8px] text-on-surface-variant uppercase tracking-widest pl-1 mb-1">Typ</span>
                                  <select value={ex.t} onChange={e => {
                                      const nd = {...data}; nd.db[ex.id].t = e.target.value as any; saveData(nd);
                                  }} className="font-label text-xs bg-surface-container-highest px-3 py-2 rounded-xl text-on-surface outline-none focus:ring-1 focus:ring-primary-container transition-shadow w-full">
                                      <option value="push">Push</option>
                                      <option value="pull">Pull</option>
                                      <option value="beine">Beine</option>
                                      <option value="arme">Arme</option>
                                      <option value="cardio">Cardio</option>
                                      <option value="core">Core</option>
                                      <option value="tennis">Tennis</option>
                                  </select>
                              </label>
                          </div>

                          <div className="flex gap-3">
                              <label className="flex items-center gap-2 bg-surface-container-highest p-2 rounded-xl border border-white/5 flex-1 focus-within:ring-1 focus-within:ring-primary-container transition-shadow">
                                  <span className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest pl-1">Height (h)</span>
                                  <input type="text" value={ex.h !== undefined ? ex.h : ''} onChange={(e) => {
                                      const nd = {...data}; nd.db[ex.id].h = e.target.value; saveData(nd);
                                  }} className="w-full bg-transparent text-on-surface font-mono font-bold text-center text-sm outline-none border-none focus:ring-0 p-0" placeholder="Stufe/Loch"/>
                              </label>
                              <label className="flex items-center justify-center gap-2 bg-surface-container-highest p-2 rounded-xl border border-white/5 flex-1 focus-within:ring-1 focus-within:ring-primary-container transition-shadow">
                                  <span className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest pl-1" title="Manuelle Sortier-Priorität">Prio</span>
                                  <input type="number" value={ex.prio !== undefined ? ex.prio : ''} placeholder="Auto" onChange={(e) => {
                                      const nd = {...data}; 
                                      if (e.target.value === '') { delete nd.db[ex.id].prio; }
                                      else { nd.db[ex.id].prio = Number(e.target.value); }
                                      saveData(nd);
                                  }} className="w-full bg-transparent text-on-surface font-mono font-bold text-center text-sm outline-none border-none focus:ring-0 p-0"/>
                              </label>
                          </div>
                      </div>
                  ))}
              </div>
          </section>
      </main>
      );
  };

  const AnalyticsView = () => {
      const freq: Record<string, number> = {};
      data.h.forEach(w => Object.keys(w.s).forEach(id => freq[id] = (freq[id] || 0) + 1));
      if(analyticsEx) {
          const logs = data.h.filter(l => l.s[analyticsEx]).sort((a,b)=>a.d-b.d);
          const chartData = logs.map(l => {
              const workingSets = l.s[analyticsEx].sets.filter(s => s.type === 'A');
              const maxW = workingSets.length > 0 ? Math.max(...workingSets.map(s => s.w)) : 0;
              const maxR = workingSets.length > 0 ? Math.max(...workingSets.filter(s => s.w === maxW).map(s => s.r)) : 0;
              return { 
                date: new Date(l.d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }), 
                weight: maxW,
                reps: maxR 
              };
          }).filter(d => d.weight > 0);
          
          const last5Logs = [...logs].reverse().slice(0, 5); // Newest first

          return (
              <main className="flex-1 overflow-y-auto px-6 space-y-6 pb-32 pt-28 max-w-md mx-auto" id="main-content">
                  <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                      <h2 className="text-xl font-headline font-black text-primary-container mb-6 uppercase tracking-tighter text-center italic">{data.db[analyticsEx]?.n}</h2>
                      <div className="h-72 w-full bg-surface-container rounded-[2rem] p-4 mb-8 border border-white/5 shadow-2xl">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 35, right: 10, left: 10, bottom: 0 }}>
                              <defs>
                                <linearGradient id="colorGold" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ffbc0d" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#ffbc0d" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                              <XAxis dataKey="date" tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false} dy={10} />
                              <YAxis domain={['dataMin - 1', 'dataMax + 1']} tickCount={8} tickFormatter={(v) => `${v}kg`} tick={{fontSize:10, fill:'#ffbc0d'}} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{backgroundColor:'#121212', borderRadius:'16px', border:'1px solid #333', color:'#fff'}}/>
                              <Area type="monotone" dataKey="weight" stroke="#ffbc0d" strokeWidth={4} fillOpacity={1} fill="url(#colorGold)">
                                  <LabelList dataKey="reps" position="top" style={{ fill: '#ffffff', fontSize: '9px', fontWeight: '900' }} formatter={(val: any) => `${val}x`} offset={10} />
                              </Area>
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>

                  <div className="space-y-3 mb-8">
                      <h3 className="text-on-surface-variant font-bold text-xs uppercase tracking-widest pl-2">Letzte 5 Einheiten</h3>
                      {last5Logs.map(log => {
                           const sessionSets = log.s[analyticsEx].sets.filter(s => s.type === 'A');
                           return (
                               <div key={log.d} className="bg-surface-container border border-white/5 p-4 rounded-2xl flex justify-between items-center shadow-lg">
                                   <div className="text-xs font-bold text-on-surface-variant">{new Date(log.d).toLocaleDateString()}</div>
                                   <div className="flex flex-col items-end gap-1">
                                      {sessionSets.map((s, i) => (
                                          <div key={i} className="text-sm font-black text-on-surface flex items-center gap-2">
                                              <span>{s.w}kg</span>
                                              <span className="text-outline text-[10px]">x</span>
                                              <span>{s.r}</span>
                                          </div>
                                      ))}
                                   </div>
                               </div>
                           )
                      })}
                  </div>

                  <button onClick={()=>setAnalyticsEx(null)} className="w-full py-4 bg-surface-container-high rounded-2xl font-headline font-black shadow-xl active:scale-95 text-on-surface hover:bg-surface-container-highest transition-colors">ZURÜCK ZUR LISTE</button>
                  </section>
              </main>
          );
      }
      
      const vol = getWeeklyVolume();
      const bw = data.bodyLogs.length > 0 ? data.bodyLogs[0].w : "--";
      const steps = data.bodyLogs.length > 0 ? data.bodyLogs[0].s : "--";
      
      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="mb-6">
                      <div className="text-primary-container font-label font-bold text-[10px] uppercase tracking-[0.3em] mb-1">Performance Center</div>
                      <h2 className="text-4xl font-headline font-black text-on-surface tracking-tighter leading-tight">Fortschritt & <br/>Analyse</h2>
                  </div>

              <div className="bg-gradient-to-r from-primary-container to-[#f59e0b] rounded-[2rem] p-6 text-on-primary-container shadow-lg shadow-primary-container/20">
                  <div className="flex items-center gap-3 mb-2">
                      <Zap size={24} className="fill-black" />
                      <h3 className="font-black text-lg uppercase tracking-widest">Active Streak</h3>
                  </div>
                  <div className="text-4xl font-black tracking-tighter">24 DAYS</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className={`${THEME.card} p-5 rounded-[2rem] border border-white/5 shadow-2xl`}>
                      <h3 className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-1">Body Mass</h3>
                      <div className="text-2xl font-black text-on-surface">{bw} <span className="text-sm text-on-surface-variant">kg</span></div>
                  </div>
                  <div className={`${THEME.card} p-5 rounded-[2rem] border border-white/5 shadow-2xl`}>
                      <h3 className="text-on-surface-variant font-bold text-[10px] uppercase tracking-widest mb-1">Daily Steps</h3>
                      <div className="text-2xl font-black text-on-surface">{steps}</div>
                  </div>
              </div>

              <div className={`${THEME.card} p-6 rounded-[2rem] border border-white/5 shadow-2xl`}>
                  <h3 className="text-on-surface font-black text-sm uppercase tracking-widest mb-6">Muscle Focus</h3>
                  <div className="space-y-4">
                      {CAT_ORDER.map(cat => {
                          const current = vol[cat] || 0;
                          const goal = data.goals[cat as MuscleGroup] || 20;
                          const pct = Math.min(100, (current / goal) * 100);
                          return (
                              <div key={cat} className="space-y-2">
                                  <div className="flex justify-between items-end px-1">
                                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">{cat}</span>
                                      <span className="text-xs font-black text-on-surface">{current} / {goal}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                                      <div className={`h-full transition-all duration-1000 ease-out bg-primary-container`} style={{ width: `${pct}%` }} />
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>

              <div className="bg-surface-container p-6 rounded-3xl border border-white/5">
                  <h3 className="font-label text-on-surface font-bold text-sm uppercase tracking-widest mb-6">Exercise Details</h3>
                  <div className="space-y-6">
                      {CAT_ORDER.map(cat => (
                          <div key={cat} className="mb-4">
                              <h4 className="text-primary-container font-label text-[10px] font-bold uppercase mb-3 tracking-widest">{cat}</h4>
                              <div className="space-y-2">
                                  {(Object.values(data.db) as ExerciseDef[]).filter(ex=>ex.c===cat).map(ex => (
                                      <button key={ex.id} onClick={()=>setAnalyticsEx(ex.id)} className="w-full flex justify-between items-center p-4 rounded-2xl hover:bg-surface-container-high transition-colors text-left bg-surface-container-highest border border-white/5 group">
                                          <span className="font-headline font-bold text-sm text-on-surface group-hover:text-primary-container transition-colors">{ex.n}</span>
                                          <div className="bg-surface-container px-3 py-1 rounded-lg border border-white/5 flex items-baseline gap-1">
                                              <span className="text-primary-container font-mono font-black text-xs">{freq[ex.id] || 0}</span>
                                          </div>
                                      </button>
                                  ))}
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          </section>
      </main>
  );
  };

  const HistoryView = () => {
    const sortedHistory = useMemo(() => [...data.h].sort((a, b) => b.d - a.d), [data.h]);
    return (
      <main className="flex-1 overflow-y-auto px-6 space-y-4 pb-48 pt-28 max-w-md mx-auto" id="main-content">
          {sortedHistory.map((log, i) => (
              <div key={log.d} className="bg-surface-container p-5 rounded-3xl border-l-4 border-l-primary-container relative shadow-lg animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <div className="text-on-surface font-headline font-black text-xl tracking-tighter">{new Date(log.d).toLocaleDateString('de-DE')} <span className="text-sm text-on-surface-variant font-normal">{new Date(log.d).toLocaleTimeString('de-DE', {hour: '2-digit', minute:'2-digit'})}</span></div>
                          <div className="text-on-surface-variant font-label text-[10px] font-bold uppercase tracking-[0.3em] mt-1">{log.t} DUR</div>
                          {log.note && <div className="text-xs text-on-surface-variant mt-2 italic border-l-2 border-white/10 pl-2">"{log.note}"</div>}
                      </div>
                      <div className="flex gap-2">
                          <button onClick={()=> {setEditTimestamp(log.d); nav('history-edit');}} className="w-10 h-10 bg-surface-container-highest text-on-surface-variant hover:bg-primary-container hover:text-on-primary transition-colors rounded-full flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                          </button>
                          <button onClick={(e)=> { e.stopPropagation(); setConfirmDeleteId(log.d); }} className="w-10 h-10 bg-surface-container-highest text-on-surface-variant hover:bg-error-container hover:text-error transition-colors rounded-full flex items-center justify-center relative z-10">
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                      </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                      {Object.keys(log.s).map(id=>{
                        const name = data.db[id]?.n || id;
                        return (
                        <span key={id} className="font-label text-[10px] bg-surface-container-highest px-3 py-1.5 rounded-full text-on-surface-variant font-bold border border-white/5">
                            {name.substring(0, 24)}{name.length > 24 ? "..." : ""}
                        </span>
                      )})}
                  </div>
              </div>
          ))}
          <div className="h-24 w-full opacity-0 pointer-events-none"></div>
      </main>
    );
  };

  const HistoryEditView = () => {
      if (!editTimestamp) return null;
      const logIdx = data.h.findIndex(l => l.d === editTimestamp);
      if (logIdx === -1) { nav('history'); return null; }
      
      const [localLog, setLocalLog] = useState<WorkoutLog>(JSON.parse(JSON.stringify(data.h[logIdx])));

      const save = () => {
          const newData = {...data};
          
          // Sanitize localLog before saving
          const cleanLog = JSON.parse(JSON.stringify(localLog));
          Object.keys(cleanLog.s).forEach(id => {
              cleanLog.s[id].sets = cleanLog.s[id].sets
                  .map((s: any) => {
                      const w = Number(s.w);
                      s.w = isNaN(w) ? 0 : w;
                      
                      const r = Number(s.r);
                      s.r = isNaN(r) ? 0 : r;
                      
                      if (s.rpe === undefined || s.rpe === null || s.rpe === "") {
                          delete s.rpe;
                      } else {
                          const rpe = Number(s.rpe);
                          if (isNaN(rpe)) delete s.rpe;
                          else s.rpe = rpe;
                      }
                      return s;
                  })
                  .filter((s: any) => s.w > 0 || s.r > 0);
                  
              if (cleanLog.s[id].sets.length === 0) {
                  delete cleanLog.s[id];
              }
          });
          
          newData.h[logIdx] = cleanLog;
          saveData(newData);
          setEditTimestamp(null);
          nav('history');
          showToast("Änderungen gespeichert! ✅");
      };

      const sortedIds = Object.keys(localLog.s).sort((a, b) => (localLog.s[a].order || 0) - (localLog.s[b].order || 0));

      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="bg-surface-container p-6 rounded-3xl border border-white/5 mb-6">
                      <div className="flex justify-between items-center mb-4">
                          <span className="font-label text-on-surface-variant font-bold text-[10px] uppercase tracking-widest">Datum & Zeit</span>
                          <div className="flex gap-2">
                              <input 
                                  type="date" 
                                  value={new Date(localLog.d - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]} 
                                  onChange={e => {
                                      if (!e.target.value) return;
                                      const [year, month, day] = e.target.value.split('-').map(Number);
                                      const newDate = new Date(localLog.d);
                                      newDate.setFullYear(year, month - 1, day);
                                      setLocalLog({...localLog, d: newDate.getTime()});
                                  }} 
                                  className="bg-surface-container-highest border border-white/5 rounded-xl px-3 py-2 text-on-surface font-mono font-bold text-center focus:outline-none focus:border-primary-container transition-colors w-36"
                              />
                              <input 
                                  type="time" 
                                  value={new Date(localLog.d - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[1].substring(0, 5)} 
                                  onChange={e => {
                                      if (!e.target.value) return;
                                      const [hours, minutes] = e.target.value.split(':').map(Number);
                                      const newDate = new Date(localLog.d);
                                      newDate.setHours(hours, minutes);
                                      setLocalLog({...localLog, d: newDate.getTime()});
                                  }} 
                                  className="bg-surface-container-highest border border-white/5 rounded-xl px-2 py-2 text-on-surface font-mono font-bold text-center focus:outline-none focus:border-primary-container transition-colors min-w-[100px]"
                              />
                          </div>
                      </div>
                      <div className="flex justify-between items-center mb-4">
                          <span className="font-label text-on-surface-variant font-bold text-[10px] uppercase tracking-widest">Dauer</span>
                          <input value={localLog.t} onChange={e=>setLocalLog({...localLog, t:e.target.value})} className="bg-surface-container-highest border border-white/5 rounded-xl px-3 py-2 text-on-surface font-mono font-bold text-center w-32 focus:outline-none focus:border-primary-container transition-colors"/>
                      </div>
                      <div>
                          <span className="font-label text-on-surface-variant font-bold text-[10px] uppercase tracking-widest block mb-2">Notiz</span>
                          <textarea value={localLog.note} onChange={e=>setLocalLog({...localLog, note:e.target.value})} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-3 text-sm text-on-surface h-20 focus:outline-none focus:border-primary-container transition-colors resize-none"/>
                      </div>
                  </div>

                  {sortedIds.map(id => {
                      const exDef = data.db[id];
                      const exData = localLog.s[id];
                      return (
                          <div key={id} className="bg-surface-container p-5 rounded-3xl border border-white/5 mb-6">
                              <h3 className="font-headline font-black text-on-surface text-sm uppercase mb-4 flex items-center gap-2 flex-wrap">
                                  {exDef?.n || id}
                                  {exDef?.h && exDef.h !== 0 && exDef.h !== "0" && (
                                      <span className="text-[10px] font-label font-bold text-primary-container bg-primary-container/10 px-2 py-1 rounded-md">
                                          HÖHE: {exDef.h}
                                      </span>
                                  )}
                              </h3>
                              <div className="space-y-2">
                                  {exData.sets.map((s, sIdx) => {
                                      const isCardio = exDef?.t === 'cardio';
                                      return (
                                      <div key={sIdx} className="flex items-center gap-2">
                                          <div className="w-4 font-label text-[10px] font-bold text-on-surface-variant">#{sIdx+1}</div>
                                          
                                          <input type="number" step={(exDef?.h && exDef?.h !== 0 && exDef?.h !== "0") ? "4.5" : "0.5"} value={s.w} onChange={e=>{
                                              const ns = {...localLog};
                                              ns.s[id].sets[sIdx].w = parseFloat(e.target.value);
                                              setLocalLog(ns);
                                          }} className={`${isCardio ? 'w-20' : 'w-14'} px-0 bg-surface-container-highest border-0 border-b border-white/10 text-on-surface font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors`}/>
                                          <span className="text-[8px] text-on-surface-variant font-bold">{isCardio ? 'MIN' : 'KG'}</span>
                                          
                                          {isCardio ? null : (
                                              <>
                                                  <input type="number" value={s.r} onChange={e=>{
                                                      const ns = {...localLog};
                                                      ns.s[id].sets[sIdx].r = parseInt(e.target.value);
                                                      setLocalLog(ns);
                                                  }} className="w-10 px-0 bg-surface-container-highest border-0 border-b border-white/10 text-on-surface font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors"/>
                                                  <span className="text-[8px] text-on-surface-variant font-bold">REPS</span>

                                                  <input type="number" step="0.5" value={s.rpe !== undefined ? s.rpe : ''} onChange={e=>{
                                                      const ns = {...localLog};
                                                      ns.s[id].sets[sIdx].rpe = parseFloat(e.target.value);
                                                      setLocalLog(ns);
                                                  }} className="w-10 px-0 bg-surface-container-highest border-0 border-b border-white/10 text-primary-container font-black text-center py-1 outline-none focus:border-primary-container focus:ring-0 transition-colors" placeholder="-"/>
                                                  <span className="text-[8px] text-on-surface-variant font-bold">RIR</span>
                                              </>
                                          )}

                                          <button onClick={()=>{
                                              const ns = {...localLog};
                                              ns.s[id].sets.splice(sIdx, 1);
                                              setLocalLog(ns);
                                          }} className="ml-auto text-on-surface-variant hover:text-error transition-colors pl-2">
                                              <span className="material-symbols-outlined text-[16px]">close</span>
                                          </button>
                                      </div>
                                  )})}
                                  <button onClick={()=>{
                                      const ns = {...localLog};
                                      const lastSet = ns.s[id].sets.length > 0 ? ns.s[id].sets[ns.s[id].sets.length - 1] : null;
                                      const newWeight = lastSet ? lastSet.w : 0;
                                      ns.s[id].sets.push({w:newWeight, r:0, type:'A'});
                                      setLocalLog(ns);
                                  }} className="w-full py-2 mt-2 bg-surface-container-highest rounded-xl font-label text-[10px] font-bold text-on-surface-variant hover:text-on-surface transition-colors uppercase tracking-widest">+ Satz</button>
                              </div>
                          </div>
                      );
                  })}

                  <div className="flex gap-3 mt-8">
                      <button onClick={()=>nav('history')} className="flex-1 py-4 bg-surface-container-highest rounded-2xl font-label font-bold text-xs uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Abbrechen</button>
                      <button onClick={save} className="flex-[2] py-4 bg-primary-container text-on-primary rounded-2xl font-label font-bold text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all">Speichern</button>
                  </div>
              </section>
          </main>
      );
  };

  const SelectionView = () => {
      const activeCategories = Array.from(new Set([
          ...CAT_ORDER,
          ...(Object.values(data.db) as ExerciseDef[]).map(ex => ex.c)
      ]));

      return (
      <main className="flex-1 overflow-y-auto px-6 space-y-6 pb-40 pt-28 max-w-md mx-auto" id="main-content">
        <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {activeCategories.map(cat => {
                const categoryExercises = (Object.values(data.db) as ExerciseDef[]).filter(ex => ex.c === cat);
                if (categoryExercises.length === 0) return null;
                
                return (
                <div key={cat} className="bg-surface-container p-5 rounded-3xl border border-white/5 mb-6">
                    <h3 className="text-primary-container font-label font-bold uppercase mb-4 pl-2 tracking-widest text-[10px]">{cat}</h3>
                    <div className="space-y-2">
                        {categoryExercises.sort((a,b)=> calculateExercisePriority(a.id) - calculateExercisePriority(b.id)).map(ex => {
                            const isSelected = !!activeSession.exercises[ex.id];
                            return (
                                <div key={ex.id} onClick={() => {
                                    const ns = { ...activeSession };
                                    if (ns.exercises[ex.id]) delete ns.exercises[ex.id];
                                    else ns.exercises[ex.id] = { sets: [], order: Object.keys(ns.exercises).length + 1 };
                                    updateSession(ns);
                                }} className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-primary-container text-on-primary border-primary-container scale-[1.02] shadow-[0_0_15px_rgba(234,179,8,0.15)]' : 'bg-surface-container-highest text-on-surface-variant border-white/5 hover:bg-surface-container-high'}`}>
                                    <span className={`font-headline font-bold text-sm text-left ${isSelected ? 'text-on-primary' : 'text-on-surface'}`}>{ex.n}</span>
                                    {isSelected ? (
                                        <input 
                                            type="number" 
                                            onClick={(e) => e.stopPropagation()} 
                                            onChange={(e) => {
                                                const ns = { ...activeSession };
                                                ns.exercises[ex.id].order = parseInt(e.target.value) || 0;
                                                updateSession(ns);
                                            }}
                                            value={activeSession.exercises[ex.id].order} 
                                            className="w-12 h-10 bg-white/20 text-on-primary font-mono font-black text-xl text-center rounded-xl focus:outline-none"
                                        />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-on-surface-variant/30"></div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )})}
        </section>
        <div className="fixed bottom-24 left-0 right-0 p-4 flex justify-center z-40 pointer-events-none">
             <button onClick={() => {
                 if(Object.keys(activeSession.exercises).length>0){
                     const ns = { ...activeSession, start: activeSession.start || Date.now() };
                     
                     // PRE-FILL 3 SETS LOGIC
                     Object.keys(ns.exercises).forEach(id => {
                         // Only pre-fill if empty to avoid overwriting ongoing session if user navigates back/forth
                         if (ns.exercises[id].sets.length === 0) {
                             const exDef = data.db[id];
                             const prog = calculateProgression(exDef, data.h);
                             const warmupW = calculateWarmup(prog.w, exDef);
                             
                             ns.exercises[id].sets = [
                                 { w: warmupW, r: 12, type: 'W', completed: false } as any,
                                 { w: prog.w, r: prog.r, type: 'A', completed: false } as any,
                                 { w: prog.w, r: prog.r, type: 'A', completed: false } as any
                             ];
                         }
                     });

                     if (!ns.start) {
                         ns.start = Date.now();
                     }
                     updateSession(ns);
                     nav('training');
                 }
             }} className={`pointer-events-auto px-8 py-4 rounded-full font-label font-bold text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-transform duration-200 ease-in-out flex items-center gap-2 ${Object.keys(activeSession.exercises).length>0 ? 'bg-primary-container text-on-primary hover:scale-[1.02] active:scale-[0.98]' : 'bg-surface-container-highest text-on-surface-variant opacity-50 cursor-not-allowed'}`}>
                 <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                 {activeSession.start ? 'TRAINING FORTSETZEN' : 'TRAINING STARTEN'} ({Object.keys(activeSession.exercises).length})
             </button>
        </div>
      </main>
      );
  };

  const SettingsView = () => {
      const [showAdmin, setShowAdmin] = useState(false);
      const [adminCode, setAdminCode] = useState("");
      const [exportDate, setExportDate] = useState(() => {
          const d = new Date();
          d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
          return d.toISOString().split('T')[0];
      });

      const exportTraining = () => {
          const [year, month, day] = exportDate.split('-').map(Number);
          const targetDate = new Date(year, month - 1, day).toLocaleDateString('de-DE');
          const trainingsToExport = data.h.filter(log => new Date(log.d).toLocaleDateString('de-DE') === targetDate);
          
          if (trainingsToExport.length === 0) {
              showToast("Kein Training an diesem Datum gefunden.");
              return;
          }
          
          const blob = new Blob([JSON.stringify(trainingsToExport, null, 2)], {type: "application/json"});
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `training_${exportDate}.json`;
          a.click();
      };

      const importTraining = (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          
          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  const importedTrainings = JSON.parse(event.target?.result as string);
                  if (Array.isArray(importedTrainings)) {
                      const newData = {...data, h: [...importedTrainings, ...data.h]};
                      newData.h.sort((a, b) => b.d - a.d);
                      saveData(newData);
                      showToast("Training(s) erfolgreich importiert! ✅");
                  } else {
                      showToast("Ungültiges Dateiformat.");
                  }
              } catch (err) {
                  showToast("Fehler beim Importieren.");
              }
          };
          reader.readAsText(file);
      };

      return (
          <main className="flex-1 overflow-y-auto px-6 py-8 space-y-6 pb-32 pt-28 max-w-md mx-auto" id="main-content">
              {showExportModal && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in" onClick={()=>setShowExportModal(false)}>
                      <div className="bg-surface-container border border-white/5 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative animate-slide-up" onClick={e=>e.stopPropagation()}>
                         <h3 className="font-headline text-xl font-black text-on-surface mb-4 tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-primary-container text-[24px]">sync_alt</span> Training Import / Export</h3>
                         <p className="text-on-surface-variant font-body text-sm mb-6">Wähle ein Datum, um das Training dieses Tages zu exportieren, oder importiere ein zuvor exportiertes Training.</p>
                         
                         <div className="space-y-4 mb-8">
                             <div>
                                 <label className="font-label text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-2 block">Datum für Export</label>
                                 <input type="date" value={exportDate} onChange={e=>setExportDate(e.target.value)} className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-3 text-on-surface text-sm focus:ring-1 focus:ring-primary-container mb-2" />
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                                 <button onClick={exportTraining} className="w-full py-3 bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-colors rounded-xl font-label font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                                     <span className="material-symbols-outlined text-[16px]">download</span> Export
                                 </button>
                                 <label className="w-full py-3 bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-colors rounded-xl font-label font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 cursor-pointer">
                                     <span className="material-symbols-outlined text-[16px]">upload</span> Import
                                     <input type="file" accept=".json" className="hidden" onChange={(e) => { importTraining(e); setShowExportModal(false); }} />
                                 </label>
                             </div>
                         </div>
                         
                         <button onClick={() => setShowExportModal(false)} className="w-full py-4 bg-surface-container-highest rounded-2xl font-label font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Schließen</button>
                      </div>
                  </div>
              )}
              <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                  <div className="bg-surface-container p-6 rounded-3xl border border-white/5">
                      <h2 className="font-headline font-black text-2xl text-on-surface mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-primary-container text-[28px]">settings</span> System</h2>
                      
                       <div className="mt-6 pt-6 border-t border-white/5">
                            <h3 className="font-label font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mb-4">Backup</h3>
                            <div className="grid grid-cols-1 gap-3">
                                <button onClick={() => {
                                    const html = generateSnapshotHTML(data);
                                    const blob = new Blob([html], {type: "text/html"});
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `snapshot_${new Date().toISOString().split('T')[0]}.html`;
                                    a.click();
                                }} className="w-full py-3 bg-surface-container-highest text-on-surface hover:bg-surface-container-high transition-colors rounded-xl font-label font-bold uppercase text-[10px] tracking-widest flex items-center justify-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">html</span> Download HTML Snapshot
                                </button>
                            </div>
                       </div>

                       <div className="mt-6 pt-6 border-t border-white/5">
                            <h3 className="font-label font-bold text-[10px] text-on-surface-variant uppercase tracking-widest mb-4">Account</h3>
                            
                            <button onClick={() => {
                                const localDataStr = localStorage.getItem('tm_data');
                                if (localDataStr) {
                                    try {
                                        const localData = JSON.parse(localDataStr);
                                        setDoc(doc(db, `users/${user.uid}/data/appData`), localData)
                                        .then(() => showToast("Cloud-Sync erfolgreich! ☁️"))
                                        .catch(err => {
                                            console.error(err);
                                            showToast("Cloud-Sync Fehler! ⚠️");
                                        });
                                    } catch (e) {
                                        showToast("Fehler beim Lesen der lokalen Daten.");
                                    }
                                } else {
                                    showToast("Keine lokalen Daten zum Synchronisieren.");
                                }
                            }} className="w-full py-4 mb-3 bg-surface-container-highest text-on-surface hover:bg-primary-container hover:text-on-primary transition-colors rounded-2xl font-headline font-black shadow-xl active:scale-95 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">cloud_sync</span> Cloud-Sync erzwingen
                            </button>

                            <button onClick={logout} className="w-full py-4 bg-error-container text-error hover:bg-error hover:text-on-error transition-colors rounded-2xl font-headline font-black shadow-xl active:scale-95 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[20px]">logout</span> Abmelden
                            </button>
                       </div>

                       <div className="mt-6 pt-6 border-t border-white/5">
                            <div className="flex justify-between items-center mb-4 cursor-pointer group" onClick={() => setShowAdmin(!showAdmin)}>
                                <h3 className="font-label font-bold text-[10px] text-on-surface-variant group-hover:text-on-surface transition-colors uppercase tracking-widest">Internal</h3>
                                <span className={`material-symbols-outlined text-on-surface-variant transition-transform duration-300 ${showAdmin ? 'rotate-180' : ''}`}>expand_more</span>
                            </div>
                            {showAdmin && (
                                <div className="space-y-3 animate-slide-up">
                                    <input 
                                        type="password" 
                                        value={adminCode} 
                                        onChange={(e) => setAdminCode(e.target.value)} 
                                        placeholder="Access Code" 
                                        className="w-full bg-surface-container-highest border border-white/5 rounded-xl p-3 text-sm text-on-surface font-mono focus:outline-none focus:border-primary-container transition-colors"
                                    />
                                    {adminCode === "9096" && (
                                        <a href="training-app.zip" download className="block w-full py-4 bg-primary-container text-on-primary rounded-xl font-label font-bold text-[10px] uppercase tracking-widest text-center shadow-[0_0_20px_rgba(234,179,8,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                            <span className="material-symbols-outlined text-[16px]">inventory_2</span> DOWNLOAD APP ZIP
                                        </a>
                                    )}
                                </div>
                            )}
                       </div>
                  </div>
              </section>
          </main>
      );
  };

  const srcMap: Record<string, any> = { home: HomeView, plan: PlanView, supps: SuppsView, tennis: TennisView, profile: ProfileView, ai: AIView, 'ex-config': ExerciseConfigView, selection: SelectionView, stats: AnalyticsView, history: HistoryView, 'history-edit': HistoryEditView, settings: SettingsView };
  const CurrentComp = srcMap[view] || HomeView;
  const titleMap: Record<string, string> = { home:'DASHBOARD', plan:'PLANUNG', supps:'STACK', tennis:'COURT', profile:'PROFIL', ai:'INTELLIGENCE', 'ex-config':'CONFIG', selection:'AUSWAHL', training:'WORKOUT', stats:'ANALYSE', history:'LOGBUCH', 'history-edit':'EDIT LOG', body:'METRICS', settings:'SYSTEM' };

  return (
    <div className={`min-h-screen ${THEME.bg} text-on-background font-body selection:bg-primary-container/20 overflow-x-hidden`}>
      <Header view={view} userName={userName} userPhoto={userPhoto} title={titleMap[view] || 'APP'} showBack={view !== 'home'} onBack={() => nav('home')} onSnapshot={() => view === 'settings' ? setShowExportModal(true) : nav('settings')}/>
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-primary-container text-on-primary font-headline font-bold px-8 py-4 rounded-full z-[100] shadow-2xl animate-fade-in border-2 border-white">{toast}</div>}
      
      {confirmDeleteId !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in" onClick={()=>setConfirmDeleteId(null)}>
              <div className="bg-surface-container border border-white/5 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative animate-slide-up" onClick={e=>e.stopPropagation()}>
                 <h3 className="font-headline text-xl font-black text-on-surface mb-4 tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-error text-[24px]">warning</span> Warnung</h3>
                 <p className="text-on-surface-variant font-body text-sm mb-8">Einheit wirklich löschen?</p>
                 <div className="flex gap-3">
                    <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-surface-container-highest rounded-2xl font-label font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Abbrechen</button>
                    <button onClick={executeDelete} className="flex-1 py-4 bg-error-container text-error rounded-2xl font-label font-bold text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(255,84,73,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all">Löschen</button>
                 </div>
              </div>
          </div>
      )}

      <main className="max-w-md mx-auto min-h-screen">
         {view === 'body' ? <BodyView data={data} saveData={saveData} showToast={showToast} /> : 
          view === 'training' ? <TrainingView data={data} saveData={saveData} activeSession={activeSession} updateSession={updateSession} nav={nav} showToast={showToast} /> :
          <CurrentComp />}
      </main>
      <TabBar currentView={view} nav={nav} />
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) {
    return (
      <div className={`min-h-screen ${THEME.bg} flex items-center justify-center text-white`}>
        <div className="animate-pulse flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-primary-container animate-spin">sync</span>
          <span className="font-headline font-bold uppercase tracking-widest text-sm text-on-surface-variant">Lade Profil...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`min-h-screen ${THEME.bg} flex flex-col items-center justify-center p-6 text-center`}>
        <div className="w-24 h-24 bg-surface-container rounded-full mb-8 border-2 border-primary-container flex items-center justify-center shadow-[0_0_30px_rgba(255,188,13,0.2)]">
          <span className="material-symbols-outlined text-5xl text-primary-container">lock</span>
        </div>
        <h1 className="font-headline font-black text-4xl tracking-tighter text-on-surface mb-2">FITNESS MAXX</h1>
        <p className="font-label text-sm text-on-surface-variant mb-12 max-w-xs">Bitte melde dich an, um auf deine persönlichen Trainingsdaten zuzugreifen.</p>
        
        <button 
          onClick={loginWithGoogle}
          className="w-full max-w-xs py-5 bg-white text-black rounded-3xl font-headline font-black text-lg shadow-xl active:scale-95 transition-transform flex items-center justify-center gap-3"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
          Mit Google anmelden
        </button>
      </div>
    );
  }

  return <MainApp user={user} />;
};

export default App;