const fs = require('fs');

let code = fs.readFileSync('App.tsx', 'utf8');

// The props everything will destruct
const destructureLine = `  const { data, saveData, showToast, nav, user, activeSession, updateSession, confirmDeleteId, setConfirmDeleteId, executeDelete, analyticsEx, setAnalyticsEx, editTimestamp, setEditTimestamp, userName, setUserName, userPhoto, setUserPhoto, showExportModal, setShowExportModal, getWeeklyVolume, calculateExercisePriority, getSmartInsight } = props;`;

const views = [
    "HomeView", "PlanView", "SuppsView", "TennisView", "AIView", 
    "ProfileView", "ExerciseConfigView", "AnalyticsView", 
    "HistoryView", "HistoryEditView", "SelectionView", "SettingsView"
];

let extractedCode = "\n// --- EXTRACTED VIEWS ---\n";

for (const view of views) {
    const regex = new RegExp(`const ${view} = \\(\\) => {`);
    const match = code.match(regex);
    if (!match) {
        console.log("Could not find", view);
        continue;
    }
    let startIndex = match.index;
    let braceCount = 0;
    let inString = false;
    let stringChar = '';
    let endIndex = -1;

    for (let i = startIndex; i < code.length; i++) {
        const char = code[i];
        const prevChar = i > 0 ? code[i-1] : '';

        if (!inString && (char === '"' || char === "'" || char === '\`')) {
            inString = true;
            stringChar = char;
        } else if (inString && char === stringChar && prevChar !== '\\\\') {
            inString = false;
        }

        if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
                braceCount--;
                if (braceCount === 0) {
                    endIndex = i + 1;
                    if (code[endIndex] === ';') endIndex++;
                    // Remove trailing whitespace
                    while(code[endIndex] === '\\n' || code[endIndex] === '\\r') endIndex++;
                    break;
                }
            }
        }
    }

    if (endIndex !== -1) {
        let viewCode = code.substring(startIndex, endIndex);
        viewCode = viewCode.replace(`const ${view} = () => {`, `const ${view} = (props: any) => {\\n${destructureLine}`);
        extractedCode += viewCode + "\\n\\n";
        code = code.substring(0, startIndex) + code.substring(endIndex);
    }
}

// Ensure the helper functions and state setters are passed as PROPS
const allProps = `data={data} saveData={saveData} showToast={showToast} nav={nav} user={user} activeSession={activeSession} updateSession={updateSession} confirmDeleteId={confirmDeleteId} setConfirmDeleteId={setConfirmDeleteId} executeDelete={executeDelete} analyticsEx={analyticsEx} setAnalyticsEx={setAnalyticsEx} editTimestamp={editTimestamp} setEditTimestamp={setEditTimestamp} userName={userName} setUserName={setUserName} userPhoto={userPhoto} setUserPhoto={setUserPhoto} showExportModal={showExportModal} setShowExportModal={setShowExportModal} getWeeklyVolume={getWeeklyVolume} calculateExercisePriority={calculateExercisePriority} getSmartInsight={getSmartInsight}`;

// Replace <CurrentComp /> with <CurrentComp {...allProps} /> (or whatever is the actual current comp usage)
// In App.tsx it's currently: <CurrentComp />
code = code.replace(/<CurrentComp \/>/g, `<CurrentComp ${allProps} />`);

// Add extracted code before MainApp
code = code.replace("const MainApp = ({ user }: { user: FirebaseUser }) => {", extractedCode + "const MainApp = ({ user }: { user: FirebaseUser }) => {");

fs.writeFileSync('App.tsx', code);
console.log("Refactored App.tsx successfully.");
