import { useState } from 'react'
import type { Exercise } from '../types'

interface Props {
  exercise: Exercise
  sets?: number
  reps?: number
  duration?: number
  onClick?: () => void
}

/** Pure display card — no context, no side effects. */
export default function ExerciseCard({ exercise, sets, reps, duration, onClick }: Props) {
  const [imgError, setImgError] = useState(false)

  const thumbUrl =
    exercise.youtubeId && !imgError
      ? `https://img.youtube.com/vi/${exercise.youtubeId}/mqdefault.jpg`
      : null

  const detail =
    exercise.format === 'time'
      ? `${sets ?? 1} × ${duration ?? 30}s`
      : `${sets ?? 1} × ${reps ?? '?'} reps`

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-left hover:border-zinc-700 transition-colors"
    >
      {thumbUrl ? (
        <img
          src={thumbUrl}
          alt={exercise.name}
          className="w-16 h-12 rounded-lg object-cover flex-shrink-0 opacity-80"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-16 h-12 rounded-lg bg-zinc-800 flex-shrink-0 flex items-center justify-center text-xl">
          💪
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100 truncate">{exercise.name}</p>
        <p className="text-xs text-zinc-500 truncate capitalize">
          {exercise.bodyParts.join(', ')}
        </p>
        <p className="text-xs text-orange-400 font-medium mt-0.5">{detail}</p>
      </div>
    </button>
  )
}
