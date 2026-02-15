import { ExerciseDef, SetLog, WorkoutLog } from "../types";

// Helper to round to nearest step
const roundToStep = (value: number, step: number) => {
    return Math.round(value / step) * step;
};

// Progression Rules
export const calculateProgression = (exercise: ExerciseDef, history: WorkoutLog[]) => {
  // 1. Sort history by date descending (newest first)
  const sortedHistory = [...history].sort((a, b) => b.d - a.d);
  
  // 2. Find last session with this exercise
  const lastSession = sortedHistory.find(log => 
    log.s && log.s[exercise.id] && log.s[exercise.id].sets && log.s[exercise.id].sets.length > 0
  );
  
  // Defaults if new
  if (!lastSession) {
    return { w: exercise.defW, r: 10, isIncrease: false };
  }

  // 3. Filter for Working Sets ('A') only
  let validSets = lastSession.s[exercise.id].sets.filter(s => s.type === 'A');
  if (validSets.length === 0) validSets = lastSession.s[exercise.id].sets;
  if (validSets.length === 0) return { w: exercise.defW, r: 10, isIncrease: false };

  // 4. Determine base values
  const maxWeightInLastSession = Math.max(...validSets.map(s => s.w));
  const setsAtMaxWeight = validSets.filter(s => s.w === maxWeightInLastSession);
  const maxRepsAtMaxWeight = Math.max(...setsAtMaxWeight.map(s => s.r));

  // 5. Progression Logic
  const nameLower = exercise.n.toLowerCase();
  
  // Identify Exercise Type for Steps
  const isFreeCompound = nameLower.includes('bankdrücken') || nameLower.includes('dips') || nameLower.includes('klimm');
  const isCable = !isFreeCompound; // Default to cable tower logic for everything else as requested

  // Increment Rules
  const increaseStep = isFreeCompound ? 2.0 : 4.5;
  const roundingStep = isFreeCompound ? 0.5 : 4.5;

  let newWeight = maxWeightInLastSession;
  let isIncrease = false;

  // Rule: Increase if > 12 reps reached
  if (maxRepsAtMaxWeight > 12) {
    newWeight = maxWeightInLastSession + increaseStep;
    isIncrease = true;
  }

  // Rounding Logic
  newWeight = roundToStep(newWeight, roundingStep);

  return { w: newWeight, r: isIncrease ? 8 : 10, isIncrease };
};

export const calculateWarmup = (targetWeight: number, exercise: ExerciseDef) => {
  const nameLower = exercise.n.toLowerCase();
  const isFreeCompound = nameLower.includes('bankdrücken') || nameLower.includes('dips') || nameLower.includes('klimm');
  const roundingStep = isFreeCompound ? 2.5 : 4.5; // Cables round to 4.5 steps, Free to 2.5 plates

  const rawWarmup = targetWeight * 0.60;
  // Ensure at least minimal weight
  return Math.max(roundingStep, roundToStep(rawWarmup, roundingStep));
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