import './ContactStatusSelect.css'

export type ContactStatus =
  | 'not_contacted'
  | 'contacted'
  | 'not_interested'
  | 'affiliated'

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
  {
    value: 'not_interested',
    label: 'No le interesa',
    className: 'contact-status--not-interested',
  },
  {
    value: 'affiliated',
    label: 'Ya afiliado',
    className: 'contact-status--affiliated',
  },
]

export const CONTACT_STATUS_ORDER: Record<ContactStatus, number> = {
  not_contacted: 0,
  contacted: 1,
  not_interested: 2,
  affiliated: 3,
}

export function normalizeContactStatus(value?: string | null): ContactStatus {
  if (
    value === 'contacted' ||
    value === 'not_interested' ||
    value === 'affiliated' ||
    value === 'not_contacted'
  ) {
    return value
  }
  return 'not_contacted'
}

export function contactStatusLabel(value?: string | null): string {
  const status = normalizeContactStatus(value)
  return CONTACT_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? 'No contactado'
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
