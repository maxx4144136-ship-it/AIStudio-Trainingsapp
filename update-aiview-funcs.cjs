const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

// Function to get ISO week number
const getWeekStr = `      const getWeekNumber = (d: Date) => {
          d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
          d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
          const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
          const weekNo = Math.ceil(( ( (d.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
          return "KW " + weekNo + " " + d.getUTCFullYear();
      };
`

code = code.replace(
`  const AIView = () => {
      const [startD, setStartD] = useState(() => { const d=new Date(); d.setDate(d.getDate()-14); return d.toISOString().split('T')[0]; });`,
`  const AIView = () => {
      const [startD, setStartD] = useState(() => { const d=new Date(); d.setDate(d.getDate()-14); return d.toISOString().split('T')[0]; });
${getWeekStr}`
);

// Save feedback function
code = code.replace(
`      const analyzeData = async () => {`,
`      const saveFeedback = () => {
          if(!analysis) return;
          const weekLabel = getWeekNumber(new Date());
          const newLogs = data.aiLogs || [];
          saveData({
              ...data,
              aiLogs: [{ week: weekLabel, text: analysis, date: Date.now() }, ...newLogs]
          });
          showToast("Feedback gespeichert! 💾");
      };

      const analyzeData = async () => {`
);

fs.writeFileSync('App.tsx', code);
console.log("Updated AIView functions");
