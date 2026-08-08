import { useEffect, useRef, useState } from 'react'
import { fetchZones } from '../../services/api'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { APP_STRINGS } from '../../constants/strings'
import type { Zone } from '../../types/api'
import './ZoneSelect.css'

interface Props {
  value: Zone | null
  onChange: (zone: Zone | null) => void
}

function ZoneSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [zones, setZones] = useState<Zone[]>([])
  const debouncedQuery = useDebouncedValue(query, 300)
  const abortRef = useRef<AbortController | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (value) setQuery(value.formatted_address)
  }, [value])

  useEffect(() => {
    if (debouncedQuery.trim().length < 3) {
      setZones([])
      setError('')
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setError('')
    fetchZones(debouncedQuery, ac.signal)
      .then((results) => {
        setZones(results)
        setOpen(true)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))

    return () => ac.abort()
  }, [debouncedQuery])

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  function handleSelect(zone: Zone) {
    onChange(zone)
    setQuery(zone.formatted_address)
    setOpen(false)
  }

  function handleClear() {
    onChange(null)
    setQuery('')
    setZones([])
  }

  return (
    <div className="zone-select" ref={boxRef}>
      <label className="zone-select__label" htmlFor="zone-input">
        {APP_STRINGS.search.zoneLabel}
      </label>
      <div className="zone-select__field">
        <input
          id="zone-input"
          className="zone-select__input"
          type="text"
          value={query}
          placeholder={APP_STRINGS.search.zonePlaceholder}
          onChange={(e) => {
            setQuery(e.target.value)
            if (value) onChange(null)
          }}
          onFocus={() => zones.length && setOpen(true)}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="zone-select__clear"
            onClick={handleClear}
            aria-label="Limpiar zona"
          >
            ×
          </button>
        )}
      </div>

      {open && (
        <ul className="zone-select__list">
          {loading && <li className="zone-select__hint">Buscando zonas...</li>}
          {error && <li className="zone-select__hint zone-select__hint--error">{error}</li>}
          {!loading && !error && zones.length === 0 && (
            <li className="zone-select__hint">{APP_STRINGS.search.zoneHint}</li>
          )}
          {zones.map((zone) => (
            <li key={zone.place_id ?? zone.formatted_address}>
              <button
                type="button"
                className="zone-select__option"
                onClick={() => handleSelect(zone)}
              >
                <span className="zone-select__option-name">{zone.name}</span>
                <span className="zone-select__option-address">{zone.formatted_address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default ZoneSelect
