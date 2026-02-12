import { ExerciseDef, SetLog, WorkoutLog } from "../types";

// Progression Rules
export const calculateProgression = (exercise: ExerciseDef, history: WorkoutLog[]) => {
  // 1. Sort history by date descending (newest first) to guarantee we get the latest session
  const sortedHistory = [...history].sort((a, b) => b.d - a.d);
  
  // 2. Find the last session that actually contains this exercise
  const lastSession = sortedHistory.find(log => 
    log.s && log.s[exercise.id] && log.s[exercise.id].sets && log.s[exercise.id].sets.length > 0
  );
  
  if (!lastSession) {
    return { w: exercise.defW, r: 10, isIncrease: false };
  }

  // 3. Filter for Working Sets ('A') only. If none, fall back to any set.
  let validSets = lastSession.s[exercise.id].sets.filter(s => s.type === 'A');
  if (validSets.length === 0) {
     validSets = lastSession.s[exercise.id].sets;
  }

  if (validSets.length === 0) {
    return { w: exercise.defW, r: 10, isIncrease: false };
  }

  // 4. Determine base values from the LAST session
  // Use the weight of the heaviest working set to base progression on
  const maxWeightInLastSession = Math.max(...validSets.map(s => s.w));
  // Find the sets performed at that max weight to check reps
  const setsAtMaxWeight = validSets.filter(s => s.w === maxWeightInLastSession);
  const maxRepsAtMaxWeight = Math.max(...setsAtMaxWeight.map(s => s.r));

  // 5. Progression Logic
  // "Wurden im letzten Training (Arbeitssatz) > 12 Wiederholungen erreicht"
  if (maxRepsAtMaxWeight > 12) {
    let increase = 2.5; // Default
    const nameLower = exercise.n.toLowerCase();
    
    if (nameLower.includes('bankdrücken') || nameLower.includes('dips')) {
      increase = 2.0;
    } else if (nameLower.includes('kabel') || nameLower.includes('seil') || nameLower.includes('zug') || nameLower.includes('fly')) {
      increase = 4.5;
    }

    return { w: maxWeightInLastSession + increase, r: 10, isIncrease: true };
  } else {
    // Keep weight, focus on reps
    return { w: maxWeightInLastSession, r: Math.min(maxRepsAtMaxWeight + 1, 12), isIncrease: false };
  }
};

export const calculateWarmup = (targetWeight: number, exercise: ExerciseDef) => {
  // Rule: Warmup is exactly 60% of target
  return Math.round((targetWeight * 0.6) * 2) / 2;
};

// Health Constraint: Tennis Elbow
export const isExerciseAllowed = (exercise: ExerciseDef) => {
  const nameLower = exercise.n.toLowerCase();
  if (nameLower.includes('klimmzüge') || nameLower.includes('pull up')) {
    return false;
  }
  return true;
};

export const generateSnapshotHTML = (data: any) => {
    const dataString = JSON.stringify(data).replace(/<\/script>/gi, "\\x3C\\x2Fscript\\x3E");
    return `<!DOCTYPE html><html><body><script>window.SNAPSHOT_DATA = ${dataString};</script></body></html>`;
};