const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Add state and delete function
code = code.replace(
    'const [loading, setLoading] = useState(false);',
    `const [loading, setLoading] = useState(false);
      const [confirmDeleteAILogId, setConfirmDeleteAILogId] = useState<number | null>(null);

      const deleteAILog = () => {
          if (confirmDeleteAILogId !== null) {
              const newLogs = (data.aiLogs || []).filter(l => l.date !== confirmDeleteAILogId);
              saveData({ ...data, aiLogs: newLogs });
              setConfirmDeleteAILogId(null);
              showToast("Analyse gelöscht 🗑️");
          }
      };`
);

// 2. Add delete button
code = code.replace(
    /<button onClick=\{\(\) => \{ setAnalysis\(log\.text\); setIsNewAnalysis\(false\); \}\} className="text-on-surface hover:text-\[#3b82f6\] transition-colors p-2 bg-surface-container-highest rounded-full flex items-center justify-center">\s*<span className="material-symbols-outlined text-\[16px\]">visibility<\/span>\s*<\/button>/g,
    `<div className="flex gap-2">
                                              <button onClick={() => { setAnalysis(log.text); setIsNewAnalysis(false); }} className="text-on-surface hover:text-[#3b82f6] transition-colors p-2 bg-surface-container-highest rounded-full flex items-center justify-center">
                                                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                                              </button>
                                              <button onClick={() => setConfirmDeleteAILogId(log.date)} className="text-on-surface hover:text-error transition-colors p-2 bg-surface-container-highest rounded-full flex items-center justify-center">
                                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                              </button>
                                          </div>`
);

// 3. Add Modal dialog specifically for AI View
code = code.replace(
    '              </section>\n          </main>',
    `              </section>

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
                  )}

          </main>`
);

fs.writeFileSync('App.tsx', code);
console.log('App.tsx updated to include delete feature!');
