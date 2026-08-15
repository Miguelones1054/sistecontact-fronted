import { useCallback, useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import { SchedulingSettingsProvider } from '../../context/SchedulingSettingsContext'
import { SearchProvider } from '../../context/SearchContext'
import ProfilePanel from '../ProfilePanel/ProfilePanel'
import ScheduleIntervalBar from '../ScheduleIntervalBar/ScheduleIntervalBar'
import './AppShell.css'

function AppShell() {
  const { user, logout, membershipEnabled, refreshMembership } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)
  const [checkingMembership, setCheckingMembership] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [calendarFlash, setCalendarFlash] = useState<'connected' | 'error' | null>(
    null,
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gcal = params.get('google_calendar')
    if (gcal !== 'connected' && gcal !== 'error') return

    setCalendarFlash(gcal)
    setProfileOpen(true)
    params.delete('google_calendar')
    const next = params.toString()
    const path = `${window.location.pathname}${next ? `?${next}` : ''}${window.location.hash}`
    window.history.replaceState({}, '', path)
  }, [])

  const clearCalendarFlash = useCallback(() => {
    setCalendarFlash(null)
  }, [])

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  async function handleRefreshMembership() {
    setCheckingMembership(true)
    try {
      await refreshMembership()
    } finally {
      setCheckingMembership(false)
    }
  }

  return (
    <SchedulingSettingsProvider>
      <SearchProvider>
      <div className="app-shell">
        <header className="app-shell__header">
          <div className="app-shell__header-row">
            <div className="app-shell__brand">
              <h1 className="app-shell__title">{APP_STRINGS.app.name}</h1>
              <p className="app-shell__subtitle">{APP_STRINGS.app.subtitle}</p>
            </div>
            <div className="app-shell__actions">
              <button
                type="button"
                className="app-shell__logout"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {APP_STRINGS.login.logout}
              </button>
              <button
                type="button"
                className="app-shell__profile"
                onClick={() => setProfileOpen(true)}
              >
                {APP_STRINGS.profile.button}
              </button>
            </div>
          </div>
          <div className="app-shell__header-meta">
            <p className="app-shell__tagline">{APP_STRINGS.app.tagline}</p>
            {user?.email && (
              <span className="app-shell__user" title={user.email}>
                {user.email}
              </span>
            )}
          </div>
        </header>

        <nav className="app-shell__tabs" aria-label="Secciones">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `app-shell__tab${isActive ? ' app-shell__tab--active' : ''}`
            }
          >
            {APP_STRINGS.tabs.search}
          </NavLink>
          <NavLink
            to="/prospectos"
            className={({ isActive }) =>
              `app-shell__tab${isActive ? ' app-shell__tab--active' : ''}`
            }
          >
            {APP_STRINGS.tabs.prospects}
          </NavLink>
          <NavLink
            to="/visitas"
            className={({ isActive }) =>
              `app-shell__tab${isActive ? ' app-shell__tab--active' : ''}`
            }
          >
            {APP_STRINGS.tabs.visits}
          </NavLink>
          <NavLink
            to="/contactados"
            className={({ isActive }) =>
              `app-shell__tab${isActive ? ' app-shell__tab--active' : ''}`
            }
          >
            {APP_STRINGS.tabs.contacted}
          </NavLink>
        </nav>

        {!membershipEnabled && (
          <div className="app-shell__membership" role="status">
            <p className="app-shell__membership-text">
              {APP_STRINGS.login.membershipBanner}{' '}
              <a
                className="app-shell__membership-link"
                href={APP_STRINGS.login.membershipUrl}
                target="_blank"
                rel="noreferrer"
              >
                {APP_STRINGS.login.membershipAction}
              </a>
            </p>
            <button
              type="button"
              className="app-shell__membership-refresh"
              onClick={() => void handleRefreshMembership()}
              disabled={checkingMembership}
            >
              {checkingMembership
                ? APP_STRINGS.login.checkingSession
                : APP_STRINGS.login.membershipRefresh}
            </button>
          </div>
        )}

        {membershipEnabled && <ScheduleIntervalBar />}

        <div className="app-shell__content">
          {membershipEnabled ? (
            <Outlet />
          ) : (
            <div className="app-shell__membership-panel">
              <p>{APP_STRINGS.login.errors.noAccess}</p>
              <a
                className="app-shell__membership-cta"
                href={APP_STRINGS.login.membershipUrl}
                target="_blank"
                rel="noreferrer"
              >
                {APP_STRINGS.login.membershipAction}
              </a>
            </div>
          )}
        </div>

        <ProfilePanel
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          calendarFlash={calendarFlash}
          onCalendarFlashConsumed={clearCalendarFlash}
        />
      </div>
      </SearchProvider>
    </SchedulingSettingsProvider>
  )
}

export default AppShell
