// ─────────────────────────────────────────────────────────────────────────────
// Exercise database enums
// ─────────────────────────────────────────────────────────────────────────────

export type BodyPart =
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps'
  | 'core' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'full-body'

export type Equipment = 'bodyweight' | 'dumbbell' | 'band' | 'chair'

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

export type Goal =
  | 'fat-burning' | 'muscle-building' | 'endurance'
  | 'mobility' | 'flexibility' | 'general-fitness' | 'hiit' | 'circuit'

export type Phase = 'warmup' | 'main' | 'cooldown'

export type ExerciseFormat = 'reps' | 'time'

// ─────────────────────────────────────────────────────────────────────────────
// Exercise (matches exercises.json schema)
// ─────────────────────────────────────────────────────────────────────────────

export interface Exercise {
  id: string
  name: string
  bodyParts: BodyPart[]
  equipment: Equipment[]
  difficulty: Difficulty
  goals: Goal[]
  phase: Phase[]
  highImpact: boolean
  format: ExerciseFormat
  defaultSets: number
  defaultReps: number | null
  defaultDuration: number | null
  description: string
  tips: string
  youtubeId: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Workout configuration inputs
// ─────────────────────────────────────────────────────────────────────────────

export type Intensity = 1 | 2 | 3 | 4 | 5

export type ExerciseType = 'bodyweight' | 'equipment' | 'mixed'

export type UserEquipment = 'dumbbell' | 'band' | 'chair'

export interface WorkoutConfig {
  bodyParts: BodyPart[]
  equipment: UserEquipment[]
  duration: number          // minutes: 10–60
  intensity: Intensity
  fitnessLevel: Difficulty
  goal: Goal
  silentMode: boolean
  exerciseType: ExerciseType
}

export const DEFAULT_CONFIG: WorkoutConfig = {
  bodyParts: ['full-body'],
  equipment: [],
  duration: 30,
  intensity: 3,
  fitnessLevel: 'beginner',
  goal: 'general-fitness',
  silentMode: false,
  exerciseType: 'bodyweight',
}

// ─────────────────────────────────────────────────────────────────────────────
// A single exercise slot inside a generated workout
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkoutExercise {
  exercise: Exercise
  sets: number
  reps: number | null       // null when time-based
  duration: number | null   // seconds; null when reps-based
  restAfter: number         // seconds
}

// ─────────────────────────────────────────────────────────────────────────────
// A fully generated workout (stored in history after completion)
// ─────────────────────────────────────────────────────────────────────────────

export interface GeneratedWorkout {
  id: string
  config: WorkoutConfig
  createdAt: string          // ISO date string
  warmup: WorkoutExercise[]
  main: WorkoutExercise[]
  cooldown: WorkoutExercise[]
  estimatedDuration: number  // minutes
  completedAt: string | null
  actualDuration: number | null  // minutes
  source?: 'auto' | 'builder'   // how the workout was created
}

// ─────────────────────────────────────────────────────────────────────────────
// Active session state (in-progress workout)
// ─────────────────────────────────────────────────────────────────────────────

/** Flat ordered list of all exercises across phases */
export interface SessionItem extends WorkoutExercise {
  phase: Phase
}

export type SessionPhase = 'exercise' | 'rest' | 'done'

export interface WorkoutSession {
  items: SessionItem[]
  currentIdx: number
  currentSet: number
  phase: SessionPhase
  startedAt: number          // Date.now()
  nextIdx?: number
  nextSet?: number
}

// ─────────────────────────────────────────────────────────────────────────────
// App-wide state
// ─────────────────────────────────────────────────────────────────────────────

export interface AppState {
  config: WorkoutConfig
  generatedWorkout: GeneratedWorkout | null
  session: WorkoutSession | null
  history: GeneratedWorkout[]
}
