const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// 1. Add state variable
code = code.replace(
    'const [analysis, setAnalysis] = useState<string | null>(null);',
    'const [analysis, setAnalysis] = useState<string | null>(null);\n      const [isNewAnalysis, setIsNewAnalysis] = useState(false);'
);

// 2. Add setIsNewAnalysis(true) to analyzeData
code = code.replace(
    /setAnalysis\(response\.text \|\| "Keine Antwort generiert\."\);/,
    'setAnalysis(response.text || "Keine Antwort generiert.");\n              setIsNewAnalysis(true);'
);

// clear isNewAnalysis at the start of analyzeData
code = code.replace(
    'setAnalysis(null);',
    'setAnalysis(null);\n          setIsNewAnalysis(false);'
);


// 3. Clear isNewAnalysis on save
code = code.replace(
    /showToast\("Feedback gespeichert! 💾"\);/,
    'setIsNewAnalysis(false);\n          showToast("Feedback gespeichert! 💾");'
);

// 4. Conditional rendering for the save button
code = code.replace(
    /<button onClick=\{saveFeedback\}/,
    '{isNewAnalysis && <button onClick={saveFeedback}'
);
code = code.replace(
    /Speichern\n                            <\/button>/,
    'Speichern\n                            </button>}'
);

// 5. Update view existing analysis button
code = code.replace(
    /<button onClick=\{\(\) => setAnalysis\(log\.text\)\} /,
    '<button onClick={() => { setAnalysis(log.text); setIsNewAnalysis(false); }} '
);

fs.writeFileSync('App.tsx', code);
console.log('App.tsx updated to fix the save bug');
