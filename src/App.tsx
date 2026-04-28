import { Routes, Route, Navigate } from 'react-router-dom'
import { AppProvider } from './context/AppContext'
import AppNav from './components/BottomNav'
import Landing from './pages/Landing'
import Config from './pages/Config'
import WorkoutOverview from './pages/WorkoutOverview'
import ActiveWorkout from './pages/ActiveWorkout'
import WorkoutComplete from './pages/WorkoutComplete'
import History from './pages/History'
import WorkoutBuilder from './pages/WorkoutBuilder'

export default function App() {
  return (
    <AppProvider>
      {/*
        Mobile:  bottom nav → main needs pb-16
        Desktop: top nav (h-14) → main needs pt-14; no bottom padding
      */}
      <div className="flex flex-col h-full">
        <main className="flex-1 overflow-y-auto relative pb-16 md:pb-0 md:pt-14">
          <Routes>
            <Route path="/"                  element={<Landing />} />
            <Route path="/config"            element={<Config />} />
            <Route path="/workout/overview"  element={<WorkoutOverview />} />
            <Route path="/workout/builder"  element={<WorkoutBuilder />} />
            <Route path="/workout/active"    element={<ActiveWorkout />} />
            <Route path="/workout/complete"  element={<WorkoutComplete />} />
            <Route path="/history"           element={<History />} />
            <Route path="*"                  element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <AppNav />
      </div>
    </AppProvider>
  )
}
