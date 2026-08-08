export interface LatLng {
  latitude: number
  longitude: number
}

export interface Viewport {
  northeast: LatLng
  southwest: LatLng
}

export interface Zone {
  place_id?: string
  name: string
  formatted_address: string
  center: LatLng
  viewport: Viewport
  types?: string[]
}

export interface Business {
  place_id: string
  name: string
  address: string
  phone?: string
  location: LatLng
  rating?: number
  user_rating_count?: number
  google_maps_uri?: string
  types?: string[]
  open_now?: boolean | null
}

export interface SearchResponse {
  zone: Zone
  query: string
  count: number
  businesses: Business[]
}

export interface ErrorResponse {
  error: string
}
