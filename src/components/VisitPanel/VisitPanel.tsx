import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import {
  deleteVisit,
  fetchBusinessVisitors,
  upsertVisit,
} from '../../services/api'
import type { GlobalVisitor, Visit } from '../../types/api'
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
  const [visitResult, setVisitResult] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showVisitors, setShowVisitors] = useState(false)
  const [visitors, setVisitors] = useState<GlobalVisitor[]>([])
  const [visitorsLoading, setVisitorsLoading] = useState(false)
  const [visitorsError, setVisitorsError] = useState('')

  useEffect(() => {
    if (!showVisitors) {
      setVisitors([])
      setVisitorsError('')
      return
    }
    const ac = new AbortController()
    setVisitorsLoading(true)
    setVisitorsError('')
    fetchBusinessVisitors(target.place_id, ac.signal)
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
  }, [showVisitors, target.place_id])

  function openForm() {
    setEditing(true)
    setNotes(visit?.notes ?? '')
    setVisitResult(visit?.visit_result ?? '')
    setError('')
    setShowVisitors(false)
  }

  async function handleSave() {
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

  return (
    <div className="visit-panel">
      {visit?.visited && !editing && (
        <div className="visit-panel__summary">
          {visit.visit_result && (
            <p className="visit-panel__line">
              <strong>{APP_STRINGS.business.resultLabel}:</strong>{' '}
              {visit.visit_result}
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
          <label className="visit-panel__field">
            <span>{APP_STRINGS.business.resultLabel}</span>
            <input
              type="text"
              value={visitResult}
              placeholder={APP_STRINGS.business.resultPlaceholder}
              onChange={(e) => setVisitResult(e.target.value)}
              disabled={saving}
            />
          </label>
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
  )
}

export default VisitPanel
