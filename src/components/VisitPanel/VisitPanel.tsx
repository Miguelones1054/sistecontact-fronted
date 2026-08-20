import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import {
  deleteVisit,
  fetchBusinessScheduled,
  fetchBusinessVisitors,
  upsertVisit,
} from '../../services/api'
import type { GlobalScheduledVisit, GlobalVisitor, Visit } from '../../types/api'
import { formatVisitDate } from '../../utils/dates'
import {
  CONTACT_OUTCOME_OPTIONS,
  contactOutcomeLabel,
  normalizeContactOutcome,
  type ContactOutcome,
} from '../ContactStatusSelect/ContactStatusSelect'
import './VisitPanel.css'

export interface VisitTarget {
  place_id: string
  name: string
  address: string
  phone?: string
  rating?: number
  user_rating_count?: number
  google_maps_uri?: string
  latitude?: number
  longitude?: number
  open_now?: boolean | null
}

interface Props {
  target: VisitTarget
  visit?: Visit | null
  onVisitSaved?: (visit: Visit) => void
  onVisitRemoved?: (placeId: string) => void
  extraActions?: React.ReactNode
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

function VisitPanel({
  target,
  visit,
  onVisitSaved,
  onVisitRemoved,
  extraActions,
}: Props) {
  const { user } = useAuth()
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState('')
  const [visitResult, setVisitResult] = useState<ContactOutcome | ''>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showVisitors, setShowVisitors] = useState(false)
  const [visitors, setVisitors] = useState<GlobalVisitor[]>([])
  const [scheduled, setScheduled] = useState<GlobalScheduledVisit[]>([])
  const [visitorsLoading, setVisitorsLoading] = useState(false)
  const [visitorsError, setVisitorsError] = useState('')
  const [scheduledError, setScheduledError] = useState('')

