import { useEffect, useMemo, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import { useSchedulingSettings } from '../../context/SchedulingSettingsContext'
import { fetchProspectsList, upsertProspect } from '../../services/api'
import type { Prospect, Visit } from '../../types/api'
import {
  compareISODates,
  earliestScheduleDate,
  formatVisitDate,
  todayISODate,
  tomorrowISODate,
  visitDateGroup,
} from '../../utils/dates'
import {
  buildTimeOptionsFromInterval,
  defaultTimeForInterval,
  formatCallDateTime,
} from '../../utils/callTimes'
import { calendarSyncFeedback } from '../../utils/calendarSync'
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
type ChannelFilter = 'all' | 'visit' | 'call'

const SECTION_ORDER: DateGroupKey[] = ['today', 'overdue', 'upcoming', 'none']

const SECTION_TITLE: Record<DateGroupKey, string> = {
  today: APP_STRINGS.visits.sectionToday,
  overdue: APP_STRINGS.visits.sectionOverdue,
  upcoming: APP_STRINGS.visits.sectionUpcoming,
  none: APP_STRINGS.visits.sectionNoDate,
}

function scheduleDateForChannel(
  item: Prospect,
  channel: ChannelFilter,
): string | undefined {
  if (channel === 'visit') return item.visit_date || undefined
  if (channel === 'call') return item.call_date || undefined
  return earliestScheduleDate(item.call_date, item.visit_date)
}

function sortByScheduleDate(
  a: Prospect,
  b: Prospect,
  channel: ChannelFilter,
): number {
  const byDate = compareISODates(
    scheduleDateForChannel(a, channel),
    scheduleDateForChannel(b, channel),
  )
  if (byDate !== 0) return byDate
  return a.name.localeCompare(b.name, 'es')
}

function matchesChannel(item: Prospect, channel: ChannelFilter): boolean {
  if (channel === 'visit') return !!item.visit_date
  if (channel === 'call') return !!item.call_date
  return true
}

function matchesDateFilter(
  item: Prospect,
  date: string,
  channel: ChannelFilter,
): boolean {
  if (channel === 'visit') return item.visit_date === date
  if (channel === 'call') return item.call_date === date
  return item.call_date === date || item.visit_date === date
}

function VisitsPage() {
  const { intervalMinutes } = useSchedulingSettings()
  const timeOptions = useMemo(() => buildTimeOptionsFromInterval(intervalMinutes), [intervalMinutes])
  const defaultTime = useMemo(() => defaultTimeForInterval(intervalMinutes), [intervalMinutes])
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dateBusyId, setDateBusyId] = useState<string | null>(null)
  const [callBusyId, setCallBusyId] = useState<string | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftVisitTimes, setDraftVisitTimes] = useState<Record<string, string>>({})
  const [draftCallDates, setDraftCallDates] = useState<Record<string, string>>({})
  const [draftCallTimes, setDraftCallTimes] = useState<Record<string, string>>({})
  const [filterDate, setFilterDate] = useState<DateFilter>('all')
  const [filterChannel, setFilterChannel] = useState<ChannelFilter>('all')
  const [customDate, setCustomDate] = useState(todayISODate())
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  function toggleExpanded(placeId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(placeId)) next.delete(placeId)
      else next.add(placeId)
      return next
    })
  }

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
        const visitTimeDrafts: Record<string, string> = {}
        const callDrafts: Record<string, string> = {}
        const callTimeDrafts: Record<string, string> = {}
        for (const item of list) {
          drafts[item.place_id] = item.visit_date ?? ''
          visitTimeDrafts[item.place_id] = item.visit_time ?? defaultTime
          callDrafts[item.place_id] = item.call_date ?? ''
          callTimeDrafts[item.place_id] = item.call_time ?? defaultTime
        }
        setDraftDates(drafts)
        setDraftVisitTimes(visitTimeDrafts)
        setDraftCallDates(callDrafts)
        setDraftCallTimes(callTimeDrafts)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : APP_STRINGS.visits.error)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [defaultTime])

  const channelCounts = useMemo(() => {
    let visit = 0
    let call = 0
    for (const item of items) {
      if (item.visit_date) visit += 1
      if (item.call_date) call += 1
    }
    return { all: items.length, visit, call }
  }, [items])

  const sortedItems = useMemo(() => {
    let filtered = items.filter((i) => matchesChannel(i, filterChannel))
    if (resolvedDateFilter) {
      filtered = filtered.filter((i) =>
        matchesDateFilter(i, resolvedDateFilter, filterChannel),
      )
    }
    return [...filtered].sort((a, b) => sortByScheduleDate(a, b, filterChannel))
  }, [items, resolvedDateFilter, filterChannel])

  const grouped = useMemo(() => {
    const today = todayISODate()
    const buckets: Record<DateGroupKey, Prospect[]> = {
      today: [],
      overdue: [],
      upcoming: [],
      none: [],
    }
    for (const item of sortedItems) {
      const schedule = scheduleDateForChannel(item, filterChannel)
      buckets[visitDateGroup(schedule, today)].push(item)
    }
    return buckets
  }, [sortedItems, filterChannel])

  function handleVisitSaved(visit: Visit) {
    setItems((prev) => prev.filter((i) => i.place_id !== visit.place_id))
    setDraftDates((prev) => {
      const next = { ...prev }
      delete next[visit.place_id]
      return next
    })
    setDraftVisitTimes((prev) => {
      const next = { ...prev }
      delete next[visit.place_id]
      return next
    })
    setDraftCallDates((prev) => {
      const next = { ...prev }
      delete next[visit.place_id]
      return next
    })
    setDraftCallTimes((prev) => {
      const next = { ...prev }
      delete next[visit.place_id]
      return next
    })
  }

  async function handleSaveVisitDate(item: Prospect) {
    const nextDate = (draftDates[item.place_id] ?? '').trim()
    const nextTime = (draftVisitTimes[item.place_id] ?? '').trim()
    if (!nextDate) {
      setError(APP_STRINGS.business.visitDateRequired)
      return
    }
    if (!nextTime) {
      setError(APP_STRINGS.prospects.visitTimeRequired)
      return
    }
    if (
      nextDate === (item.visit_date ?? '') &&
      nextTime === (item.visit_time ?? '')
    ) {
      return
    }

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
        visit_time: nextTime,
      })
      setItems((prev) =>
        prev.map((i) => (i.place_id === item.place_id ? { ...i, ...updated } : i)),
      )
      setDraftDates((prev) => ({
        ...prev,
        [item.place_id]: updated.visit_date ?? nextDate,
      }))
      setDraftVisitTimes((prev) => ({
        ...prev,
        [item.place_id]: updated.visit_time ?? nextTime,
      }))
      const syncMsg = calendarSyncFeedback(updated)
      if (syncMsg) setError(syncMsg)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.prospectError,
      )
    } finally {
      setDateBusyId(null)
    }
  }

  async function handleClearVisitDate(item: Prospect) {
    if (!item.visit_date && !item.visit_time) return
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
        prev.map((i) =>
          i.place_id === item.place_id
            ? {
                ...i,
                ...updated,
                visit_date: undefined,
                visit_time: undefined,
                call_date: updated.call_date || undefined,
                call_time: updated.call_time || undefined,
              }
            : i,
        ),
      )
      setDraftDates((prev) => ({ ...prev, [item.place_id]: '' }))
      setDraftVisitTimes((prev) => ({
        ...prev,
        [item.place_id]: defaultTime,
      }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.prospectError,
      )
    } finally {
      setDateBusyId(null)
    }
  }

  async function handleSaveCallDate(item: Prospect) {
    const nextDate = (draftCallDates[item.place_id] ?? '').trim()
    const nextTime = (draftCallTimes[item.place_id] ?? '').trim()
    if (!nextDate) {
      setError(APP_STRINGS.prospects.callDateRequired)
      return
    }
    if (!nextTime) {
      setError(APP_STRINGS.prospects.callTimeRequired)
      return
    }
    if (
      nextDate === (item.call_date ?? '') &&
      nextTime === (item.call_time ?? '')
    ) {
      return
    }

    setCallBusyId(item.place_id)
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
        call_date: nextDate,
        call_time: nextTime,
      })
      setItems((prev) =>
        prev.map((i) => (i.place_id === item.place_id ? { ...i, ...updated } : i)),
      )
      setDraftCallDates((prev) => ({
        ...prev,
        [item.place_id]: updated.call_date ?? nextDate,
      }))
      setDraftCallTimes((prev) => ({
        ...prev,
        [item.place_id]: updated.call_time ?? nextTime,
      }))
      const syncMsg = calendarSyncFeedback(updated)
      if (syncMsg) setError(syncMsg)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.prospectError,
      )
    } finally {
      setCallBusyId(null)
    }
  }

  async function handleClearCallDate(item: Prospect) {
    if (!item.call_date && !item.call_time) return
    setCallBusyId(item.place_id)
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
        clear_call_date: true,
      })
      setItems((prev) =>
        prev.map((i) =>
          i.place_id === item.place_id
            ? {
                ...i,
                ...updated,
                call_date: undefined,
                call_time: undefined,
                visit_date: updated.visit_date || undefined,
                visit_time: updated.visit_time || undefined,
              }
            : i,
        ),
      )
      setDraftCallDates((prev) => ({ ...prev, [item.place_id]: '' }))
      setDraftCallTimes((prev) => ({
        ...prev,
        [item.place_id]: defaultTime,
      }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.prospectError,
      )
    } finally {
      setCallBusyId(null)
    }
  }

  function renderCard(item: Prospect) {
    const showCall = filterChannel === 'all' || filterChannel === 'call'
    const showVisit = filterChannel === 'all' || filterChannel === 'visit'
    const draft = draftDates[item.place_id] ?? item.visit_date ?? ''
    const visitTimeDraft =
      draftVisitTimes[item.place_id] ?? item.visit_time ?? defaultTime
    const dirty =
      draft !== (item.visit_date ?? '') ||
      visitTimeDraft !== (item.visit_time ?? '')
    const dateBusy = dateBusyId === item.place_id
    const callDraft = draftCallDates[item.place_id] ?? item.call_date ?? ''
    const callTimeDraft =
      draftCallTimes[item.place_id] ?? item.call_time ?? defaultTime
    const callDirty =
      callDraft !== (item.call_date ?? '') ||
      callTimeDraft !== (item.call_time ?? '')
    const callBusy = callBusyId === item.place_id
    const expanded = expandedIds.has(item.place_id)
    const hasCall = !!item.call_date
    const hasVisit = !!item.visit_date
    const isScheduled =
      (showCall && hasCall) || (showVisit && hasVisit) || (!showCall && !showVisit && (hasCall || hasVisit))
    const statusLabel = contactStatusLabel(item.contact_status)
    const outcomeLabel = contactOutcomeLabel(
      normalizeContactOutcome(item.contact_outcome, item.contact_status),
    )

    return (
      <li
        key={item.place_id}
        className={`visits__card${expanded ? ' visits__card--expanded' : ''}${
          isScheduled ? ' visits__card--scheduled' : ' visits__card--unscheduled'
        }`}
      >
        <button
          type="button"
          className="visits__card-summary"
          onClick={() => toggleExpanded(item.place_id)}
          aria-expanded={expanded}
          aria-controls={`visits-detail-${item.place_id}`}
        >
          <div className="visits__card-summary-main">
            <div className="visits__card-summary-top">
              <h3 className="visits__name">{item.name}</h3>
              {isScheduled ? (
                <span className="visits__scheduled-pill">
                  {APP_STRINGS.visits.scheduledLabel}
                </span>
              ) : (
                <span className="visits__scheduled-pill visits__scheduled-pill--muted">
                  {APP_STRINGS.visits.unscheduledLabel}
                </span>
              )}
            </div>
            <div className="visits__channel-badges">
              {showCall && hasCall && (
                <span className="visits__channel-badge visits__channel-badge--call">
                  {APP_STRINGS.visits.badgeCall}
                  <span className="visits__channel-badge-when">
                    {formatCallDateTime(item.call_date, item.call_time)}
                  </span>
                </span>
              )}
              {showVisit && hasVisit && (
                <span className="visits__channel-badge visits__channel-badge--visit">
                  {APP_STRINGS.visits.badgeVisit}
                  <span className="visits__channel-badge-when">
                    {formatCallDateTime(item.visit_date, item.visit_time)}
                  </span>
                </span>
              )}
              {showCall && !hasCall && filterChannel === 'call' && (
                <span className="visits__channel-badge visits__channel-badge--empty">
                  {APP_STRINGS.visits.badgeCall}: {APP_STRINGS.visits.noCallDate}
                </span>
              )}
              {showVisit && !hasVisit && filterChannel === 'visit' && (
                <span className="visits__channel-badge visits__channel-badge--empty">
                  {APP_STRINGS.visits.badgeVisit}: {APP_STRINGS.visits.noVisitDate}
                </span>
              )}
              {filterChannel === 'all' && !hasCall && !hasVisit && (
                <span className="visits__channel-badge visits__channel-badge--empty">
                  {APP_STRINGS.visits.unscheduledLabel}
                </span>
              )}
            </div>
          </div>
          <span className="visits__card-chevron" aria-hidden="true">
            {expanded ? '▾' : '▸'}
          </span>
          <span className="visits__sr-only">
            {expanded
              ? APP_STRINGS.visits.collapseCard
              : APP_STRINGS.visits.expandCard}
          </span>
        </button>

        {expanded && (
          <div
            id={`visits-detail-${item.place_id}`}
            className="visits__card-detail"
          >
            <div className="visits__card-main">
              <div className="visits__card-top">
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

              {showCall && (
                <div className="visits__date-row">
                  <div className="visits__datetime-fields">
                    <label className="visits__date-field">
                      <span>{APP_STRINGS.visits.callDateLabel}</span>
                      <input
                        type="date"
                        value={callDraft}
                        onChange={(e) =>
                          setDraftCallDates((prev) => ({
                            ...prev,
                            [item.place_id]: e.target.value,
                          }))
                        }
                        disabled={callBusy}
                      />
                    </label>
                    <label className="visits__date-field">
                      <span>{APP_STRINGS.visits.callTimeLabel}</span>
                      <select
                        value={callTimeDraft}
                        onChange={(e) =>
                          setDraftCallTimes((prev) => ({
                            ...prev,
                            [item.place_id]: e.target.value,
                          }))
                        }
                        disabled={callBusy}
                      >
                        {!timeOptions.includes(callTimeDraft) && (
                          <option value="">
                            {APP_STRINGS.visits.callTimePlaceholder}
                          </option>
                        )}
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="visits__date-meta">
                    <span className="visits__date-hint">
                      {item.call_date
                        ? formatCallDateTime(item.call_date, item.call_time)
                        : APP_STRINGS.visits.noCallDate}
                    </span>
                    {callDirty && (
                      <button
                        type="button"
                        className="visits__date-save"
                        onClick={() => handleSaveCallDate(item)}
                        disabled={callBusy || !callDraft || !callTimeDraft}
                      >
                        {callBusy
                          ? APP_STRINGS.business.savingVisit
                          : APP_STRINGS.visits.saveDate}
                      </button>
                    )}
                    {!!item.call_date && (
                      <button
                        type="button"
                        className="visits__date-save"
                        onClick={() => handleClearCallDate(item)}
                        disabled={callBusy}
                      >
                        {APP_STRINGS.visits.clearDate}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {showVisit && (
                <div className="visits__date-row">
                  <div className="visits__datetime-fields">
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
                    <label className="visits__date-field">
                      <span>{APP_STRINGS.visits.visitTimeLabel}</span>
                      <select
                        value={visitTimeDraft}
                        onChange={(e) =>
                          setDraftVisitTimes((prev) => ({
                            ...prev,
                            [item.place_id]: e.target.value,
                          }))
                        }
                        disabled={dateBusy}
                      >
                        {!timeOptions.includes(visitTimeDraft) && (
                          <option value="">
                            {APP_STRINGS.visits.visitTimePlaceholder}
                          </option>
                        )}
                        {timeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="visits__date-meta">
                    <span className="visits__date-hint">
                      {item.visit_date
                        ? formatCallDateTime(item.visit_date, item.visit_time)
                        : APP_STRINGS.visits.noVisitDate}
                    </span>
                    {dirty && (
                      <button
                        type="button"
                        className="visits__date-save"
                        onClick={() => handleSaveVisitDate(item)}
                        disabled={dateBusy || !draft || !visitTimeDraft}
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
              )}
            </div>

            {showVisit && (
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
            )}
          </div>
        )}
      </li>
    )
  }

  const emptyForChannel =
    filterChannel === 'visit'
      ? APP_STRINGS.visits.emptyVisit
      : filterChannel === 'call'
        ? APP_STRINGS.visits.emptyCall
        : APP_STRINGS.visits.empty

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

      <div className="visits__subtabs" role="tablist" aria-label="Tipo de cita">
        <button
          type="button"
          role="tab"
          aria-selected={filterChannel === 'all'}
          className={`visits__subtab${filterChannel === 'all' ? ' visits__subtab--active' : ''}`}
          onClick={() => setFilterChannel('all')}
        >
          {APP_STRINGS.visits.tabAll}
          <span className="visits__subtab-count">{channelCounts.all}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterChannel === 'visit'}
          className={`visits__subtab${filterChannel === 'visit' ? ' visits__subtab--active' : ''}`}
          onClick={() => setFilterChannel('visit')}
        >
          {APP_STRINGS.visits.tabVisit}
          <span className="visits__subtab-count">{channelCounts.visit}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filterChannel === 'call'}
          className={`visits__subtab${filterChannel === 'call' ? ' visits__subtab--active' : ''}`}
          onClick={() => setFilterChannel('call')}
        >
          {APP_STRINGS.visits.tabCall}
          <span className="visits__subtab-count">{channelCounts.call}</span>
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

      {!loading && !error && sortedItems.length === 0 && !resolvedDateFilter && (
        <p className="visits__empty">{emptyForChannel}</p>
      )}

      {!loading && !error && sortedItems.length === 0 && !!resolvedDateFilter && (
        <p className="visits__empty">{APP_STRINGS.visits.filterChannelEmpty}</p>
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
