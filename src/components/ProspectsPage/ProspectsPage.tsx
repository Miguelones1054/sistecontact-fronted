import { useEffect, useMemo, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import {
  deleteProspect,
  fetchProspectsList,
  upsertContactStatus,
} from '../../services/api'
import type { Prospect } from '../../types/api'
import { exportProspectsXlsx } from '../../utils/exportXlsx'
import ContactStatusSelect, {
  CONTACT_STATUS_OPTIONS,
  CONTACT_STATUS_ORDER,
  type ContactStatus,
  normalizeContactStatus,
} from '../ContactStatusSelect/ContactStatusSelect'
import './ProspectsPage.css'

function sortProspects(a: Prospect, b: Prospect): number {
  const oa = CONTACT_STATUS_ORDER[normalizeContactStatus(a.contact_status)]
  const ob = CONTACT_STATUS_ORDER[normalizeContactStatus(b.contact_status)]
  if (oa !== ob) return oa - ob
  return a.name.localeCompare(b.name, 'es')
}

function ProspectsPage() {
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<ContactStatus | 'all'>('all')

  function load() {
    setLoading(true)
    setError('')
    fetchProspectsList()
      .then(setItems)
      .catch((err) => {
        setError(err instanceof Error ? err.message : APP_STRINGS.prospects.error)
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
    return [...filtered].sort(sortProspects)
  }, [items, filterStatus])

  async function handleRemove(placeId: string) {
    setRemovingId(placeId)
    try {
      await deleteProspect(placeId)
      setItems((prev) => prev.filter((i) => i.place_id !== placeId))
    } catch (err) {
      setError(err instanceof Error ? err.message : APP_STRINGS.prospects.error)
    } finally {
      setRemovingId(null)
    }
  }

  async function handleContactStatus(item: Prospect, status: ContactStatus) {
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
    <div className="prospects">
      <div className="prospects__header">
        <div>
          <h2 className="prospects__title">{APP_STRINGS.prospects.title}</h2>
          <p className="prospects__subtitle">{APP_STRINGS.prospects.subtitle}</p>
        </div>
        <button
          type="button"
          className="prospects__export"
          onClick={() => exportProspectsXlsx(sortedItems)}
          disabled={loading || sortedItems.length === 0}
        >
          {APP_STRINGS.export.xlsx}
        </button>
      </div>

      <div className="prospects__filters" role="group" aria-label="Filtrar por estado">
        <button
          type="button"
          className={`prospects__filter${filterStatus === 'all' ? ' prospects__filter--active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          {APP_STRINGS.prospects.filterAll}
        </button>
        {CONTACT_STATUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`prospects__filter${filterStatus === opt.value ? ' prospects__filter--active' : ''}`}
            onClick={() => setFilterStatus(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && <p className="prospects__hint">{APP_STRINGS.prospects.loading}</p>}
      {error && <p className="prospects__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="prospects__empty">{APP_STRINGS.prospects.empty}</p>
      )}

      {!loading && items.length > 0 && sortedItems.length === 0 && (
        <p className="prospects__empty">{APP_STRINGS.prospects.filterEmpty}</p>
      )}

      {!loading && sortedItems.length > 0 && (
        <ul className="prospects__list">
          {sortedItems.map((item) => (
            <li key={item.place_id} className="prospects__card">
              <div className="prospects__card-main">
                <div className="prospects__card-top">
                  <h3 className="prospects__name">{item.name}</h3>
                  <ContactStatusSelect
                    value={item.contact_status}
                    disabled={statusBusyId === item.place_id}
                    onChange={(status) => handleContactStatus(item, status)}
                  />
                </div>
                <p className="prospects__address">{item.address}</p>
                {item.phone && (
                  <a className="prospects__phone" href={`tel:${item.phone}`}>
                    {item.phone}
                  </a>
                )}
                {item.rating != null && item.rating > 0 && (
                  <span className="prospects__rating">
                    ★ {item.rating.toFixed(1)}
                  </span>
                )}
                {item.google_maps_uri && (
                  <a
                    className="prospects__link"
                    href={item.google_maps_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {APP_STRINGS.business.viewOnMaps}
                  </a>
                )}
              </div>
              <div className="prospects__card-actions">
                <button
                  type="button"
                  className="prospects__remove"
                  onClick={() => handleRemove(item.place_id)}
                  disabled={removingId === item.place_id}
                >
                  {APP_STRINGS.prospects.remove}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ProspectsPage