  useEffect(() => {
    if (!showVisitors) {
      setVisitors([])
      setScheduled([])
      setVisitorsError('')
      setScheduledError('')
      return
    }
    const ac = new AbortController()
    setVisitorsLoading(true)
    setVisitorsError('')
    setScheduledError('')
    Promise.all([
      fetchBusinessVisitors(target.place_id, ac.signal),
      fetchBusinessScheduled(target.place_id, ac.signal),
    ])
      .then(([visitorItems, scheduledItems]) => {
        setVisitors(visitorItems)
        setScheduled(scheduledItems)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setVisitorsError(
            err instanceof Error
              ? err.message
              : APP_STRINGS.business.whoVisitedError,
          )
          setScheduledError(APP_STRINGS.business.whoScheduledError)
        }
      })
      .finally(() => setVisitorsLoading(false))
    return () => ac.abort()
  }, [showVisitors, target.place_id])

  function openForm() {
    setEditing(true)
    setNotes(visit?.notes ?? '')
    setVisitResult(normalizeContactOutcome(visit?.visit_result, null))
    setError('')
    setShowVisitors(false)
  }

  async function handleSave() {
    if (!visitResult) {
      setError(APP_STRINGS.business.resultRequired)
      return
    }
    setSaving(true)
    setError('')
    try {
      const saved = await upsertVisit(target.place_id, {
        name: target.name,
        address: target.address,
        notes,
        visit_result: visitResult,
        phone: target.phone ?? visit?.phone,
        rating: target.rating ?? visit?.rating,
        user_rating_count: target.user_rating_count ?? visit?.user_rating_count,
        google_maps_uri: target.google_maps_uri ?? visit?.google_maps_uri,
        latitude: target.latitude ?? visit?.latitude,
        longitude: target.longitude ?? visit?.longitude,
        open_now: target.open_now ?? visit?.open_now,
      })
      setEditing(false)
      onVisitSaved?.(saved)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.visitError,
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleUnmark() {
    setSaving(true)
    setError('')
    try {
      await deleteVisit(target.place_id)
      setEditing(false)
      onVisitRemoved?.(target.place_id)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : APP_STRINGS.business.visitError,
      )
    } finally {
      setSaving(false)
    }
  }

  const savedResultLabel = contactOutcomeLabel(visit?.visit_result)

  return (
    <div className="visit-panel">
      {visit?.visited && !editing && (
        <div className="visit-panel__summary">
          {savedResultLabel && (
            <p className="visit-panel__line">
              <strong>{APP_STRINGS.business.resultLabel}:</strong>{' '}
              {savedResultLabel}
            </p>
          )}
          {visit.notes && (
            <p className="visit-panel__line">
              <strong>{APP_STRINGS.business.notesLabel}:</strong> {visit.notes}
            </p>
          )}
        </div>
      )}

      {!editing ? (
        <div className="visit-panel__actions">
          <button type="button" className="visit-panel__btn" onClick={openForm}>
            {visit?.visited
              ? APP_STRINGS.business.editVisit
              : APP_STRINGS.business.markVisited}
          </button>
          <button
            type="button"
            className="visit-panel__btn"
            onClick={() => setShowVisitors((v) => !v)}
          >
            {APP_STRINGS.business.whoVisited}
          </button>
          {visit?.visited && (
            <button
              type="button"
              className="visit-panel__btn visit-panel__btn--muted"
              onClick={handleUnmark}
              disabled={saving}
            >
              {APP_STRINGS.business.unmarkVisited}
            </button>
          )}
          {extraActions}
        </div>
      ) : (
        <div className="visit-panel__form">
          <fieldset className="visit-panel__outcome" disabled={saving}>
            <legend>{APP_STRINGS.business.resultLabel}</legend>
            {CONTACT_OUTCOME_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`visit-panel__outcome-opt ${opt.className}`}
              >
                <input
                  type="radio"
                  name={`visit-outcome-${target.place_id}`}
                  value={opt.value}
                  checked={visitResult === opt.value}
                  onChange={() => setVisitResult(opt.value)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
          <label className="visit-panel__field">
            <span>{APP_STRINGS.business.notesLabel}</span>
            <textarea
              rows={3}
              value={notes}
              placeholder={APP_STRINGS.business.notesPlaceholder}
              onChange={(e) => setNotes(e.target.value)}
              disabled={saving}
            />
          </label>
          {error && <p className="visit-panel__error">{error}</p>}
          <div className="visit-panel__actions">
            <button
              type="button"
              className="visit-panel__btn visit-panel__btn--primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving
                ? APP_STRINGS.business.savingVisit
                : APP_STRINGS.business.saveVisit}
            </button>
            <button
              type="button"
              className="visit-panel__btn visit-panel__btn--muted"
              onClick={() => {
                setEditing(false)
                setError('')
              }}
              disabled={saving}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && !editing && <p className="visit-panel__error">{error}</p>}

      {showVisitors && (
        <div className="visit-panel__visitors">
          <h4 className="visit-panel__visitors-title">
            {APP_STRINGS.business.whoScheduledTitle}
          </h4>
          {visitorsLoading && (
            <p className="visit-panel__hint">
              {APP_STRINGS.business.whoScheduledLoading}
            </p>
          )}
          {scheduledError && (
            <p className="visit-panel__error">{scheduledError}</p>
          )}
          {!visitorsLoading && !scheduledError && scheduled.length === 0 && (
            <p className="visit-panel__hint">
              {APP_STRINGS.business.whoScheduledEmpty}
            </p>
          )}
          {!visitorsLoading && scheduled.length > 0 && (
            <ul className="visit-panel__visitors-list">
              {scheduled.map((s) => {
                const isYou = user?.uid === s.uid
                const label = s.display_name || s.email || s.uid
                return (
                  <li key={s.uid} className="visit-panel__visitor">
                    <div className="visit-panel__visitor-main">
                      <span className="visit-panel__visitor-name">
                        {label}
                        {isYou ? ` (${APP_STRINGS.business.youLabel})` : ''}
                      </span>
                      {s.email &&
                        s.display_name &&
                        s.display_name !== s.email && (
                          <span className="visit-panel__visitor-email">
                            {s.email}
                          </span>
                        )}
                    </div>
                    <div className="visit-panel__visitor-meta">
                      {s.visit_date && (
                        <span>
                          {APP_STRINGS.business.whoScheduledDate}:{' '}
                          {formatVisitDate(s.visit_date)}
                          {s.visit_time ? ` ${s.visit_time}` : ''}
                        </span>
                      )}
                      {s.call_date && (
                        <span>
                          {APP_STRINGS.business.whoScheduledCall}:{' '}
                          {formatVisitDate(s.call_date)}
                          {s.call_time ? ` ${s.call_time}` : ''}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          <h4 className="visit-panel__visitors-title visit-panel__visitors-title--spaced">
            {APP_STRINGS.business.whoVisitedTitle}
          </h4>
          {visitorsLoading && (
            <p className="visit-panel__hint">
              {APP_STRINGS.business.whoVisitedLoading}
            </p>
          )}
          {visitorsError && (
            <p className="visit-panel__error">{visitorsError}</p>
          )}
          {!visitorsLoading && !visitorsError && visitors.length === 0 && (
            <p className="visit-panel__hint">
              {APP_STRINGS.business.whoVisitedEmpty}
            </p>
          )}
          {!visitorsLoading && visitors.length > 0 && (
            <ul className="visit-panel__visitors-list">
              {visitors.map((v) => {
                const isYou = user?.uid === v.uid
                const label = v.display_name || v.email || v.uid
                return (
                  <li key={v.uid} className="visit-panel__visitor">
                    <div className="visit-panel__visitor-main">
                      <span className="visit-panel__visitor-name">
                        {label}
                        {isYou ? ` (${APP_STRINGS.business.youLabel})` : ''}
                      </span>
                      {v.email &&
                        v.display_name &&
                        v.display_name !== v.email && (
                          <span className="visit-panel__visitor-email">
                            {v.email}
                          </span>
                        )}
                    </div>
                    <div className="visit-panel__visitor-meta">
                      {(v.visit_result || v.contact_outcome) && (
                        <span>
                          {APP_STRINGS.business.whoVisitedResult}:{' '}
                          {contactOutcomeLabel(
                            v.visit_result || v.contact_outcome,
                          )}
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
  )
}

export default VisitPanel
