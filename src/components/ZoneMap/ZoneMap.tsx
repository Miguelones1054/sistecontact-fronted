import { useEffect } from 'react'
import { Circle, CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { LatLng, Business } from '../../types/api'
import 'leaflet/dist/leaflet.css'
import './ZoneMap.css'

interface Props {
  center: LatLng
  radiusKm: number
  businesses?: Business[]
}

function MapSync({ center, radiusKm }: { center: LatLng; radiusKm: number }) {
  const map = useMap()

  useEffect(() => {
    const latLng = L.latLng(center.latitude, center.longitude)
    const bounds = latLng.toBounds(radiusKm * 1000 * 2)
    map.fitBounds(bounds, { padding: [28, 28], maxZoom: 15, animate: true })
  }, [center.latitude, center.longitude, radiusKm, map])

  return null
}

function ZoneMap({ center, radiusKm, businesses = [] }: Props) {
  const position: [number, number] = [center.latitude, center.longitude]

  return (
    <div className="zone-map">
      <MapContainer
        className="zone-map__canvas"
        center={position}
        zoom={13}
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSync center={center} radiusKm={radiusKm} />
        <Circle
          center={position}
          radius={radiusKm * 1000}
          pathOptions={{
            color: '#2b6cb0',
            fillColor: '#2b6cb0',
            fillOpacity: 0.12,
            weight: 2,
          }}
        />
        <CircleMarker
          center={position}
          radius={7}
          pathOptions={{
            color: '#fff',
            weight: 2,
            fillColor: '#2b6cb0',
            fillOpacity: 1,
          }}
        />
        {businesses.map((b) => (
          <CircleMarker
            key={b.place_id}
            center={[b.location.latitude, b.location.longitude]}
            radius={5}
            pathOptions={{
              color: '#fff',
              weight: 1.5,
              fillColor: '#c05621',
              fillOpacity: 0.95,
            }}
          />
        ))}
      </MapContainer>
    </div>
  )
}

export default ZoneMap
