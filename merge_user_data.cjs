const fs = require('fs');

const userData = JSON.parse(fs.readFileSync('user_data.json', 'utf8'));
const constantsContent = fs.readFileSync('constants.ts', 'utf8');

// We need to merge userData.h into INJECTED_HISTORY in constants.ts
// Let's just rewrite the whole constants.ts using the new data, but keeping the existing structure.

let content = `import { AppData, ExerciseDef } from './types';\n\n`;
content += `export const FALLBACK_EXERCISES: { [key: string]: ExerciseDef } = ${JSON.stringify(userData.db, null, 2)};\n\n`;
content += `export const INJECTED_HISTORY = ${JSON.stringify(userData.h, null, 2)};\n\n`;
content += `export const INJECTED_BODY = ${JSON.stringify(userData.bodyLogs, null, 2)};\n\n`;
content += `export const INJECTED_SUPPS = ${JSON.stringify(userData.userSupps, null, 2)};\n\n`;
content += `export const INITIAL_PROFILE = ${JSON.stringify(userData.userProfile)};\n\n`;

content += `export const FALLBACK_DATA: AppData = {
  db: FALLBACK_EXERCISES,
  h: INJECTED_HISTORY as any,
  bodyLogs: INJECTED_BODY,
  weekPlan: ${JSON.stringify(userData.weekPlan)},
  timeLimits: ${JSON.stringify(userData.timeLimits)},
  userSupps: INJECTED_SUPPS,
  userProfile: INITIAL_PROFILE,
  userCalStatus: ${JSON.stringify(userData.userCalStatus)},
  dob: ${JSON.stringify(userData.dob)},
  goals: ${JSON.stringify(userData.goals)},
  calTargets: ${JSON.stringify(userData.calTargets)}
};\n\n`;
content += `export const CAT_ORDER = ["Brust", "Rücken", "Schultern", "Arme", "Beine"];\n`;

fs.writeFileSync('constants.ts', content);
console.log("Updated constants.ts with user data. History length:", userData.h.length);
