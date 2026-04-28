import type { WorkoutConfig, GeneratedWorkout } from '../types'
import { DEFAULT_CONFIG } from '../types'

const KEYS = {
  history:       'hwapp_history',
  lastConfig:    'hwapp_last_config',
  activeWorkout: 'hwapp_active_workout',
} as const

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ }
}

// ── Config ────────────────────────────────────────────────────────────────────

export function loadConfig(): WorkoutConfig {
  return safeGet<WorkoutConfig>(KEYS.lastConfig, DEFAULT_CONFIG)
}

export function saveConfig(config: WorkoutConfig): void {
  safeSet(KEYS.lastConfig, config)
}

// ── History ───────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50

export function loadHistory(): GeneratedWorkout[] {
  return safeGet<GeneratedWorkout[]>(KEYS.history, [])
}

export function saveToHistory(workout: GeneratedWorkout): GeneratedWorkout[] {
  // Deduplicate by ID so repeated dispatches never create duplicate entries
  const existing = loadHistory().filter(w => w.id !== workout.id)
  const updated = [workout, ...existing].slice(0, MAX_HISTORY)
  safeSet(KEYS.history, updated)
  return updated
}

export function deleteFromHistory(id: string): GeneratedWorkout[] {
  const updated = loadHistory().filter(w => w.id !== id)
  safeSet(KEYS.history, updated)
  return updated
}

// ── Active workout (persist mid-session across page refreshes) ────────────────

export function saveActiveWorkout(workout: GeneratedWorkout): void {
  safeSet(KEYS.activeWorkout, workout)
}

export function loadActiveWorkout(): GeneratedWorkout | null {
  return safeGet<GeneratedWorkout | null>(KEYS.activeWorkout, null)
}

export function clearActiveWorkout(): void {
  try { localStorage.removeItem(KEYS.activeWorkout) } catch { /* ignore */ }
}
