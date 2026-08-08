import { useState } from 'react'
import { APP_STRINGS } from '../../constants/strings'
import type { Business } from '../../types/api'
import './BusinessList.css'

interface Props {
  businesses: Business[]
}

function ratingStars(rating?: number): string {
  if (!rating) return APP_STRINGS.business.noRating
  return `★ ${rating.toFixed(1)}`
}

function BusinessList({ businesses }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set())

  if (businesses.length === 0) {
    return <p className="business-list__empty">{APP_STRINGS.search.noResults}</p>
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <ul className="business-list">
      {businesses.map((b) => {
        const id = b.place_id
        const isOpen = openIds.has(id)

        return (
          <li
            key={id}
            className={`business-row ${isOpen ? 'business-row--open' : ''}`}
          >
            <button
              type="button"
              className="business-row__summary"
              onClick={() => toggle(id)}
              aria-expanded={isOpen}
            >
              <span className="business-row__summary-main">
                <span className="business-row__name">{b.name}</span>
                <span className="business-row__summary-meta">
                  <span className="business-row__rating">{ratingStars(b.rating)}</span>
                  {b.open_now != null && (
                    <span
                      className={`business-row__status ${
                        b.open_now
                          ? 'business-row__status--open'
                          : 'business-row__status--closed'
                      }`}
                    >
                      {b.open_now
                        ? APP_STRINGS.business.openNow
                        : APP_STRINGS.business.closed}
                    </span>
                  )}
                </span>
              </span>
              <span className="business-row__chevron" aria-hidden="true">
                {isOpen ? '▾' : '▸'}
              </span>
            </button>

            {isOpen && (
              <div className="business-row__details">
                <p className="business-row__address">{b.address}</p>

                <div className="business-row__detail-line">
                  <span className="business-row__label">
                    {APP_STRINGS.business.phone}
                  </span>
                  {b.phone ? (
                    <a className="business-row__phone" href={`tel:${b.phone}`}>
                      {b.phone}
                    </a>
                  ) : (
                    <span className="business-row__muted">
                      {APP_STRINGS.business.noPhone}
                    </span>
                  )}
                </div>

                {b.user_rating_count != null && b.user_rating_count > 0 && (
                  <div className="business-row__detail-line">
                    <span className="business-row__label">
                      {APP_STRINGS.business.reviewsLabel}
                    </span>
                    <span>{APP_STRINGS.business.reviews(b.user_rating_count)}</span>
                  </div>
                )}

                {b.google_maps_uri && (
                  <a
                    className="business-row__link"
                    href={b.google_maps_uri}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {APP_STRINGS.business.viewOnMaps}
                  </a>
                )}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

export default BusinessList
