import {
  createContext, useContext, useReducer, useEffect,
  type ReactNode, type Dispatch,
} from 'react'
import type {
  AppState, WorkoutConfig, GeneratedWorkout,
  WorkoutSession, SessionItem, Phase,
} from '../types'
import {
  loadConfig, saveConfig,
  loadHistory, saveToHistory, deleteFromHistory,
} from '../lib/storage'

// ─────────────────────────────────────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────────────────────────────────────

export type AppAction =
  | { type: 'SET_CONFIG';         config: WorkoutConfig }
  | { type: 'SET_WORKOUT';        workout: GeneratedWorkout }
  | { type: 'REPLACE_EXERCISE';   phase: Phase; index: number; item: GeneratedWorkout['warmup'][number] }
  | { type: 'REMOVE_EXERCISE';    phase: Phase; index: number }
  | { type: 'START_SESSION' }
  | { type: 'COMPLETE_SET' }
  | { type: 'REST_DONE' }
  | { type: 'END_SESSION' }
  | { type: 'SAVE_TO_HISTORY' }
  | { type: 'DELETE_HISTORY';     id: string }
  | { type: 'REORDER_MAIN';       fromIndex: number; toIndex: number }
  | { type: 'REDO_WORKOUT';       workout: GeneratedWorkout }

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildSessionItems(workout: GeneratedWorkout): SessionItem[] {
  return [
    ...workout.warmup.map(we   => ({ ...we, phase: 'warmup'   as Phase })),
    ...workout.main.map(we     => ({ ...we, phase: 'main'     as Phase })),
    ...workout.cooldown.map(we => ({ ...we, phase: 'cooldown' as Phase })),
  ]
}

// ─────────────────────────────────────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────────────────────────────────────

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {

    case 'SET_CONFIG':
      return { ...state, config: action.config }

    case 'SET_WORKOUT':
      return { ...state, generatedWorkout: action.workout, session: null }

    case 'REPLACE_EXERCISE': {
      if (!state.generatedWorkout) return state
      const w = state.generatedWorkout
      const updated = { ...w }
      updated[action.phase] = updated[action.phase].map((item, i) =>
        i === action.index ? action.item : item,
      )
      return { ...state, generatedWorkout: updated }
    }

    case 'REMOVE_EXERCISE': {
      if (!state.generatedWorkout) return state
      const w = state.generatedWorkout
      const updated = { ...w }
      updated[action.phase] = updated[action.phase].filter((_, i) => i !== action.index)
      return { ...state, generatedWorkout: updated }
    }

    case 'START_SESSION': {
      if (!state.generatedWorkout) return state
      const items = buildSessionItems(state.generatedWorkout)
      if (items.length === 0) return state
      const session: WorkoutSession = {
        items,
        currentIdx: 0,
        currentSet: 1,
        phase: 'exercise',
        startedAt: Date.now(),
      }
      return { ...state, session }
    }

    case 'COMPLETE_SET': {
      const s = state.session
      if (!s) return state
      const item = s.items[s.currentIdx]
      const isLastSet      = s.currentSet >= item.sets
      const isLastExercise = s.currentIdx >= s.items.length - 1

      if (isLastSet && isLastExercise) {
        return { ...state, session: { ...s, phase: 'done' } }
      }

      const nextIdx = isLastSet ? s.currentIdx + 1 : s.currentIdx
      const nextSet = isLastSet ? 1 : s.currentSet + 1
      return {
        ...state,
        session: { ...s, phase: 'rest', nextIdx, nextSet },
      }
    }

    case 'REST_DONE': {
      const s = state.session
      if (!s || s.nextIdx === undefined || s.nextSet === undefined) return state
      return {
        ...state,
        session: {
          ...s,
          phase: 'exercise',
          currentIdx: s.nextIdx,
          currentSet: s.nextSet,
          nextIdx: undefined,
          nextSet: undefined,
        },
      }
    }

    case 'END_SESSION':
      return { ...state, session: null }

    case 'SAVE_TO_HISTORY': {
      if (!state.generatedWorkout) return state
      // Idempotency: if already saved (e.g. StrictMode double-invoke), ignore
      if (state.generatedWorkout.completedAt) return state
      const completed: GeneratedWorkout = {
        ...state.generatedWorkout,
        completedAt: new Date().toISOString(),
        actualDuration: state.session
          ? Math.round((Date.now() - state.session.startedAt) / 60000)
          : null,
      }
      const history = saveToHistory(completed)
      return { ...state, history, session: null, generatedWorkout: completed }
    }

    case 'DELETE_HISTORY': {
      const history = deleteFromHistory(action.id)
      return { ...state, history }
    }

    case 'REORDER_MAIN': {
      if (!state.generatedWorkout) return state
      const main = [...state.generatedWorkout.main]
      const [removed] = main.splice(action.fromIndex, 1)
      main.splice(action.toIndex, 0, removed)
      return { ...state, generatedWorkout: { ...state.generatedWorkout, main } }
    }

    case 'REDO_WORKOUT': {
      const redone: GeneratedWorkout = {
        ...action.workout,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        completedAt: null,
        actualDuration: null,
      }
      return { ...state, generatedWorkout: redone, session: null }
    }

    default:
      return state
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState
  dispatch: Dispatch<AppAction>
}

const AppContext = createContext<AppContextValue | null>(null)

function initialState(): AppState {
  return {
    config:            loadConfig(),
    generatedWorkout:  null,
    session:           null,
    history:           loadHistory(),
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  // Persist config whenever it changes
  useEffect(() => { saveConfig(state.config) }, [state.config])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
