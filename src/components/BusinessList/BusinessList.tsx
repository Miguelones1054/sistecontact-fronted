import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import {
  deleteProspect,
  fetchBusinessScheduled,
  fetchBusinessVisitors,
  fetchProspectsByPlaceIds,
  upsertProspect,
} from '../../services/api'
import type {
  Business,
  GlobalScheduledVisit,
  GlobalVisitor,
} from '../../types/api'
import { formatVisitDate } from '../../utils/dates'
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
  const [visitorsOpenId, setVisitorsOpenId] = useState<string | null>(null)
  const [visitors, setVisitors] = useState<GlobalVisitor[]>([])
  const [scheduled, setScheduled] = useState<GlobalScheduledVisit[]>([])
  const [visitorsLoading, setVisitorsLoading] = useState(false)
  const [visitorsError, setVisitorsError] = useState('')
  const [scheduledError, setScheduledError] = useState('')
  const [prospectIds, setProspectIds] = useState<Set<string>>(() => new Set())
  const [prospectBusyId, setProspectBusyId] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (businesses.length === 0) {
      setProspectIds(new Set())
      return
    }

    const ids = businesses.map((b) => b.place_id).filter(Boolean)
    const ac = new AbortController()
    fetchProspectsByPlaceIds(ids, ac.signal)
      .then((items) => {
        setProspectIds(new Set(items.map((i) => i.place_id)))
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
      setScheduled([])
      setVisitorsError('')
      setScheduledError('')
      setVisitorsLoading(false)
      return
    }

    const ac = new AbortController()
    setVisitorsLoading(true)
    setVisitorsError('')
    setScheduledError('')
    Promise.all([
      fetchBusinessVisitors(visitorsOpenId, ac.signal),
      fetchBusinessScheduled(visitorsOpenId, ac.signal),
    ])
      .then(([visitorItems, scheduledItems]) => {
        setVisitors(visitorItems)
        setScheduled(scheduledItems)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          const msg =
            err instanceof Error
              ? err.message
              : APP_STRINGS.business.whoVisitedError
          setVisitorsError(msg)
          setScheduledError(APP_STRINGS.business.whoScheduledError)
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
    if (visitorsOpenId === id) {
      setVisitorsOpenId(null)
    }
    setActionError('')
  }

  function toggleVisitors(placeId: string) {
    setVisitorsOpenId((prev) => (prev === placeId ? null : placeId))
    setActionError('')
  }

  async function handleToggleProspect(b: Business) {
    setActionError('')
    const isProspect = prospectIds.has(b.place_id)
    setProspectBusyId(b.place_id)
    try {
      if (isProspect) {
        await deleteProspect(b.place_id)
        setProspectIds((prev) => {
          const next = new Set(prev)
          next.delete(b.place_id)
          return next
        })
      } else {
        await upsertProspect(b.place_id, {
          name: b.name,
          address: b.address,
          phone: b.phone,
          rating: b.rating,
          user_rating_count: b.user_rating_count,
          google_maps_uri: b.google_maps_uri,
          latitude: b.location?.latitude,
          longitude: b.location?.longitude,
          open_now: b.open_now,
          contact_status: 'not_contacted',
        })
        setProspectIds((prev) => new Set(prev).add(b.place_id))
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : APP_STRINGS.business.prospectError,
      )
    } finally {
      setProspectBusyId(null)
    }
  }

  return (
    <ul className="business-list">
      {businesses.map((b) => {
        const id = b.place_id
        const isOpen = openIds.has(id)
        const showVisitors = visitorsOpenId === id
        const isProspect = prospectIds.has(id)
        const prospectBusy = prospectBusyId === id

        return (
          <li
            key={id}
            className={`business-row ${isOpen ? 'business-row--open' : ''}`}
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
                  {isProspect && (
                    <span className="business-row__tovisit-badge">
                      {APP_STRINGS.business.prospectBadge}
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

                <div className="business-row__visit-actions">
                  <button
                    type="button"
                    className="business-row__visit-btn business-row__visit-btn--primary"
                    onClick={() => handleToggleProspect(b)}
                    disabled={prospectBusy}
                  >
                    {prospectBusy
                      ? APP_STRINGS.business.savingVisit
                      : isProspect
                        ? APP_STRINGS.business.removeProspect
                        : APP_STRINGS.business.addProspect}
                  </button>
                  <button
                    type="button"
                    className="business-row__visit-btn"
                    onClick={() => toggleVisitors(id)}
                  >
                    {APP_STRINGS.business.whoVisited}
                  </button>
                </div>

                {actionError && (
                  <p className="business-row__visit-error">{actionError}</p>
                )}

                {showVisitors && (
                  <div className="business-row__visitors">
                    <h3 className="business-row__visitors-title">
                      {APP_STRINGS.business.whoScheduledTitle}
                    </h3>
                    {visitorsLoading && (
                      <p className="business-row__visitors-hint">
                        {APP_STRINGS.business.whoScheduledLoading}
                      </p>
                    )}
                    {scheduledError && (
                      <p className="business-row__visit-error">{scheduledError}</p>
                    )}
                    {!visitorsLoading &&
                      !scheduledError &&
                      scheduled.length === 0 && (
                        <p className="business-row__visitors-hint">
                          {APP_STRINGS.business.whoScheduledEmpty}
                        </p>
                      )}
                    {!visitorsLoading && scheduled.length > 0 && (
                      <ul className="business-row__visitors-list">
                        {scheduled.map((s) => {
                          const isYou = user?.uid === s.uid
                          const label = s.display_name || s.email || s.uid
                          return (
                            <li key={s.uid} className="business-row__visitor">
                              <div className="business-row__visitor-main">
                                <span className="business-row__visitor-name">
                                  {label}
                                  {isYou
                                    ? ` (${APP_STRINGS.business.youLabel})`
                                    : ''}
                                </span>
                                {s.email &&
                                  s.display_name &&
                                  s.display_name !== s.email && (
                                    <span className="business-row__visitor-email">
                                      {s.email}
                                    </span>
                                  )}
                              </div>
                              <div className="business-row__visitor-meta">
                                {s.visit_date && (
                                  <span>
                                    {APP_STRINGS.business.whoScheduledDate}:{' '}
                                    {formatVisitDate(s.visit_date)}
                                  </span>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}

                    <h3 className="business-row__visitors-title business-row__visitors-title--spaced">
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
                    {!visitorsLoading &&
                      !visitorsError &&
                      visitors.length === 0 && (
                        <p className="business-row__visitors-hint">
                          {APP_STRINGS.business.whoVisitedEmpty}
                        </p>
                      )}
                    {!visitorsLoading && visitors.length > 0 && (
                      <ul className="business-row__visitors-list">
                        {visitors.map((v) => {
                          const isYou = user?.uid === v.uid
                          const label = v.display_name || v.email || v.uid
                          return (
                            <li key={v.uid} className="business-row__visitor">
                              <div className="business-row__visitor-main">
                                <span className="business-row__visitor-name">
                                  {label}
                                  {isYou
                                    ? ` (${APP_STRINGS.business.youLabel})`
                                    : ''}
                                </span>
                                {v.email &&
                                  v.display_name &&
                                  v.display_name !== v.email && (
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
