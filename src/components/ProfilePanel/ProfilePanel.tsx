import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { APP_STRINGS } from '../../constants/strings'
import {
  disconnectGoogleCalendar,
  fetchGoogleCalendarConnectURL,
  fetchGoogleCalendarStatus,
  fetchProspectsList,
  fetchVisits,
} from '../../services/api'
import type { GoogleCalendarStatus, Prospect, Visit } from '../../types/api'
import {
  CONTACT_OUTCOME_OPTIONS,
  CONTACT_STATUS_OPTIONS,
  type ContactOutcome,
  normalizeContactOutcome,
  normalizeContactStatus,
} from '../ContactStatusSelect/ContactStatusSelect'
import './ProfilePanel.css'

interface Props {
  open: boolean
  onClose: () => void
  calendarFlash?: 'connected' | 'error' | null
  onCalendarFlashConsumed?: () => void
}

interface BarItem {
  key: string
  label: string
  value: number
  color: string
}

const OUTCOME_COLORS: Record<ContactOutcome, string> = {
  closed_sale: '#805ad5',
  not_interested: '#e53e3e',
  affiliated: '#38a169',
}

const STATUS_COLORS = {
  not_contacted: '#a0aec0',
  contacted: '#3182ce',
} as const

function StatBarChart({ title, items, emptyLabel }: {
  title: string
  items: BarItem[]
  emptyLabel: string
}) {
  const max = Math.max(0, ...items.map((i) => i.value))
  const total = items.reduce((sum, i) => sum + i.value, 0)

  return (
    <section className="profile-panel__chart">
      <h3 className="profile-panel__chart-title">{title}</h3>
      {total === 0 ? (
        <p className="profile-panel__chart-empty">{emptyLabel}</p>
      ) : (
        <ul className="profile-panel__bars">
          {items.map((item) => {
            const pct = max > 0 ? (item.value / max) * 100 : 0
            const share = total > 0 ? Math.round((item.value / total) * 100) : 0
            return (
              <li key={item.key} className="profile-panel__bar-row">
                <div className="profile-panel__bar-meta">
                  <span className="profile-panel__bar-label">{item.label}</span>
                  <span className="profile-panel__bar-value">
                    {item.value} ({share}%)
                  </span>
                </div>
                <div className="profile-panel__bar-track" aria-hidden="true">
                  <div
                    className="profile-panel__bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: item.color,
                    }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function computeProspectStats(prospects: Prospect[]) {
  let contacted = 0
  let notContacted = 0
  const outcomes: Record<ContactOutcome, number> = {
    closed_sale: 0,
    not_interested: 0,
    affiliated: 0,
  }

  for (const p of prospects) {
    const status = normalizeContactStatus(p.contact_status)
    if (status === 'contacted') contacted += 1
    else notContacted += 1

    const outcome = normalizeContactOutcome(p.contact_outcome, p.contact_status)
    if (outcome) outcomes[outcome] += 1
  }

  return {
    total: prospects.length,
    contacted,
    notContacted,
    outcomes,
  }
}

function computeVisitStats(visits: Visit[]) {
  const outcomes: Record<ContactOutcome, number> = {
    closed_sale: 0,
    not_interested: 0,
    affiliated: 0,
  }
  let withOutcome = 0

  for (const v of visits) {
    const outcome = normalizeContactOutcome(v.visit_result, null)
    if (outcome) {
      outcomes[outcome] += 1
      withOutcome += 1
    }
  }

  return {
    total: visits.length,
    withOutcome,
    outcomes,
  }
}

function ProfilePanel({
  open,
  onClose,
  calendarFlash = null,
  onCalendarFlashConsumed,
}: Props) {
  const { user } = useAuth()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [calendar, setCalendar] = useState<GoogleCalendarStatus | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [calendarError, setCalendarError] = useState('')
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [flash, setFlash] = useState<'connected' | 'error' | null>(null)

  useEffect(() => {
    if (!open) return
    const ac = new AbortController()
    setLoading(true)
    setError('')
    Promise.all([
      fetchProspectsList(ac.signal),
      fetchVisits([], ac.signal),
    ])
      .then(([nextProspects, nextVisits]) => {
        setProspects(nextProspects)
        setVisits(nextVisits)
      })
      .catch((err) => {
        if (err.name === 'AbortError') return
        setError(
          err instanceof Error ? err.message : APP_STRINGS.profile.error,
        )
      })
      .finally(() => setLoading(false))
    return () => ac.abort()
  }, [open])

  useEffect(() => {
    if (!open) return
    const ac = new AbortController()
    setCalendarLoading(true)
    setCalendarError('')
    fetchGoogleCalendarStatus(ac.signal)
      .then((status) => setCalendar(status))
      .catch((err) => {
        if (err.name === 'AbortError') return
        setCalendarError(
          err instanceof Error
            ? err.message
            : APP_STRINGS.profile.calendarLoadError,
        )
      })
      .finally(() => setCalendarLoading(false))
    return () => ac.abort()
  }, [open])

  useEffect(() => {
    if (!open || !calendarFlash) return
    setFlash(calendarFlash)
    onCalendarFlashConsumed?.()
  }, [open, calendarFlash, onCalendarFlashConsumed])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  async function handleConnectCalendar() {
    setCalendarBusy(true)
    setCalendarError('')
    try {
      const { auth_url: authURL } = await fetchGoogleCalendarConnectURL()
      window.location.assign(authURL)
    } catch (err) {
      setCalendarBusy(false)
      setCalendarError(
        err instanceof Error
          ? err.message
          : APP_STRINGS.profile.calendarConnectError,
      )
    }
  }

  async function handleDisconnectCalendar() {
    setCalendarBusy(true)
    setCalendarError('')
    setFlash(null)
    try {
      await disconnectGoogleCalendar()
      setCalendar((prev) =>
        prev
          ? { ...prev, connected: false, email: undefined, connected_at: undefined }
          : { configured: true, connected: false },
      )
    } catch (err) {
      setCalendarError(
        err instanceof Error
          ? err.message
          : APP_STRINGS.profile.calendarDisconnectError,
      )
    } finally {
      setCalendarBusy(false)
    }
  }

  const prospectStats = useMemo(
    () => computeProspectStats(prospects),
    [prospects],
  )
  const visitStats = useMemo(() => computeVisitStats(visits), [visits])

  const statusBars: BarItem[] = CONTACT_STATUS_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    value:
      opt.value === 'contacted'
        ? prospectStats.contacted
        : prospectStats.notContacted,
    color: STATUS_COLORS[opt.value],
  }))

  const prospectOutcomeBars: BarItem[] = CONTACT_OUTCOME_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    value: prospectStats.outcomes[opt.value],
    color: OUTCOME_COLORS[opt.value],
  }))

  const visitOutcomeBars: BarItem[] = CONTACT_OUTCOME_OPTIONS.map((opt) => ({
    key: opt.value,
    label: opt.label,
    value: visitStats.outcomes[opt.value],
    color: OUTCOME_COLORS[opt.value],
  }))

  if (!open) return null

  const calendarConfigured = calendar?.configured ?? false
  const calendarConnected = calendar?.connected ?? false

  return (
    <div className="profile-panel" role="dialog" aria-modal="true" aria-labelledby="profile-panel-title">
      <button
        type="button"
        className="profile-panel__backdrop"
        aria-label={APP_STRINGS.profile.close}
        onClick={onClose}
      />
      <div className="profile-panel__sheet">
        <header className="profile-panel__header">
          <div>
            <h2 id="profile-panel-title" className="profile-panel__title">
              {APP_STRINGS.profile.title}
            </h2>
            <p className="profile-panel__email">{user?.email ?? ''}</p>
          </div>
          <button
            type="button"
            className="profile-panel__close"
            onClick={onClose}
          >
            {APP_STRINGS.profile.close}
          </button>
        </header>

        <section className="profile-panel__calendar">
          <div className="profile-panel__calendar-head">
            <h3 className="profile-panel__calendar-title">
              {APP_STRINGS.profile.calendarTitle}
            </h3>
            {!calendarLoading && calendarConfigured && (
              <span
                className={`profile-panel__calendar-pill${
                  calendarConnected
                    ? ' profile-panel__calendar-pill--on'
                    : ' profile-panel__calendar-pill--off'
                }`}
              >
                {calendarConnected
                  ? APP_STRINGS.profile.calendarConnected
                  : APP_STRINGS.profile.calendarDisconnected}
              </span>
            )}
          </div>
          <p className="profile-panel__calendar-subtitle">
            {APP_STRINGS.profile.calendarSubtitle}
          </p>

          {flash === 'connected' && (
            <p className="profile-panel__calendar-flash profile-panel__calendar-flash--ok">
              {APP_STRINGS.profile.calendarConnectedFlash}
            </p>
          )}
          {flash === 'error' && (
            <p className="profile-panel__calendar-flash profile-panel__calendar-flash--err">
              {APP_STRINGS.profile.calendarErrorFlash}
            </p>
          )}

          {calendarLoading && (
            <p className="profile-panel__hint">{APP_STRINGS.profile.loading}</p>
          )}
          {calendarError && (
            <p className="profile-panel__error">{calendarError}</p>
          )}

          {!calendarLoading && calendar && !calendarConfigured && (
            <p className="profile-panel__calendar-note">
              {APP_STRINGS.profile.calendarNotConfigured}
            </p>
          )}

          {!calendarLoading && calendarConfigured && calendarConnected && (
            <p className="profile-panel__calendar-account">
              {calendar.email}
            </p>
          )}

          {!calendarLoading && calendarConfigured && (
            <div className="profile-panel__calendar-actions">
              {calendarConnected ? (
                <button
                  type="button"
                  className="profile-panel__calendar-btn profile-panel__calendar-btn--ghost"
                  onClick={handleDisconnectCalendar}
                  disabled={calendarBusy}
                >
                  {calendarBusy
                    ? APP_STRINGS.profile.calendarDisconnecting
                    : APP_STRINGS.profile.calendarDisconnect}
                </button>
              ) : (
                <button
                  type="button"
                  className="profile-panel__calendar-btn"
                  onClick={handleConnectCalendar}
                  disabled={calendarBusy}
                >
                  {calendarBusy
                    ? APP_STRINGS.profile.calendarConnecting
                    : APP_STRINGS.profile.calendarConnect}
                </button>
              )}
            </div>
          )}
        </section>

        {loading && (
          <p className="profile-panel__hint">{APP_STRINGS.profile.loading}</p>
        )}
        {error && <p className="profile-panel__error">{error}</p>}

        {!loading && !error && (
          <>
            <div className="profile-panel__kpis">
              <div className="profile-panel__kpi">
                <span className="profile-panel__kpi-value">
                  {prospectStats.total}
                </span>
                <span className="profile-panel__kpi-label">
                  {APP_STRINGS.profile.kpiProspects}
                </span>
              </div>
              <div className="profile-panel__kpi">
                <span className="profile-panel__kpi-value">
                  {prospectStats.contacted}
                </span>
                <span className="profile-panel__kpi-label">
                  {APP_STRINGS.profile.kpiContacted}
                </span>
              </div>
              <div className="profile-panel__kpi">
                <span className="profile-panel__kpi-value">
                  {prospectStats.outcomes.closed_sale}
                </span>
                <span className="profile-panel__kpi-label">
                  {APP_STRINGS.profile.kpiClosedSales}
                </span>
              </div>
              <div className="profile-panel__kpi">
                <span className="profile-panel__kpi-value">
                  {visitStats.total}
                </span>
                <span className="profile-panel__kpi-label">
                  {APP_STRINGS.profile.kpiVisits}
                </span>
              </div>
            </div>

            <StatBarChart
              title={APP_STRINGS.profile.chartContactStatus}
              items={statusBars}
              emptyLabel={APP_STRINGS.profile.emptyProspects}
            />
            <StatBarChart
              title={APP_STRINGS.profile.chartContactOutcomes}
              items={prospectOutcomeBars}
              emptyLabel={APP_STRINGS.profile.emptyOutcomes}
            />
            <StatBarChart
              title={APP_STRINGS.profile.chartVisitOutcomes}
              items={visitOutcomeBars}
              emptyLabel={APP_STRINGS.profile.emptyVisits}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default ProfilePanel
