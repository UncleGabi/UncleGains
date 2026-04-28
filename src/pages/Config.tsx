import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { generateWorkout } from '../lib/generateWorkout'
import type { WorkoutConfig, BodyPart, UserEquipment, Difficulty, Goal, ExerciseType, Intensity } from '../types'
import exercisesRaw from '../data/exercises.json'
import type { Exercise } from '../types'

const exercises = exercisesRaw as Exercise[]

// ─────────────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────────────

const BODY_PARTS: { value: BodyPart; label: string; emoji: string }[] = [
  { value: 'full-body',  label: 'Full Body',  emoji: '🏃' },
  { value: 'chest',      label: 'Chest',      emoji: '💪' },
  { value: 'back',       label: 'Back',       emoji: '🔙' },
  { value: 'shoulders',  label: 'Shoulders',  emoji: '🏋️' },
  { value: 'biceps',     label: 'Biceps',     emoji: '💪' },
  { value: 'triceps',    label: 'Triceps',    emoji: '💪' },
  { value: 'core',       label: 'Core',       emoji: '🎯' },
  { value: 'glutes',     label: 'Glutes',     emoji: '🍑' },
  { value: 'quads',      label: 'Quads',      emoji: '🦵' },
  { value: 'hamstrings', label: 'Hamstrings', emoji: '🦵' },
  { value: 'calves',     label: 'Calves',     emoji: '🦵' },
]

const EQUIPMENT_OPTIONS: { value: UserEquipment; label: string; emoji: string }[] = [
  { value: 'dumbbell', label: 'Dumbbell',  emoji: '🏋️' },
  { value: 'band',     label: 'Res. Band', emoji: '🪢' },
  { value: 'chair',    label: 'Chair',     emoji: '🪑' },
]

const GOALS: { value: Goal; label: string; emoji: string; desc: string }[] = [
  { value: 'general-fitness', label: 'General Fitness', emoji: '🏅', desc: 'Balanced workout' },
  { value: 'fat-burning',     label: 'Fat Burning',     emoji: '🔥', desc: 'Torch calories' },
  { value: 'muscle-building', label: 'Build Muscle',    emoji: '💪', desc: 'Hypertrophy' },
  { value: 'hiit',            label: 'HIIT',            emoji: '⚡', desc: 'High intensity' },
  { value: 'endurance',       label: 'Endurance',       emoji: '🏃', desc: 'Stamina & cardio' },
  { value: 'circuit',         label: 'Circuit',         emoji: '🔄', desc: 'Back-to-back' },
  { value: 'mobility',        label: 'Mobility',        emoji: '🧘', desc: 'Range of motion' },
  { value: 'flexibility',     label: 'Flexibility',     emoji: '🤸', desc: 'Stretch & recover' },
]

const INTENSITY_META: Record<Intensity, { label: string; color: string; bg: string; border: string }> = {
  1: { label: 'Easy',     color: 'text-emerald-400', bg: 'bg-emerald-500', border: 'border-emerald-500' },
  2: { label: 'Light',    color: 'text-green-400',   bg: 'bg-green-500',   border: 'border-green-500' },
  3: { label: 'Moderate', color: 'text-yellow-400',  bg: 'bg-yellow-500',  border: 'border-yellow-500' },
  4: { label: 'Hard',     color: 'text-orange-400',  bg: 'bg-orange-500',  border: 'border-orange-500' },
  5: { label: 'Max',      color: 'text-red-400',     bg: 'bg-red-500',     border: 'border-red-500' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-usable atoms
// ─────────────────────────────────────────────────────────────────────────────

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-3">
      {children}
    </p>
  )
}

