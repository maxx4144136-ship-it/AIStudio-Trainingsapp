const fs = require('fs');
let code = fs.readFileSync('constants.ts', 'utf8');

code = code.replace(
`  goals: {"Brust":20,"Rücken":20,"Schultern":20,"Arme":20,"Beine":3},
  calTargets: {"cut":2300,"bulk":3200,"main":2800}`,
`  goals: {"Brust":20,"Rücken":20,"Schultern":20,"Arme":20,"Beine":3},
  calTargets: {"cut":2300,"bulk":3200,"main":2800},
  aiLogs: []`
);

fs.writeFileSync('constants.ts', code);
console.log("Updated constants.ts");
