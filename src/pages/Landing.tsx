import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

const GOAL_EMOJI: Record<string, string> = {
  'hiit': '⚡', 'fat-burning': '🔥', 'muscle-building': '💪',
  'endurance': '🏃', 'mobility': '🧘', 'flexibility': '🤸',
  'general-fitness': '🏅', 'circuit': '🔄',
}

export default function Landing() {
  const { state } = useApp()
  const navigate  = useNavigate()

  const hasHistory    = state.history.length > 0
  const lastWorkout   = state.history[0]
  const totalMinutes  = state.history.reduce((a, w) => a + (w.actualDuration ?? w.estimatedDuration), 0)
  const totalExercises = state.history.reduce(
    (a, w) => a + w.warmup.length + w.main.length + w.cooldown.length, 0
  )

  return (
    <div className="min-h-full px-5 pt-10 pb-8 md:pt-12 md:px-0">
      <div className="max-w-5xl mx-auto md:px-8">

        {/* ── Desktop: two-column hero ──────────────────────────────── */}
        <div className="md:grid md:grid-cols-2 md:gap-10 md:items-start mb-6 md:mb-10">

          {/* ── Hero card ─────────────────────────────────────────── */}
          <div className="relative rounded-3xl overflow-hidden bg-zinc-900 border border-zinc-800 p-7 mb-5 md:mb-0">
            <div className="absolute inset-0 bg-dot-grid opacity-30 pointer-events-none" />
            <div className="absolute -top-10 -right-10 w-56 h-56 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-violet-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/25 rounded-full px-3 py-1 mb-5">
                <span className="text-xs font-bold text-orange-400 tracking-wider uppercase">Home Trainer</span>
              </div>

              <h1 className="text-5xl md:text-6xl font-black tracking-tight text-zinc-50 leading-none mb-3">
                Uncle<span className="text-orange-500">Gains</span>
              </h1>
              <p className="text-zinc-400 text-sm md:text-base leading-relaxed mb-7">
                Your free home trainer. Built around your body, time &amp; goals — no gym, no subscription, no nonsense.
              </p>

              <button
                onClick={() => navigate('/config')}
                className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2.5"
              >
                <span className="text-lg">⚡</span>
                Generate a Workout
              </button>

              {hasHistory && (
                <button
                  onClick={() => navigate('/history')}
                  className="mt-3 w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2.5 border bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200 active:scale-[0.98]"
                >
                  <span className="text-base">🗂️</span>
                  My Workouts ({state.history.length})
                </button>
              )}
            </div>
          </div>

          {/* ── Right column: stats + last session ──────────────────── */}
          <div className="flex flex-col gap-4">

            {/* Stats strip */}
            {hasHistory ? (
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: state.history.length, label: 'Sessions',   icon: '🏋️' },
                  { value: `${Math.round(totalMinutes / 60)}h`, label: 'Total time', icon: '⏱' },
                  { value: totalExercises, label: 'Exercises', icon: '💥' },
                ].map(({ value, label, icon }) => (
                  <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center">
                    <div className="text-xl mb-1">{icon}</div>
                    <div className="text-xl font-black text-orange-500">{value}</div>
                    <div className="text-[10px] text-zinc-600 uppercase tracking-wide mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">🏋️</div>
                <h3 className="text-base font-black text-zinc-200 mb-1">No sessions yet</h3>
                <p className="text-sm text-zinc-500">Complete your first workout and your stats will appear here.</p>
              </div>
            )}

            {/* Last workout recap */}
            {hasHistory && lastWorkout && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-zinc-500">Last session</span>
                  <button
                    onClick={() => navigate('/history')}
                    className="text-xs text-orange-400 font-semibold hover:text-orange-300"
                  >
                    View all →
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-2xl flex-shrink-0">
                    {GOAL_EMOJI[lastWorkout.config.goal] ?? '🏋️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-zinc-100 capitalize">
                      {lastWorkout.config.goal.replace(/-/g, ' ')} · {lastWorkout.config.fitnessLevel}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {lastWorkout.actualDuration ?? lastWorkout.estimatedDuration} min ·{' '}
                      {lastWorkout.warmup.length + lastWorkout.main.length + lastWorkout.cooldown.length} exercises ·{' '}
                      {new Date(lastWorkout.completedAt ?? lastWorkout.createdAt).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Mini goal strip */}
                <div className="mt-4 flex gap-1.5 flex-wrap">
                  {lastWorkout.config.bodyParts.slice(0, 4).map(bp => (
                    <span key={bp} className="text-[10px] font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-0.5 capitalize">
                      {bp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Feature highlights (shown when no history) */}
            {!hasHistory && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '🎯', title: 'Goal-based', desc: 'Muscle building, HIIT, endurance and more' },
                  { icon: '🤫', title: 'Silent mode', desc: 'No jumping — apartment friendly' },
                  { icon: '🏠', title: 'Home-ready', desc: 'Bodyweight, dumbbells, bands & chair' },
                  { icon: '📈', title: 'Track history', desc: 'See your progress over time' },
                ].map(({ icon, title, desc }) => (
                  <div key={title} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                    <div className="text-2xl mb-2">{icon}</div>
                    <p className="text-sm font-bold text-zinc-200 mb-0.5">{title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Mobile-only: CTAs below hero when no history */}
        {!hasHistory && (
          <div className="space-y-3 md:hidden">
            <button
              onClick={() => navigate('/config')}
              className="w-full py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2.5"
            >
              <span className="text-lg">⚡</span> Generate a Workout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
