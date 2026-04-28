import type {
  Exercise, WorkoutConfig, WorkoutExercise, GeneratedWorkout,
  Phase, Goal, Difficulty, Intensity, BodyPart,
} from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// Explicit slot profiles per goal × intensity
// ─────────────────────────────────────────────────────────────────────────────

interface SlotProfile {
  sets:         number
  repsBase:     number | null
  durationBase: number | null
  rest:         number
}

const SLOT_PROFILES: Record<Goal, Record<Intensity, SlotProfile>> = {
  'muscle-building': {
    1: { sets: 3, repsBase: 12, durationBase: null, rest:  60 },
    2: { sets: 3, repsBase: 10, durationBase: null, rest:  75 },
    3: { sets: 4, repsBase: 10, durationBase: null, rest:  75 },
    4: { sets: 4, repsBase:  8, durationBase: null, rest:  90 },
    5: { sets: 5, repsBase:  8, durationBase: null, rest: 120 },
  },
  'fat-burning': {
    1: { sets: 3, repsBase: 15, durationBase: null, rest: 45 },
    2: { sets: 3, repsBase: 15, durationBase: null, rest: 40 },
    3: { sets: 3, repsBase: 15, durationBase: null, rest: 35 },
    4: { sets: 4, repsBase: 15, durationBase: null, rest: 25 },
    5: { sets: 4, repsBase: 20, durationBase: null, rest: 20 },
  },
  'hiit': {
    1: { sets: 3, repsBase: null, durationBase: 30, rest: 25 },
    2: { sets: 3, repsBase: null, durationBase: 35, rest: 20 },
    3: { sets: 3, repsBase: null, durationBase: 40, rest: 20 },
    4: { sets: 4, repsBase: null, durationBase: 40, rest: 15 },
    5: { sets: 4, repsBase: null, durationBase: 45, rest: 10 },
  },
  'endurance': {
    1: { sets: 3, repsBase: 20, durationBase: null, rest: 35 },
    2: { sets: 3, repsBase: 20, durationBase: null, rest: 30 },
    3: { sets: 3, repsBase: 20, durationBase: null, rest: 25 },
    4: { sets: 4, repsBase: 25, durationBase: null, rest: 20 },
    5: { sets: 4, repsBase: 25, durationBase: null, rest: 15 },
  },
  'mobility': {
    1: { sets: 2, repsBase: null, durationBase: 30, rest: 15 },
    2: { sets: 2, repsBase: null, durationBase: 35, rest: 15 },
    3: { sets: 2, repsBase: null, durationBase: 40, rest: 15 },
    4: { sets: 3, repsBase: null, durationBase: 40, rest: 15 },
    5: { sets: 3, repsBase: null, durationBase: 45, rest: 10 },
  },
  'flexibility': {
    1: { sets: 2, repsBase: null, durationBase: 30, rest: 10 },
    2: { sets: 2, repsBase: null, durationBase: 40, rest: 10 },
    3: { sets: 2, repsBase: null, durationBase: 45, rest: 10 },
    4: { sets: 3, repsBase: null, durationBase: 45, rest: 10 },
    5: { sets: 3, repsBase: null, durationBase: 60, rest: 10 },
  },
  'general-fitness': {
    1: { sets: 3, repsBase: 12, durationBase: null, rest: 60 },
    2: { sets: 3, repsBase: 12, durationBase: null, rest: 50 },
    3: { sets: 3, repsBase: 12, durationBase: null, rest: 45 },
    4: { sets: 3, repsBase: 15, durationBase: null, rest: 40 },
    5: { sets: 4, repsBase: 15, durationBase: null, rest: 35 },
  },
  'circuit': {
    1: { sets: 2, repsBase: 12, durationBase: null, rest: 20 },
    2: { sets: 3, repsBase: 12, durationBase: null, rest: 15 },
    3: { sets: 3, repsBase: 15, durationBase: null, rest: 15 },
    4: { sets: 3, repsBase: 15, durationBase: null, rest: 10 },
    5: { sets: 4, repsBase: 15, durationBase: null, rest: 10 },
  },
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration-aware profile adjustment
// Shorter workouts use fewer sets and shorter rest so more exercises fit
// ─────────────────────────────────────────────────────────────────────────────

function getAdjustedProfile(goal: Goal, intensity: Intensity, durationMinutes: number): SlotProfile {
  const base = SLOT_PROFILES[goal][intensity]
  if (durationMinutes <= 30) {
    return { ...base, sets: Math.min(base.sets, 3), rest: Math.min(base.rest, 50) }
  }
  if (durationMinutes <= 45) {
    return { ...base, sets: Math.min(base.sets, 3), rest: Math.min(base.rest, 65) }
  }
  return base
}

// ─────────────────────────────────────────────────────────────────────────────
// Muscle group size weights (for proportional exercise allocation)
// ─────────────────────────────────────────────────────────────────────────────

const MUSCLE_WEIGHT: Partial<Record<BodyPart, number>> = {
  'back':        8,
  'chest':       7,
  'quads':       7,
  'glutes':      6,
  'hamstrings':  6,
  'shoulders':   5,
  'core':        5,
  'biceps':      3,
  'triceps':     3,
  'calves':      2,
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise count calculation
// Warmup/cooldown: step function based on workout duration
// Main: muscle-based count bounded by time budget
// ─────────────────────────────────────────────────────────────────────────────

interface PhaseCounts { warmup: number; main: number; cooldown: number }

function getExerciseCounts(
  durationMinutes: number,
  _goal: Goal,
  _intensity: Intensity,
  bodyParts: BodyPart[],
): PhaseCounts {
  // Warmup / cooldown: step function
  const phaseCap = durationMinutes <= 30 ? 3 : durationMinutes <= 50 ? 4 : 5

  // Main: exact step function per user spec
  // ≤30 min → 3–5 (muscle-based within range)
  // 30–40   → 6
  // 40–50   → 7
  // >50     → 8
  let mainCount: number
  if (durationMinutes <= 30) {
    const isFullBody = bodyParts.includes('full-body') || bodyParts.length === 0
    if (isFullBody) {
      mainCount = 4
    } else {
      const totalWeight = bodyParts.reduce((s, bp) => s + (MUSCLE_WEIGHT[bp] ?? 5), 0)
      mainCount = Math.min(4, Math.max(3, Math.ceil(totalWeight / 6)))
    }
  } else if (durationMinutes <= 40) {
    mainCount = 5
  } else if (durationMinutes <= 50) {
    mainCount = 6
  } else {
    mainCount = 7
  }

  return { warmup: phaseCap, main: mainCount, cooldown: phaseCap }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pool filter (difficulty, silent mode, equipment)
// ─────────────────────────────────────────────────────────────────────────────

function difficultyRank(d: Difficulty): number {
  return { beginner: 0, intermediate: 1, advanced: 2 }[d]
}

function filterPool(exercises: Exercise[], config: WorkoutConfig): Exercise[] {
  const maxRank = difficultyRank(config.fitnessLevel)
  return exercises.filter(ex => {
    if (difficultyRank(ex.difficulty) > maxRank) return false
    if (config.silentMode && ex.highImpact) return false
    if (config.exerciseType === 'bodyweight') {
      if (!ex.equipment.every(eq => eq === 'bodyweight')) return false
    } else if (config.exerciseType === 'equipment') {
      if (!ex.equipment.some(eq => config.equipment.includes(eq as never))) return false
    }
    return true
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Shuffle (Fisher-Yates)
// ─────────────────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─────────────────────────────────────────────────────────────────────────────
// Match purity: fraction of exercise's body parts that match the target
// Exercises with higher purity are more focused on the requested muscles
// e.g. "squat" targeting [quads,glutes] in a [quads,glutes,hamstrings] workout → 2/2 = 1.0
//      "lunge + shoulder press" → [quads,glutes,shoulders] → 2/3 ≈ 0.67 → ranked lower
// ─────────────────────────────────────────────────────────────────────────────

function matchPurity(ex: Exercise, targetParts: BodyPart[]): number {
  if (targetParts.includes('full-body')) return 1
  const matching = ex.bodyParts.filter(bp => targetParts.includes(bp)).length
  return matching / Math.max(1, ex.bodyParts.length)
}

// Sort pool by purity (descending), shuffle within each purity tier for variety
function sortByPurity(pool: Exercise[], targetParts: BodyPart[]): Exercise[] {
  if (targetParts.includes('full-body')) return shuffle(pool)
  const tiers = new Map<number, Exercise[]>()
  for (const ex of pool) {
    const key = Math.round(matchPurity(ex, targetParts) * 10)
    if (!tiers.has(key)) tiers.set(key, [])
    tiers.get(key)!.push(ex)
  }
  const result: Exercise[] = []
  for (const k of [...tiers.keys()].sort((a, b) => b - a)) {
    result.push(...shuffle(tiers.get(k)!))
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Select exercises for warmup / cooldown
// ─────────────────────────────────────────────────────────────────────────────

function selectPhasedExercises(
  pool: Exercise[],
  phase: Phase,
  count: number,
  targetBodyParts: BodyPart[],
): Exercise[] {
  const eligible = pool.filter(ex => ex.phase.includes(phase))
  if (eligible.length === 0) return []

  const useFull = targetBodyParts.includes('full-body') || targetBodyParts.length === 0
  const targeted = useFull ? [] : shuffle(
    eligible.filter(ex => ex.bodyParts.some(bp => targetBodyParts.includes(bp)))
  )
  const general = shuffle(
    useFull ? eligible : eligible.filter(ex => !targeted.some(t => t.id === ex.id))
  )

  const ordered = [...targeted, ...general]
  const result: Exercise[] = []
  const used = new Set<string>()
  for (const ex of ordered) {
    if (result.length >= count) break
    if (!used.has(ex.id)) { result.push(ex); used.add(ex.id) }
  }

  // Cycle through eligible if still short
  if (result.length < count && eligible.length > 0) {
    const shuffledAll = shuffle(eligible)
    let i = 0
    while (result.length < count && i < count * 4) {
      result.push(shuffledAll[i % shuffledAll.length])
      i++
    }
  }

  return result.slice(0, count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Select main exercises with proportional muscle-group allocation
// Exercises are ranked by match purity before selection — compound movements
// that involve non-target muscles are deprioritised
// ─────────────────────────────────────────────────────────────────────────────

function selectMainExercises(
  pool: Exercise[],
  goal: Goal,
  bodyParts: BodyPart[],
  count: number,
): Exercise[] {
  const goalFiltered = pool.filter(ex => ex.goals.includes(goal))
  const goalPool     = goalFiltered.length >= count ? goalFiltered : pool

  // Filter to target body parts (strict — no fallback to unrelated muscles)
  const rawBodyPartPool = bodyParts.includes('full-body')
    ? goalPool.filter(ex => ex.phase.includes('main'))
    : goalPool.filter(ex =>
        ex.phase.includes('main') &&
        ex.bodyParts.some(bp => bodyParts.includes(bp)),
      )

  // Relax goal filter if pool is too small, but keep body part constraint
  const bodyPartPool = rawBodyPartPool.length >= Math.ceil(count * 0.5)
    ? rawBodyPartPool
    : pool.filter(ex =>
        ex.phase.includes('main') &&
        (bodyParts.includes('full-body') || ex.bodyParts.some(bp => bodyParts.includes(bp)))
      )

  // Sort by purity so laser-focused exercises are picked before wide compounds
  const finalPool = sortByPurity(bodyPartPool, bodyParts)

  if (bodyParts.includes('full-body') || bodyParts.length <= 1) {
    return finalPool.slice(0, count)
  }

  // Proportional allocation by muscle size
  const totalWeight = bodyParts.reduce((s, bp) => s + (MUSCLE_WEIGHT[bp] ?? 5), 0)
  const sortedParts = [...bodyParts].sort(
    (a, b) => (MUSCLE_WEIGHT[b] ?? 5) - (MUSCLE_WEIGHT[a] ?? 5)
  )

  const slotMap = new Map<BodyPart, number>()
  let allocated = 0
  for (const bp of sortedParts) {
    const slots = Math.max(1, Math.round(((MUSCLE_WEIGHT[bp] ?? 5) / totalWeight) * count))
    slotMap.set(bp, slots)
    allocated += slots
  }

  // Correct rounding drift
  let diff = count - allocated
  let idx  = 0
  while (diff !== 0) {
    const bp = sortedParts[idx % sortedParts.length]
    slotMap.set(bp, (slotMap.get(bp) ?? 1) + (diff > 0 ? 1 : -1))
    diff += diff > 0 ? -1 : 1
    idx++
  }

  // Pick exercises per body part — purity-sorted pool ensures clean matches
  const selected: Exercise[] = []
  const usedIds = new Set<string>()

  for (const bp of sortedParts) {
    const slots  = slotMap.get(bp) ?? 1
    // Within each body part, prefer high-purity exercises (already sorted)
    const bpPool = finalPool.filter(ex => ex.bodyParts.includes(bp) && !usedIds.has(ex.id))
    const picks  = bpPool.slice(0, slots)
    picks.forEach(ex => usedIds.add(ex.id))
    selected.push(...picks)
  }

  // Fill any remaining slots from the sorted pool
  const filler = finalPool.filter(ex => !usedIds.has(ex.id)).slice(0, count - selected.length)
  selected.push(...filler)

  return selected.slice(0, count)
}

// ─────────────────────────────────────────────────────────────────────────────
// Sequencing: avoid consecutive same primary muscle
// ─────────────────────────────────────────────────────────────────────────────

function sequenceExercises(exercises: Exercise[]): Exercise[] {
  if (exercises.length <= 1) return exercises
  const result: Exercise[] = []
  const remaining = [...exercises]
  while (remaining.length > 0) {
    const lastParts = result.length > 0 ? result[result.length - 1].bodyParts : []
    const idx = remaining.findIndex(ex => !ex.bodyParts.some(bp => lastParts.includes(bp)))
    result.push(idx !== -1 ? remaining.splice(idx, 1)[0] : remaining.splice(0, 1)[0])
  }
  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// Build slot defaults for a given exercise + phase + goal + intensity
// ─────────────────────────────────────────────────────────────────────────────

export interface SlotDefaults {
  sets:      number
  reps:      number | null
  duration:  number | null
  restAfter: number
}

export function getSlotDefaults(
  ex: Exercise,
  goal: Goal,
  intensity: Intensity,
  phase: Phase,
  durationMinutes: number,
): SlotDefaults {
  // Warm-up and cool-down: 1 set, respect the exercise's own format
  if (phase === 'warmup' || phase === 'cooldown') {
    if (ex.format === 'reps') {
      return { sets: 1, reps: ex.defaultReps ?? 12, duration: null, restAfter: 10 }
    }
    return { sets: 1, reps: null, duration: ex.defaultDuration ?? 30, restAfter: 10 }
  }

  // Use duration-adjusted profile for main block
  const p = getAdjustedProfile(goal, intensity, durationMinutes)

  if (ex.format === 'time') {
    return {
      sets:      p.sets,
      reps:      null,
      duration:  p.durationBase ?? ex.defaultDuration ?? 30,
      restAfter: p.rest,
    }
  }

  if (p.durationBase !== null) {
    return {
      sets:      p.sets,
      reps:      ex.defaultReps ?? 12,
      duration:  null,
      restAfter: p.rest,
    }
  }

  return {
    sets:      p.sets,
    reps:      p.repsBase ?? ex.defaultReps ?? 12,
    duration:  null,
    restAfter: p.rest,
  }
}

function buildWorkoutExercises(
  exercises: Exercise[],
  phase: Phase,
  goal: Goal,
  intensity: Intensity,
  durationMinutes: number,
): WorkoutExercise[] {
  return exercises.map(ex => {
    const d = getSlotDefaults(ex, goal, intensity, phase, durationMinutes)
    return { exercise: ex, sets: d.sets, reps: d.reps, duration: d.duration, restAfter: d.restAfter }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Accurate duration estimate
// ─────────────────────────────────────────────────────────────────────────────

function estimateDuration(
  warmup: WorkoutExercise[],
  main: WorkoutExercise[],
  cooldown: WorkoutExercise[],
): number {
  const calc = (items: WorkoutExercise[]) =>
    items.reduce((acc, item) => {
      const workPerSet = item.duration ?? ((item.reps ?? 10) * 3)
      return acc + item.sets * (workPerSet + item.restAfter) + 10
    }, 0)
  return Math.round((calc(warmup) + calc(main) + calc(cooldown)) / 60)
}

// ─────────────────────────────────────────────────────────────────────────────
// Estimate how long a list of exercises will take in the main block,
// given the user's config (used by the builder for the time warning)
// ─────────────────────────────────────────────────────────────────────────────

export function estimateMainDuration(
  exercises: Exercise[],
  config: WorkoutConfig,
): number {
  const p = getAdjustedProfile(config.goal, config.intensity, config.duration)
  const seconds = exercises.reduce((acc, ex) => {
    const workPerSet = ex.format === 'time'
      ? (p.durationBase ?? ex.defaultDuration ?? 30)
      : ((p.repsBase ?? ex.defaultReps ?? 10) * 3)
    return acc + p.sets * (workPerSet + p.rest) + 10
  }, 0)
  return Math.round(seconds / 60)
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

export function generateWorkout(
  config: WorkoutConfig,
  allExercises: Exercise[],
): GeneratedWorkout {
  const counts  = getExerciseCounts(config.duration, config.goal, config.intensity, config.bodyParts)
  const basePool = filterPool(allExercises, config)

  const warmupPool   = filterPool(allExercises, { ...config, exerciseType: 'bodyweight', silentMode: false })
  const cooldownPool = filterPool(allExercises, { ...config, exerciseType: 'bodyweight', silentMode: false })

  const warmupEx = selectPhasedExercises(warmupPool, 'warmup',   counts.warmup,   config.bodyParts)
  const mainRaw  = selectMainExercises(  basePool,   config.goal, config.bodyParts, counts.main)
  const mainEx   = sequenceExercises(mainRaw)
  const cooldownEx = selectPhasedExercises(cooldownPool, 'cooldown', counts.cooldown, config.bodyParts)

  const dur = config.duration
  const warmup   = buildWorkoutExercises(warmupEx,   'warmup',   config.goal, config.intensity, dur)
  const main     = buildWorkoutExercises(mainEx,     'main',     config.goal, config.intensity, dur)
  const cooldown = buildWorkoutExercises(cooldownEx, 'cooldown', config.goal, config.intensity, dur)

  return {
    id: crypto.randomUUID(),
    config,
    createdAt: new Date().toISOString(),
    source: 'auto' as const,
    warmup,
    main,
    cooldown,
    estimatedDuration: estimateDuration(warmup, main, cooldown),
    completedAt: null,
    actualDuration: null,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom-builder entry point — user supplies main exercises, we generate
// warmup + cooldown automatically from the same config
// ─────────────────────────────────────────────────────────────────────────────

export function generateWithCustomMain(
  config: WorkoutConfig,
  allExercises: Exercise[],
  customMain: Exercise[],
): GeneratedWorkout {
  const counts      = getExerciseCounts(config.duration, config.goal, config.intensity, config.bodyParts)
  const warmupPool  = filterPool(allExercises, { ...config, exerciseType: 'bodyweight', silentMode: false })
  const cdPool      = filterPool(allExercises, { ...config, exerciseType: 'bodyweight', silentMode: false })

  const warmupEx    = selectPhasedExercises(warmupPool, 'warmup',   counts.warmup,   config.bodyParts)
  const cooldownEx  = selectPhasedExercises(cdPool,     'cooldown', counts.cooldown, config.bodyParts)

  const dur     = config.duration
  const warmup  = buildWorkoutExercises(warmupEx,   'warmup',   config.goal, config.intensity, dur)
  const main    = buildWorkoutExercises(customMain, 'main',     config.goal, config.intensity, dur)
  const cooldown = buildWorkoutExercises(cooldownEx, 'cooldown', config.goal, config.intensity, dur)

  return {
    id: crypto.randomUUID(),
    config,
    createdAt: new Date().toISOString(),
    source: 'builder' as const,
    warmup,
    main,
    cooldown,
    estimatedDuration: estimateDuration(warmup, main, cooldown),
    completedAt: null,
    actualDuration: null,
  }
}
