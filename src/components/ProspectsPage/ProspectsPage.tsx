import { useEffect, useMemo, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import { useSchedulingSettings } from '../../context/SchedulingSettingsContext'
import {
  deleteProspect,
  fetchProspectsList,
  upsertContactStatus,
  upsertProspect,
} from '../../services/api'
import type { Prospect } from '../../types/api'
import { todayISODate } from '../../utils/dates'
import {
  buildTimeOptionsFromInterval,
  defaultTimeForInterval,
  formatCallDateTime,
} from '../../utils/callTimes'
import { exportProspectsPdf } from '../../utils/exportPdf'
import { exportProspectsXlsx } from '../../utils/exportXlsx'
import ContactStatusSelect, {
  CONTACT_OUTCOME_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  CONTACT_STATUS_ORDER,
  type ContactOutcome,
  type ContactStatus,
  contactOutcomeLabel,
  normalizeContactOutcome,
  normalizeContactStatus,
} from '../ContactStatusSelect/ContactStatusSelect'
import './ProspectsPage.css'

type StatusFilter = ContactStatus | ContactOutcome | 'all'

function sortProspects(a: Prospect, b: Prospect): number {
  const oa = CONTACT_STATUS_ORDER[normalizeContactStatus(a.contact_status)]
  const ob = CONTACT_STATUS_ORDER[normalizeContactStatus(b.contact_status)]
  if (oa !== ob) return oa - ob
  const outA = normalizeContactOutcome(a.contact_outcome, a.contact_status)
  const outB = normalizeContactOutcome(b.contact_outcome, b.contact_status)
  if (outA !== outB) return outA.localeCompare(outB)
  return a.name.localeCompare(b.name, 'es')
}

function matchesFilter(item: Prospect, filter: StatusFilter): boolean {
  const status = normalizeContactStatus(item.contact_status)
  const outcome = normalizeContactOutcome(item.contact_outcome, item.contact_status)
  if (filter === 'all') return true
  if (filter === 'not_contacted' || filter === 'contacted') return status === filter
  return outcome === filter
}

function ProspectsPage() {
  const { intervalMinutes } = useSchedulingSettings()
  const timeOptions = useMemo(
    () => buildTimeOptionsFromInterval(intervalMinutes),
    [intervalMinutes],
  )
  const defaultTime = useMemo(
    () => defaultTimeForInterval(intervalMinutes),
    [intervalMinutes],
  )
  const [items, setItems] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null)
  const [dateBusyId, setDateBusyId] = useState<string | null>(null)
  const [callBusyId, setCallBusyId] = useState<string | null>(null)
  const [draftDates, setDraftDates] = useState<Record<string, string>>({})
  const [draftVisitTimes, setDraftVisitTimes] = useState<Record<string, string>>(
    {},
  )
  const [draftCallDates, setDraftCallDates] = useState<Record<string, string>>({})
  const [draftCallTimes, setDraftCallTimes] = useState<Record<string, string>>({})
  const [draftOutcomes, setDraftOutcomes] = useState<Record<string, ContactOutcome | ''>>({})
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [pendingContactIds, setPendingContactIds] = useState<Set<string>>(
    () => new Set(),
  )
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')

  function load() {
    setLoading(true)
    setError('')
    fetchProspectsList()
      .then((list) => {
        setItems(list)
        const dates: Record<string, string> = {}
        const visitTimes: Record<string, string> = {}
        const callDates: Record<string, string> = {}
        const callTimes: Record<string, string> = {}
        const outcomes: Record<string, ContactOutcome | ''> = {}
        const notes: Record<string, string> = {}
        for (const item of list) {
          dates[item.place_id] = item.visit_date ?? todayISODate()
          visitTimes[item.place_id] = item.visit_time ?? defaultTime
          callDates[item.place_id] = item.call_date ?? todayISODate()
          callTimes[item.place_id] = item.call_time ?? defaultTime
          outcomes[item.place_id] = normalizeContactOutcome(
            item.contact_outcome,
            item.contact_status,
          )
          notes[item.place_id] = item.contact_notes ?? ''
        }
        setDraftDates(dates)
        setDraftVisitTimes(visitTimes)
        setDraftCallDates(callDates)
        setDraftCallTimes(callTimes)
        setDraftOutcomes(outcomes)
        setDraftNotes(notes)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : APP_STRINGS.prospects.error)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [defaultTime])

  const sortedItems = useMemo(() => {
    return items.filter((i) => matchesFilter(i, filterStatus)).sort(sortProspects)
  }, [items, filterStatus])

  async function handleRemove(placeId: string) {
    setRemovingId(placeId)
    try {
      await deleteProspect(placeId)
      setItems((prev) => prev.filter((i) => i.place_id !== placeId))
      setDraftDates((prev) => {
        const next = { ...prev }
        delete next[placeId]
        return next
      })
      setDraftOutcomes((prev) => {
        const next = { ...prev }
        delete next[placeId]
        return next
      })
      setDraftNotes((prev) => {
        const next = { ...prev }
        delete next[placeId]
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : APP_STRINGS.prospects.error)
    } finally {
      setRemovingId(null)
    }
  }

  async function handleContactStatus(item: Prospect, status: ContactStatus) {
    setError('')
    if (status === 'contacted') {
      setPendingContactIds((prev) => new Set(prev).add(item.place_id))
      setDraftOutcomes((prev) => ({
        ...prev,
        [item.place_id]:
          prev[item.place_id] ||
          normalizeContactOutcome(item.contact_outcome, item.contact_status),
      }))
      setDraftNotes((prev) => ({
        ...prev,
        [item.place_id]: prev[item.place_id] ?? item.contact_notes ?? '',
      }))
      return
    }

    setPendingContactIds((prev) => {
      const next = new Set(prev)
      next.delete(item.place_id)
      return next
    })
    setStatusBusyId(item.place_id)
    try {
      await upsertContactStatus(item.place_id, {
        name: item.name,
        address: item.address,
        contact_status: 'not_contacted',
        contact_outcome: '',
        contact_notes: '',
      })
      setItems((prev) =>
        prev.map((i) =>
          i.place_id === item.place_id
            ? { ...i, contact_status: 'not_contacted', contact_outcome: '', contact_notes: '' }
            : i,
        ),
      )
      setDraftOutcomes((prev) => ({ ...prev, [item.place_id]: '' }))
      setDraftNotes((prev) => ({ ...prev, [item.place_id]: '' }))
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.statusError,
      )
    } finally {
      setStatusBusyId(null)
    }
  }

  async function handleSaveContact(item: Prospect) {
    const outcome = draftOutcomes[item.place_id] ?? ''
    if (!outcome) {
      setError(APP_STRINGS.prospects.outcomeRequired)
      return
    }
    const notes = (draftNotes[item.place_id] ?? '').trim()
    setStatusBusyId(item.place_id)
    setError('')
    try {
      await upsertContactStatus(item.place_id, {
        name: item.name,
        address: item.address,
        contact_status: 'contacted',
        contact_outcome: outcome,
        contact_notes: notes,
      })
      setPendingContactIds((prev) => {
        const next = new Set(prev)
        next.delete(item.place_id)
        return next
      })
      setItems((prev) =>
        prev.map((i) =>
          i.place_id === item.place_id
            ? {
                ...i,
                contact_status: 'contacted',
                contact_outcome: outcome,
                contact_notes: notes,
              }
            : i,
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
        prev.map((i) => (i.place_id === item.place_id ? { ...i, ...updated } : i)),
      )
      setDraftDates((prev) => ({
        ...prev,
        [item.place_id]: todayISODate(),
      }))
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
        prev.map((i) => (i.place_id === item.place_id ? { ...i, ...updated } : i)),
      )
      setDraftCallDates((prev) => ({
        ...prev,
        [item.place_id]: todayISODate(),
      }))
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

  return (
    <div className="prospects">
      <div className="prospects__header">
        <div>
          <h2 className="prospects__title">{APP_STRINGS.prospects.title}</h2>
          <p className="prospects__subtitle">{APP_STRINGS.prospects.subtitle}</p>
        </div>
        <div className="prospects__export-group">
          <button
            type="button"
            className="prospects__export"
            onClick={() => exportProspectsXlsx(sortedItems)}
            disabled={loading || sortedItems.length === 0}
          >
            {APP_STRINGS.export.xlsx}
          </button>
          <button
            type="button"
            className="prospects__export prospects__export--pdf"
            onClick={() => exportProspectsPdf(sortedItems)}
            disabled={loading || sortedItems.length === 0}
          >
            {APP_STRINGS.export.pdf}
          </button>
        </div>
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
        {CONTACT_OUTCOME_OPTIONS.map((opt) => (
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
          {sortedItems.map((item) => {
            const draft = draftDates[item.place_id] ?? item.visit_date ?? todayISODate()
            const visitTimeDraft =
              draftVisitTimes[item.place_id] ?? item.visit_time ?? defaultTime
            const dirty =
              draft !== (item.visit_date ?? '') ||
              visitTimeDraft !== (item.visit_time ?? '')
            const dateBusy = dateBusyId === item.place_id
            const callDraft =
              draftCallDates[item.place_id] ?? item.call_date ?? todayISODate()
            const callTimeDraft =
              draftCallTimes[item.place_id] ?? item.call_time ?? defaultTime
            const callDirty =
              callDraft !== (item.call_date ?? '') ||
              callTimeDraft !== (item.call_time ?? '')
            const callBusy = callBusyId === item.place_id
            const isContacted =
              normalizeContactStatus(item.contact_status) === 'contacted' ||
              pendingContactIds.has(item.place_id)
            const draftOutcome =
              draftOutcomes[item.place_id] ??
              normalizeContactOutcome(item.contact_outcome, item.contact_status)
            const draftNote = draftNotes[item.place_id] ?? item.contact_notes ?? ''
            const savedOutcome = normalizeContactOutcome(
              item.contact_outcome,
              item.contact_status,
            )
            const contactDirty =
              draftOutcome !== savedOutcome ||
              draftNote !== (item.contact_notes ?? '')
            const statusBusy = statusBusyId === item.place_id
            const hasCall = !!item.call_date
            const hasVisit = !!item.visit_date
            const isScheduled = hasCall || hasVisit

            return (
              <li
                key={item.place_id}
                className={`prospects__card${isScheduled ? ' prospects__card--scheduled' : ''}`}
              >
                <div className="prospects__card-main">
                  <div className="prospects__card-top">
                    <h3 className="prospects__name">{item.name}</h3>
                    <ContactStatusSelect
                      value={isContacted ? 'contacted' : item.contact_status}
                      disabled={statusBusy}
                      onChange={(status) => handleContactStatus(item, status)}
                    />
                  </div>
                  {isScheduled && (
                    <div className="prospects__schedule-badges">
                      {hasCall && (
                        <span className="prospects__schedule-badge prospects__schedule-badge--call">
                          {APP_STRINGS.prospects.badgeCall}
                          <span className="prospects__schedule-badge-when">
                            {formatCallDateTime(item.call_date, item.call_time)}
                          </span>
                        </span>
                      )}
                      {hasVisit && (
                        <span className="prospects__schedule-badge prospects__schedule-badge--visit">
                          {APP_STRINGS.prospects.badgeVisit}
                          <span className="prospects__schedule-badge-when">
                            {formatCallDateTime(item.visit_date, item.visit_time)}
                          </span>
                        </span>
                      )}
                      <span className="prospects__scheduled-pill">
                        {APP_STRINGS.prospects.scheduledLabel}
                      </span>
                    </div>
                  )}
                  {isContacted && savedOutcome && !contactDirty && (
                    <p className="prospects__outcome-summary">
                      {contactOutcomeLabel(savedOutcome)}
                    </p>
                  )}
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

                  {isContacted && (
                    <div className="prospects__contact-form">
                      <fieldset className="prospects__outcome" disabled={statusBusy}>
                        <legend>{APP_STRINGS.prospects.outcomeLabel}</legend>
                        {CONTACT_OUTCOME_OPTIONS.map((opt) => (
                          <label key={opt.value} className={`prospects__outcome-opt ${opt.className}`}>
                            <input
                              type="radio"
                              name={`outcome-${item.place_id}`}
                              value={opt.value}
                              checked={draftOutcome === opt.value}
                              onChange={() =>
                                setDraftOutcomes((prev) => ({
                                  ...prev,
                                  [item.place_id]: opt.value,
                                }))
                              }
                            />
                            {opt.label}
                          </label>
                        ))}
                      </fieldset>
                      <label className="prospects__notes-field">
                        <span>{APP_STRINGS.prospects.notesLabel}</span>
                        <textarea
                          rows={3}
                          value={draftNote}
                          placeholder={APP_STRINGS.prospects.notesPlaceholder}
                          disabled={statusBusy}
                          onChange={(e) =>
                            setDraftNotes((prev) => ({
                              ...prev,
                              [item.place_id]: e.target.value,
                            }))
                          }
                        />
                      </label>
                      {(contactDirty || !savedOutcome) && (
                        <button
                          type="button"
                          className="prospects__date-save"
                          onClick={() => handleSaveContact(item)}
                          disabled={statusBusy || !draftOutcome}
                        >
                          {statusBusy
                            ? APP_STRINGS.business.savingVisit
                            : APP_STRINGS.prospects.saveContact}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="prospects__schedule">
                    <div
                      className={`prospects__date-row${hasCall ? ' prospects__date-row--scheduled' : ''}`}
                    >
                      <div className="prospects__datetime-fields">
                        <label className="prospects__date-field">
                          <span>{APP_STRINGS.prospects.callDateLabel}</span>
                          <input
                            type="date"
                            value={callDraft}
                            min={todayISODate()}
                            onChange={(e) =>
                              setDraftCallDates((prev) => ({
                                ...prev,
                                [item.place_id]: e.target.value,
                              }))
                            }
                            disabled={callBusy}
                          />
                        </label>
                        <label className="prospects__date-field">
                          <span>{APP_STRINGS.prospects.callTimeLabel}</span>
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
                                {APP_STRINGS.prospects.callTimePlaceholder}
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
                      <div className="prospects__date-meta">
                        <span className="prospects__date-hint">
                          {item.call_date
                            ? formatCallDateTime(item.call_date, item.call_time)
                            : APP_STRINGS.prospects.noCallDate}
                        </span>
                        {(callDirty || !item.call_date) && (
                          <button
                            type="button"
                            className="prospects__date-save"
                            onClick={() => handleSaveCallDate(item)}
                            disabled={callBusy || !callDraft || !callTimeDraft}
                          >
                            {callBusy
                              ? APP_STRINGS.business.savingVisit
                              : APP_STRINGS.prospects.saveDate}
                          </button>
                        )}
                        {!!item.call_date && (
                          <button
                            type="button"
                            className="prospects__date-save"
                            onClick={() => handleClearCallDate(item)}
                            disabled={callBusy}
                          >
                            {APP_STRINGS.prospects.clearDate}
                          </button>
                        )}
                      </div>
                    </div>

                    <div
                      className={`prospects__date-row${hasVisit ? ' prospects__date-row--scheduled' : ''}`}
                    >
                      <div className="prospects__datetime-fields">
                        <label className="prospects__date-field">
                          <span>{APP_STRINGS.prospects.visitDateLabel}</span>
                          <input
                            type="date"
                            value={draft}
                            min={todayISODate()}
                            onChange={(e) =>
                              setDraftDates((prev) => ({
                                ...prev,
                                [item.place_id]: e.target.value,
                              }))
                            }
                            disabled={dateBusy}
                          />
                        </label>
                        <label className="prospects__date-field">
                          <span>{APP_STRINGS.prospects.visitTimeLabel}</span>
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
                                {APP_STRINGS.prospects.visitTimePlaceholder}
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
                      <div className="prospects__date-meta">
                        <span className="prospects__date-hint">
                          {item.visit_date
                            ? formatCallDateTime(item.visit_date, item.visit_time)
                            : APP_STRINGS.prospects.noVisitDate}
                        </span>
                        {(dirty || !item.visit_date) && (
                          <button
                            type="button"
                            className="prospects__date-save"
                            onClick={() => handleSaveVisitDate(item)}
                            disabled={dateBusy || !draft || !visitTimeDraft}
                          >
                            {dateBusy
                              ? APP_STRINGS.business.savingVisit
                              : APP_STRINGS.prospects.saveDate}
                          </button>
                        )}
                        {!!item.visit_date && (
                          <button
                            type="button"
                            className="prospects__date-save"
                            onClick={() => handleClearVisitDate(item)}
                            disabled={dateBusy}
                          >
                            {APP_STRINGS.prospects.clearDate}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
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
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default ProspectsPage
