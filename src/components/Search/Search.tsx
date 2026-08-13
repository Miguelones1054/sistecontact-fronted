import ZoneSelect from '../ZoneSelect/ZoneSelect'
import ZoneMap from '../ZoneMap/ZoneMap'
import BusinessList from '../BusinessList/BusinessList'
import { APP_STRINGS } from '../../constants/strings'
import { useSearch } from '../../context/SearchContext'
import { exportSearchXlsx } from '../../utils/exportXlsx'
import './Search.css'

const MIN_RADIUS_KM = 0.5
const MAX_RADIUS_KM = 15
const RADIUS_STEP_KM = 0.5

function Search() {
  const {
    type,
    setType,
    zone,
    radiusKm,
    setRadiusKm,
    mapEnabled,
    setMapEnabled,
    results,
    resultZone,
    resultRadiusKm,
    loading,
    error,
    hasSearched,
    handleZoneChange,
    runSearch,
  } = useSearch()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    runSearch()
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
        <div className="search__results-header">
          <h2 className="search__results-title">
            {APP_STRINGS.search.resultsTitle(
              results.length,
              type.trim(),
              resultZone.name,
              resultRadiusKm,
            )}
          </h2>
          <button
            type="button"
            className="search__export"
            onClick={() =>
              exportSearchXlsx(results, {
                type: type.trim(),
                zone: resultZone.name,
                radiusKm: resultRadiusKm,
              })
            }
            disabled={results.length === 0}
          >
            {APP_STRINGS.export.xlsx}
          </button>
        </div>
      )}

      {loading && <p className="search__loading">{APP_STRINGS.search.loading}</p>}

      {hasSearched && !loading && !error && (
        <BusinessList businesses={results} />
      )}
    </div>
  )
}

export default Search
