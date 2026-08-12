/** Fecha local en formato YYYY-MM-DD. */
export function todayISODate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Suma (o resta) días a una fecha YYYY-MM-DD en calendario local. */
export function addDaysISODate(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  const yy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}

export function tomorrowISODate(today = todayISODate()): string {
  return addDaysISODate(today, 1)
}

export function formatVisitDate(iso?: string | null): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  const date = new Date(y, m - 1, d)
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function visitDateGroup(
  iso: string | undefined | null,
  today = todayISODate(),
): 'today' | 'upcoming' | 'overdue' | 'none' {
  if (!iso) return 'none'
  if (iso === today) return 'today'
  if (iso < today) return 'overdue'
  return 'upcoming'
}

export function compareISODates(a?: string | null, b?: string | null): number {
  if (!a && !b) return 0
  if (!a) return 1
  if (!b) return -1
  return a.localeCompare(b)
}

export function earliestScheduleDate(
  ...dates: Array<string | undefined | null>
): string | undefined {
  const valid = dates.filter((d): d is string => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d))
  if (!valid.length) return undefined
  return [...valid].sort()[0]
}
