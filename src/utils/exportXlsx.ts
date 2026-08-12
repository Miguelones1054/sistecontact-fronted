import * as XLSX from 'xlsx'
import type { ContactedItem } from '../components/ContactedPage/ContactedPage'
import type { Prospect } from '../types/api'
import {
  contactOutcomeLabel,
  contactStatusLabel,
} from '../components/ContactStatusSelect/ContactStatusSelect'

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

export function exportProspectsXlsx(items: Prospect[]) {
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
    Clasificación: contactOutcomeLabel(
      item.contact_outcome || item.contact_status,
    ),
    'Anotaciones de contacto': item.contact_notes ?? '',
    'Fecha de visita': item.visit_date ?? '',
    'Agregado el': formatDate(item.created_at),
    'Actualizado el': formatDate(item.updated_at),
  }))

  const stamp = new Date().toISOString().slice(0, 10)
  downloadWorkbook(
    rows.length ? rows : [{ Nombre: '(sin registros)' }],
    'Prospectos',
    `sistecontact-prospectos-${stamp}.xlsx`,
  )
}

export function exportContactedXlsx(items: ContactedItem[]) {
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
    Llamada: item.channels.includes('call') ? 'Sí' : 'No',
    Visita: item.channels.includes('visit') ? 'Sí' : 'No',
    'Clasificación de contacto': contactOutcomeLabel(
      item.prospect?.contact_outcome || item.prospect?.contact_status,
    ),
    'Anotaciones de contacto': item.prospect?.contact_notes ?? '',
    'Resultado de la visita': contactOutcomeLabel(item.visit?.visit_result),
    'Notas de la visita': item.visit?.notes ?? '',
    'Actualizado el': formatDate(item.updated_at),
  }))

  const stamp = new Date().toISOString().slice(0, 10)
  downloadWorkbook(
    rows.length ? rows : [{ Nombre: '(sin registros)' }],
    'Contactados',
    `sistecontact-contactados-${stamp}.xlsx`,
  )
}
