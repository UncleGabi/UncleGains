import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function WorkoutComplete() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const workout  = state.generatedWorkout

  if (!workout) { navigate('/'); return null }

  const totalExercises = workout.warmup.length + workout.main.length + workout.cooldown.length
  const totalSets      = [...workout.warmup, ...workout.main, ...workout.cooldown].reduce((a, w) => a + w.sets, 0)
  const actualDur      = workout.actualDuration
  const estimatedDur   = workout.estimatedDuration
  const calories       = Math.round(totalSets * 4)

  const stats = [
    { icon: '⏱', value: actualDur != null ? `${actualDur}` : `~${estimatedDur}`, unit: 'min',   label: actualDur != null ? 'Actual time' : 'Est. time' },
    { icon: '💥', value: `${totalExercises}`, unit: 'moves', label: 'Exercises' },
    { icon: '🔁', value: `${totalSets}`,      unit: 'sets',  label: 'Sets done' },
    { icon: '🔥', value: `~${calories}`,      unit: 'kcal',  label: 'Calories' },
  ]

  return (
    <div className="min-h-full flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-lg">

        {/* Celebration */}
        <div className="text-center mb-8">
          <div className="relative inline-block mb-4">
            <div className="text-8xl animate-bounce">🎉</div>
            <div className="absolute -top-2 -right-3 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <span className="text-sm">✓</span>
            </div>
          </div>
          <h1 className="text-4xl font-black text-zinc-50 mb-2">Workout Complete!</h1>
          <p className="text-zinc-400 text-sm capitalize">
            {workout.config.goal.replace(/-/g, ' ')} · {workout.config.fitnessLevel}
          </p>
        </div>

        {/* Stats — 2×2 on mobile, 4 in a row on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map(({ icon, value, unit, label }) => (
            <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="flex items-baseline gap-1 justify-center">
                <span className="text-2xl font-black text-orange-500">{value}</span>
                <span className="text-xs text-zinc-600">{unit}</span>
              </div>
              <div className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Motivational nudge */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl px-5 py-3.5 mb-8 text-center">
          <p className="text-sm text-orange-300 font-semibold">Every rep counts. Keep showing up! 💪</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => { dispatch({ type: 'REDO_WORKOUT', workout }); navigate('/workout/overview') }}
            className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-200 font-bold rounded-2xl transition-all border border-zinc-700 flex items-center justify-center gap-2"
          >
            🔁 Redo this workout
          </button>
          <button
            onClick={() => { dispatch({ type: 'END_SESSION' }); navigate('/') }}
            className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-black rounded-2xl transition-all shadow-xl shadow-orange-500/20"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}
