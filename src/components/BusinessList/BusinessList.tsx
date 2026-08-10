import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import {
  deleteToVisit,
  deleteVisit,
  fetchBusinessVisitors,
  fetchContactStatuses,
  fetchToVisitByPlaceIds,
  fetchVisits,
  upsertContactStatus,
  upsertToVisit,
  upsertVisit,
} from '../../services/api'
import type { Business, GlobalVisitor, Visit } from '../../types/api'
import ContactStatusSelect, {
  type ContactStatus,
  normalizeContactStatus,
} from '../ContactStatusSelect/ContactStatusSelect'
import './BusinessList.css'

interface Props {
  businesses: Business[]
}

function ratingStars(rating?: number): string {
  if (!rating) return APP_STRINGS.business.noRating
  return `★ ${rating.toFixed(1)}`
}

function formatVisitorDate(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function BusinessList({ businesses }: Props) {
  const { user } = useAuth()
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [visitorsOpenId, setVisitorsOpenId] = useState<string | null>(null)
  const [visitors, setVisitors] = useState<GlobalVisitor[]>([])
  const [visitorsLoading, setVisitorsLoading] = useState(false)
  const [visitorsError, setVisitorsError] = useState('')
  const [visits, setVisits] = useState<Record<string, Visit>>({})
  const [toVisitIds, setToVisitIds] = useState<Set<string>>(() => new Set())
  const [contactStatuses, setContactStatuses] = useState<Record<string, ContactStatus>>(
    {},
  )
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [visitResult, setVisitResult] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toVisitBusyId, setToVisitBusyId] = useState<string | null>(null)
  const [visitError, setVisitError] = useState('')

  useEffect(() => {
    if (businesses.length === 0) {
      setVisits({})
      setToVisitIds(new Set())
      setContactStatuses({})
      return
    }

    const ids = businesses.map((b) => b.place_id).filter(Boolean)
    const ac = new AbortController()
    Promise.all([
      fetchVisits(ids, ac.signal),
      fetchToVisitByPlaceIds(ids, ac.signal),
      fetchContactStatuses(ids, ac.signal),
    ])
      .then(([visitItems, toVisitItems, statusItems]) => {
        const map: Record<string, Visit> = {}
        for (const v of visitItems) {
          map[v.place_id] = v
        }
        setVisits(map)
        setToVisitIds(new Set(toVisitItems.map((i) => i.place_id)))
        const statuses: Record<string, ContactStatus> = {}
        for (const s of statusItems) {
          statuses[s.place_id] = normalizeContactStatus(s.contact_status)
        }
        for (const t of toVisitItems) {
          if (!statuses[t.place_id] && t.contact_status) {
            statuses[t.place_id] = normalizeContactStatus(t.contact_status)
          }
        }
        setContactStatuses(statuses)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.warn(err)
        }
      })

    return () => ac.abort()
  }, [businesses])

  useEffect(() => {
    if (!visitorsOpenId) {
      setVisitors([])
      setVisitorsError('')
      setVisitorsLoading(false)
      return
    }

    const ac = new AbortController()
    setVisitorsLoading(true)
    setVisitorsError('')
    fetchBusinessVisitors(visitorsOpenId, ac.signal)
      .then(setVisitors)
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setVisitorsError(
            err instanceof Error
              ? err.message
              : APP_STRINGS.business.whoVisitedError,
          )
        }
      })
      .finally(() => setVisitorsLoading(false))

    return () => ac.abort()
  }, [visitorsOpenId])

  if (businesses.length === 0) {
    return <p className="business-list__empty">{APP_STRINGS.search.noResults}</p>
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    if (editingId === id) {
      setEditingId(null)
      setVisitError('')
    }
    if (visitorsOpenId === id) {
      setVisitorsOpenId(null)
    }
  }

  function openVisitForm(b: Business) {
    const existing = visits[b.place_id]
    setEditingId(b.place_id)
    setNotes(existing?.notes ?? '')
    setVisitResult(existing?.visit_result ?? '')
    setVisitError('')
    setVisitorsOpenId(null)
    setOpenIds((prev) => new Set(prev).add(b.place_id))
  }

  function toggleVisitors(placeId: string) {
    setVisitorsOpenId((prev) => (prev === placeId ? null : placeId))
    setEditingId(null)
    setVisitError('')
  }

  async function handleSaveVisit(b: Business) {
    setSavingId(b.place_id)
    setVisitError('')
    try {
      const saved = await upsertVisit(b.place_id, {
        name: b.name,
        address: b.address,
        notes,
        visit_result: visitResult,
        phone: b.phone,
        rating: b.rating,
        user_rating_count: b.user_rating_count,
        google_maps_uri: b.google_maps_uri,
        latitude: b.location?.latitude,
        longitude: b.location?.longitude,
        open_now: b.open_now,
      })
      setVisits((prev) => ({ ...prev, [b.place_id]: saved }))
      setToVisitIds((prev) => {
        const next = new Set(prev)
        next.delete(b.place_id)
        return next
      })
      setEditingId(null)
      if (visitorsOpenId === b.place_id) {
        setVisitorsOpenId(null)
        queueMicrotask(() => setVisitorsOpenId(b.place_id))
      }
    } catch (err) {
      setVisitError(
        err instanceof Error ? err.message : APP_STRINGS.business.visitError,
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleUnmark(b: Business) {
    setSavingId(b.place_id)
    setVisitError('')
    try {
      await deleteVisit(b.place_id)
      setVisits((prev) => {
        const next = { ...prev }
        delete next[b.place_id]
        return next
      })
      setEditingId(null)
      if (visitorsOpenId === b.place_id) {
        setVisitorsOpenId(null)
        queueMicrotask(() => setVisitorsOpenId(b.place_id))
      }
    } catch (err) {
      setVisitError(
        err instanceof Error ? err.message : APP_STRINGS.business.visitError,
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleToggleToVisit(b: Business) {
    setToVisitBusyId(b.place_id)
    setVisitError('')
    const isQueued = toVisitIds.has(b.place_id)
    try {
      if (isQueued) {
        await deleteToVisit(b.place_id)
        setToVisitIds((prev) => {
          const next = new Set(prev)
          next.delete(b.place_id)
          return next
        })
      } else {
        await upsertToVisit(b.place_id, {
          name: b.name,
          address: b.address,
          phone: b.phone,
          rating: b.rating,
          user_rating_count: b.user_rating_count,
          google_maps_uri: b.google_maps_uri,
          latitude: b.location?.latitude,
          longitude: b.location?.longitude,
          open_now: b.open_now,
          contact_status: contactStatuses[b.place_id] ?? 'not_contacted',
        })
        setToVisitIds((prev) => new Set(prev).add(b.place_id))
      }
    } catch (err) {
      setVisitError(
        err instanceof Error ? err.message : APP_STRINGS.business.toVisitError,
      )
    } finally {
      setToVisitBusyId(null)
    }
  }

  async function handleContactStatus(b: Business, status: ContactStatus) {
    setStatusBusyId(b.place_id)
    setVisitError('')
    try {
      await upsertContactStatus(b.place_id, {
        name: b.name,
        address: b.address,
        contact_status: status,
      })
      setContactStatuses((prev) => ({ ...prev, [b.place_id]: status }))
    } catch (err) {
      setVisitError(
        err instanceof Error ? err.message : APP_STRINGS.business.statusError,
      )
    } finally {
      setStatusBusyId(null)
    }
  }

  return (
    <ul className="business-list">
      {businesses.map((b) => {
        const id = b.place_id
        const isOpen = openIds.has(id)
        const visit = visits[id]
        const isEditing = editingId === id
        const isSaving = savingId === id
        const showVisitors = visitorsOpenId === id
        const isToVisit = toVisitIds.has(id)
        const toVisitBusy = toVisitBusyId === id

        return (
          <li
            key={id}
            className={`business-row ${isOpen ? 'business-row--open' : ''} ${
              visit?.visited ? 'business-row--visited' : ''
            }`}
          >
            <button
              type="button"
              className="business-row__summary"
              onClick={() => toggle(id)}
              aria-expanded={isOpen}
            >
              <span className="business-row__summary-main">
                <span className="business-row__name-row">
                  <span className="business-row__name">{b.name}</span>
                  {visit?.visited && (
                    <span className="business-row__visited-badge">
                      {APP_STRINGS.business.visitedBadge}
                    </span>
                  )}
                  {isToVisit && !visit?.visited && (
                    <span className="business-row__tovisit-badge">
                      {APP_STRINGS.business.toVisitBadge}
                    </span>
                  )}
                </span>
                <span className="business-row__summary-meta">
                  <span className="business-row__rating">{ratingStars(b.rating)}</span>
                  {b.open_now != null && (
                    <span
                      className={`business-row__status ${
                        b.open_now
                          ? 'business-row__status--open'
                          : 'business-row__status--closed'
                      }`}
                    >
                      {b.open_now
                        ? APP_STRINGS.business.openNow
                        : APP_STRINGS.business.closed}
                    </span>
                  )}
                </span>
              </span>
              <span className="business-row__chevron" aria-hidden="true">
                {isOpen ? '▾' : '▸'}
              </span>
            </button>

            <div className="business-row__contact">
              <ContactStatusSelect
                value={contactStatuses[id]}
                disabled={statusBusyId === id}
                onChange={(status) => handleContactStatus(b, status)}
              />
            </div>

            {isOpen && (
              <div className="business-row__details">
                <p className="business-row__address">{b.address}</p>

                <div className="business-row__detail-line">
                  <span className="business-row__label">
                    {APP_STRINGS.business.phone}
                  </span>
                  {b.phone ? (
                    <a className="business-row__phone" href={`tel:${b.phone}`}>
                      {b.phone}
                    </a>
                  ) : (
                    <span className="business-row__muted">
                      {APP_STRINGS.business.noPhone}
                    </span>
                  )}
                </div>

                {b.user_rating_count != null && b.user_rating_count > 0 && (
                  <div className="business-row__detail-line">
                    <span className="business-row__label">
                      {APP_STRINGS.business.reviewsLabel}
                    </span>
                    <span>{APP_STRINGS.business.reviews(b.user_rating_count)}</span>
                  </div>
                )}

                {b.google_maps_uri && (
                  <a
                    className="business-row__link"
                    href={b.google_maps_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {APP_STRINGS.business.viewOnMaps}
                  </a>
                )}

                {visit?.visited && !isEditing && (
                  <div className="business-row__visit-summary">
                    {visit.visit_result && (
                      <p className="business-row__visit-line">
                        <strong>{APP_STRINGS.business.resultLabel}:</strong>{' '}
                        {visit.visit_result}
                      </p>
                    )}
                    {visit.notes && (
                      <p className="business-row__visit-line">
                        <strong>{APP_STRINGS.business.notesLabel}:</strong>{' '}
                        {visit.notes}
                      </p>
                    )}
                  </div>
                )}

                {!isEditing ? (
                  <div className="business-row__visit-actions">
                    <button
                      type="button"
                      className="business-row__visit-btn"
                      onClick={() => openVisitForm(b)}
                    >
                      {visit?.visited
                        ? APP_STRINGS.business.editVisit
                        : APP_STRINGS.business.markVisited}
                    </button>
                    <button
                      type="button"
                      className="business-row__visit-btn"
                      onClick={() => handleToggleToVisit(b)}
                      disabled={toVisitBusy}
                    >
                      {isToVisit
                        ? APP_STRINGS.business.removeToVisit
                        : APP_STRINGS.business.addToVisit}
                    </button>
                    <button
                      type="button"
                      className="business-row__visit-btn"
                      onClick={() => toggleVisitors(id)}
                    >
                      {APP_STRINGS.business.whoVisited}
                    </button>
                    {visit?.visited && (
                      <button
                        type="button"
                        className="business-row__visit-btn business-row__visit-btn--muted"
                        onClick={() => handleUnmark(b)}
                        disabled={isSaving}
                      >
                        {APP_STRINGS.business.unmarkVisited}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="business-row__visit-form">
                    <label className="business-row__visit-field">
                      <span>{APP_STRINGS.business.resultLabel}</span>
                      <input
                        type="text"
                        value={visitResult}
                        placeholder={APP_STRINGS.business.resultPlaceholder}
                        onChange={(e) => setVisitResult(e.target.value)}
                        disabled={isSaving}
                      />
                    </label>
                    <label className="business-row__visit-field">
                      <span>{APP_STRINGS.business.notesLabel}</span>
                      <textarea
                        rows={3}
                        value={notes}
                        placeholder={APP_STRINGS.business.notesPlaceholder}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={isSaving}
                      />
                    </label>
                    {visitError && (
                      <p className="business-row__visit-error">{visitError}</p>
                    )}
                    <div className="business-row__visit-actions">
                      <button
                        type="button"
                        className="business-row__visit-btn business-row__visit-btn--primary"
                        onClick={() => handleSaveVisit(b)}
                        disabled={isSaving}
                      >
                        {isSaving
                          ? APP_STRINGS.business.savingVisit
                          : APP_STRINGS.business.saveVisit}
                      </button>
                      <button
                        type="button"
                        className="business-row__visit-btn business-row__visit-btn--muted"
                        onClick={() => {
                          setEditingId(null)
                          setVisitError('')
                        }}
                        disabled={isSaving}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {showVisitors && (
                  <div className="business-row__visitors">
                    <h3 className="business-row__visitors-title">
                      {APP_STRINGS.business.whoVisitedTitle}
                    </h3>
                    {visitorsLoading && (
                      <p className="business-row__visitors-hint">
                        {APP_STRINGS.business.whoVisitedLoading}
                      </p>
                    )}
                    {visitorsError && (
                      <p className="business-row__visit-error">{visitorsError}</p>
                    )}
                    {!visitorsLoading && !visitorsError && visitors.length === 0 && (
                      <p className="business-row__visitors-hint">
                        {APP_STRINGS.business.whoVisitedEmpty}
                      </p>
                    )}
                    {!visitorsLoading && visitors.length > 0 && (
                      <ul className="business-row__visitors-list">
                        {visitors.map((v) => {
                          const isYou = user?.uid === v.uid
                          const label =
                            v.display_name || v.email || v.uid
                          return (
                            <li key={v.uid} className="business-row__visitor">
                              <div className="business-row__visitor-main">
                                <span className="business-row__visitor-name">
                                  {label}
                                  {isYou ? ` (${APP_STRINGS.business.youLabel})` : ''}
                                </span>
                                {v.email && v.display_name && v.display_name !== v.email && (
                                  <span className="business-row__visitor-email">
                                    {v.email}
                                  </span>
                                )}
                              </div>
                              <div className="business-row__visitor-meta">
                                {v.visit_result && (
                                  <span>
                                    {APP_STRINGS.business.whoVisitedResult}:{' '}
                                    {v.visit_result}
                                  </span>
                                )}
                                <span>{formatVisitorDate(v.updated_at)}</span>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default BusinessList
