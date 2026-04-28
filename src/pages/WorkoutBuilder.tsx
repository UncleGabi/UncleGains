import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { Exercise, BodyPart, WorkoutExercise } from '../types'
import {
  generateWithCustomMain,
  estimateMainDuration,
  getSlotDefaults,
} from '../lib/generateWorkout'
import exercisesRaw from '../data/exercises.json'
import ExerciseModal from '../components/ExerciseModal'

const BUILDER_STORAGE_KEY = 'workout_builder_selected_ids'

const allExercises = exercisesRaw as Exercise[]

// ─────────────────────────────────────────────────────────────────────────────
// Muscle group tabs config
// ─────────────────────────────────────────────────────────────────────────────

const MUSCLE_TABS: { value: BodyPart | 'all'; label: string; emoji: string }[] = [
  { value: 'all',         label: 'All',        emoji: '⚡' },
  { value: 'chest',       label: 'Chest',      emoji: '💪' },
  { value: 'back',        label: 'Back',       emoji: '🔙' },
  { value: 'shoulders',   label: 'Shoulders',  emoji: '🏋️' },
  { value: 'biceps',      label: 'Biceps',     emoji: '💪' },
  { value: 'triceps',     label: 'Triceps',    emoji: '💪' },
  { value: 'core',        label: 'Core',       emoji: '🎯' },
  { value: 'glutes',      label: 'Glutes',     emoji: '🍑' },
  { value: 'quads',       label: 'Quads',      emoji: '🦵' },
  { value: 'hamstrings',  label: 'Hamstrings', emoji: '🦵' },
  { value: 'calves',      label: 'Calves',     emoji: '🦵' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function difficultyRank(d: string): number {
  return { beginner: 0, intermediate: 1, advanced: 2 }[d] ?? 0
}

function getDifficultyColor(d: string) {
  return d === 'beginner'
    ? 'bg-emerald-500/20 text-emerald-400'
    : d === 'intermediate'
      ? 'bg-yellow-500/20 text-yellow-400'
      : 'bg-red-500/20 text-red-400'
}

// ─────────────────────────────────────────────────────────────────────────────
// Browse exercise card
// ─────────────────────────────────────────────────────────────────────────────

function BrowseCard({
  exercise, isSelected, onToggle, onOpenModal,
}: {
  exercise: Exercise
  isSelected: boolean
  onToggle: () => void
  onOpenModal: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const thumbUrl = exercise.youtubeId && !imgError
    ? `https://img.youtube.com/vi/${exercise.youtubeId}/mqdefault.jpg`
    : null

  return (
    <div className={`flex items-center gap-3 rounded-2xl border transition-all ${
      isSelected
        ? 'bg-orange-500/10 border-orange-500/40'
        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
    }`}>
      {/* Clickable info area — opens modal */}
      <button
        onClick={onOpenModal}
        className="flex items-center gap-3 flex-1 min-w-0 p-3 text-left"
      >
        {/* Thumbnail */}
        <div className="w-12 h-12 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={exercise.name}
              onError={() => setImgError(true)}
              className="w-full h-full object-cover opacity-80"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xl">💪</div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-bold truncate leading-tight ${isSelected ? 'text-orange-200' : 'text-zinc-100'}`}>
            {exercise.name}
          </p>
          <p className="text-[10px] text-zinc-500 mt-0.5 capitalize truncate">
            {exercise.bodyParts.slice(0, 2).join(' · ')}
          </p>
          <span className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${getDifficultyColor(exercise.difficulty)}`}>
            {exercise.difficulty}
          </span>
        </div>
      </button>

      {/* Add / Added toggle — separate from the info button */}
      <button
        onClick={onToggle}
        className={`flex-shrink-0 w-8 h-8 mr-3 rounded-full flex items-center justify-center transition-all active:scale-90 font-black text-sm ${
          isSelected
            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
            : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
        }`}
      >
        {isSelected ? '✓' : '+'}
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Selected exercise card (My List)
// ─────────────────────────────────────────────────────────────────────────────

function SelectedCard({
  item, index, onRemove,
}: {
  item: WorkoutExercise
  index: number
  onRemove: () => void
}) {
  const { exercise, sets, reps, duration } = item
  return (
    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-3">
      <div className="w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
        <span className="text-[10px] font-black text-orange-400">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-zinc-100 truncate">{exercise.name}</p>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {sets} sets · {duration != null ? `${duration}s` : `${reps} reps`}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-red-500/20 hover:text-red-400
          text-zinc-500 flex items-center justify-center flex-shrink-0 transition-colors text-xs font-bold"
      >
        ×
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Time estimate + warning bar
// ─────────────────────────────────────────────────────────────────────────────

function TimeEstimate({
  selectedExercises, configDuration,
}: {
  selectedExercises: Exercise[]
  configDuration: number
}) {
  const { state } = useApp()
  const mainMin = useMemo(
    () => estimateMainDuration(selectedExercises, state.config),
    [selectedExercises, state.config],
  )
  const warmupCooldownMin = Math.round(configDuration * 0.25) // ~25% of session
  const totalEst = mainMin + warmupCooldownMin
  const isOver   = totalEst > configDuration

  if (selectedExercises.length === 0) return null

  return (
    <div className={`rounded-2xl border p-3.5 space-y-1 ${
      isOver
        ? 'bg-amber-500/10 border-amber-500/25'
        : 'bg-zinc-900 border-zinc-800'
    }`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">Main section</span>
        <span className="font-bold text-zinc-200">~{mainMin} min</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-500">Warm-up + cool-down</span>
        <span className="font-bold text-zinc-200">~{warmupCooldownMin} min</span>
      </div>
      <div className="border-t border-zinc-800 pt-1 flex items-center justify-between text-xs">
        <span className="text-zinc-400 font-semibold">Total estimate</span>
        <span className={`font-black ${isOver ? 'text-amber-400' : 'text-orange-400'}`}>
          ~{totalEst} min
        </span>
      </div>
      {isOver && (
        <p className="text-[10px] text-amber-400 pt-0.5 flex items-start gap-1">
          <span className="flex-shrink-0 mt-0.5">⚠️</span>
          <span>
            This exceeds your {configDuration} min session.
            Remove some exercises or increase your duration in Config.
          </span>
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkoutBuilder() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()

  const [activeTab,      setActiveTab]     = useState<'browse' | 'mylist'>('browse')
  const [activeMuscle,   setActiveMuscle]  = useState<BodyPart | 'all'>('all')
  const [search,         setSearch]        = useState('')
  const [modalExercise,  setModalExercise] = useState<Exercise | null>(null)

  // ── Restore selection from localStorage on mount ──────────────
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(BUILDER_STORAGE_KEY)
      return stored ? (JSON.parse(stored) as string[]) : []
    } catch { return [] }
  })

  // ── Persist selection to localStorage whenever it changes ─────
  useEffect(() => {
    try { localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(selectedIds)) }
    catch { /* ignore storage errors */ }
  }, [selectedIds])

  // Filter the exercise pool the same way the normal generator does
  const pool = useMemo(() => {
    const maxRank = difficultyRank(state.config.fitnessLevel)
    return allExercises.filter(ex => {
      if (!ex.phase.includes('main')) return false
      if (difficultyRank(ex.difficulty) > maxRank) return false
      if (state.config.silentMode && ex.highImpact) return false
      if (state.config.exerciseType === 'bodyweight') {
        if (!ex.equipment.every(eq => eq === 'bodyweight')) return false
      } else if (state.config.exerciseType === 'equipment') {
        if (!ex.equipment.some(eq => state.config.equipment.includes(eq as never))) return false
      }
      return true
    })
  }, [state.config])

  // Apply muscle-tab + search filter for browsing
  const filtered = useMemo(() => {
    let list = pool
    if (activeMuscle !== 'all') {
      // Match primary muscle only (first bodyPart) to avoid cross-group bleed
      list = list.filter(ex => ex.bodyParts[0] === activeMuscle)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(ex =>
        ex.name.toLowerCase().includes(q) ||
        ex.bodyParts.some(bp => bp.includes(q))
      )
    }
    return list.sort((a, b) => a.name.localeCompare(b.name))
  }, [pool, activeMuscle, search])

  // Build WorkoutExercise previews for selected items (for My List display)
  const selectedItems: WorkoutExercise[] = useMemo(() => {
    return selectedIds.flatMap(id => {
      const ex = allExercises.find(e => e.id === id)
      if (!ex) return []
      const d = getSlotDefaults(ex, state.config.goal, state.config.intensity, 'main', state.config.duration)
      return [{ exercise: ex, sets: d.sets, reps: d.reps, duration: d.duration, restAfter: d.restAfter }]
    })
  }, [selectedIds, state.config])

  const selectedExercises = selectedItems.map(si => si.exercise)

  function toggleExercise(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function handleStart() {
    if (selectedExercises.length === 0) return
    const workout = generateWithCustomMain(state.config, allExercises, selectedExercises)
    dispatch({ type: 'SET_WORKOUT', workout })
    navigate('/workout/overview')
  }

  const canStart = selectedIds.length > 0

  // ── Shared panels ──────────────────────────────────────────────────────────

  const BrowsePanel = (
    <div className="flex flex-col h-full min-h-0">
      {/* Muscle tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 px-0 scrollbar-none flex-shrink-0">
        {MUSCLE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveMuscle(tab.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeMuscle === tab.value
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500'
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mt-2 mb-3 flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search exercises…"
          className="w-full pl-9 pr-3 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-sm text-zinc-200
            placeholder-zinc-600 focus:outline-none focus:border-orange-500/50 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 text-lg leading-none"
          >×</button>
        )}
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-3">🤷</div>
            <p className="text-zinc-500 text-sm">No exercises found.</p>
            {search && (
              <button onClick={() => setSearch('')} className="mt-2 text-xs text-orange-400 hover:underline">
                Clear search
              </button>
            )}
          </div>
        ) : (
          filtered.map(ex => (
            <BrowseCard
              key={ex.id}
              exercise={ex}
              isSelected={selectedIds.includes(ex.id)}
              onToggle={() => toggleExercise(ex.id)}
              onOpenModal={() => setModalExercise(ex)}
            />
          ))
        )}
      </div>
    </div>
  )

  const MyListPanel = (
    <div className="flex flex-col h-full min-h-0">
      {selectedItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
          <div className="text-5xl mb-4">📋</div>
          <p className="text-zinc-400 font-semibold text-sm mb-1">Your list is empty</p>
          <p className="text-zinc-600 text-xs">Add exercises from the Browse tab.</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {selectedItems.map((item, i) => (
            <SelectedCard
              key={item.exercise.id}
              item={item}
              index={i}
              onRemove={() => toggleExercise(item.exercise.id)}
            />
          ))}
        </div>
      )}

      {/* Time estimate (always visible at bottom of panel) */}
      <div className="flex-shrink-0 mt-4 space-y-3">
        <TimeEstimate
          selectedExercises={selectedExercises}
          configDuration={state.config.duration}
        />
      </div>
    </div>
  )

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky header ───────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-3 md:pt-5 bg-zinc-950 sticky top-0 z-20 border-b border-zinc-800/50 flex-shrink-0">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate('/config')}
            className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-zinc-50 leading-tight">Build My Workout</h1>
            <p className="text-xs text-zinc-600">
              {state.config.duration} min · {state.config.fitnessLevel} · {state.config.goal.replace(/-/g, ' ')}
            </p>
          </div>
          {/* Desktop CTA in header */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="hidden sm:flex items-center gap-1.5 text-sm font-black text-white
              bg-orange-500 hover:bg-orange-400 active:scale-[0.98]
              disabled:bg-zinc-700 disabled:text-zinc-500
              px-4 py-2 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex-shrink-0"
          >
            <span>▶</span>
            Let's go
            {selectedIds.length > 0 && (
              <span className="bg-white/20 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                {selectedIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── MOBILE: tabbed layout ────────────────────────────────── */}
      <div className="sm:hidden flex flex-col flex-1 min-h-0">
        {/* Tab bar */}
        <div className="flex border-b border-zinc-800 flex-shrink-0">
          <button
            onClick={() => setActiveTab('browse')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'browse'
                ? 'text-orange-400 border-b-2 border-orange-500'
                : 'text-zinc-500'
            }`}
          >
            Browse ({filtered.length})
          </button>
          <button
            onClick={() => setActiveTab('mylist')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors ${
              activeTab === 'mylist'
                ? 'text-orange-400 border-b-2 border-orange-500'
                : 'text-zinc-500'
            }`}
          >
            My List
            {selectedIds.length > 0 && (
              <span className="ml-1.5 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                {selectedIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden px-5 pt-4 pb-0 min-h-0">
          {activeTab === 'browse' ? BrowsePanel : MyListPanel}
        </div>

        {/* Mobile CTA — fixed above bottom nav */}
        <div className="fixed bottom-16 left-0 right-0 px-5 pb-3 pt-6
          bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent z-50 flex-shrink-0">
          <button
            onClick={() => {
              if (!canStart) { setActiveTab('browse'); return }
              handleStart()
            }}
            disabled={!canStart}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98]
              disabled:bg-zinc-800 disabled:text-zinc-600
              text-white font-black text-base rounded-2xl transition-all
              shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            {canStart ? (
              <><span>▶</span> Let's go ({selectedIds.length} exercise{selectedIds.length !== 1 ? 's' : ''})</>
            ) : (
              <>Add exercises to get started</>
            )}
          </button>
        </div>
      </div>

      {/* ── DESKTOP: two-column layout ───────────────────────────── */}
      <div className="hidden sm:flex flex-1 min-h-0 max-w-5xl mx-auto w-full px-5 gap-6 pt-5 pb-8">

        {/* Left: Browse */}
        <div className="flex-[3] flex flex-col min-h-0">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-3">
            Browse Exercises <span className="text-zinc-700 font-normal">({filtered.length} available)</span>
          </h2>
          {BrowsePanel}
        </div>

        {/* Right: My List */}
        <div className="flex-[2] flex flex-col min-h-0">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 mb-3">
            My List <span className="text-zinc-700 font-normal">({selectedIds.length} selected)</span>
          </h2>
          {MyListPanel}

          {/* Desktop CTA at bottom of right column */}
          <div className="mt-4 flex-shrink-0">
            <button
              onClick={handleStart}
              disabled={!canStart}
              className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98]
                disabled:bg-zinc-800 disabled:text-zinc-600
                text-white font-black text-base rounded-2xl transition-all
                shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2"
            >
              {canStart ? (
                <><span>▶</span> Let's go — {selectedIds.length} exercise{selectedIds.length !== 1 ? 's' : ''}</>
              ) : (
                <>Select exercises to begin</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Exercise detail modal */}
      {modalExercise && (
        <ExerciseModal
          exercise={modalExercise}
          onClose={() => setModalExercise(null)}
        />
      )}
    </div>
  )
}
