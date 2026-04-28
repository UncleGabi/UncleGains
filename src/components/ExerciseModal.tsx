import { useState, useEffect } from 'react'
import type { Exercise } from '../types'

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  intermediate: 'text-yellow-400  bg-yellow-400/10  border-yellow-400/20',
  advanced:     'text-red-400     bg-red-400/10     border-red-400/20',
}

interface Props {
  exercise: Exercise
  onClose: () => void
}

/** Pure exercise detail modal — no context, no side effects. */
export default function ExerciseModal({ exercise, onClose }: Props) {
  const [showVideo, setShowVideo] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const thumbUrl = exercise.youtubeId
    ? `https://img.youtube.com/vi/${exercise.youtubeId}/maxresdefault.jpg`
    : null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-zinc-900 sm:rounded-2xl rounded-t-2xl border border-zinc-800 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Video / Thumbnail */}
        <div className="relative aspect-video bg-zinc-950 overflow-hidden">
          {showVideo && exercise.youtubeId ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${exercise.youtubeId}?autoplay=1&rel=0`}
              title={exercise.name}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : thumbUrl ? (
            <div
              className="relative w-full h-full cursor-pointer group"
              onClick={() => setShowVideo(true)}
            >
              <img src={thumbUrl} alt={exercise.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                <div className="w-14 h-14 rounded-full bg-orange-500 flex items-center justify-center shadow-lg">
                  <svg viewBox="0 0 24 24" fill="white" className="w-7 h-7 ml-1">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-zinc-600">
              <svg viewBox="0 0 24 24" fill="none" className="w-12 h-12">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" />
              </svg>
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title + badges */}
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLOR[exercise.difficulty]}`}>
                {exercise.difficulty}
              </span>
              {exercise.highImpact && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border text-red-400 bg-red-400/10 border-red-400/20">
                  High Impact
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-zinc-50">{exercise.name}</h2>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {exercise.bodyParts.map(bp => (
              <span key={bp} className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 capitalize">{bp}</span>
            ))}
            {exercise.equipment.map(eq => (
              <span key={eq} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300 capitalize">{eq}</span>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800 rounded-xl p-2.5 text-center">
              <div className="text-lg font-bold text-orange-500">{exercise.defaultSets}</div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Sets</div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-2.5 text-center">
              <div className="text-lg font-bold text-orange-500">
                {exercise.format === 'time' ? `${exercise.defaultDuration}s` : exercise.defaultReps}
              </div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide">
                {exercise.format === 'time' ? 'Duration' : 'Reps'}
              </div>
            </div>
            <div className="bg-zinc-800 rounded-xl p-2.5 text-center">
              <div className="text-lg font-bold text-orange-500 capitalize">{exercise.format}</div>
              <div className="text-[11px] text-zinc-500 uppercase tracking-wide">Format</div>
            </div>
          </div>

          {/* Description */}
          {exercise.description && (
            <div>
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">How to do it</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{exercise.description}</p>
            </div>
          )}

          {/* Tips */}
          {exercise.tips && (
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
              <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1.5">Pro Tips</h3>
              <p className="text-sm text-zinc-300 leading-relaxed">{exercise.tips}</p>
            </div>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-semibold text-sm bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
