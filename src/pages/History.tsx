import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { GeneratedWorkout } from '../types'

const GOAL_EMOJI: Record<string, string> = {
  'hiit': '⚡', 'fat-burning': '🔥', 'muscle-building': '💪',
  'endurance': '🏃', 'mobility': '🧘', 'flexibility': '🤸',
  'general-fitness': '🏅', 'circuit': '🔄',
}

function WorkoutHistoryCard({ workout, onRedo, onDelete }: {
  workout: GeneratedWorkout
  onRedo: () => void
  onDelete: () => void
}) {
  const date           = new Date(workout.completedAt ?? workout.createdAt)
  const totalExercises = workout.warmup.length + workout.main.length + workout.cooldown.length
  const duration       = workout.actualDuration ?? workout.estimatedDuration
  const totalSets      = [...workout.warmup, ...workout.main, ...workout.cooldown].reduce((a, w) => a + w.sets, 0)

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-zinc-700 transition-colors">
      <div className="flex items-center gap-3.5 p-4">
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
          {GOAL_EMOJI[workout.config.goal] ?? '🏋️'}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-black text-zinc-100 capitalize leading-tight">
            {workout.config.goal.replace(/-/g, ' ')} Workout
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5 capitalize truncate">
            {workout.config.fitnessLevel} · {workout.config.bodyParts.slice(0, 3).join(', ')}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="text-xs font-semibold text-zinc-400">
            {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
          <button onClick={onDelete} className="text-zinc-700 hover:text-red-400 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex border-t border-zinc-800/70">
        {[
          { value: `${duration}m`, label: 'Duration' },
          { value: `${totalExercises}`, label: 'Exercises' },
          { value: `${totalSets}`, label: 'Sets' },
        ].map(({ value, label }) => (
          <div key={label} className="flex-1 text-center py-2.5">
            <div className="text-sm font-black text-orange-500">{value}</div>
            <div className="text-[9px] text-zinc-600 uppercase tracking-wide mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="px-4 pb-4 pt-3">
        <button
          onClick={onRedo}
          className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 text-sm font-bold rounded-xl transition-all border border-zinc-700 flex items-center justify-center gap-2"
        >
          🔁 Redo this workout
        </button>
      </div>
    </div>
  )
}

export default function History() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()

  function handleRedo(workout: GeneratedWorkout) {
    dispatch({ type: 'REDO_WORKOUT', workout })
    navigate('/workout/overview')
  }

  function handleDelete(id: string) {
    if (window.confirm('Remove this workout from history?')) {
      dispatch({ type: 'DELETE_HISTORY', id })
    }
  }

  return (
    <div className="flex flex-col h-full">

      {/* ── Sticky header ──────────────────────────────────────────── */}
      <div className="px-5 pt-8 pb-4 md:pt-6 bg-zinc-950 sticky top-0 md:top-0 z-20 border-b border-zinc-800/50">
        <div className="max-w-5xl mx-auto md:px-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black text-zinc-50">Workout History</h1>
          </div>
          {state.history.length > 0 && (
            <span className="text-xs font-bold text-zinc-500 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
              {state.history.length}
            </span>
          )}
          {state.history.length > 0 && (
            <button
              onClick={() => navigate('/config')}
              className="hidden md:flex items-center gap-1.5 text-sm font-bold text-white bg-orange-500 hover:bg-orange-400 px-4 py-2 rounded-xl transition-colors shadow-lg shadow-orange-500/20"
            >
              ⚡ New Workout
            </button>
          )}
        </div>
      </div>

      {/* ── List ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5">
        <div className="max-w-5xl mx-auto md:px-3">
          {state.history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
              <div className="text-6xl">📭</div>
              <div>
                <h2 className="text-xl font-black text-zinc-200 mb-1.5">No workouts yet</h2>
                <p className="text-zinc-500 text-sm">Complete your first workout to see it here.</p>
              </div>
              <button
                onClick={() => navigate('/config')}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-bold text-sm transition-colors shadow-lg shadow-orange-500/20"
              >
                ⚡ Generate a Workout
              </button>
            </div>
          ) : (
            /* Desktop: 2-column grid; Mobile: single column */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {state.history.map(workout => (
                <WorkoutHistoryCard
                  key={workout.id}
                  workout={workout}
                  onRedo={() => handleRedo(workout)}
                  onDelete={() => handleDelete(workout.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
