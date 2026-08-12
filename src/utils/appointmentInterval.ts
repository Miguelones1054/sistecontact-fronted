/** Intervalos permitidos entre citas (múltiplos de 10 minutos). */
export const APPOINTMENT_INTERVAL_OPTIONS = [
  10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 150, 180,
] as const

export const DEFAULT_APPOINTMENT_INTERVAL_MINUTES = 60

export function normalizeAppointmentInterval(value?: number | null): number {
  if (
    typeof value === 'number' &&
    APPOINTMENT_INTERVAL_OPTIONS.includes(
      value as (typeof APPOINTMENT_INTERVAL_OPTIONS)[number],
    )
  ) {
    return value
  }
  return DEFAULT_APPOINTMENT_INTERVAL_MINUTES
}
