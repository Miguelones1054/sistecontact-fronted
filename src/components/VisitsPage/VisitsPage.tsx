import { useEffect, useMemo, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import { fetchProspectsList, upsertProspect } from '../../services/api'
import type { Prospect, Visit } from '../../types/api'
import {
  compareISODates,
  formatVisitDate,
  todayISODate,
  tomorrowISODate,
  visitDateGroup,
} from '../../utils/dates'
import { exportProspectsXlsx } from '../../utils/exportXlsx'
import {
  contactOutcomeLabel,
  contactStatusLabel,
  normalizeContactOutcome,
  normalizeContactStatus,
} from '../ContactStatusSelect/ContactStatusSelect'
import VisitPanel from '../VisitPanel/VisitPanel'
import './VisitsPage.css'

type DateGroupKey = 'today' | 'overdue' | 'upcoming' | 'none'
type DateFilter = 'all' | 'today' | 'tomorrow' | 'custom'

const SECTION_ORDER: DateGroupKey[] = ['today', 'overdue', 'upcoming', 'none']

const SECTION_TITLE: Record<DateGroupKey, string> = {
  today: APP_STRINGS.visits.sectionToday,
  overdue: APP_STRINGS.visits.sectionOverdue,
  upcoming: APP_STRINGS.visits.sectionUpcoming,
  none: APP_STRINGS.visits.sectionNoDate,
}

function sortByVisitDate(a: Prospect, b: Prospect): number {
  const byDate = compareISODates(a.visit_date, b.visit_date)
  if (byDate !== 0) return byDate
  return a.name.localeCompare(b.name, 'es')
}

function VisitsPage() {
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateBusyId, setDateBusyId] = useState<string | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [filterDate, setFilterDate] = useState<DateFilter>('all')
  const [customDate, setCustomDate] = useState(todayISODate())

  const resolvedDateFilter = useMemo(() => {
    if (filterDate === 'today') return todayISODate()
    if (filterDate === 'tomorrow') return tomorrowISODate()
    if (filterDate === 'custom') return customDate
    return null
  }, [filterDate, customDate])

  function load() {
    setLoading(true)
    setError('')
    fetchProspectsList()
      .then((list) => {
        setItems(list)
        const drafts: Record<string, string> = {}
        for (const item of list) {
          drafts[item.place_id] = item.visit_date ?? ''
        }
        setDraftDates(drafts)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : APP_STRINGS.visits.error)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const sortedItems = useMemo(() => {
    let filtered = items
    if (resolvedDateFilter) {
      filtered = filtered.filter((i) => i.visit_date === resolvedDateFilter)
    }
    return [...filtered].sort(sortByVisitDate)
  }, [items, resolvedDateFilter])

  const grouped = useMemo(() => {
    const today = todayISODate()
    const buckets: Record<DateGroupKey, Prospect[]> = {
      today: [],
      overdue: [],
      upcoming: [],
      none: [],
    }
    for (const item of sortedItems) {
      buckets[visitDateGroup(item.visit_date, today)].push(item)
    }
    return buckets
  }, [sortedItems])

  function handleVisitSaved(visit: Visit) {
    setItems((prev) => prev.filter((i) => i.place_id !== visit.place_id))
    setDraftDates((prev) => {
      const next = { ...prev }
      delete next[visit.place_id]
      return next
    })
  }

  async function handleSaveVisitDate(item: Prospect) {
    const nextDate = (draftDates[item.place_id] ?? '').trim()
    if (!nextDate) {
      setError(APP_STRINGS.business.visitDateRequired)
      return
    }
    if (nextDate === (item.visit_date ?? '')) return

    setDateBusyId(item.place_id)
    setError('')
    try {
      const updated = await upsertProspect(item.place_id, {
        name: item.name,
        address: item.address,
        phone: item.phone,
        rating: item.rating,
        user_rating_count: item.user_rating_count,
        google_maps_uri: item.google_maps_uri,
        latitude: item.latitude,
        longitude: item.longitude,
        open_now: item.open_now,
        contact_status: item.contact_status,
        contact_outcome: item.contact_outcome,
        contact_notes: item.contact_notes,
        visit_date: nextDate,
      })
      setItems((prev) =>
        prev.map((i) => (i.place_id === item.place_id ? { ...i, ...updated } : i)),
      )
      setDraftDates((prev) => ({
        ...prev,
        [item.place_id]: updated.visit_date ?? nextDate,
      }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.prospectError,
      )
    } finally {
      setDateBusyId(null)
    }
  }

  async function handleClearVisitDate(item: Prospect) {
    if (!item.visit_date) return
    setDateBusyId(item.place_id)
    setError('')
    try {
      const updated = await upsertProspect(item.place_id, {
        name: item.name,
        address: item.address,
        phone: item.phone,
        rating: item.rating,
        user_rating_count: item.user_rating_count,
        google_maps_uri: item.google_maps_uri,
        latitude: item.latitude,
        longitude: item.longitude,
        open_now: item.open_now,
        contact_status: item.contact_status,
        contact_outcome: item.contact_outcome,
        contact_notes: item.contact_notes,
        clear_visit_date: true,
      })
      setItems((prev) =>
        prev.map((i) => (i.place_id === item.place_id ? { ...i, ...updated } : i)),
      )
      setDraftDates((prev) => ({ ...prev, [item.place_id]: '' }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.prospectError,
      )
    } finally {
      setDateBusyId(null)
    }
  }

  function renderCard(item: Prospect) {
    const draft = draftDates[item.place_id] ?? item.visit_date ?? ''
    const dirty = draft !== (item.visit_date ?? '')
    const dateBusy = dateBusyId === item.place_id
    const statusLabel = contactStatusLabel(item.contact_status)
    const outcomeLabel = contactOutcomeLabel(
      normalizeContactOutcome(item.contact_outcome, item.contact_status),
    )

    return (
      <li key={item.place_id} className="visits__card">
        <div className="visits__card-main">
          <div className="visits__card-top">
            <h3 className="visits__name">{item.name}</h3>
            <span
              className={`visits__status-badge visits__status-badge--${normalizeContactStatus(item.contact_status)}`}
            >
              {outcomeLabel || statusLabel}
            </span>
          </div>
          <p className="visits__address">{item.address}</p>
          {item.phone && (
            <a className="visits__phone" href={`tel:${item.phone}`}>
              {item.phone}
            </a>
          )}
          {item.google_maps_uri && (
            <a
              className="visits__link"
              href={item.google_maps_uri}
              target="_blank"
              rel="noopener noreferrer"
            >
              {APP_STRINGS.business.viewOnMaps}
            </a>
          )}

          <div className="visits__date-row">
            <label className="visits__date-field">
              <span>{APP_STRINGS.visits.visitDateLabel}</span>
              <input
                type="date"
                value={draft}
                onChange={(e) =>
                  setDraftDates((prev) => ({
                    ...prev,
                    [item.place_id]: e.target.value,
                  }))
                }
                disabled={dateBusy}
              />
            </label>
            <div className="visits__date-meta">
              <span className="visits__date-hint">
                {item.visit_date
                  ? formatVisitDate(item.visit_date)
                  : APP_STRINGS.visits.noVisitDate}
              </span>
              {dirty && (
                <button
                  type="button"
                  className="visits__date-save"
                  onClick={() => handleSaveVisitDate(item)}
                  disabled={dateBusy || !draft}
                >
                  {dateBusy
                    ? APP_STRINGS.business.savingVisit
                    : APP_STRINGS.visits.saveDate}
                </button>
              )}
              {!!item.visit_date && (
                <button
                  type="button"
                  className="visits__date-save"
                  onClick={() => handleClearVisitDate(item)}
                  disabled={dateBusy}
                >
                  {APP_STRINGS.visits.clearDate}
                </button>
              )}
            </div>
          </div>
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
        />
      </li>
    )
  }

  return (
    <div className="visits">
      <div className="visits__header">
        <div>
          <h2 className="visits__title">{APP_STRINGS.visits.title}</h2>
          <p className="visits__subtitle">{APP_STRINGS.visits.subtitle}</p>
        </div>
        <button
          type="button"
          className="visits__export"
          onClick={() => exportProspectsXlsx(sortedItems)}
          disabled={loading || sortedItems.length === 0}
        >
          {APP_STRINGS.export.xlsx}
        </button>
      </div>

      <div className="visits__filters" role="group" aria-label="Filtrar por fecha">
        <button
          type="button"
          className={`visits__filter${filterDate === 'all' ? ' visits__filter--active' : ''}`}
          onClick={() => setFilterDate('all')}
        >
          {APP_STRINGS.visits.filterDateAll}
        </button>
        <button
          type="button"
          className={`visits__filter${filterDate === 'today' ? ' visits__filter--active' : ''}`}
          onClick={() => setFilterDate('today')}
        >
          {APP_STRINGS.visits.filterDateToday}
        </button>
        <button
          type="button"
          className={`visits__filter${filterDate === 'tomorrow' ? ' visits__filter--active' : ''}`}
          onClick={() => setFilterDate('tomorrow')}
        >
          {APP_STRINGS.visits.filterDateTomorrow}
        </button>
        <button
          type="button"
          className={`visits__filter${filterDate === 'custom' ? ' visits__filter--active' : ''}`}
          onClick={() => setFilterDate('custom')}
        >
          {APP_STRINGS.visits.filterDateCustom}
        </button>
        {filterDate === 'custom' && (
          <label className="visits__custom-date">
            <span className="visits__custom-date-label">
              {APP_STRINGS.visits.filterDateCustomLabel}
            </span>
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value || todayISODate())}
            />
          </label>
        )}
      </div>

      {loading && <p className="visits__hint">{APP_STRINGS.visits.loading}</p>}
      {error && <p className="visits__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="visits__empty">{APP_STRINGS.visits.empty}</p>
      )}

      {!loading && items.length > 0 && sortedItems.length === 0 && (
        <p className="visits__empty">{APP_STRINGS.visits.filterDateEmpty}</p>
      )}

      {!loading && sortedItems.length > 0 && (
        <div className="visits__sections">
          {resolvedDateFilter ? (
            <section className="visits__section visits__section--filtered">
              <h3 className="visits__section-title">
                {formatVisitDate(resolvedDateFilter)}
                <span className="visits__section-count">{sortedItems.length}</span>
              </h3>
              <ul className="visits__list">{sortedItems.map(renderCard)}</ul>
            </section>
          ) : (
            SECTION_ORDER.map((key) => {
              const sectionItems = grouped[key]
              if (sectionItems.length === 0) return null
              return (
                <section
                  key={key}
                  className={`visits__section visits__section--${key}`}
                >
                  <h3 className="visits__section-title">
                    {SECTION_TITLE[key]}
                    <span className="visits__section-count">
                      {sectionItems.length}
                    </span>
                  </h3>
                  <ul className="visits__list">{sectionItems.map(renderCard)}</ul>
                </section>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export default VisitsPage
