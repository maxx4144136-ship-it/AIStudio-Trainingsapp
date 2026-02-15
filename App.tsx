import React, { useState, useEffect, useMemo } from 'react';
import { 
  Home, Zap, Trash2, Scale, History, BarChart3, Settings, X, Check, 
  Calendar, Pill, Activity, User, Cpu, Trophy, Edit3, Save, Copy, Upload, FileJson, Play, Square, CheckSquare, Search
} from 'lucide-react';
import { AppData, ExerciseDef, GitHubConfig, ActiveSession, MuscleGroup, WorkoutLog } from './types';
import { FALLBACK_DATA, CAT_ORDER } from './constants';
import { calculateProgression, calculateWarmup, generateSnapshotHTML } from './utils/logic';
import { fetchFromGitHub, saveToGitHub } from './services/github';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart, CartesianGrid, LabelList, ComposedChart, Bar } from 'recharts';

const APP_VERSION = "V27.24 (STABLE)";

const THEME = {
  bg: "bg-[#121212]",
  card: "bg-[#1e1e1e]",
  cardBorder: "border border-white/5",
  radius: "rounded-[2rem]",
  btnPrimary: "bg-[#ffbc0d] text-black",
};

const DAY_NAMES = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// --- COMPONENTS ---

const Header = ({ title, showBack, onBack, onSnapshot }: { title: string, showBack: boolean, onBack: () => void, onSnapshot: () => void }) => (
  <div className="fixed top-0 left-0 w-full h-24 bg-[#121212]/95 backdrop-blur-md z-50 flex items-end justify-between px-6 pb-4 border-b border-white/5">
    {showBack ? (
      <button onClick={onBack} className="bg-[#2c2c2c] p-2 rounded-full active:scale-90 shadow-lg">
        <div className="font-black text-[10px] text-white uppercase flex items-center gap-1">‹ Zurück</div>
      </button>
    ) : <div className="w-10" />}
    <div className="text-center">
        <div className="text-[10px] font-black uppercase tracking-widest mb-1 pulse-version-gold">PRO {APP_VERSION}</div>
        <h1 className="text-xl font-black tracking-tighter text-white uppercase italic drop-shadow-md leading-none">{title}</h1>
    </div>
    <button onClick={onSnapshot} className="bg-[#2c2c2c] p-2 rounded-full active:scale-90 shadow-lg">
      <span className="text-xl">💾</span>
    </button>
  </div>
);

const TabBar = ({ currentView, nav }: { currentView: string, nav: (id: string) => void }) => {
  const tabs = [
    { id: 'home', icon: Home },
    { id: 'plan', icon: Calendar },
    { id: 'selection', icon: Zap },
    { id: 'stats', icon: BarChart3 },
    { id: 'profile', icon: User },
  ];
  return (
    <div className="fixed bottom-6 left-4 right-4 h-[70px] bg-[#1e1e1e] rounded-[2rem] z-50 flex justify-around items-center border border-white/10 shadow-2xl">
      {tabs.map(t => (
        <button key={t.id} onClick={() => nav(t.id)} className={`p-2 rounded-full transition-all duration-300 ${currentView === t.id ? 'bg-[#ffbc0d] text-black scale-110' : 'opacity-40 text-white'}`}>
          <t.icon size={22} strokeWidth={2.5} />
        </button>
      ))}
    </div>
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
        <div className="fixed top-24 right-4 bg-[#ffbc0d] text-black font-black font-mono px-4 py-2 rounded-full z-[40] shadow-lg pointer-events-none">
            {timerStr}
        </div>
    );
};

// --- EXTERNALIZED VIEWS ---

