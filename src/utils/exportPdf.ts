import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { Prospect } from '../types/api'

function formatRating(rating?: number): string {
  if (rating == null || rating <= 0) return ''
  return rating.toFixed(1)
}

export function exportProspectsPdf(items: Prospect[]) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const stamp = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('SisteContact — Prospectos', 14, 16)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80)
  doc.text(`${items.length} comercios · ${stamp}`, 14, 22)
  doc.setTextColor(0)

  const body = items.map((item) => [
    item.name || '',
    item.address || '',
    item.phone || '',
    formatRating(item.rating),
  ])

  autoTable(doc, {
    startY: 26,
    head: [['Nombre', 'Dirección / ubicación', 'Teléfono', 'Rating']],
    body: body.length ? body : [['(sin registros)', '', '', '']],
    styles: {
      fontSize: 8,
      cellPadding: 2.2,
      overflow: 'linebreak',
      valign: 'top',
    },
    headStyles: {
      fillColor: [43, 108, 176],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 48 },
      1: { cellWidth: 78 },
      2: { cellWidth: 32 },
      3: { cellWidth: 18, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  const fileStamp = new Date().toISOString().slice(0, 10)
  doc.save(`sistecontact-prospectos-${fileStamp}.pdf`)
}
