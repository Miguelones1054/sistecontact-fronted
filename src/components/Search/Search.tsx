import { useRef, useState } from 'react'
import ZoneSelect from '../ZoneSelect/ZoneSelect'
import ZoneMap from '../ZoneMap/ZoneMap'
import BusinessList from '../BusinessList/BusinessList'
import { searchBusinesses } from '../../services/api'
import { APP_STRINGS } from '../../constants/strings'
import type { Business, Zone } from '../../types/api'
import './Search.css'

const DEFAULT_RADIUS_KM = 2
const MIN_RADIUS_KM = 0.5
const MAX_RADIUS_KM = 15
const RADIUS_STEP_KM = 0.5

function Search() {
  const [type, setType] = useState('')
  const [zone, setZone] = useState<Zone | null>(null)
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM)
  const [mapEnabled, setMapEnabled] = useState(false)
  const [results, setResults] = useState<Business[]>([])
  const [resultZone, setResultZone] = useState<Zone | null>(null)
  const [resultRadiusKm, setResultRadiusKm] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  function handleZoneChange(next: Zone | null) {
    setZone(next)
    setResults([])
    setResultZone(null)
    setResultRadiusKm(undefined)
    setHasSearched(false)
    setError('')
  }

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
    const radius = mapEnabled ? radiusKm : undefined
    searchBusinesses(type.trim(), zoneRef, ac.signal, radius)
      .then((resp) => {
        setResults(resp.businesses)
        setResultZone(resp.zone)
        setResultRadiusKm(mapEnabled ? resp.radius_km : undefined)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
  }

  return (
    <div className="search">
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
          <ZoneSelect value={zone} onChange={handleZoneChange} />
        </div>

        <div className="search__actions">
          <label className="search__map-toggle">
            <input
              type="checkbox"
              checked={mapEnabled}
              onChange={(e) => setMapEnabled(e.target.checked)}
            />
            <span>{APP_STRINGS.search.mapToggleLabel}</span>
          </label>
          <button className="search__submit" type="submit" disabled={loading}>
            {loading ? APP_STRINGS.search.loading : APP_STRINGS.search.submit}
          </button>
        </div>

        {mapEnabled && zone && (
          <div className="search__map-block">
            <div className="search__radius">
              <div className="search__radius-head">
                <label className="search__label" htmlFor="radius-input">
                  {APP_STRINGS.search.radiusLabel}
                </label>
                <span className="search__radius-value">
                  {APP_STRINGS.search.radiusValue(radiusKm)}
                </span>
              </div>
              <input
                id="radius-input"
                className="search__radius-slider"
                type="range"
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                step={RADIUS_STEP_KM}
                value={radiusKm}
                onChange={(e) => setRadiusKm(Number(e.target.value))}
              />
            </div>
            <ZoneMap
              key={zone.place_id ?? zone.formatted_address}
              center={zone.center}
              radiusKm={radiusKm}
              businesses={hasSearched && !loading ? results : []}
            />
          </div>
        )}

        {error && <p className="search__error">{error}</p>}
      </form>

      {hasSearched && !loading && resultZone && (
        <h2 className="search__results-title">
          {APP_STRINGS.search.resultsTitle(
            results.length,
            type.trim(),
            resultZone.name,
            resultRadiusKm,
          )}
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
