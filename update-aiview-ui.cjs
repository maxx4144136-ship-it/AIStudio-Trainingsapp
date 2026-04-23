const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
`                  {analysis && (
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
          </main>`,
`                  {analysis && (
                      <div className="mt-8 bg-surface-container p-6 rounded-3xl border border-[#3b82f6]/30 shadow-[0_0_30px_rgba(59,130,246,0.1)] animate-fade-in">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="font-headline font-black text-xl text-[#3b82f6] flex items-center gap-2">
                                <span className="material-symbols-outlined">insights</span>
                                Dein Feedback
                            </h3>
                            <button onClick={saveFeedback} className="bg-surface-container-highest text-[#3b82f6] hover:bg-[#3b82f6] hover:text-white transition-colors p-2 rounded-xl flex items-center gap-2 font-label text-xs uppercase tracking-widest font-bold">
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Speichern
                            </button>
                          </div>
                          <div className="prose prose-invert prose-sm max-w-none text-on-surface-variant">
                              <Markdown>{analysis}</Markdown>
                          </div>
                      </div>
                  )}

                  {data.aiLogs && data.aiLogs.length > 0 && (
                      <div className="mt-8 space-y-4">
                          <h3 className="font-headline font-black text-lg text-on-surface flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#3b82f6]">history</span>
                              Gespeicherte Analysen
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {data.aiLogs.map((log, i) => (
                                  <div key={i} className="bg-surface-container p-5 rounded-3xl border border-white/5 shadow-lg">
                                      <div className="flex justify-between items-start mb-3">
                                          <div>
                                            <div className="font-headline font-black text-[#3b82f6]">{log.week}</div>
                                            <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{new Date(log.date).toLocaleDateString('de-DE')}</div>
                                          </div>
                                          <button onClick={() => setAnalysis(log.text)} className="text-on-surface hover:text-[#3b82f6] transition-colors p-2 bg-surface-container-highest rounded-full flex items-center justify-center">
                                              <span className="material-symbols-outlined text-[16px]">visibility</span>
                                          </button>
                                       </div>
                                       <p className="text-xs text-on-surface-variant line-clamp-3 overflow-hidden text-ellipsis">
                                          {log.text.replace(/[*#]/g, '')}
                                       </p>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </section>
          </main>`
);

fs.writeFileSync('App.tsx', code);
console.log("Updated AIView UI");
