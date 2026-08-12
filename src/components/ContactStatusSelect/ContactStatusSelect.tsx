import './ContactStatusSelect.css'

export type ContactStatus = 'not_contacted' | 'contacted'

export type ContactOutcome = 'closed_sale' | 'not_interested' | 'affiliated'

export const CONTACT_STATUS_OPTIONS: {
  value: ContactStatus
  label: string
  className: string
}[] = [
  {
    value: 'not_contacted',
    label: 'No contactado',
    className: 'contact-status--not-contacted',
  },
  {
    value: 'contacted',
    label: 'Contactado',
    className: 'contact-status--contacted',
  },
]

export const CONTACT_OUTCOME_OPTIONS: {
  value: ContactOutcome
  label: string
  className: string
}[] = [
  {
    value: 'closed_sale',
    label: 'Venta cerrada',
    className: 'contact-outcome--closed-sale',
  },
  {
    value: 'not_interested',
    label: 'No le interesa',
    className: 'contact-outcome--not-interested',
  },
  {
    value: 'affiliated',
    label: 'Ya tiene el servicio',
    className: 'contact-outcome--affiliated',
  },
]

export const CONTACT_STATUS_ORDER: Record<ContactStatus, number> = {
  not_contacted: 0,
  contacted: 1,
}

export function normalizeContactStatus(value?: string | null): ContactStatus {
  if (value === 'not_contacted' || !value) return 'not_contacted'
  return 'contacted'
}

export function normalizeContactOutcome(
  outcome?: string | null,
  status?: string | null,
): ContactOutcome | '' {
  if (
    outcome === 'closed_sale' ||
    outcome === 'not_interested' ||
    outcome === 'affiliated'
  ) {
    return outcome
  }
  if (
    status === 'closed_sale' ||
    status === 'not_interested' ||
    status === 'affiliated'
  ) {
    return status
  }
  return ''
}

export function contactStatusLabel(value?: string | null): string {
  const status = normalizeContactStatus(value)
  return CONTACT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'No contactado'
}

export function contactOutcomeLabel(value?: string | null): string {
  const opt = CONTACT_OUTCOME_OPTIONS.find((o) => o.value === value)
  if (opt) return opt.label
  if (!value) return ''
  return value
}

interface Props {
  value?: string | null
  disabled?: boolean
  onChange: (status: ContactStatus) => void
}

function ContactStatusSelect({ value, disabled, onChange }: Props) {
  const current = normalizeContactStatus(value)
  const meta = CONTACT_STATUS_OPTIONS.find((o) => o.value === current)!

  return (
    <label className={`contact-status ${meta.className}`}>
      <span className="contact-status__dot" aria-hidden="true" />
      <select
        className="contact-status__select"
        value={current}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as ContactStatus)}
        aria-label="Estado de contacto"
      >
        {CONTACT_STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default ContactStatusSelect
