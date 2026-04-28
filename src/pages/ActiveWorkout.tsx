import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { SessionItem } from '../types'

// ─────────────────────────────────────────────────────────────────────────────
// SVG progress ring
// ─────────────────────────────────────────────────────────────────────────────

const R    = 54
const CIRC = 2 * Math.PI * R

function ProgressRing({ progress, color = '#f97316', animate = true }: {
  progress: number; color?: string; animate?: boolean
}) {
  const dash = CIRC * Math.max(0, Math.min(1, progress))
  return (
    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
      <circle cx="60" cy="60" r={R} fill="none" stroke="#27272a" strokeWidth="10" />
      <circle
        cx="60" cy="60" r={R} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${CIRC}`} strokeLinecap="round"
        style={{ transition: animate ? 'stroke-dasharray 1s linear' : 'none' }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Prominent workout clock — elapsed vs planned
// ─────────────────────────────────────────────────────────────────────────────

function LiveClock({ elapsed, estimatedMin }: { elapsed: number; estimatedMin: number }) {
  const totalEstSec = estimatedMin * 60
  const pct = Math.min(1, elapsed / totalEstSec)

  return (
    <div className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 overflow-hidden">
      {/* Time values row */}
      <div className="flex items-stretch divide-x divide-zinc-700/60">
        {/* Elapsed */}
        <div className="flex-1 flex flex-col items-center justify-center py-3.5 px-4 gap-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">
            ⏱ Elapsed
          </div>
          <div className="text-2xl md:text-3xl font-black tabular-nums text-orange-400 leading-none">
            {formatElapsed(elapsed)}
          </div>
        </div>

        {/* Divider with pulsing dot */}
        <div className="flex flex-col items-center justify-center px-3">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        </div>

        {/* Planned */}
        <div className="flex-1 flex flex-col items-center justify-center py-3.5 px-4 gap-0.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 mb-1">
            ⏰ Planned
          </div>
          <div className="text-2xl md:text-3xl font-black tabular-nums text-zinc-300 leading-none">
            {estimatedMin}<span className="text-base text-zinc-500 ml-0.5">min</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-zinc-800">
        <div
          className="h-full bg-gradient-to-r from-orange-600 to-orange-400 transition-all duration-1000 ease-linear"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Rest timer
// ─────────────────────────────────────────────────────────────────────────────

function RestTimer({ total, onDone, onSkip }: {
  total: number; onDone: () => void; onSkip: () => void
}) {
  const [rem, setRem] = useState(total)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // Reset counter when a new rest period starts
  useEffect(() => { setRem(total) }, [total])

  // Single stable interval — never restarts mid-countdown
  useEffect(() => {
    const id = setInterval(() => {
      setRem(r => {
        if (r <= 1) {
          clearInterval(id)
          // Call onDone after state settles
          setTimeout(() => onDoneRef.current(), 0)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [total]) // only re-run when a new rest period begins

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-44 h-44 md:w-52 md:h-52">
        <ProgressRing progress={rem / total} color="#94a3b8" />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl md:text-5xl font-black tabular-nums text-zinc-50">{rem}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] mt-1">rest</span>
        </div>
      </div>
      <button
        onClick={onSkip}
        className="px-7 py-2.5 bg-zinc-800 hover:bg-zinc-700 active:scale-95
          text-zinc-300 font-semibold rounded-xl text-sm transition-all border border-zinc-700"
      >
        Skip rest →
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise countdown timer
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseTimer({ duration, onDone, onSkip }: {
  duration: number; onDone: () => void; onSkip: () => void
}) {
  const [rem, setRem] = useState(duration)
  const [running, setRunning] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone

  // Reset when exercise changes
  useEffect(() => { setRem(duration); setRunning(false) }, [duration])

  // Single stable interval — only (re)starts when running flips on or exercise changes
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      setRem(r => {
        if (r <= 1) {
          clearInterval(id)
          setTimeout(() => onDoneRef.current(), 0)
          return 0
        }
        return r - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [running, duration]) // re-run only when play/pause or new exercise

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative w-48 h-48 md:w-60 md:h-60">
        <ProgressRing progress={rem / duration} animate={running} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl md:text-6xl font-black tabular-nums text-zinc-50">{rem}</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-[0.15em] mt-1">seconds</span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setRunning(r => !r)}
          className={`px-8 py-3.5 rounded-2xl font-black text-sm transition-all active:scale-95 ${
            running
              ? 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200 border border-zinc-600'
              : 'bg-orange-500 hover:bg-orange-400 text-white shadow-xl shadow-orange-500/25'
          }`}
        >
          {running ? '⏸ Pause' : '▶ Start Timer'}
        </button>
        <button
          onClick={onSkip}
          className="px-5 py-3.5 rounded-2xl font-black text-sm bg-zinc-800 hover:bg-zinc-700
            active:scale-95 text-zinc-400 hover:text-zinc-200 transition-all border border-zinc-700"
          title="Skip this set"
        >
          Skip ⏭
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// "Up next" mini card
// ─────────────────────────────────────────────────────────────────────────────

function NextUpCard({ item }: { item: SessionItem }) {
  return (
    <div className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl p-3.5 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-zinc-700 overflow-hidden flex-shrink-0">
        {item.exercise.youtubeId ? (
          <img
            src={`https://img.youtube.com/vi/${item.exercise.youtubeId}/mqdefault.jpg`}
            alt="" className="w-full h-full object-cover opacity-70"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg">💪</div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-0.5">Up next</p>
        <p className="text-sm font-bold text-zinc-200 truncate">{item.exercise.name}</p>
        <p className="text-xs text-zinc-500">
          {item.exercise.format === 'time'
            ? `${item.duration}s`
            : isUnilateral(item.exercise.name)
              ? `${item.reps} reps / side`
              : `${item.reps} reps`
          } · Set 1 of {item.sets}
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Unilateral helper
// ─────────────────────────────────────────────────────────────────────────────

function isUnilateral(name: string): boolean {
  const n = name.toLowerCase()
  return (
    n.includes('lunge') || n.includes('single-leg') || n.includes('single leg') ||
    n.includes('single-arm') || n.includes('single arm') || n.includes('one-arm') ||
    n.includes('one arm') || n.includes('one-leg') || n.includes('one leg') ||
    n.includes('bulgarian') || n.includes('split squat') || n.includes('step-up') ||
    n.includes('step up') || n.includes('cossack') || n.includes('kickback') ||
    n.includes('side bend') || n.includes('pistol') || n.includes('copenhagen') ||
    n.includes('single leg') || n.includes('single arm')
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Phase label map
// ─────────────────────────────────────────────────────────────────────────────

const PHASE_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  warmup:   { text: '🔥 Warm-Up',    color: 'text-amber-400',   bg: 'bg-amber-500/10 border-amber-500/25' },
  main:     { text: '⚡ Main Block', color: 'text-violet-400',  bg: 'bg-violet-500/10 border-violet-500/25' },
  cooldown: { text: '🧊 Cool-Down',  color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/25' },
}

function formatElapsed(totalSecs: number): string {
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function ActiveWorkout() {
  const { state, dispatch } = useApp()
  const navigate = useNavigate()
  const [showVideo, setShowVideo] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const session = state.session

  useEffect(() => {
    if (!session || session.phase === 'done') return
    const start = session.startedAt
    const tick  = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session?.startedAt, session?.phase])

  if (!session) {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 text-center pb-20 gap-4">
        <div className="text-6xl">⚡</div>
        <h2 className="text-xl font-black text-zinc-200 mb-1">No active workout</h2>
        <p className="text-zinc-500 text-sm">Generate a workout and hit Start to begin.</p>
        <button
          onClick={() => navigate('/config')}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-2xl font-bold text-sm shadow-lg shadow-orange-500/20 transition-colors"
        >
          Configure Workout
        </button>
      </div>
    )
  }

  const { items, currentIdx, currentSet, phase } = session
  const currentItem  = items[currentIdx]
  const totalSets    = items.reduce((a, i) => a + i.sets, 0)
  const doneSets     = items.slice(0, currentIdx).reduce((a, i) => a + i.sets, 0) + (currentSet - 1)
  const progress     = doneSets / totalSets
  const estimatedMin = state.generatedWorkout?.estimatedDuration ?? 0

  const nextItemInSession = session.nextIdx !== undefined ? items[session.nextIdx] : items[currentIdx + 1]
  const phaseChange  = nextItemInSession && nextItemInSession.phase !== currentItem.phase
  const phaseLabel   = PHASE_LABEL[currentItem?.phase ?? 'main']

  function handleEnd() {
    if (window.confirm('End this workout?')) {
      dispatch({ type: 'END_SESSION' })
      navigate('/workout/overview')
    }
  }

  // ── Done ──────────────────────────────────────────────────────────────────
  if (phase === 'done') {
    return (
      <div className="flex flex-col h-full items-center justify-center px-8 pb-20 text-center gap-6">
        <div className="text-7xl animate-bounce">🎉</div>
        <div>
          <h2 className="text-3xl font-black text-zinc-50 mb-1">All done!</h2>
          <p className="text-zinc-400 text-sm">Excellent work — let's save it.</p>
        </div>
        <button
          onClick={() => { dispatch({ type: 'SAVE_TO_HISTORY' }); navigate('/workout/complete') }}
          className="w-full max-w-xs py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-black rounded-2xl shadow-xl shadow-orange-500/25 transition-all"
        >
          See summary →
        </button>
      </div>
    )
  }

  // ── Rest ──────────────────────────────────────────────────────────────────
  if (phase === 'rest') {
    const nextItem = session.nextIdx !== undefined ? items[session.nextIdx] : null
    return (
      <div className="min-h-full px-5 pt-6 pb-8 md:pt-8 max-w-2xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-0.5">Rest period</p>
            <h2 className="text-xl font-black text-zinc-100">Catch your breath</h2>
          </div>
          <button onClick={handleEnd}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
            End
          </button>
        </div>

        {/* Clock */}
        <div className="mb-5">
          <LiveClock elapsed={elapsed} estimatedMin={estimatedMin} />
        </div>

        {/* Overall progress */}
        <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-8">
          <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
        </div>

        <div className="flex flex-col items-center gap-6">
          <RestTimer
            total={currentItem.restAfter || 60}
            onDone={() => dispatch({ type: 'REST_DONE' })}
            onSkip={() => dispatch({ type: 'REST_DONE' })}
          />
          {phaseChange && nextItem && (
            <div className={`w-full border rounded-2xl p-3.5 text-center ${nextItem.phase === 'cooldown' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-violet-500/10 border-violet-500/20'}`}>
              <p className="text-sm font-bold text-zinc-200">
                {PHASE_LABEL[nextItem.phase]?.text ?? 'Next phase'} starting next
              </p>
            </div>
          )}
          {nextItem && !phaseChange && <NextUpCard item={nextItem} />}
        </div>
      </div>
    )
  }

  // ── Exercise ──────────────────────────────────────────────────────────────
  const { exercise, sets, reps, duration } = currentItem
  const isTime   = exercise.format === 'time'
  const thumbUrl = exercise.youtubeId
    ? `https://img.youtube.com/vi/${exercise.youtubeId}/mqdefault.jpg`
    : null
  const [thumbLoaded, setThumbLoaded] = useState(false)
  useEffect(() => { setThumbLoaded(false) }, [thumbUrl])

  return (
    <div className="min-h-full flex flex-col">
      {/* ── Desktop two-panel wrapper ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col md:flex-row md:min-h-full">

        {/* ── LEFT PANEL — info, clock, progress ──────────────────────── */}
        <aside className="
          flex flex-col px-5 pt-6 pb-4
          md:w-80 md:flex-shrink-0 md:sticky md:top-0 md:h-screen
          md:pt-8 md:pb-8 md:px-8 md:border-r md:border-zinc-800
          md:overflow-y-auto
        ">
          {/* Phase badge */}
          <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 border text-xs font-bold mb-3 self-start ${phaseLabel.bg} ${phaseLabel.color}`}>
            {phaseLabel.text}
          </div>

          {/* Exercise name + position */}
          <h2 className="text-2xl md:text-3xl font-black text-zinc-50 leading-tight mb-1">
            {exercise.name}
          </h2>
          <p className="text-sm text-zinc-500 mb-5">
            Exercise {currentIdx + 1} of {items.length}
          </p>

          {/* Prominent clock */}
          <LiveClock elapsed={elapsed} estimatedMin={estimatedMin} />

          {/* Overall progress bar */}
          <div className="mt-5 mb-2">
            <div className="flex items-center justify-between text-[10px] text-zinc-600 uppercase tracking-widest mb-1.5">
              <span>Progress</span>
              <span>{Math.round(progress * 100)}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full transition-all duration-500" style={{ width: `${progress * 100}%` }} />
            </div>
          </div>

          {/* Set pips */}
          <div className="flex gap-1.5 mt-4 mb-5">
            {Array.from({ length: sets }).map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
                i < currentSet - 1   ? 'bg-orange-500 flex-1' :
                i === currentSet - 1 ? 'bg-orange-500 flex-[1.5]' : 'bg-zinc-800 flex-1'
              }`} />
            ))}
          </div>

          <p className="text-sm text-zinc-400 mb-6">
            Set <span className="text-orange-400 font-black text-base">{currentSet}</span> of {sets}
          </p>

          {/* End button – desktop */}
          <div className="mt-auto hidden md:block">
            <button onClick={handleEnd}
              className="w-full flex items-center justify-center gap-2 text-sm text-zinc-500 hover:text-red-400
                bg-zinc-800/60 border border-zinc-700 hover:border-red-500/30 px-4 py-3 rounded-xl transition-all"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              End workout
            </button>
          </div>
        </aside>

        {/* ── RIGHT PANEL — timer / reps / video ──────────────────────── */}
        <main className="flex-1 flex flex-col items-center justify-center px-5 py-6 md:py-12 gap-6 md:gap-8">

          {/* Mobile: end button above the action area */}
          <div className="w-full flex justify-end md:hidden">
            <button onClick={handleEnd}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 bg-zinc-800 border border-zinc-700 px-3 py-1.5 rounded-xl transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                <rect x="3" y="3" width="18" height="18" rx="2"/>
              </svg>
              End
            </button>
          </div>

          {/* Mobile-only: clock strip (desktop sees it in sidebar) */}
          <div className="w-full md:hidden">
            <LiveClock elapsed={elapsed} estimatedMin={estimatedMin} />
          </div>

          {/* Mobile-only: set pips */}
          <div className="flex gap-1.5 w-full justify-center md:hidden">
            {Array.from({ length: sets }).map((_, i) => (
              <div key={i} className={`h-2 rounded-full transition-all duration-300 ${
                i < currentSet - 1   ? 'bg-orange-500 w-7'  :
                i === currentSet - 1 ? 'bg-orange-500 w-10' : 'bg-zinc-800 w-7'
              }`} />
            ))}
          </div>

          {/* Timer or reps */}
          {isTime ? (
            <ExerciseTimer
              duration={duration ?? 30}
              onDone={() => dispatch({ type: 'COMPLETE_SET' })}
              onSkip={() => dispatch({ type: 'COMPLETE_SET' })}
            />
          ) : (
            <div className="text-center">
              <div className="text-[8rem] md:text-[11rem] font-black text-zinc-50 leading-none tabular-nums">
                {reps}
              </div>
              <div className="text-zinc-600 text-sm uppercase tracking-[0.2em] mt-2">
                {isUnilateral(exercise.name) ? 'reps / side' : 'reps'}
              </div>
            </div>
          )}

          {/* Mobile: set label */}
          <p className="text-zinc-400 text-sm md:hidden">
            Set <span className="text-orange-400 font-black text-base">{currentSet}</span> of {sets}
          </p>

          {/* Video thumbnail */}
          {thumbUrl && (
            <button
              onClick={() => setShowVideo(true)}
              className="w-full max-w-sm aspect-video rounded-2xl overflow-hidden relative group border border-zinc-800 bg-zinc-900"
            >
              {/* Loading spinner — shown until image loads */}
              {!thumbLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-zinc-700 border-t-orange-500 rounded-full animate-spin" />
                </div>
              )}
              <img
                src={thumbUrl}
                alt={exercise.name}
                onLoad={() => setThumbLoaded(true)}
                className={`w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity duration-300 ${thumbLoaded ? 'opacity-50' : 'opacity-0'}`}
              />
              {thumbLoaded && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-orange-500/90 flex items-center justify-center shadow-xl">
                    <svg viewBox="0 0 24 24" fill="white" className="w-5 h-5 ml-0.5">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  </div>
                  <span className="text-xs text-zinc-300 font-semibold">Watch tutorial</span>
                </div>
              )}
            </button>
          )}

          {/* Done button (reps) */}
          {!isTime && (
            <button
              onClick={() => dispatch({ type: 'COMPLETE_SET' })}
              className="w-full max-w-sm py-4 bg-orange-500 hover:bg-orange-400 active:scale-[0.98]
                text-white font-black text-base rounded-2xl transition-all shadow-xl shadow-orange-500/25
                flex items-center justify-center gap-2.5"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Done — Set {currentSet} of {sets}
            </button>
          )}
        </main>
      </div>

      {/* Tutorial video overlay */}
      {showVideo && exercise.youtubeId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setShowVideo(false)}
        >
          <div className="w-full max-w-2xl px-5" onClick={e => e.stopPropagation()}>
            <div className="aspect-video rounded-2xl overflow-hidden shadow-2xl">
              <iframe
                className="w-full h-full"
                src={`https://www.youtube.com/embed/${exercise.youtubeId}?autoplay=1&rel=0`}
                title={exercise.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <button
              onClick={() => setShowVideo(false)}
              className="mt-3 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold rounded-xl text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
