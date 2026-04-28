import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────

function HomeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function HistoryIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 1 0 .5-4" />
      <polyline points="3 3 3 7 7 7" />
    </svg>
  )
}

function ActiveIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Abandon-session confirmation modal
// ─────────────────────────────────────────────────────────────────────────────

function AbandonModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-6" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xs bg-zinc-900 border border-zinc-700 rounded-3xl p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/25 flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl">⚡</span>
        </div>
        <h3 className="text-lg font-black text-zinc-50 text-center mb-1">Workout in progress</h3>
        <p className="text-sm text-zinc-400 text-center mb-6">
          Leaving now will pause your session. Return any time via the Workout tab.
        </p>
        <div className="space-y-2.5">
          <button onClick={onConfirm} className="w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.98] text-zinc-300 font-bold rounded-2xl transition-all border border-zinc-700 text-sm">
            Leave anyway
          </button>
          <button onClick={onCancel} className="w-full py-3.5 bg-orange-500 hover:bg-orange-400 active:scale-[0.98] text-white font-black rounded-2xl transition-all shadow-lg shadow-orange-500/20 text-sm">
            Keep going 💪
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared nav item data
// ─────────────────────────────────────────────────────────────────────────────

export default function AppNav() {
  const { state } = useApp()
  const navigate   = useNavigate()
  const location   = useLocation()
  const hasSession    = state.session !== null
  const onActiveRoute = location.pathname === '/workout/active'

  const [pendingDest, setPendingDest] = useState<string | null>(null)

  function handleGuardedNav(dest: string) {
    if (hasSession && onActiveRoute) { setPendingDest(dest) }
    else { navigate(dest) }
  }

  const isHome    = location.pathname === '/'
  const isHistory = location.pathname === '/history'

  // ── Shared button factory ────────────────────────────────────────────────

  function NavBtn({
    active, onClick, icon, label, badge,
  }: {
    active: boolean
    onClick: () => void
    icon: React.ReactNode
    label: string
    badge?: React.ReactNode
  }) {
    return (
      <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-0.5 transition-colors
          md:flex-row md:gap-2 md:px-3.5 md:py-2 md:rounded-xl
          flex-1 md:flex-none
          ${active
            ? 'text-orange-500 md:bg-orange-500/10'
            : 'text-zinc-500 hover:text-zinc-300 md:hover:bg-zinc-800'
          }`}
      >
        <div className="relative">
          {icon}
          {badge}
        </div>
        <span className="text-[10px] font-medium tracking-wide uppercase md:text-xs md:normal-case md:tracking-normal md:font-semibold">{label}</span>
      </button>
    )
  }

  return (
    <>
      {pendingDest && (
        <AbandonModal
          onConfirm={() => { navigate(pendingDest!); setPendingDest(null) }}
          onCancel={() => setPendingDest(null)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════
          DESKTOP — fixed top bar
          ══════════════════════════════════════════════════════════════════ */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-40 h-14
        bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800 items-center">
        <div className="max-w-7xl mx-auto w-full px-6 flex items-center gap-2">

          {/* Brand */}
          <button
            onClick={() => handleGuardedNav('/')}
            className="mr-4 text-lg font-black text-zinc-50 hover:opacity-80 transition-opacity flex-shrink-0"
          >
            Uncle<span className="text-orange-500">Gains</span>
          </button>

          {/* Nav links */}
          <NavBtn
            active={isHome}
            onClick={() => handleGuardedNav('/')}
            icon={<HomeIcon />}
            label="Home"
          />

          {hasSession && (
            <NavBtn
              active={onActiveRoute}
              onClick={() => navigate('/workout/active')}
              icon={
                <div className="relative">
                  <ActiveIcon />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                </div>
              }
              label="Active Workout"
            />
          )}

          <NavBtn
            active={isHistory}
            onClick={() => handleGuardedNav('/history')}
            icon={<HistoryIcon />}
            label="History"
            badge={state.history.length > 0 ? (
              <span className="absolute -top-1.5 -right-1.5 bg-zinc-700 text-zinc-300
                text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {state.history.length > 9 ? '9+' : state.history.length}
              </span>
            ) : undefined}
          />

          {/* Active workout accent */}
          {hasSession && (
            <div className="ml-auto flex items-center gap-2 bg-orange-500/10 border border-orange-500/20
              rounded-xl px-3.5 py-1.5">
              <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              <span className="text-xs font-bold text-orange-400">Workout in progress</span>
              <button
                onClick={() => navigate('/workout/active')}
                className="text-xs font-black text-white bg-orange-500 hover:bg-orange-400
                  px-2.5 py-1 rounded-lg transition-colors"
              >
                Resume →
              </button>
            </div>
          )}
        </div>
      </header>

      {/* ══════════════════════════════════════════════════════════════════
          MOBILE — fixed bottom bar
          ══════════════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-40"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-16 max-w-md mx-auto">

          <button
            onClick={() => handleGuardedNav('/')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
              ${isHome ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <HomeIcon />
            <span className="text-[10px] font-medium tracking-wide uppercase">Home</span>
          </button>

          {hasSession && (
            <NavLink
              to="/workout/active"
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
                 ${isActive ? 'text-orange-500' : 'text-orange-400 hover:text-orange-300'}`
              }
            >
              <div className="relative">
                <ActiveIcon />
                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
              </div>
              <span className="text-[10px] font-medium tracking-wide uppercase">Workout</span>
            </NavLink>
          )}

          <button
            onClick={() => handleGuardedNav('/history')}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors
              ${isHistory ? 'text-orange-500' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <div className="relative">
              <HistoryIcon />
              {state.history.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-zinc-700 text-zinc-300
                  text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {state.history.length > 9 ? '9+' : state.history.length}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium tracking-wide uppercase">History</span>
          </button>
        </div>
      </nav>
    </>
  )
}