const BodyView = ({ data, saveData, showToast }: { data: AppData, saveData: (d: AppData) => void, showToast: (m: string) => void }) => {
    const [w, setW] = useState("");
    const [s, setS] = useState("");
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    
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
      <div className="pt-28 pb-32 px-4 space-y-6 animate-fade-in">
          <div className={`${THEME.card} p-6 rounded-3xl border border-white/5 shadow-2xl`}>
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-tighter italic">Gewicht & Steps</h2>
              
              <div className="mb-4">
                  <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-2">Datum</label>
                  <input type="date" value={dateInput} onChange={e=>setDateInput(e.target.value)} className="w-full bg-black/60 p-3 rounded-xl text-white font-bold border border-white/10 outline-none focus:border-[#ffbc0d]"/>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="text-[10px] text-[#3b82f6] font-black uppercase tracking-widest block mb-2">Gewicht (KG)</label>
                      <input type="number" placeholder="00.0" value={w} onChange={e=>setW(e.target.value)} className="w-full bg-black/60 p-4 rounded-2xl text-2xl font-black text-[#3b82f6] outline-none border border-white/10 focus:border-[#3b82f6] shadow-inner"/>
                  </div>
                  <div>
                      <label className="text-[10px] text-[#10b981] font-black uppercase tracking-widest block mb-2">Steps</label>
                      <input type="number" placeholder="10k" value={s} onChange={e=>setS(e.target.value)} className="w-full bg-black/60 p-4 rounded-2xl text-2xl font-black text-[#10b981] outline-none border border-white/10 focus:border-[#10b981] shadow-inner"/>
                  </div>
              </div>
              <button onClick={add} className="w-full mt-6 py-4 bg-white text-black rounded-2xl font-black shadow-xl text-lg border-b-4 border-zinc-300 uppercase tracking-tighter active:scale-95 transition-transform">Speichern</button>
          </div>

          {chartData.length > 1 && (
              <div className="h-72 w-full bg-[#1e1e1e] rounded-[2rem] p-4 border border-white/5 shadow-2xl overflow-hidden">
                  <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" />
                          <XAxis dataKey="date" tick={{fontSize:10, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                          <YAxis yAxisId="left" domain={['dataMin - 1', 'dataMax + 1']} tick={{fontSize:10, fill:'#3b82f6'}} axisLine={false} tickLine={false} width={40} />
                          <YAxis yAxisId="right" orientation="right" tick={{fontSize:10, fill:'#10b981'}} axisLine={false} tickLine={false} width={40} />
                          <Tooltip contentStyle={{backgroundColor:'#121212', borderRadius:'12px', border:'none', color:'#fff'}} itemStyle={{fontSize:'12px', fontWeight:'bold'}}/>
                          <Bar yAxisId="right" dataKey="steps" fill="#10b981" barSize={8} radius={[4, 4, 0, 0]} fillOpacity={0.6} />
                          <Line yAxisId="left" type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={1.5} dot={{r:2, fill:'#3b82f6', strokeWidth:1, stroke:'#fff'}} connectNulls={true} animationDuration={1000} />
                      </ComposedChart>
                  </ResponsiveContainer>
              </div>
          )}

          <div className="space-y-3">
               <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-widest pl-2">Letzte 7 Tage</h3>
               {last7.map(l => (
                   <div key={l.d} className="bg-[#1e1e1e] border border-white/5 p-3 rounded-2xl flex items-center justify-between shadow-lg">
                       <div className="text-xs font-bold text-zinc-400 w-16">{new Date(l.d).toLocaleDateString('de-DE', {day:'2-digit', month:'2-digit'})}</div>
                       <div className="flex gap-2 flex-1 justify-end items-center">
                           <div className="relative">
                               <input type="number" value={l.w || ''} onChange={(e) => updateEntry(l.d, 'w', e.target.value)} className="w-16 bg-black/40 border border-[#3b82f6]/30 rounded-lg py-1.5 text-center text-sm font-black text-[#3b82f6] outline-none focus:border-[#3b82f6]" placeholder="kg" />
                           </div>
                           <div className="relative">
                               <input type="number" value={l.s || ''} onChange={(e) => updateEntry(l.d, 's', e.target.value)} className="w-16 bg-black/40 border border-[#10b981]/30 rounded-lg py-1.5 text-center text-sm font-black text-[#10b981] outline-none focus:border-[#10b981]" placeholder="steps" />
                           </div>
                           <button onClick={() => remove(l.d)} className="p-2 text-zinc-600 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                       </div>
                   </div>
               ))}
          </div>
      </div>
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
            // Cleanup 'completed' flag before saving to history to keep data clean
            const cleanExercises = JSON.parse(JSON.stringify(activeSession.exercises));
            Object.keys(cleanExercises).forEach(id => {
                cleanExercises[id].sets.forEach((s: any) => delete s.completed);
            });

            const newHistory = [{ d: activeSession.start || Date.now(), t: finalDur, note: note, s: cleanExercises }, ...data.h];
            saveData({ ...data, h: newHistory }); 
            
            updateSession({ start: null, exercises: {} }); 
            setConfirmMode(null);

            setTimeout(() => {
                nav('home'); 
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
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={() => setConfirmMode(null)}>
                    <div className="bg-[#1e1e1e] border border-white/10 p-6 rounded-[2rem] w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white mb-2 uppercase italic tracking-tighter">
                            {confirmMode === 'save' ? 'Training beenden?' : 'Training abbrechen?'}
                        </h3>
                        <p className="text-zinc-400 text-sm font-bold mb-6">
                            {confirmMode === 'save' ? 'Die Einheit wird im Logbuch gespeichert.' : 'Alle Fortschritte dieser Einheit gehen verloren.'}
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmMode(null)} className="flex-1 py-4 bg-zinc-800 rounded-xl font-black text-xs uppercase text-zinc-400">Zurück</button>
                            <button 
                                onClick={confirmMode === 'save' ? performFinish : performAbort} 
                                className={`flex-1 py-4 rounded-xl font-black text-xs uppercase text-black ${confirmMode === 'save' ? 'bg-[#10b981]' : 'bg-red-500'}`}
                            >
                                {confirmMode === 'save' ? 'Speichern' : 'Löschen'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="pt-28 pb-48 px-4 space-y-6">
                {sortedIds.map(id => {
                    const ex = data.db[id]; if(!ex) return null;
                    const sets = activeSession.exercises[id].sets;
                    const prog = calculateProgression(ex, data.h);
                    return (
                        <div key={id} className={`${THEME.card} ${THEME.radius} p-5 border ${THEME.cardBorder}`}>
                            <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-black text-white text-sm uppercase max-w-[70%]">{ex.n}</h3>
                                    <div className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400 font-bold">H: {ex.h}</div>
                            </div>
                            <div className="text-[10px] text-zinc-500 font-bold mb-4 uppercase tracking-widest">ZIEL: <span className="text-[#ffbc0d]">{prog.w}kg x {prog.r}</span></div>
                            <div className="space-y-3">
                                {sets.map((s: any, idx) => (
                                    <div key={idx} className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${s.completed ? 'bg-green-900/20 border-green-500/30' : 'bg-black border-white/5'}`}>
                                        {/* Checkbox */}
                                        <button onClick={() => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets[idx].completed = !s.completed;
                                            updateSession(ns);
                                        }} className={`p-2 rounded-lg transition-colors ${s.completed ? 'text-[#10b981]' : 'text-zinc-600 hover:text-white'}`}>
                                            {s.completed ? <CheckSquare size={24} /> : <Square size={24} />}
                                        </button>

                                        <button onClick={() => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets[idx].type = s.type === 'W' ? 'A' : 'W';
                                            updateSession(ns);
                                        }} className={`w-8 h-8 rounded-full font-bold text-[10px] flex-shrink-0 ${s.type==='W'?'bg-zinc-700':'bg-[#ffbc0d] text-black'}`}>{s.type}</button>
                                        
                                        <input type="number" value={s.w} onChange={e => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets[idx].w = parseFloat(e.target.value);
                                            updateSession(ns);
                                        }} className="w-14 bg-transparent text-center font-black text-lg text-white border-b border-zinc-800 outline-none" />
                                        <span className="text-[9px] font-black text-zinc-600 uppercase">kg</span>
                                        
                                        <input type="number" value={s.r} onChange={e => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets[idx].r = parseInt(e.target.value);
                                            updateSession(ns);
                                        }} className="w-10 bg-transparent text-center font-black text-lg text-white border-b border-zinc-800 outline-none" />
                                        <span className="text-[9px] font-black text-zinc-600 uppercase">x</span>
                                        
                                        <button onClick={() => {
                                            const ns = JSON.parse(JSON.stringify(activeSession));
                                            ns.exercises[id].sets.splice(idx,1);
                                            updateSession(ns);
                                        }} className="ml-auto text-zinc-800 pl-1"><X size={14}/></button>
                                    </div>
                                ))}
                                <button onClick={() => {
                                    const ns = JSON.parse(JSON.stringify(activeSession));
                                    ns.exercises[id].sets.push({w:0,r:10,type:'A',rpe:8, completed: false}); 
                                    updateSession(ns);
                                }} className="w-full py-2 bg-[#2c2c2c] rounded-lg text-[10px] font-bold text-zinc-500 uppercase">+ Satz hinzufügen</button>
                            </div>
                        </div>
                    );
                })}
                
                <div className="space-y-4 pt-4">
                    <button type="button" onClick={() => setConfirmMode('save')} className="relative z-10 w-full py-5 bg-[#10b981] text-black rounded-2xl font-black text-xl shadow-xl uppercase tracking-tighter flex items-center justify-center gap-2 active:scale-95 transition-transform cursor-pointer">
                        <Check size={28} strokeWidth={3} /> Einheit Speichern
                    </button>

                    <div className={`${THEME.card} p-4 rounded-2xl relative z-0`}>
                        <textarea placeholder="Notizen zur Einheit..." value={note} onChange={e=>setNote(e.target.value)} className="w-full bg-black/30 text-white text-sm p-3 rounded-xl border border-white/10 h-24" />
                    </div>
                    
                    <button type="button" onClick={() => setConfirmMode('abort')} className="relative z-10 w-full py-4 bg-zinc-900 text-zinc-500 rounded-2xl font-black text-xs uppercase border border-white/5 hover:text-red-500 transition-colors cursor-pointer">
                        Abbruch & Löschen
                    </button>
                </div>
            </div>
          </div>
      );
  };

// --- MAIN APP ---

const App = () => {
  const [data, setData] = useState<AppData>(FALLBACK_DATA);
  const [view, setView] = useState<string>('home');
  // Initialized from localStorage to prevent loss on reload
  const [activeSession, setActiveSession] = useState<ActiveSession>(() => {
      try { 
        const saved = localStorage.getItem('tm_session');
        return saved ? JSON.parse(saved) : { start: null, exercises: {} }; 
      } catch { return { start: null, exercises: {} }; }
  });

  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => {
      const saved = localStorage.getItem('tm_gh_config');
      const defaults = { token: '', owner: 'maxx4144136', repo: 'AIStudio-Trainingsapp', path: 'data.json' };
      try { 
          const parsed = saved ? JSON.parse(saved) : {};
          return {
              token: parsed.token || defaults.token,
              owner: parsed.owner || defaults.owner,
              repo: parsed.repo || defaults.repo,
              path: parsed.path || defaults.path
          };
      } catch { return defaults; }
  });
  const [toast, setToast] = useState<string | null>(null);
  const [analyticsEx, setAnalyticsEx] = useState<string | null>(null);
  const [editTimestamp, setEditTimestamp] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const nav = (id: string) => { 
      if(id !== 'stats') setAnalyticsEx(null);
      if(id !== 'history-edit') setEditTimestamp(null);
      setView(id); 
      window.scrollTo(0,0); 
  };

  useEffect(() => {
    // Checkpoint log
    console.log("V27.24 STABLE CHECKPOINT LOADED");
    
    const localData = localStorage.getItem('tm_data');
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        const localTimestamps = new Set(parsed.h.map((l: any) => l.d));
        const missingFromHardcoded = FALLBACK_DATA.h.filter(l => !localTimestamps.has(l.d));
        if (missingFromHardcoded.length > 0) {
            parsed.h = [...missingFromHardcoded, ...parsed.h].sort((a: any, b: any) => b.d - a.d);
            localStorage.setItem('tm_data', JSON.stringify(parsed));
        }
        if (!parsed.userSupps) parsed.userSupps = FALLBACK_DATA.userSupps;
        if (!parsed.weekPlan) parsed.weekPlan = FALLBACK_DATA.weekPlan;
        if (!parsed.timeLimits) parsed.timeLimits = FALLBACK_DATA.timeLimits;
        
        setData(parsed);
      } catch(e) {
        console.error("Local Storage Error", e);
        setData(FALLBACK_DATA);
      }
    } else {
        localStorage.setItem('tm_data', JSON.stringify(FALLBACK_DATA));
    }
  }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };
  const saveData = (newData: AppData) => { setData(newData); localStorage.setItem('tm_data', JSON.stringify(newData)); };
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

  /* --- VIEWS --- */

  const HomeView = () => {
    const vol = getWeeklyVolume();
    const today = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long' });
    const bw = data.bodyLogs.length > 0 ? data.bodyLogs[0].w : "--";
    
    return (
      <div className="pt-28 pb-32 px-4 space-y-6 animate-fade-in">
        <div className="flex justify-between items-end mb-4">
            <div>
                <div className="text-[#ffbc0d] font-black text-[10px] uppercase tracking-[0.3em] mb-1">Dashboard</div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">{today}</h2>
            </div>
            <div onClick={() => nav('body')} className="bg-[#1e1e1e] border border-white/5 rounded-2xl px-4 py-2 text-right">
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Gewicht & Steps</div>
                <div className="text-lg font-black text-[#3b82f6]">{bw} kg</div>
            </div>
        </div>

        <button onClick={() => nav('selection')} className="w-full py-6 bg-[#ffbc0d] text-black rounded-[2.5rem] font-black text-2xl shadow-lg shadow-[#ffbc0d]/20 active:scale-95 transition-transform flex items-center justify-center gap-3 border-b-4 border-[#e0a800]">
            <Zap size={28} className="fill-black" /> WORKOUT STARTEN
        </button>

        <div className="grid grid-cols-2 gap-3">
             <button onClick={() => nav('tennis')} className={`${THEME.card} p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 active:scale-95`}>
                <Activity size={24} className="text-[#10b981]" />
                <span className="text-[10px] font-black uppercase">Tennis Log</span>
             </button>
             <button onClick={() => nav('supps')} className={`${THEME.card} p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 active:scale-95`}>
                <Pill size={24} className="text-[#a855f7]" />
                <span className="text-[10px] font-black uppercase">Supplements</span>
             </button>
             
             <button onClick={() => nav('stats')} className={`${THEME.card} p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 active:scale-95`}>
                <BarChart3 size={24} className="text-[#3b82f6]" />
                <span className="text-[10px] font-black uppercase">Progress</span>
             </button>

             <button onClick={() => nav('history')} className={`${THEME.card} p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 active:scale-95`}>
                <History size={24} className="text-[#f97316]" />
                <span className="text-[10px] font-black uppercase text-zinc-300">Logbuch</span>
             </button>

             <button onClick={() => nav('ai')} className={`${THEME.card} p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-2 active:scale-95 col-span-2 bg-gradient-to-r from-indigo-900/40 to-purple-900/40`}>
                <Cpu size={24} className="text-white" />
                <span className="text-[10px] font-black uppercase text-white">KI Analyse Scope Generator</span>
             </button>
        </div>

        <div className={`${THEME.card} p-6 rounded-[2.5rem] border border-white/5 shadow-2xl`}>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-white font-black text-sm uppercase italic">Wochenvolumen</h3>
                <span className="text-[10px] bg-black/50 px-3 py-1 rounded-full text-zinc-500 font-black uppercase">Target: 20</span>
            </div>
            <div className="space-y-4">
                {CAT_ORDER.map(cat => {
                    const current = vol[cat] || 0;
                    const goal = data.goals[cat as MuscleGroup] || 20;
                    const pct = Math.min(100, (current / goal) * 100);
                    return (
                        <div key={cat} className="space-y-2">
                            <div className="flex justify-between items-end px-1">
                                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{cat}</span>
                                <span className="text-[10px] font-black text-white italic">{current} / {goal}</span>
                            </div>
                            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                                <div className={`h-full transition-all duration-1000 ease-out ${current >= goal ? 'bg-[#ffbc0d] shadow-[0_0_10px_#ffbc0d44]' : 'bg-zinc-700'}`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      </div>
    );
  };

  const PlanView = () => {
      const toggleDay = (idx: number) => {
          const types = ["Push", "Pull", "Legs/Arms", "Rest"];
          const current = data.weekPlan[idx];
          let next = types[0];
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
            .sort((a,b) => (a.prio || 99) - (b.prio || 99));
          
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
          <div className="pt-28 pb-32 px-4 space-y-6 animate-fade-in">
              <div className={`${THEME.card} p-6 rounded-3xl border border-white/5`}>
                  <h2 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter">Wochenplanung</h2>
                  <div className="grid grid-cols-1 gap-3">
                      {DAY_NAMES.map((day, i) => (
                          <div key={i} className={`p-4 rounded-2xl border border-white/5 flex justify-between items-center ${data.weekPlan[i] ? 'bg-zinc-900' : 'bg-transparent opacity-50'}`}>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-6 font-black text-zinc-500">{day}</div>
                                    <button onClick={() => toggleDay(i)} className={`px-3 py-1 rounded-lg font-bold text-[10px] uppercase min-w-[80px] text-center transition-colors ${!data.weekPlan[i] ? 'bg-red-900/20 text-red-500' : 'bg-[#ffbc0d] text-black'}`}>
                                        {data.weekPlan[i] || "REST"}
                                    </button>
                                </div>
                                {data.weekPlan[i] && (
                                    <div className="flex items-center gap-2">
                                        <input type="number" value={data.timeLimits[i]} onChange={(e) => updateTime(i, parseInt(e.target.value))} className="w-10 bg-black rounded text-center text-[10px] py-1 font-mono text-zinc-400 border border-white/10" />
                                        <span className="text-[9px] text-zinc-600 font-black">MIN</span>
                                    </div>
                                )}
                              </div>
                              {data.weekPlan[i] && (
                                  <button onClick={() => startPlannedSession(i)} className="bg-[#2c2c2c] p-3 rounded-xl hover:bg-[#ffbc0d] hover:text-black transition-colors">
                                      <Play size={18} fill="currentColor" />
                                  </button>
                              )}
                          </div>
                      ))}
                  </div>
              </div>
          </div>
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
          <div className="pt-28 pb-32 px-4 space-y-6 animate-fade-in">
              <div className={`${THEME.card} p-6 rounded-3xl border border-white/5`}>
                  <h2 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter flex items-center gap-2"><Pill className="text-[#a855f7]"/> Supplemente</h2>
                  <div className="space-y-2">
                      {data.userSupps.map((s, i) => (
                          <div key={i} className="flex gap-2">
                              <input value={s.n} onChange={e=>updateSupp(i,'n',e.target.value)} placeholder="Name" className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm font-bold text-white" />
                              <input value={s.val} onChange={e=>updateSupp(i,'val',e.target.value)} placeholder="Menge" className="w-20 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm font-bold text-[#a855f7] text-center" />
                              <input value={s.unit} onChange={e=>updateSupp(i,'unit',e.target.value)} placeholder="Einheit" className="w-16 bg-black/40 border border-white/10 rounded-xl px-3 py-3 text-sm font-bold text-zinc-500 text-center" />
                              <button onClick={() => removeSupp(i)} className="text-zinc-600 hover:text-red-500 px-2"><X size={18}/></button>
                          </div>
                      ))}
                  </div>
                  <button onClick={addSupp} className="w-full mt-4 py-3 bg-[#2c2c2c] rounded-xl font-bold text-xs uppercase text-zinc-400">+ Eintrag</button>
              </div>
          </div>
      );
  };

  const TennisView = () => {
      const [res, setRes] = useState("");
      const [dur, setDur] = useState("60");
      const [outcome, setOutcome] = useState("Sieg");
      
      const saveMatch = () => {
          const log: any = {
              d: Date.now(),
              t: new Date(parseInt(dur)*60000).toISOString().substr(11,8),
              note: `Tennis Match: ${res} (${outcome})`,
              s: { 'tennis_1': { sets: [{w: parseInt(dur), r: 1, type: 'A'}] } }
          };
          saveData({...data, h: [log, ...data.h]});
          showToast("Match gespeichert! 🎾");
          nav('home');
      };

      return (
          <div className="pt-28 pb-32 px-4 animate-fade-in">
              <div className={`${THEME.card} p-6 rounded-3xl border border-white/5`}>
                  <h2 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter flex items-center gap-2"><Activity className="text-[#10b981]"/> Tennis Log</h2>
                  <div className="space-y-4">
                      <div>
                          <label className="text-[10px] text-zinc-500 font-bold uppercase">Ergebnis</label>
                          <input value={res} onChange={e=>setRes(e.target.value)} placeholder="6:4, 6:2" className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Dauer (Min)</label>
                              <input type="number" value={dur} onChange={e=>setDur(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold" />
                          </div>
                          <div>
                              <label className="text-[10px] text-zinc-500 font-bold uppercase">Ausgang</label>
                              <select value={outcome} onChange={e=>setOutcome(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl p-4 text-white font-bold">
                                  <option>Sieg</option>
                                  <option>Niederlage</option>
                              </select>
                          </div>
                      </div>
                      <button onClick={saveMatch} className="w-full py-4 bg-[#10b981] text-black font-black rounded-2xl mt-4 shadow-lg">MATCH SPEICHERN</button>
                  </div>
              </div>
          </div>
      );
  };

  const AIView = () => {
      const [startD, setStartD] = useState(() => { const d=new Date(); d.setDate(d.getDate()-14); return d.toISOString().split('T')[0]; });
      const [endD, setEndD] = useState(() => new Date().toISOString().split('T')[0]);

      const copyScope = () => {
          const sTs = new Date(startD).getTime();
          const eTs = new Date(endD).setHours(23,59,59,999);
          const relH = data.h.filter(l => l.d >= sTs && l.d <= eTs);
          const relB = data.bodyLogs.filter(l => new Date(l.d).getTime() >= sTs && new Date(l.d).getTime() <= eTs);
          const prompt = `*** MEDICAL ANALYTICAL SCOPE ***\nUser Profile: ${data.userProfile}\nStatus: ${data.userCalStatus}\nSupplements: ${JSON.stringify(data.userSupps)}\n\nTRAINING DATA (${startD} to ${endD}):\n${JSON.stringify(relH)}\n\nBODY DATA:\n${JSON.stringify(relB)}\n\nTASK: Analyze progression, volume load, and recovery indicators based on this dataset.`;
          navigator.clipboard.writeText(prompt);
          showToast("Daten in Zwischenablage! 📋");
          setTimeout(() => window.open("https://gemini.google.com/app", "_blank"), 1500);
      };

      return (
          <div className="pt-28 pb-32 px-4 animate-fade-in">
              <div className={`${THEME.card} p-6 rounded-3xl border border-white/5`}>
                  <h2 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter flex items-center gap-2"><Cpu className="text-indigo-400"/> AI Scope</h2>
                  <div className="space-y-4">
                      <div><label className="text-xs font-bold text-zinc-500">Von</label><input type="date" value={startD} onChange={e=>setStartD(e.target.value)} className="w-full bg-black rounded-xl p-3 text-white border border-white/10"/></div>
                      <div><label className="text-xs font-bold text-zinc-500">Bis</label><input type="date" value={endD} onChange={e=>setEndD(e.target.value)} className="w-full bg-black rounded-xl p-3 text-white border border-white/10"/></div>
                      <button onClick={copyScope} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-lg mt-4 flex items-center justify-center gap-2"><Copy size={18}/> DATEN KOPIEREN & ÖFFNEN</button>
                  </div>
              </div>
          </div>
      );
  };

  const ProfileView = () => (
      <div className="pt-28 pb-32 px-4 space-y-6 animate-fade-in">
          <div className={`${THEME.card} p-6 rounded-3xl border border-white/5`}>
              <h2 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter">Profil & Ziele</h2>
              <div className="space-y-4">
                  <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Kalorien Status</label>
                      <div className="flex bg-black/40 rounded-xl p-1 border border-white/10 mt-1">
                          {['cut', 'main', 'bulk'].map(s => (
                              <button key={s} onClick={()=>saveData({...data, userCalStatus: s})} className={`flex-1 py-3 rounded-lg font-black text-xs uppercase ${data.userCalStatus===s ? 'bg-[#ffbc0d] text-black' : 'text-zinc-500'}`}>{s}</button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">Biometrie & Ziele</label>
                      <textarea value={data.userProfile} onChange={e=>saveData({...data, userProfile: e.target.value})} className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-zinc-300 font-medium leading-relaxed" />
                  </div>
              </div>
          </div>
          <button onClick={()=>nav('settings')} className={`${THEME.card} w-full p-5 rounded-2xl flex justify-between items-center border border-white/5`}>
              <span className="font-bold text-zinc-300">System Einstellungen</span>
              <Settings className="text-zinc-500"/>
          </button>
          <button onClick={() => nav('ex-config')} className={`${THEME.card} w-full p-5 rounded-2xl flex justify-between items-center border border-white/5`}>
              <span className="font-bold text-zinc-300">Übungen Konfigurieren</span>
              <Edit3 className="text-zinc-500"/>
          </button>
      </div>
  );

  const ExerciseConfigView = () => (
      <div className="pt-28 pb-32 px-4 animate-fade-in">
          <div className={`${THEME.card} p-4 rounded-3xl border border-white/5`}>
              <h2 className="text-xl font-black text-white mb-4 uppercase italic">Übungs-Config</h2>
              <div className="space-y-2">
                  {(Object.values(data.db) as ExerciseDef[]).map(ex => (
                      <div key={ex.id} className="bg-black/40 p-4 rounded-xl border border-white/5">
                          <div className="flex justify-between mb-2">
                              <span className="font-bold text-white text-sm">{ex.n}</span>
                              <span className="text-[10px] bg-zinc-800 px-2 py-1 rounded text-zinc-400">{ex.c}</span>
                          </div>
                          <div className="flex gap-2">
                              <label className="flex items-center gap-2 bg-black p-2 rounded-lg border border-white/10">
                                  <span className="text-[10px] text-zinc-500 font-bold">H</span>
                                  <input type="number" value={ex.h} onChange={(e) => {
                                      const nd = {...data}; nd.db[ex.id].h = e.target.value; saveData(nd);
                                  }} className="w-8 bg-transparent text-white font-bold text-center text-sm outline-none"/>
                              </label>
                              <label className="flex items-center gap-2 bg-black p-2 rounded-lg border border-white/10 flex-1">
                                  <span className="text-[10px] text-zinc-500 font-bold">Prio</span>
                                  <input type="number" value={ex.prio || 99} onChange={(e) => {
                                      const nd = {...data}; nd.db[ex.id].prio = parseInt(e.target.value); saveData(nd);
                                  }} className="w-full bg-transparent text-white font-bold text-center text-sm outline-none"/>
                              </label>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
  );

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
              <div className="pt-28 pb-32 px-4 animate-fade-in">
                  <h2 className="text-xl font-black text-[#ffbc0d] mb-6 uppercase tracking-tighter text-center italic">{data.db[analyticsEx]?.n}</h2>
                  <div className="h-72 w-full bg-[#1e1e1e] rounded-[2rem] p-4 mb-8 border border-white/5 shadow-2xl">
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
                      <h3 className="text-zinc-500 font-bold text-xs uppercase tracking-widest pl-2">Letzte 5 Einheiten</h3>
                      {last5Logs.map(log => {
                           const sessionSets = log.s[analyticsEx].sets.filter(s => s.type === 'A');
                           return (
                               <div key={log.d} className="bg-[#1e1e1e] border border-white/5 p-4 rounded-2xl flex justify-between items-center shadow-lg">
                                   <div className="text-xs font-bold text-zinc-400">{new Date(log.d).toLocaleDateString()}</div>
                                   <div className="flex flex-col items-end gap-1">
                                      {sessionSets.map((s, i) => (
                                          <div key={i} className="text-sm font-black text-white flex items-center gap-2">
                                              <span>{s.w}kg</span>
                                              <span className="text-zinc-600 text-[10px]">x</span>
                                              <span>{s.r}</span>
                                          </div>
                                      ))}
                                   </div>
                               </div>
                           )
                      })}
                  </div>

                  <button onClick={()=>setAnalyticsEx(null)} className="w-full py-4 bg-[#2c2c2c] rounded-2xl font-black shadow-xl active:scale-95">ZURÜCK ZUR LISTE</button>
              </div>
          );
      }
      return (
          <div className="pt-28 pb-32 px-4 space-y-4 animate-fade-in">
              {CAT_ORDER.map(cat => (
                  <div key={cat} className={`${THEME.card} p-5 rounded-3xl border border-white/5`}>
                      <h3 className="text-[#ffbc0d] text-[10px] font-black uppercase mb-3 tracking-widest">{cat}</h3>
                      <div className="space-y-1">
                          {(Object.values(data.db) as ExerciseDef[]).filter(ex=>ex.c===cat).map(ex => (
                              <button key={ex.id} onClick={()=>setAnalyticsEx(ex.id)} className="w-full flex justify-between p-4 rounded-xl hover:bg-white/5 transition-all text-left">
                                  <span className="text-sm font-bold text-zinc-300">{ex.n}</span>
                                  <div className="bg-black/50 px-3 py-1 rounded-full border border-white/10 flex items-baseline gap-1">
                                      <span className="text-[#ffbc0d] font-black text-xs">{freq[ex.id] || 0}</span>
                                      <span className="text-[8px] text-zinc-600 font-black uppercase ml-1">Mal</span>
                                  </div>
                              </button>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      );
  };

  const HistoryView = () => {
    const sortedHistory = useMemo(() => [...data.h].sort((a, b) => b.d - a.d), [data.h]);
    return (
      <div className="pt-28 pb-32 px-4 space-y-4 animate-fade-in">
          {sortedHistory.map((log, i) => (
              <div key={log.d} className="bg-[#1e1e1e] p-5 rounded-3xl border-l-4 border-l-[#ffbc0d] relative shadow-lg">
                  <div className="flex justify-between items-start mb-4">
                      <div>
                          <div className="text-white font-black text-xl italic">{new Date(log.d).toLocaleDateString('de-DE')}</div>
                          <div className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.3em] font-mono">{log.t} DUR</div>
                          {log.note && <div className="text-xs text-zinc-500 mt-1 italic">"{log.note}"</div>}
                      </div>
                      <div className="flex gap-2">
                          <button onClick={()=> {setEditTimestamp(log.d); nav('history-edit');}} className="bg-zinc-800/50 text-zinc-300 hover:bg-[#ffbc0d] hover:text-black transition-all p-2 rounded-xl"><Edit3 size={18}/></button>
                          <button onClick={(e)=> { e.stopPropagation(); setConfirmDeleteId(log.d); }} className="bg-zinc-800/50 text-zinc-300 hover:bg-red-900/30 hover:text-red-500 transition-all p-2 rounded-xl cursor-pointer relative z-10"><Trash2 size={18}/></button>
                      </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {Object.keys(log.s).map(id=>(
                        <span key={id} className="text-[10px] bg-black/60 px-3 py-1.5 rounded-xl text-zinc-400 font-black border border-white/5 shadow-inner">
                            {data.db[id]?.n.substring(0, 24)}{data.db[id]?.n.length > 24 ? "..." : ""}
                        </span>
                      ))}
                  </div>
              </div>
          ))}
      </div>
    );
  };

  const HistoryEditView = () => {
      if (!editTimestamp) return null;
      const logIdx = data.h.findIndex(l => l.d === editTimestamp);
      if (logIdx === -1) { nav('history'); return null; }
      
      const [localLog, setLocalLog] = useState<WorkoutLog>(JSON.parse(JSON.stringify(data.h[logIdx])));

      const save = () => {
          const newData = {...data};
          newData.h[logIdx] = localLog;
          saveData(newData);
          setEditTimestamp(null);
          nav('history');
          showToast("Änderungen gespeichert! ✅");
      };

      const sortedIds = Object.keys(localLog.s).sort((a, b) => (localLog.s[a].order || 0) - (localLog.s[b].order || 0));

      return (
          <div className="pt-28 pb-32 px-4 space-y-6 animate-fade-in">
              <div className={`${THEME.card} p-6 rounded-3xl border border-white/5`}>
                  <div className="flex justify-between items-center mb-4">
                      <span className="text-zinc-500 font-bold text-xs uppercase">Datum</span>
                      <span className="text-white font-black text-xl">{new Date(localLog.d).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                      <span className="text-zinc-500 font-bold text-xs uppercase">Dauer</span>
                      <input value={localLog.t} onChange={e=>setLocalLog({...localLog, t:e.target.value})} className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono font-bold text-center w-32"/>
                  </div>
                  <div>
                      <span className="text-zinc-500 font-bold text-xs uppercase block mb-2">Notiz</span>
                      <textarea value={localLog.note} onChange={e=>setLocalLog({...localLog, note:e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white h-20"/>
                  </div>
              </div>

              {sortedIds.map(id => {
                  const exDef = data.db[id];
                  const exData = localLog.s[id];
                  return (
                      <div key={id} className={`${THEME.card} p-5 rounded-3xl border border-white/5`}>
                          <h3 className="font-black text-white text-sm uppercase mb-4">{exDef?.n || id}</h3>
                          <div className="space-y-2">
                              {exData.sets.map((s, sIdx) => (
                                  <div key={sIdx} className="flex items-center gap-2">
                                      <div className="w-4 text-[10px] font-bold text-zinc-600">#{sIdx+1}</div>
                                      
                                      <input type="number" value={s.w} onChange={e=>{
                                          const ns = {...localLog};
                                          ns.s[id].sets[sIdx].w = parseFloat(e.target.value);
                                          setLocalLog(ns);
                                      }} className="w-14 bg-black/40 border-b border-white/10 text-white font-black text-center py-1 outline-none"/>
                                      <span className="text-[8px] text-zinc-600">KG</span>
                                      
                                      <input type="number" value={s.r} onChange={e=>{
                                          const ns = {...localLog};
                                          ns.s[id].sets[sIdx].r = parseInt(e.target.value);
                                          setLocalLog(ns);
                                      }} className="w-10 bg-black/40 border-b border-white/10 text-white font-black text-center py-1 outline-none"/>
                                      <span className="text-[8px] text-zinc-600">REPS</span>

                                      <input type="number" value={s.rpe !== undefined ? s.rpe : ''} onChange={e=>{
                                          const ns = {...localLog};
                                          ns.s[id].sets[sIdx].rpe = parseFloat(e.target.value);
                                          setLocalLog(ns);
                                      }} className="w-10 bg-black/40 border-b border-white/10 text-[#ffbc0d] font-black text-center py-1 outline-none"/>
                                      <span className="text-[8px] text-zinc-600">RIR</span>

                                      <button onClick={()=>{
                                          const ns = {...localLog};
                                          ns.s[id].sets.splice(sIdx, 1);
                                          setLocalLog(ns);
                                      }} className="ml-auto text-zinc-700 hover:text-red-500 pl-2"><X size={16}/></button>
                                  </div>
                              ))}
                              <button onClick={()=>{
                                  const ns = {...localLog};
                                  ns.s[id].sets.push({w:0, r:0, type:'A'});
                                  setLocalLog(ns);
                              }} className="w-full py-2 mt-2 bg-zinc-800/50 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase">+ Satz</button>
                          </div>
                      </div>
                  );
              })}

              <div className="flex gap-3">
                  <button onClick={()=>nav('history')} className="flex-1 py-4 bg-zinc-800 rounded-2xl font-black text-xs uppercase text-zinc-400">Abbrechen</button>
                  <button onClick={save} className="flex-[2] py-4 bg-[#ffbc0d] text-black rounded-2xl font-black text-sm uppercase shadow-lg">Speichern</button>
              </div>
          </div>
      );
  };

  const SelectionView = () => (
      <div className="pt-28 pb-40 px-4 space-y-6 animate-fade-in">
        {CAT_ORDER.map(cat => (
            <div key={cat} className={`${THEME.card} ${THEME.radius} p-5 border ${THEME.cardBorder}`}>
                <h3 className="text-[#ffbc0d] font-black uppercase mb-4 pl-2 tracking-wider text-xs">{cat}</h3>
                <div className="space-y-2">
                    {(Object.values(data.db) as ExerciseDef[]).filter(ex => ex.c === cat).sort((a,b)=> (a.prio||99)-(b.prio||99)).map(ex => {
                        const isSelected = !!activeSession.exercises[ex.id];
                        return (
                            <div key={ex.id} onClick={() => {
                                const ns = { ...activeSession };
                                if (ns.exercises[ex.id]) delete ns.exercises[ex.id];
                                else ns.exercises[ex.id] = { sets: [], order: Object.keys(ns.exercises).length + 1 };
                                updateSession(ns);
                            }} className={`w-full flex justify-between items-center p-4 rounded-2xl border transition-all cursor-pointer ${isSelected ? 'bg-[#ffbc0d] text-black border-[#ffbc0d] scale-[1.02]' : 'bg-[#121212] text-zinc-400 border-white/5'}`}>
                                <span className="font-bold text-sm text-left">{ex.n}</span>
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
                                        className="w-12 h-10 bg-white text-black font-black text-xl text-center rounded-xl shadow-inner focus:outline-none"
                                    />
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-zinc-600"></div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        ))}
        <div className="fixed bottom-24 left-4 right-4">
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

                     updateSession(ns);
                     nav('training');
                 }
             }} className="w-full py-5 bg-[#ffbc0d] text-black rounded-2xl font-black text-xl shadow-xl border-b-4 border-[#e0a800]">
                TRAINING STARTEN ({Object.keys(activeSession.exercises).length})
             </button>
        </div>
      </div>
  );

  const SettingsView = () => {
      const [localCfg, setLocalCfg] = useState<GitHubConfig>(() => {
          const saved = localStorage.getItem('tm_gh_config');
          const defaults = { token: '', owner: 'maxx4144136', repo: 'AIStudio-Trainingsapp', path: 'data.json' };
          try { 
              const parsed = saved ? JSON.parse(saved) : {};
              return {
                  token: parsed.token || defaults.token,
                  owner: parsed.owner || defaults.owner,
                  repo: parsed.repo || defaults.repo,
                  path: parsed.path || defaults.path
              };
          } catch { return defaults; }
      });
      
      const saveConfig = () => {
          setGhConfig(localCfg);
          localStorage.setItem('tm_gh_config', JSON.stringify(localCfg));
          showToast("Config gespeichert! ⚙️");
      };

      const load = async () => {
          const loaded = await fetchFromGitHub(ghConfig);
          if(loaded) {
              saveData(loaded);
              showToast("Daten geladen! 📥");
          } else {
              showToast("Fehler beim Laden ❌");
          }
      };

      const push = async () => {
          const success = await saveToGitHub(ghConfig, data);
          if(success) showToast("Daten gespeichert! ☁️");
          else showToast("Fehler beim Speichern ❌");
      };

      const verifySync = async () => {
          const remote = await fetchFromGitHub(ghConfig);
          if (!remote) {
              showToast("Verbindung fehlgeschlagen ❌");
              return;
          }

          const localCount = data.h.length;
          const remoteCount = remote.h.length;
          // Sort to ensure we get the latest
          const localLast = [...data.h].sort((a,b) => b.d - a.d)[0]?.d || 0;
          const remoteLast = [...remote.h].sort((a,b) => b.d - a.d)[0]?.d || 0;

          if (localCount === remoteCount && localLast === remoteLast) {
              showToast("Daten sind synchron! ✅");
          } else if (localLast > remoteLast) {
              showToast(`Lokal ist neuer (${localCount} vs ${remoteCount}) ⚠️`);
          } else {
              showToast(`GitHub ist neuer (${remoteCount} vs ${localCount}) 📥`);
          }
      };

      const reset = () => {
          if(confirm("Alles zurücksetzen?")) {
              saveData(FALLBACK_DATA);
              showToast("Reset erfolgreich 🔄");
          }
      }

      return (
          <div className="pt-28 pb-32 px-4 space-y-6 animate-fade-in">
              <div className={`${THEME.card} p-6 rounded-3xl border border-white/5`}>
                  <h2 className="text-xl font-black text-white mb-6 uppercase italic tracking-tighter flex items-center gap-2"><Settings className="text-zinc-500"/> System</h2>
                  
                  <div className="space-y-4 mb-6">
                      <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">GitHub Sync</h3>
                      <input value={localCfg.token} onChange={e=>setLocalCfg({...localCfg, token: e.target.value})} placeholder="Token" type="password" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-mono" />
                      <input value={localCfg.owner} onChange={e=>setLocalCfg({...localCfg, owner: e.target.value})} placeholder="Owner (z.B. DeinUser)" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-mono" />
                      <input value={localCfg.repo} onChange={e=>setLocalCfg({...localCfg, repo: e.target.value})} placeholder="Repo (z.B. training-data)" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-mono" />
                      <input value={localCfg.path} onChange={e=>setLocalCfg({...localCfg, path: e.target.value})} placeholder="Path (data.json)" className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white font-mono" />
                      <button onClick={saveConfig} className="w-full py-3 bg-zinc-800 rounded-xl font-bold text-xs uppercase text-zinc-300">Config Speichern</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                      <button onClick={load} className="py-4 bg-blue-900/30 text-blue-400 rounded-2xl font-black border border-blue-900/50 flex flex-col items-center gap-2">
                          <span className="text-2xl">📥</span>
                          <span className="text-[10px] uppercase">Laden</span>
                      </button>
                      <button onClick={push} className="py-4 bg-green-900/30 text-green-400 rounded-2xl font-black border border-green-900/50 flex flex-col items-center gap-2">
                          <span className="text-2xl">☁️</span>
                          <span className="text-[10px] uppercase">Speichern</span>
                      </button>
                  </div>
                  
                  <button onClick={verifySync} className="w-full py-4 bg-zinc-800 text-zinc-300 rounded-2xl font-black border border-zinc-700 flex items-center justify-center gap-2">
                      <Search size={18} />
                      <span className="text-xs uppercase">Sync Prüfen</span>
                  </button>

                   <button onClick={reset} className="w-full mt-6 py-4 bg-red-900/20 text-red-500 rounded-2xl font-black text-xs uppercase border border-red-900/30">
                      APP RESET (DANGER)
                   </button>
                   
                   <div className="mt-6 pt-6 border-t border-white/5">
                        <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4">Export</h3>
                        <button onClick={() => {
                            const html = generateSnapshotHTML(data);
                            const blob = new Blob([html], {type: "text/html"});
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url;
                            a.download = `snapshot_${new Date().toISOString().split('T')[0]}.html`;
                            a.click();
                        }} className="w-full py-3 bg-zinc-800 rounded-xl font-bold text-xs uppercase text-zinc-300">
                            Download HTML Snapshot
                        </button>
                   </div>
              </div>
          </div>
      );
  };

  const srcMap: Record<string, any> = { home: HomeView, plan: PlanView, supps: SuppsView, tennis: TennisView, profile: ProfileView, ai: AIView, 'ex-config': ExerciseConfigView, selection: SelectionView, stats: AnalyticsView, history: HistoryView, 'history-edit': HistoryEditView, settings: SettingsView };
  const CurrentComp = srcMap[view] || HomeView;
  const titleMap: Record<string, string> = { home:'DASHBOARD', plan:'PLANUNG', supps:'STACK', tennis:'COURT', profile:'PROFIL', ai:'INTELLIGENCE', 'ex-config':'CONFIG', selection:'AUSWAHL', training:'WORKOUT', stats:'ANALYSE', history:'LOGBUCH', 'history-edit':'EDIT LOG', body:'METRICS', settings:'SYSTEM' };

  return (
    <div className={`min-h-screen ${THEME.bg} text-white font-sans selection:bg-[#ffbc0d]/20 overflow-x-hidden`}>
      <Header title={titleMap[view] || 'APP'} showBack={view !== 'home'} onBack={() => nav('home')} onSnapshot={() => nav('settings')}/>
      {toast && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#ffbc0d] text-black font-black px-8 py-4 rounded-full z-[100] shadow-2xl animate-fade-in border-2 border-white">{toast}</div>}
      
      {confirmDeleteId !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={()=>setConfirmDeleteId(null)}>
              <div className="bg-[#1e1e1e] border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative" onClick={e=>e.stopPropagation()}>
                 <h3 className="text-xl font-black text-white mb-4 uppercase italic tracking-tighter">Warnung</h3>
                 <p className="text-zinc-300 text-sm font-bold mb-8">Einheit wirklich löschen ?</p>
                 <div className="flex gap-3">
                    <button onClick={() => setConfirmDeleteId(null)} className="flex-1 py-4 bg-zinc-800 rounded-xl font-black text-xs uppercase text-zinc-400">Abbrechen</button>
                    <button onClick={executeDelete} className="flex-1 py-4 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-lg shadow-red-900/20">Löschen</button>
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

export default App;