function Pill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95 ${
        active
          ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
          : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-600 hover:text-zinc-200'
      }`}
    >
      {children}
    </button>
  )
}

function SegmentedControl<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex bg-zinc-800 rounded-xl p-1 gap-1">
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => !opt.disabled && onChange(opt.value)}
          disabled={opt.disabled}
          className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
            value === opt.value
              ? 'bg-orange-500 text-white shadow'
              : opt.disabled
                ? 'text-zinc-700 cursor-not-allowed'
                : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Warnings
// ─────────────────────────────────────────────────────────────────────────────

function getWarnings(config: WorkoutConfig): string[] {
  const w: string[] = []
  if (config.silentMode && config.goal === 'hiit')
    w.push('Silent HIIT has limited options — many HIIT moves are high-impact.')
  if (config.equipment.length === 0 && config.goal === 'muscle-building')
    w.push('Muscle building without equipment is limited. Consider adding a dumbbell.')
  if (config.duration <= 10 && config.bodyParts.length > 3)
    w.push('10 min is short to cover multiple body parts effectively.')
  if (config.fitnessLevel === 'beginner' && config.intensity >= 4)
    w.push('High intensity for beginners raises injury risk. Are you sure?')
  if (['mobility', 'flexibility'].includes(config.goal) && config.intensity >= 4)
    w.push('Mobility & flexibility sessions are typically low intensity.')
  return w
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Config() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const [config, setConfig] = useState<WorkoutConfig>(state.config)
  const [generating, setGenerating] = useState(false)

  const warnings = getWarnings(config)

  useEffect(() => {
    if (config.equipment.length === 0 && config.exerciseType !== 'bodyweight') {
      setConfig(c => ({ ...c, exerciseType: 'bodyweight' }))
    }
  }, [config.equipment.length, config.exerciseType])

  function toggleBodyPart(bp: BodyPart) {
    setConfig(c => {
      if (bp === 'full-body') return { ...c, bodyParts: ['full-body'] }
      const current = c.bodyParts.filter(b => b !== 'full-body')
      const next = current.includes(bp)
        ? current.filter(b => b !== bp)
        : [...current, bp]
      return { ...c, bodyParts: next.length === 0 ? ['full-body'] : next }
    })
  }

  function toggleEquipment(eq: UserEquipment) {
    setConfig(c => ({
      ...c,
      equipment: c.equipment.includes(eq)
        ? c.equipment.filter(e => e !== eq)
        : [...c.equipment, eq],
    }))
  }

  async function handleGenerate() {
    setGenerating(true)
    dispatch({ type: 'SET_CONFIG', config })
    await new Promise(r => setTimeout(r, 700))
    const workout = generateWorkout(config, exercises)
    dispatch({ type: 'SET_WORKOUT', workout })
    setGenerating(false)
    navigate('/workout/overview')
  }

  const fitnessOptions: { value: Difficulty; label: string }[] = [
    { value: 'beginner',     label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced',     label: 'Advanced' },
  ]

  const exerciseTypeOptions: { value: ExerciseType; label: string; disabled?: boolean }[] = [
    { value: 'bodyweight', label: 'Bodyweight' },
    { value: 'equipment',  label: 'Equipment', disabled: config.equipment.length === 0 },
    { value: 'mixed',      label: 'Mixed',     disabled: config.equipment.length === 0 },
  ]

  return (
    <>
    <div className="flex flex-col h-full">

      {/* ── Sticky header ──────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-3 md:pt-5 bg-zinc-950 sticky top-0 z-20 border-b border-zinc-800/50">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-black text-zinc-50 leading-tight">Configure Workout</h1>
            <p className="text-xs text-zinc-600">Set your preferences below</p>
          </div>
        </div>
      </div>

      {/* ── Scrollable form ────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-36 sm:pb-8 space-y-4 max-w-3xl mx-auto w-full">

        {/* Body Parts */}
        <SectionCard>
          <SectionLabel>🎯 Target Body Parts</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {BODY_PARTS.map(({ value, label, emoji }) => (
              <Pill
                key={value}
                active={config.bodyParts.includes(value)}
                onClick={() => toggleBodyPart(value)}
              >
                {emoji} {label}
              </Pill>
            ))}
          </div>
        </SectionCard>

        {/* Equipment */}
        <SectionCard>
          <SectionLabel>🏋️ Equipment You Have</SectionLabel>
          <div className="flex flex-wrap gap-2 mb-3">
            {EQUIPMENT_OPTIONS.map(({ value, label, emoji }) => (
              <Pill
                key={value}
                active={config.equipment.includes(value)}
                onClick={() => toggleEquipment(value)}
              >
                {emoji} {label}
              </Pill>
            ))}
          </div>
          {config.equipment.length === 0 && (
            <p className="text-xs text-zinc-600 flex items-center gap-1.5">
              <span>ℹ️</span> No equipment selected — bodyweight moves only
            </p>
          )}
        </SectionCard>

        {/* Duration */}
        <SectionCard>
          <div className="flex items-start justify-between mb-4">
            <SectionLabel>⏱ Duration</SectionLabel>
            <div className="text-right -mt-0.5">
              <span className="text-2xl font-black text-orange-500">{config.duration}</span>
              <span className="text-xs text-zinc-500 ml-1">min</span>
            </div>
          </div>
          <input
            type="range"
            min={10} max={60} step={5}
            value={config.duration}
            onChange={e => setConfig(c => ({ ...c, duration: +e.target.value }))}
          />
          <div className="flex justify-between mt-3">
            {[10, 20, 30, 40, 50, 60].map(v => (
              <button
                key={v}
                onClick={() => setConfig(c => ({ ...c, duration: v }))}
                className={`text-[11px] font-semibold transition-colors ${
                  config.duration === v ? 'text-orange-400' : 'text-zinc-700 hover:text-zinc-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </SectionCard>

        {/* Intensity */}
        <SectionCard>
          <div className="flex items-center justify-between mb-3">
            <SectionLabel>🔥 Intensity</SectionLabel>
            <span className={`text-xs font-bold ${INTENSITY_META[config.intensity].color}`}>
              {INTENSITY_META[config.intensity].label}
            </span>
          </div>
          <div className="flex gap-2">
            {([1, 2, 3, 4, 5] as Intensity[]).map(i => {
              const meta = INTENSITY_META[i]
              const active = config.intensity === i
              return (
                <button
                  key={i}
                  onClick={() => setConfig(c => ({ ...c, intensity: i }))}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 border-2 ${
                    active
                      ? `${meta.bg} text-white border-transparent shadow-md`
                      : `bg-zinc-800 ${meta.color} border-zinc-700 hover:border-zinc-500`
                  }`}
                >
                  {i}
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* Fitness Level */}
        <SectionCard>
          <SectionLabel>📊 Fitness Level</SectionLabel>
          <SegmentedControl
            options={fitnessOptions}
            value={config.fitnessLevel}
            onChange={v => setConfig(c => ({ ...c, fitnessLevel: v }))}
          />
        </SectionCard>

        {/* Goal */}
        <SectionCard>
          <SectionLabel>🏆 Workout Goal</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {GOALS.map(({ value, label, emoji, desc }) => {
              const active = config.goal === value
              return (
                <button
                  key={value}
                  onClick={() => setConfig(c => ({ ...c, goal: value }))}
                  className={`p-3.5 rounded-xl text-left transition-all active:scale-95 border-2 ${
                    active
                      ? 'bg-orange-500/15 border-orange-500 text-orange-200'
                      : 'bg-zinc-800 border-transparent text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <div className="text-2xl mb-1.5">{emoji}</div>
                  <div className={`text-sm font-bold leading-tight ${active ? 'text-orange-200' : 'text-zinc-200'}`}>
                    {label}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{desc}</div>
                </button>
              )
            })}
          </div>
        </SectionCard>

        {/* Silent Mode + Exercise Type */}
        <SectionCard>
          {/* Silent Mode */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-zinc-800">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 mb-0.5">
                🤫 Silent Mode
              </p>
              <p className="text-xs text-zinc-600">No jumping or high-impact moves</p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, silentMode: !c.silentMode }))}
              className={`relative w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                config.silentMode ? 'bg-orange-500' : 'bg-zinc-700'
              }`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                config.silentMode ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Exercise Type */}
          <div>
            <SectionLabel>🔧 Exercise Type</SectionLabel>
            <SegmentedControl
              options={exerciseTypeOptions}
              value={config.exerciseType}
              onChange={v => setConfig(c => ({ ...c, exerciseType: v }))}
            />
            {config.equipment.length === 0 && (
              <p className="text-xs text-zinc-600 mt-2 flex items-center gap-1.5">
                <span>🔒</span> Select equipment above to unlock more options
              </p>
            )}
          </div>
        </SectionCard>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((w, i) => (
              <div key={i} className="flex gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5">
                <span className="flex-shrink-0">⚠️</span>
                <p className="text-xs text-amber-300 leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── CTAs — desktop: inline at bottom of form ──────────────── */}
      <div className="hidden sm:flex flex-col gap-2 pb-8 pt-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2.5"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Building your workout…
            </>
          ) : (
            <><span className="text-lg">⚡</span> Generate Workout</>
          )}
        </button>
        <button
          onClick={() => { dispatch({ type: 'SET_CONFIG', config }); navigate('/workout/builder') }}
          className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 font-bold rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-2"
        >
          <span className="text-base">🛠</span> Build My Own
        </button>
      </div>
    </div>

    {/* ── CTAs — mobile: fixed above bottom nav ──────────────────── */}
    <div className="sm:hidden fixed bottom-16 left-0 right-0 px-5 pb-3 pt-8 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent z-50">
      <div className="flex flex-col gap-2">
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2.5"
        >
          {generating ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Building your workout…
            </>
          ) : (
            <><span className="text-lg">⚡</span> Generate Workout</>
          )}
        </button>
        <button
          onClick={() => { dispatch({ type: 'SET_CONFIG', config }); navigate('/workout/builder') }}
          className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 font-bold rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-2 text-sm"
        >
          <span>🛠</span> Build My Own
        </button>
      </div>
    </div>
    </>
  )
}
