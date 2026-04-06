const https = require('https');
const fs = require('fs');

https.get('https://fitnessmaxx.tech/api.php', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log("Fetched data. History length:", json.h.length);
      const latestDates = json.h.map(x => new Date(x.d).toISOString().split('T')[0]).slice(0, 5);
      console.log("Latest dates:", latestDates);
      
      let content = `import { AppData, ExerciseDef } from './types';\n\n`;
      content += `export const FALLBACK_EXERCISES: { [key: string]: ExerciseDef } = ${JSON.stringify(json.db, null, 2)};\n\n`;
      content += `export const INJECTED_HISTORY = ${JSON.stringify(json.h, null, 2)};\n\n`;
      content += `export const INJECTED_BODY = ${JSON.stringify(json.bodyLogs, null, 2)};\n\n`;
      content += `export const INJECTED_SUPPS = ${JSON.stringify(json.userSupps, null, 2)};\n\n`;
      content += `export const INITIAL_PROFILE = ${JSON.stringify(json.userProfile)};\n\n`;
      
      content += `export const FALLBACK_DATA: AppData = {
  db: FALLBACK_EXERCISES,
  h: INJECTED_HISTORY as any,
  bodyLogs: INJECTED_BODY,
  weekPlan: ${JSON.stringify(json.weekPlan)},
  timeLimits: ${JSON.stringify(json.timeLimits)},
  userSupps: INJECTED_SUPPS,
  userProfile: INITIAL_PROFILE,
  userCalStatus: ${JSON.stringify(json.userCalStatus)},
  dob: ${JSON.stringify(json.dob)},
  goals: ${JSON.stringify(json.goals)},
  calTargets: ${JSON.stringify(json.calTargets)}
};\n\n`;
      content += `export const CAT_ORDER = ["Brust", "Rücken", "Schultern", "Arme", "Beine"];\n`;
      
      fs.writeFileSync('constants.ts', content);
      console.log("Updated constants.ts");
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  });
}).on('error', (err) => {
  console.error(err);
});
