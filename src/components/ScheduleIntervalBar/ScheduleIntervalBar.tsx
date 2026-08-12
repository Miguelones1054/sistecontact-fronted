import { useEffect, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import { useSchedulingSettings } from '../../context/SchedulingSettingsContext'
import {
  APPOINTMENT_INTERVAL_OPTIONS,
  normalizeAppointmentInterval,
} from '../../utils/appointmentInterval'
import './ScheduleIntervalBar.css'

function ScheduleIntervalBar() {
  const { intervalMinutes, saving, error, setIntervalMinutes, loading } =
    useSchedulingSettings()
  const [savedHint, setSavedHint] = useState(false)
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    setLocalError(error)
  }, [error])

  async function handleChange(next: number) {
    const normalized = normalizeAppointmentInterval(next)
    setLocalError('')
    setSavedHint(false)
    try {
      await setIntervalMinutes(normalized)
      setSavedHint(true)
      window.setTimeout(() => setSavedHint(false), 1800)
    } catch {
      // error ya viene del context
    }
  }

  return (
    <div className="schedule-interval-bar">
      <label className="schedule-interval-bar__field">
        <span className="schedule-interval-bar__label">
          {APP_STRINGS.scheduling.intervalLabel}
        </span>
        <select
          className="schedule-interval-bar__select"
          value={intervalMinutes}
          disabled={saving || loading}
          onChange={(e) => void handleChange(Number(e.target.value))}
          aria-label={APP_STRINGS.scheduling.intervalLabel}
        >
          {APPOINTMENT_INTERVAL_OPTIONS.map((mins) => (
            <option key={mins} value={mins}>
              {APP_STRINGS.scheduling.intervalOption(mins)}
            </option>
          ))}
        </select>
      </label>
      <p className="schedule-interval-bar__hint">
        {APP_STRINGS.scheduling.intervalHint}
      </p>
      {saving && (
        <span className="schedule-interval-bar__status">
          {APP_STRINGS.scheduling.saving}
        </span>
      )}
      {!saving && savedHint && (
        <span className="schedule-interval-bar__status schedule-interval-bar__status--ok">
          {APP_STRINGS.scheduling.saved}
        </span>
      )}
      {localError && (
        <p className="schedule-interval-bar__error">{localError}</p>
      )}
    </div>
  )
}

export default ScheduleIntervalBar
