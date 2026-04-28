import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { WorkoutExercise, Phase, Exercise } from '../types'
import { generateWorkout } from '../lib/generateWorkout'
import exercisesRaw from '../data/exercises.json'
import ExerciseModal from '../components/ExerciseModal'
import {
  DndContext, closestCenter, PointerSensor, TouchSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function isUnilateral(name: string): boolean {
  const n = name.toLowerCase()
  return (
    n.includes('lunge') || n.includes('single-leg') || n.includes('single leg') ||
    n.includes('single-arm') || n.includes('single arm') || n.includes('one-arm') ||
    n.includes('one arm') || n.includes('one-leg') || n.includes('one leg') ||
    n.includes('bulgarian') || n.includes('split squat') || n.includes('step-up') ||
    n.includes('step up') || n.includes('cossack') || n.includes('kickback') ||
    n.includes('side bend') || n.includes('pistol') || n.includes('copenhagen')
  )
}

const exercises = exercisesRaw as Exercise[]

// ─────────────────────────────────────────────────────────────────────────────
// Phase metadata
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_META: Record<Phase, { label: string; color: string; bg: string; bar: string; emoji: string }> = {
  warmup:   { label: 'Warm-Up',    color: 'text-amber-400',   bg: 'bg-amber-500/10   border-amber-500/20',   bar: 'bg-amber-500',   emoji: '🔥' },
  main:     { label: 'Main Block', color: 'text-violet-400',  bg: 'bg-violet-500/10  border-violet-500/20',  bar: 'bg-violet-500',  emoji: '⚡' },
  cooldown: { label: 'Cool-Down',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', bar: 'bg-emerald-500', emoji: '🧊' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Replace picker modal
// ─────────────────────────────────────────────────────────────────────────────

interface ReplacePickerProps {
  slot: WorkoutExercise
  phase: Phase
  onSelect: (replacement: WorkoutExercise) => void
  onClose: () => void
}

function ReplacePicker({ slot, phase, onSelect, onClose }: ReplacePickerProps) {
  const { state } = useApp()

  const currentIds = new Set([
    ...(state.generatedWorkout?.warmup.map(w => w.exercise.id)    ?? []),
    ...(state.generatedWorkout?.main.map(w => w.exercise.id)      ?? []),
    ...(state.generatedWorkout?.cooldown.map(w => w.exercise.id)  ?? []),
  ])

  const candidates = exercises.filter(ex => {
    if (currentIds.has(ex.id)) return false
    if (!ex.phase.includes(phase)) return false
    if (ex.difficulty === 'advanced' && state.config.fitnessLevel === 'beginner') return false
    if (state.config.silentMode && ex.highImpact) return false
    const sharesBodyPart = slot.exercise.bodyParts.some(bp => ex.bodyParts.includes(bp as never))
    return sharesBodyPart || phase !== 'main'
  }).slice(0, 12)

  const meta = PHASE_META[phase]

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative w-full bg-zinc-900 rounded-t-3xl border-t border-zinc-800 max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1.5 rounded-full bg-zinc-700" />
        </div>

        <div className="px-5 pb-8">
          {/* Header */}
          <div className="mb-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500 mb-0.5">Replace exercise</p>
            <h3 className="text-base font-black text-zinc-50">{slot.exercise.name}</h3>
          </div>

          {/* Phase badge */}
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 border mb-4 ${meta.bg}`}>
            <span className="text-xs">{meta.emoji}</span>
            <span className={`text-xs font-bold ${meta.color}`}>{meta.label} alternatives</span>
          </div>

          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">🤷</div>
              <p className="text-zinc-500 text-sm">No alternatives found for this slot.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map(ex => (
                <button
                  key={ex.id}
                  onClick={() => onSelect({
                    exercise: ex,
                    sets: slot.sets,
                    reps: ex.format === 'reps' ? (slot.reps ?? ex.defaultReps ?? 10) : null,
                    duration: ex.format === 'time' ? (slot.duration ?? ex.defaultDuration ?? 30) : null,
                    restAfter: slot.restAfter,
                  })}
                  className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] rounded-xl p-3 text-left transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-700 overflow-hidden flex-shrink-0">
                    {ex.youtubeId ? (
                      <img src={`https://img.youtube.com/vi/${ex.youtubeId}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xl">💪</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-100 truncate">{ex.name}</p>
                    <p className="text-xs text-zinc-500 capitalize mt-0.5">{ex.bodyParts.slice(0, 2).join(' · ')}</p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                    ex.difficulty === 'beginner'     ? 'bg-emerald-500/20 text-emerald-400' :
                    ex.difficulty === 'intermediate' ? 'bg-yellow-500/20  text-yellow-400'  :
                                                       'bg-red-500/20     text-red-400'
                  }`}>
                    {ex.difficulty}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Drag handle icon
// ─────────────────────────────────────────────────────────────────────────────

function GripIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
      <circle cx="5" cy="4"  r="1.3"/><circle cx="11" cy="4"  r="1.3"/>
      <circle cx="5" cy="8"  r="1.3"/><circle cx="11" cy="8"  r="1.3"/>
      <circle cx="5" cy="12" r="1.3"/><circle cx="11" cy="12" r="1.3"/>
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise card
// ─────────────────────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  item: WorkoutExercise
  index: number
  phase: Phase
  onOpenModal: (item: WorkoutExercise) => void
  onReplace:  (item: WorkoutExercise, phase: Phase, index: number) => void
  onRemove:   (phase: Phase, index: number) => void
  dragHandle?: React.ReactNode
}

function WorkoutExerciseCard({ item, index, phase, onOpenModal, onReplace, onRemove, dragHandle }: ExerciseCardProps) {
  const { exercise, sets, reps, duration } = item
  const [imgError, setImgError] = useState(false)

  const thumbUrl = exercise.youtubeId && !imgError
    ? `https://img.youtube.com/vi/${exercise.youtubeId}/mqdefault.jpg`
    : null

  const equipLabel = exercise.equipment.includes('bodyweight') || exercise.equipment.length === 0
    ? 'Bodyweight'
    : exercise.equipment[0]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Main row */}
      <div className="flex items-center gap-1 pl-2 pr-0">
        {/* Drag handle slot */}
        {dragHandle}
        {/* Tappable info area */}
        <button
          className="flex-1 flex items-center gap-3 p-3 text-left min-w-0"
          onClick={() => onOpenModal(item)}
        >
        {/* Thumbnail + index badge */}
        <div className="relative w-16 h-16 rounded-xl bg-zinc-800 overflow-hidden flex-shrink-0">
          {thumbUrl ? (
            <img
              src={thumbUrl}
              alt={exercise.name}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">💪</div>
          )}
          {/* Index badge */}
          <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
            <span className="text-[9px] font-black text-zinc-300">{index + 1}</span>
          </div>
          {/* Play overlay */}
          {thumbUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="white" className="w-3 h-3 ml-0.5">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-zinc-100 truncate leading-tight">{exercise.name}</h4>
          <p className="text-xs text-zinc-500 mt-0.5 capitalize truncate">
            {exercise.bodyParts.slice(0, 2).join(' · ')}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-bold text-orange-400">
              {sets} × {duration != null
                ? `${duration}s`
                : isUnilateral(exercise.name)
                  ? `${reps} / side`
                  : `${reps} reps`}
            </span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span className="text-[10px] text-zinc-600 capitalize">{equipLabel}</span>
          </div>
        </div>

        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4 text-zinc-700 flex-shrink-0">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        </button>
      </div>{/* end main row flex */}

      {/* Action bar */}
      <div className="flex border-t border-zinc-800/70">
        <button
          onClick={() => onReplace(item, phase, index)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-zinc-500 hover:text-orange-400 hover:bg-zinc-800/50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.49"/>
          </svg>
          Replace
        </button>
        <div className="w-px bg-zinc-800/70" />
        <button
          onClick={() => onRemove(phase, index)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-zinc-500 hover:text-red-400 hover:bg-zinc-800/50 transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
          </svg>
          Remove
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sortable card wrapper (main section only)
// ─────────────────────────────────────────────────────────────────────────────

function SortableExerciseCard(props: ExerciseCardProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: props.item.exercise.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity:  isDragging ? 0.45 : 1,
        zIndex:   isDragging ? 10 : undefined,
        position: 'relative',
      }}
    >
      <WorkoutExerciseCard
        {...props}
        dragHandle={
          <div
            {...attributes}
            {...listeners}
            className="flex items-center justify-center px-1.5 py-2 text-zinc-600
              hover:text-zinc-400 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
            title="Drag to reorder"
          >
            <GripIcon />
          </div>
        }
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// DnD main section — wraps main exercises with drag-and-drop
// ─────────────────────────────────────────────────────────────────────────────

interface DndMainSectionProps {
  items:        WorkoutExercise[]
  onOpenModal:  (item: WorkoutExercise) => void
  onReplace:    (item: WorkoutExercise, phase: Phase, index: number) => void
  onRemove:     (phase: Phase, index: number) => void
  onReorder:    (fromIndex: number, toIndex: number) => void
}

function DndMainSection({ items, onOpenModal, onReplace, onRemove, onReorder }: DndMainSectionProps) {
  const meta = PHASE_META['main']
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const ids = items.map(i => i.exercise.id)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const from = ids.indexOf(active.id as string)
    const to   = ids.indexOf(over.id  as string)
    if (from !== -1 && to !== -1) onReorder(from, to)
  }

  if (items.length === 0) return null

  return (
    <div>
      {/* Phase header */}
      <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 mb-2 ${meta.bg}`}>
        <div className={`w-2 h-8 rounded-full ${meta.bar}`} />
        <div className="flex-1">
          <p className={`text-xs font-black uppercase tracking-wider ${meta.color}`}>
            {meta.emoji} {meta.label}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{items.length} exercises</p>
        </div>
      </div>

      {/* Drag hint */}
      <div className="flex items-center gap-1.5 px-1 mb-3">
        <GripIcon />
        <span className="text-[10px] text-zinc-600">Hold & drag to reorder</span>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5">
            {items.map((item, i) => (
              <SortableExerciseCard
                key={item.exercise.id}
                item={item}
                index={i}
                phase="main"
                onOpenModal={onOpenModal}
                onReplace={onReplace}
                onRemove={onRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase section
// ─────────────────────────────────────────────────────────────────────────────

interface PhaseSectionProps {
  phase: Phase
  items: WorkoutExercise[]
  onOpenModal: (item: WorkoutExercise) => void
  onReplace:  (item: WorkoutExercise, phase: Phase, index: number) => void
  onRemove:   (phase: Phase, index: number) => void
}

function PhaseSection({ phase, items, onOpenModal, onReplace, onRemove }: PhaseSectionProps) {
  const meta = PHASE_META[phase]
  if (items.length === 0) return null

  return (
    <div>
      {/* Phase header */}
      <div className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 mb-3 ${meta.bg}`}>
        <div className={`w-2 h-8 rounded-full ${meta.bar}`} />
        <div>
          <p className={`text-xs font-black uppercase tracking-wider ${meta.color}`}>
            {meta.emoji} {meta.label}
          </p>
          <p className="text-[10px] text-zinc-600 mt-0.5">{items.length} exercises</p>
        </div>
      </div>

      <div className="space-y-2.5">
        {items.map((item, i) => (
          <WorkoutExerciseCard
            key={item.exercise.id}
            item={item}
            index={i}
            phase={phase}
            onOpenModal={onOpenModal}
            onReplace={onReplace}
            onRemove={onRemove}
          />
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function WorkoutOverview() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const workout = state.generatedWorkout

  const [modalItem,   setModalItem]   = useState<WorkoutExercise | null>(null)
  const [replaceSlot, setReplaceSlot] = useState<{ item: WorkoutExercise; phase: Phase; index: number } | null>(null)

  if (!workout) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 pb-20 text-center gap-4">
        <div className="text-6xl">🏋️</div>
        <div>
          <h2 className="text-xl font-black text-zinc-200 mb-1">No workout yet</h2>
          <p className="text-zinc-500 text-sm">Configure and generate one first.</p>
        </div>
        <button
          onClick={() => navigate('/config')}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-bold text-sm transition-colors"
        >
          Configure Workout
        </button>
      </div>
    )
  }

  const totalExercises = workout.warmup.length + workout.main.length + workout.cooldown.length
  const backPath = workout.source === 'builder' ? '/workout/builder' : '/config'

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky header ─────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-4 md:pt-5 bg-zinc-950 sticky top-0 z-20 border-b border-zinc-800/50">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => navigate(backPath)}
            className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-zinc-50 capitalize truncate">
              {workout.config.goal.replace(/-/g, ' ')} Workout
            </h1>
            <p className="text-xs text-zinc-500">
              ~{workout.estimatedDuration} min · {totalExercises} exercises · {workout.config.fitnessLevel}
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_WORKOUT', workout: generateWorkout(state.config, exercises) })}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-orange-400 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 rounded-xl transition-all flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.49-4.49"/>
            </svg>
            Redo
          </button>
          {/* Desktop: Start Workout button in header */}
          <button
            onClick={() => { dispatch({ type: 'START_SESSION' }); navigate('/workout/active') }}
            disabled={totalExercises === 0}
            className="hidden sm:flex items-center gap-1.5 text-sm font-black text-white bg-orange-500 hover:bg-orange-400 active:scale-[0.98] disabled:bg-zinc-700 disabled:text-zinc-500 px-4 py-2 rounded-xl transition-all shadow-lg shadow-orange-500/20 flex-shrink-0"
          >
            <span>▶</span> Start
          </button>
        </div>

        {/* Phase pill summary */}
        <div className="flex gap-1.5">
          {(['warmup', 'main', 'cooldown'] as Phase[]).map(p => {
            const meta = PHASE_META[p]
            const count = workout[p].length
            if (count === 0) return null
            return (
              <span key={p} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${meta.bg} ${meta.color}`}>
                {meta.emoji} {count}
              </span>
            )
          })}
        </div>
      </div>

      {/* ── Exercise list ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-36 sm:pb-10 pt-5 space-y-6 max-w-3xl mx-auto w-full">
        {(['warmup', 'main', 'cooldown'] as Phase[]).map(phase =>
          phase === 'main' ? (
            <DndMainSection
              key="main"
              items={workout.main}
              onOpenModal={setModalItem}
              onReplace={(item, ph, idx) => setReplaceSlot({ item, phase: ph, index: idx })}
              onRemove={(ph, idx) => dispatch({ type: 'REMOVE_EXERCISE', phase: ph, index: idx })}
              onReorder={(from, to) => dispatch({ type: 'REORDER_MAIN', fromIndex: from, toIndex: to })}
            />
          ) : (
            <PhaseSection
              key={phase}
              phase={phase}
              items={workout[phase]}
              onOpenModal={setModalItem}
              onReplace={(item, ph, idx) => setReplaceSlot({ item, phase: ph, index: idx })}
              onRemove={(ph, idx) => dispatch({ type: 'REMOVE_EXERCISE', phase: ph, index: idx })}
            />
          )
        )}
      </div>

      {/* ── Start CTA — mobile only: fixed above bottom nav ───────── */}
      <div className="sm:hidden fixed bottom-16 left-0 right-0 px-5 pb-3 pt-8 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent z-30">
        <button
          onClick={() => { dispatch({ type: 'START_SESSION' }); navigate('/workout/active') }}
          disabled={totalExercises === 0}
          className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2.5"
        >
          <span className="text-lg">▶</span>
          Start Workout
        </button>
      </div>

      {/* Modals */}
      {modalItem && <ExerciseModal exercise={modalItem.exercise} onClose={() => setModalItem(null)} />}
      {replaceSlot && (
        <ReplacePicker
          slot={replaceSlot.item}
          phase={replaceSlot.phase}
          onSelect={replacement => {
            dispatch({ type: 'REPLACE_EXERCISE', phase: replaceSlot.phase, index: replaceSlot.index, item: replacement })
            setReplaceSlot(null)
          }}
          onClose={() => setReplaceSlot(null)}
        />
      )}
    </div>
  )
}
