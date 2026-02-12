
export type MuscleGroup = 'Brust' | 'Rücken' | 'Schultern' | 'Arme' | 'Beine' | 'Tennis';
export type ExerciseType = 'push' | 'pull' | 'beine' | 'arme' | 'cardio';

export interface ExerciseDef {
  id: string;
  n: string; // name
  c: MuscleGroup; // category
  t: ExerciseType; // type
  defW: number; // default weight
  h: number | string; // handle/height setting
  prio?: number;
}

export interface SetLog {
  w: number; // weight
  r: number; // reps
  rpe?: number;
  type: 'A' | 'W'; // Arbeittssatz or Warmup
  completed?: boolean; // New field for UI toggle
}

export interface WorkoutLog {
  d: number; // timestamp
  t: string; // duration "HH:MM:SS"
  note: string;
  s: {
    [exerciseId: string]: {
      sets: SetLog[];
      order?: number;
      h?: number | string; // Snapshot of handle height at time of workout
    };
  };
}

export interface BodyLog {
  d: string; // YYYY-MM-DD
  w?: string; // weight
  s?: string; // steps
}

export interface AppData {
  db: { [key: string]: ExerciseDef }; // Exercise Database
  h: WorkoutLog[]; // History
  bodyLogs: BodyLog[];
  weekPlan: (string | null)[]; // 7 days
  timeLimits: number[]; // 7 days
  userSupps: {n: string, val: string, unit: string}[];
  userProfile: string;
  userCalStatus: string;
  // New Fields
  dob: string; // Date of Birth YYYY-MM-DD
  goals: { [key in MuscleGroup]?: number }; // Custom weekly set goals
  calTargets: { cut: number, bulk: number, main: number }; // Absolute Kcal values
}

export interface ActiveSession {
  start: number | null;
  exercises: {
    [id: string]: {
      sets: SetLog[];
      order: number;
    };
  };
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  path: string;
}
