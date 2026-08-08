import { useRef, useState } from 'react'
import ZoneSelect from '../ZoneSelect/ZoneSelect'
import BusinessList from '../BusinessList/BusinessList'
import { searchBusinesses } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import type { Business, Zone } from '../../types/api'
import './Search.css'

function Search() {
  const { user, logout } = useAuth()
  const [type, setType] = useState('')
  const [zone, setZone] = useState<Zone | null>(null)
  const [results, setResults] = useState<Business[]>([])
  const [resultZone, setResultZone] = useState<Zone | null>(null)
  const [loading, setLoading] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type.trim()) {
      setError(APP_STRINGS.search.typeRequired)
      return
    }
    if (!zone) {
      setError(APP_STRINGS.search.zoneRequired)
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setError('')
    setHasSearched(true)

    const zoneRef = zone.place_id ?? zone.formatted_address
    searchBusinesses(type.trim(), zoneRef, ac.signal)
      .then((resp) => {
        setResults(resp.businesses)
        setResultZone(resp.zone)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="search">
      <div className="search__topbar">
        <span className="search__user">{user?.email}</span>
        <button
          type="button"
          className="search__logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {APP_STRINGS.login.logout}
        </button>
      </div>

      <header className="search__header">
        <h1 className="search__title">{APP_STRINGS.app.name}</h1>
        <p className="search__tagline">{APP_STRINGS.app.tagline}</p>
      </header>

      <form className="search__form" onSubmit={handleSubmit}>
        <div className="search__field">
          <label className="search__label" htmlFor="type-input">
            {APP_STRINGS.search.typeLabel}
          </label>
          <input
            id="type-input"
            className="search__input"
            type="text"
            value={type}
            placeholder={APP_STRINGS.search.typePlaceholder}
            onChange={(e) => setType(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className="search__field">
          <ZoneSelect value={zone} onChange={setZone} />
        </div>

        <button className="search__submit" type="submit" disabled={loading}>
          {loading ? APP_STRINGS.search.loading : APP_STRINGS.search.submit}
        </button>

        {error && <p className="search__error">{error}</p>}
      </form>

      {hasSearched && !loading && resultZone && (
        <h2 className="search__results-title">
          {APP_STRINGS.search.resultsTitle(results.length, type.trim(), resultZone.name)}
        </h2>
      )}

      {loading && <p className="search__loading">{APP_STRINGS.search.loading}</p>}

      {hasSearched && !loading && !error && (
        <BusinessList businesses={results} />
      )}
    </div>
  )
}

export default Search
