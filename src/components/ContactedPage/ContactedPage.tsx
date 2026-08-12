import { useEffect, useMemo, useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import {
  contactOutcomeLabel,
  normalizeContactOutcome,
  normalizeContactStatus,
} from '../ContactStatusSelect/ContactStatusSelect'
import { fetchProspectsList, fetchVisits } from '../../services/api'
import type { Prospect, Visit } from '../../types/api'
import { exportContactedXlsx } from '../../utils/exportXlsx'
import VisitPanel from '../VisitPanel/VisitPanel'
import './ContactedPage.css'

export interface ContactedItem {
  place_id: string
  name: string
  address: string
  phone?: string
  rating?: number
  user_rating_count?: number
  google_maps_uri?: string
  latitude?: number
  longitude?: number
  open_now?: boolean | null
  channels: ('call' | 'visit')[]
  prospect?: Prospect
  visit?: Visit
  updated_at: string
}

export function buildContactedList(
  prospects: Prospect[],
  visits: Visit[],
): ContactedItem[] {
  const byId = new Map<string, ContactedItem>()

  for (const p of prospects) {
    if (normalizeContactStatus(p.contact_status) !== 'contacted') continue
    byId.set(p.place_id, {
      place_id: p.place_id,
      name: p.name,
      address: p.address,
      phone: p.phone,
      rating: p.rating,
      user_rating_count: p.user_rating_count,
      google_maps_uri: p.google_maps_uri,
      latitude: p.latitude,
      longitude: p.longitude,
      open_now: p.open_now,
      channels: ['call'],
      prospect: p,
      updated_at: p.updated_at,
    })
  }

  for (const v of visits) {
    const existing = byId.get(v.place_id)
    if (existing) {
      byId.set(v.place_id, {
        ...existing,
        name: v.name || existing.name,
        address: v.address || existing.address,
        phone: v.phone ?? existing.phone,
        rating: v.rating ?? existing.rating,
        user_rating_count: v.user_rating_count ?? existing.user_rating_count,
        google_maps_uri: v.google_maps_uri ?? existing.google_maps_uri,
        latitude: v.latitude ?? existing.latitude,
        longitude: v.longitude ?? existing.longitude,
        open_now: v.open_now ?? existing.open_now,
        channels: ['call', 'visit'],
        visit: v,
        updated_at: new Date(
          Math.max(
            new Date(existing.updated_at).getTime(),
            new Date(v.updated_at).getTime(),
          ),
        ).toISOString(),
      })
    } else {
      byId.set(v.place_id, {
        place_id: v.place_id,
        name: v.name,
        address: v.address,
        phone: v.phone,
        rating: v.rating,
        user_rating_count: v.user_rating_count,
        google_maps_uri: v.google_maps_uri,
        latitude: v.latitude,
        longitude: v.longitude,
        open_now: v.open_now,
        channels: ['visit'],
        visit: v,
        updated_at: v.updated_at,
      })
    }
  }

  return [...byId.values()].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

function ContactedPage() {
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const items = useMemo(
    () => buildContactedList(prospects, visits),
    [prospects, visits],
  )

  function load() {
    setLoading(true)
    setError('')
    Promise.all([fetchProspectsList(), fetchVisits([])])
      .then(([nextProspects, nextVisits]) => {
        setProspects(nextProspects)
        setVisits(nextVisits)
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : APP_STRINGS.contacted.error,
        )
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  function handleVisitSaved(visit: Visit) {
    setVisits((prev) => {
      const next = prev.filter((i) => i.place_id !== visit.place_id)
      return [visit, ...next]
    })
  }

  function handleVisitRemoved(placeId: string) {
    setVisits((prev) => prev.filter((i) => i.place_id !== placeId))
  }

  return (
    <div className="contacted-page">
      <div className="contacted-page__header">
        <div>
          <h2 className="contacted-page__title">{APP_STRINGS.contacted.title}</h2>
          <p className="contacted-page__subtitle">
            {APP_STRINGS.contacted.subtitle}
          </p>
        </div>
        <button
          type="button"
          className="contacted-page__export"
          onClick={() => exportContactedXlsx(items)}
          disabled={loading || items.length === 0}
        >
          {APP_STRINGS.export.xlsx}
        </button>
      </div>

      {loading && (
        <p className="contacted-page__hint">{APP_STRINGS.contacted.loading}</p>
      )}
      {error && <p className="contacted-page__error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="contacted-page__empty">{APP_STRINGS.contacted.empty}</p>
      )}

      {!loading && items.length > 0 && (
        <ul className="contacted-page__list">
          {items.map((item) => {
            const outcome = item.prospect
              ? normalizeContactOutcome(
                  item.prospect.contact_outcome,
                  item.prospect.contact_status,
                )
              : ''
            const notes = item.prospect?.contact_notes?.trim() ?? ''

            return (
              <li key={item.place_id} className="contacted-page__card">
                <div className="contacted-page__card-main">
                  <div className="contacted-page__name-row">
                    <h3 className="contacted-page__name">{item.name}</h3>
                    <div className="contacted-page__badges">
                      {item.channels.includes('call') && (
                        <span className="contacted-page__badge contacted-page__badge--call">
                          {APP_STRINGS.contacted.channelCall}
                        </span>
                      )}
                      {item.channels.includes('visit') && (
                        <span className="contacted-page__badge contacted-page__badge--visit">
                          {APP_STRINGS.contacted.channelVisit}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="contacted-page__address">{item.address}</p>
                  {item.phone && (
                    <a
                      className="contacted-page__phone"
                      href={`tel:${item.phone}`}
                    >
                      {item.phone}
                    </a>
                  )}
                  {item.google_maps_uri && (
                    <a
                      className="contacted-page__link"
                      href={item.google_maps_uri}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {APP_STRINGS.business.viewOnMaps}
                    </a>
                  )}

                  {item.channels.includes('call') && (outcome || notes) && (
                    <div className="contacted-page__contact-info">
                      {outcome && (
                        <p className="contacted-page__contact-outcome">
                          {APP_STRINGS.prospects.outcomeLabel}:{' '}
                          {contactOutcomeLabel(outcome)}
                        </p>
                      )}
                      {notes && (
                        <p className="contacted-page__contact-notes">{notes}</p>
                      )}
                    </div>
                  )}
                </div>

                {item.visit && (
                  <VisitPanel
                    target={{
                      place_id: item.place_id,
                      name: item.name,
                      address: item.address,
                      phone: item.phone,
                      rating: item.rating,
                      user_rating_count: item.user_rating_count,
                      google_maps_uri: item.google_maps_uri,
                      latitude: item.latitude,
                      longitude: item.longitude,
                      open_now: item.open_now,
                    }}
                    visit={item.visit}
                    onVisitSaved={handleVisitSaved}
                    onVisitRemoved={handleVisitRemoved}
                  />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default ContactedPage
