import { useEffect, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import { fetchVisits } from '../../services/api'
import type { Visit } from '../../types/api'
import { exportVisitedXlsx } from '../../utils/exportXlsx'
import VisitPanel from '../VisitPanel/VisitPanel'
import './VisitedPage.css'

function VisitedPage() {
  const [items, setItems] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  function load() {
    setLoading(true)
    setError('')
    fetchVisits([])
      .then((visits) =>
        setItems(
          [...visits].sort(
            (a, b) =>
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
          ),
        ),
      )
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : APP_STRINGS.visited.error,
        )
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function handleVisitSaved(visit: Visit) {
    setItems((prev) => {
      const next = prev.filter((i) => i.place_id !== visit.place_id)
      return [visit, ...next]
    })
  }

  function handleVisitRemoved(placeId: string) {
    setItems((prev) => prev.filter((i) => i.place_id !== placeId))
  }

  return (
    <div className="visited-page">
      <div className="visited-page__header">
        <div>
          <h2 className="visited-page__title">{APP_STRINGS.visited.title}</h2>
          <p className="visited-page__subtitle">{APP_STRINGS.visited.subtitle}</p>
        </div>
        <button
          type="button"
          className="visited-page__export"
          onClick={() => exportVisitedXlsx(items)}
          disabled={loading || items.length === 0}
        >
          {APP_STRINGS.export.xlsx}
        </button>
      </div>

      {loading && (
        <p className="visited-page__hint">{APP_STRINGS.visited.loading}</p>
      )}
      {error && <p className="visited-page__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="visited-page__empty">{APP_STRINGS.visited.empty}</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="visited-page__list">
          {items.map((item) => (
            <li key={item.place_id} className="visited-page__card">
              <div className="visited-page__card-main">
                <div className="visited-page__name-row">
                  <h3 className="visited-page__name">{item.name}</h3>
                  <span className="visited-page__badge">
                    {APP_STRINGS.business.visitedBadge}
                  </span>
                </div>
                <p className="visited-page__address">{item.address}</p>
                {item.phone && (
                  <a className="visited-page__phone" href={`tel:${item.phone}`}>
                    {item.phone}
                  </a>
                )}
                {item.google_maps_uri && (
                  <a
                    className="visited-page__link"
                    href={item.google_maps_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {APP_STRINGS.business.viewOnMaps}
                  </a>
                )}
              </div>

              <VisitPanel
                target={{
                  place_id: item.place_id,
                  name: item.name,
                  address: item.address,
                  phone: item.phone,
                  rating: item.rating,
                  user_rating_count: item.user_rating_count,
                  google_maps_uri: item.google_maps_uri,
                  latitude: item.latitude,
                  longitude: item.longitude,
                  open_now: item.open_now,
                }}
                visit={item}
                onVisitSaved={handleVisitSaved}
                onVisitRemoved={handleVisitRemoved}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default VisitedPage
