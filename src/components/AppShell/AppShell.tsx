import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import './AppShell.css'

function AppShell() {
  const { user, logout } = useAuth()
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="app-shell">
      <div className="app-shell__topbar">
        <span className="app-shell__user">{user?.email}</span>
        <button
          type="button"
          className="app-shell__logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {APP_STRINGS.login.logout}
        </button>
      </div>

      <header className="app-shell__header">
        <h1 className="app-shell__title">{APP_STRINGS.app.name}</h1>
        <p className="app-shell__subtitle">{APP_STRINGS.app.subtitle}</p>
        <p className="app-shell__tagline">{APP_STRINGS.app.tagline}</p>
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
          to="/visitados"
          className={({ isActive }) =>
            `app-shell__tab${isActive ? ' app-shell__tab--active' : ''}`
          }
        >
          {APP_STRINGS.tabs.visited}
        </NavLink>
      </nav>

      <div className="app-shell__content">
        <Outlet />
      </div>
    </div>
  )
}

export default AppShell
