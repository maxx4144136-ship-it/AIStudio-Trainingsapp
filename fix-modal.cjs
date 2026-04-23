const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Remove from PlanView
code = code.replace(
`                  {confirmDeleteAILogId !== null && (
                      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setConfirmDeleteAILogId(null)}>
                          <div className="bg-surface-container border border-white/5 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative animate-slide-up" onClick={e=>e.stopPropagation()}>
                             <h3 className="font-headline text-xl font-black text-on-surface mb-4 tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-error text-[24px]">warning</span> Warnung</h3>
                             <p className="text-on-surface-variant font-body text-sm mb-8">Diese gespeicherte Analyse wirklich löschen?</p>
                             <div className="flex gap-3">
                                <button onClick={() => setConfirmDeleteAILogId(null)} className="flex-1 py-4 bg-surface-container-highest rounded-2xl font-label font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Abbrechen</button>
                                <button onClick={deleteAILog} className="flex-1 py-4 bg-error-container text-error rounded-2xl font-label font-bold text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(255,84,73,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all">Löschen</button>
                             </div>
                          </div>
                      </div>
                  )}`,
''
);

// 2. Add inside AIView
const modalCode = `
                  {confirmDeleteAILogId !== null && (
                      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setConfirmDeleteAILogId(null)}>
                          <div className="bg-surface-container border border-white/5 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative animate-slide-up" onClick={e=>e.stopPropagation()}>
                             <h3 className="font-headline text-xl font-black text-on-surface mb-4 tracking-tighter flex items-center gap-2"><span className="material-symbols-outlined text-error text-[24px]">warning</span> Warnung</h3>
                             <p className="text-on-surface-variant font-body text-sm mb-8">Diese gespeicherte Analyse wirklich löschen?</p>
                             <div className="flex gap-3">
                                <button onClick={() => setConfirmDeleteAILogId(null)} className="flex-1 py-4 bg-surface-container-highest rounded-2xl font-label font-bold text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface transition-colors">Abbrechen</button>
                                <button onClick={deleteAILog} className="flex-1 py-4 bg-error-container text-error rounded-2xl font-label font-bold text-[10px] uppercase tracking-widest shadow-[0_0_20px_rgba(255,84,73,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all">Löschen</button>
                             </div>
                          </div>
                      </div>
                  )}`;

code = code.replace(
`                  {data.aiLogs && data.aiLogs.length > 0 && (
                      <div className="mt-8 space-y-4">
                          <h3 className="font-headline font-black text-lg text-on-surface flex items-center gap-2">`,
modalCode + `\n                  {data.aiLogs && data.aiLogs.length > 0 && (
                      <div className="mt-8 space-y-4">
                          <h3 className="font-headline font-black text-lg text-on-surface flex items-center gap-2">`
);

fs.writeFileSync('App.tsx', code);
console.log('Fixed modal placement');
