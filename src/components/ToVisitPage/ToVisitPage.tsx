import { useEffect, useMemo, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import {
  deleteToVisit,
  fetchToVisitList,
  upsertContactStatus,
} from '../../services/api'
import type { ToVisit, Visit } from '../../types/api'
import { exportToVisitXlsx } from '../../utils/exportXlsx'
import ContactStatusSelect, {
  CONTACT_STATUS_OPTIONS,
  CONTACT_STATUS_ORDER,
  type ContactStatus,
  normalizeContactStatus,
} from '../ContactStatusSelect/ContactStatusSelect'
import VisitPanel from '../VisitPanel/VisitPanel'
import './ToVisitPage.css'

function ToVisitPage() {
  const [items, setItems] = useState<ToVisit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<ContactStatus | 'all'>('all')

  function load() {
    setLoading(true)
    setError('')
    fetchToVisitList()
      .then(setItems)
      .catch((err) => {
        setError(err instanceof Error ? err.message : APP_STRINGS.toVisit.error)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const sortedItems = useMemo(() => {
    const filtered =
      filterStatus === 'all'
        ? items
        : items.filter(
            (i) => normalizeContactStatus(i.contact_status) === filterStatus,
          )
    return [...filtered].sort((a, b) => {
      const oa = CONTACT_STATUS_ORDER[normalizeContactStatus(a.contact_status)]
      const ob = CONTACT_STATUS_ORDER[normalizeContactStatus(b.contact_status)]
      if (oa !== ob) return oa - ob
      return a.name.localeCompare(b.name, 'es')
    })
  }, [items, filterStatus])

  async function handleRemove(placeId: string) {
    setRemovingId(placeId)
    try {
      await deleteToVisit(placeId)
      setItems((prev) => prev.filter((i) => i.place_id !== placeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : APP_STRINGS.toVisit.error)
    } finally {
      setRemovingId(null)
    }
  }

  function handleVisitSaved(visit: Visit) {
    setItems((prev) => prev.filter((i) => i.place_id !== visit.place_id))
  }

  async function handleContactStatus(item: ToVisit, status: ContactStatus) {
    setStatusBusyId(item.place_id)
    setError('')
    try {
      await upsertContactStatus(item.place_id, {
        name: item.name,
        address: item.address,
        contact_status: status,
      })
      setItems((prev) =>
        prev.map((i) =>
          i.place_id === item.place_id ? { ...i, contact_status: status } : i,
        ),
      )
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.statusError,
      )
    } finally {
      setStatusBusyId(null)
    }
  }

  return (
    <div className="to-visit">
      <div className="to-visit__header">
        <div>
          <h2 className="to-visit__title">{APP_STRINGS.toVisit.title}</h2>
          <p className="to-visit__subtitle">{APP_STRINGS.toVisit.subtitle}</p>
        </div>
        <button
          type="button"
          className="to-visit__export"
          onClick={() => exportToVisitXlsx(sortedItems)}
          disabled={loading || sortedItems.length === 0}
        >
          {APP_STRINGS.export.xlsx}
        </button>
      </div>

      <div className="to-visit__filters" role="group" aria-label="Filtrar por estado">
        <button
          type="button"
          className={`to-visit__filter${filterStatus === 'all' ? ' to-visit__filter--active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          {APP_STRINGS.toVisit.filterAll}
        </button>
        {CONTACT_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`to-visit__filter${filterStatus === opt.value ? ' to-visit__filter--active' : ''}`}
            onClick={() => setFilterStatus(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p className="to-visit__hint">{APP_STRINGS.toVisit.loading}</p>}
      {error && <p className="to-visit__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="to-visit__empty">{APP_STRINGS.toVisit.empty}</p>
      )}

      {!loading && items.length > 0 && sortedItems.length === 0 && (
        <p className="to-visit__empty">{APP_STRINGS.toVisit.filterEmpty}</p>
      )}

      {!loading && sortedItems.length > 0 && (
        <ul className="to-visit__list">
          {sortedItems.map((item) => (
            <li key={item.place_id} className="to-visit__card">
              <div className="to-visit__card-main">
                <div className="to-visit__card-top">
                  <h3 className="to-visit__name">{item.name}</h3>
                  <ContactStatusSelect
                    value={item.contact_status}
                    disabled={statusBusyId === item.place_id}
                    onChange={(status) => handleContactStatus(item, status)}
                  />
                </div>
                <p className="to-visit__address">{item.address}</p>
                {item.phone && (
                  <a className="to-visit__phone" href={`tel:${item.phone}`}>
                    {item.phone}
                  </a>
                )}
                {item.rating != null && item.rating > 0 && (
                  <span className="to-visit__rating">★ {item.rating.toFixed(1)}</span>
                )}
                {item.google_maps_uri && (
                  <a
                    className="to-visit__link"
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
                onVisitSaved={handleVisitSaved}
                extraActions={
                  <button
                    type="button"
                    className="visit-panel__btn visit-panel__btn--danger"
                    onClick={() => handleRemove(item.place_id)}
                    disabled={removingId === item.place_id}
                  >
                    {APP_STRINGS.toVisit.remove}
                  </button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ToVisitPage
