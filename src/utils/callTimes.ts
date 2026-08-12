import { normalizeAppointmentInterval } from './appointmentInterval'

/** Horas en bloques fijos de 10 minutos (00:00 – 23:50). */
export const CALL_TIME_OPTIONS: string[] = (() => {
  const out: string[] = []
  for (let h = 0; h < 24; h += 1) {
    for (let m = 0; m < 60; m += 10) {
      out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
    }
  }
  return out
})()

export const DEFAULT_CALL_TIME = '09:00'
export const DEFAULT_VISIT_TIME = '09:00'

const DAY_START_MINUTES = 6 * 60
const DAY_END_MINUTES = 21 * 60

/** Opciones de hora según el intervalo configurado (p. ej. 60 → 06:00, 07:00…). */
export function buildTimeOptionsFromInterval(
  intervalMinutes?: number | null,
): string[] {
  const step = normalizeAppointmentInterval(intervalMinutes)
  const out: string[] = []
  for (let mins = DAY_START_MINUTES; mins <= DAY_END_MINUTES; mins += step) {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    out.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)
  }
  return out
}

export function defaultTimeForInterval(intervalMinutes?: number | null): string {
  const options = buildTimeOptionsFromInterval(intervalMinutes)
  return options.includes(DEFAULT_VISIT_TIME)
    ? DEFAULT_VISIT_TIME
    : (options[0] ?? DEFAULT_VISIT_TIME)
}

export function formatCallDateTime(
  date?: string | null,
  time?: string | null,
): string {
  if (!date) return ''
  const [y, m, d] = date.split('-').map(Number)
  if (!y || !m || !d) return date
  const label = new Date(y, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  return time ? `${label} · ${time}` : label
}

export function isValidCallTime(value?: string | null): boolean {
  if (!value) return false
  return CALL_TIME_OPTIONS.includes(value)
}
