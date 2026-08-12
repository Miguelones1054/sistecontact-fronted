import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  fetchSchedulingSettings,
  upsertSchedulingSettings,
} from '../services/api'
import {
  DEFAULT_APPOINTMENT_INTERVAL_MINUTES,
  normalizeAppointmentInterval,
} from '../utils/appointmentInterval'

interface SchedulingSettingsContextValue {
  intervalMinutes: number
  loading: boolean
  saving: boolean
  error: string
  setIntervalMinutes: (minutes: number) => Promise<void>
  refresh: () => Promise<void>
}

const SchedulingSettingsContext =
  createContext<SchedulingSettingsContextValue | null>(null)

export function SchedulingSettingsProvider({ children }: { children: ReactNode }) {
  const [intervalMinutes, setIntervalState] = useState(
    DEFAULT_APPOINTMENT_INTERVAL_MINUTES,
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const settings = await fetchSchedulingSettings()
      setIntervalState(
        normalizeAppointmentInterval(settings.appointment_interval_minutes),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo cargar la configuración de agenda',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setIntervalMinutes = useCallback(async (minutes: number) => {
    const normalized = normalizeAppointmentInterval(minutes)
    setSaving(true)
    setError('')
    try {
      const saved = await upsertSchedulingSettings({
        appointment_interval_minutes: normalized,
      })
      setIntervalState(
        normalizeAppointmentInterval(saved.appointment_interval_minutes),
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar la configuración de agenda',
      )
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      intervalMinutes,
      loading,
      saving,
      error,
      setIntervalMinutes,
      refresh,
    }),
    [intervalMinutes, loading, saving, error, setIntervalMinutes, refresh],
  )

  return (
    <SchedulingSettingsContext.Provider value={value}>
      {children}
    </SchedulingSettingsContext.Provider>
  )
}

export function useSchedulingSettings(): SchedulingSettingsContextValue {
  const ctx = useContext(SchedulingSettingsContext)
  if (!ctx) {
    throw new Error(
      'useSchedulingSettings debe usarse dentro de SchedulingSettingsProvider',
    )
  }
  return ctx
}
