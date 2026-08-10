import * as XLSX from 'xlsx'
import type { ToVisit, Visit } from '../types/api'
import { contactStatusLabel } from '../components/ContactStatusSelect/ContactStatusSelect'

function formatDate(value?: string): string {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('es-CO')
}

function formatOpenNow(value?: boolean | null): string {
  if (value == null) return ''
  return value ? 'Abierto' : 'Cerrado'
}

function downloadWorkbook(rows: Record<string, unknown>[], sheetName: string, filename: string) {
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.min(
      48,
      Math.max(
        key.length + 2,
        ...rows.map((row) => String(row[key] ?? '').length + 2),
      ),
    ),
  }))
  worksheet['!cols'] = colWidths

  XLSX.writeFile(workbook, filename)
}

export function exportToVisitXlsx(items: ToVisit[]) {
  const rows = items.map((item) => ({
    'Place ID': item.place_id,
    Nombre: item.name,
    Dirección: item.address,
    Teléfono: item.phone ?? '',
    Rating: item.rating ?? '',
    'Nº reseñas': item.user_rating_count ?? '',
    'Abierto ahora': formatOpenNow(item.open_now),
    Latitud: item.latitude ?? '',
    Longitud: item.longitude ?? '',
    'Google Maps': item.google_maps_uri ?? '',
    'Estado de contacto': contactStatusLabel(item.contact_status),
    'Agregado el': formatDate(item.created_at),
    'Actualizado el': formatDate(item.updated_at),
  }))

  const stamp = new Date().toISOString().slice(0, 10)
  downloadWorkbook(
    rows.length ? rows : [{ Nombre: '(sin registros)' }],
    'Por visitar',
    `sistecontact-por-visitar-${stamp}.xlsx`,
  )
}

export function exportVisitedXlsx(items: Visit[]) {
  const rows = items.map((item) => ({
    'Place ID': item.place_id,
    Nombre: item.name,
    Dirección: item.address,
    Teléfono: item.phone ?? '',
    Rating: item.rating ?? '',
    'Nº reseñas': item.user_rating_count ?? '',
    'Abierto ahora': formatOpenNow(item.open_now),
    Latitud: item.latitude ?? '',
    Longitud: item.longitude ?? '',
    'Google Maps': item.google_maps_uri ?? '',
    'Resultado de la visita': item.visit_result ?? '',
    'Notas de la visita': item.notes ?? '',
    'Visitado el': formatDate(item.created_at),
    'Actualizado el': formatDate(item.updated_at),
  }))

  const stamp = new Date().toISOString().slice(0, 10)
  downloadWorkbook(
    rows.length ? rows : [{ Nombre: '(sin registros)' }],
    'Visitados',
    `sistecontact-visitados-${stamp}.xlsx`,
  )
}
