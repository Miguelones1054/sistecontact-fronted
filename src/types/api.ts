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
  radius_km?: number
  businesses: Business[]
}

export interface ErrorResponse {
  error: string
}

export interface Visit {
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
  visited: boolean
  notes: string
  visit_result: string
  created_at: string
  updated_at: string
}

export interface UpsertVisitPayload {
  name: string
  address: string
  notes: string
  visit_result: string
  phone?: string
  rating?: number
  user_rating_count?: number
  google_maps_uri?: string
  latitude?: number
  longitude?: number
  open_now?: boolean | null
}

export interface GlobalVisitor {
  uid: string
  email: string
  display_name: string
  place_id: string
  business_name: string
  visit_result: string
  visited_at: string
  updated_at: string
}

export interface GlobalScheduledVisit {
  uid: string
  email: string
  display_name: string
  place_id: string
  business_name: string
  visit_date: string
  created_at: string
  updated_at: string
}

export interface Prospect {
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
  contact_status?: string
  contact_outcome?: string
  contact_notes?: string
  visit_date?: string
  visit_time?: string
  call_date?: string
  call_time?: string
  call_google_event_id?: string
  visit_google_event_id?: string
  calendar_sync_status?: 'synced' | 'skipped' | 'error' | string
  calendar_sync_error?: string
  created_at: string
  updated_at: string
}

export interface UpsertProspectPayload {
  name: string
  address: string
  phone?: string
  rating?: number
  user_rating_count?: number
  google_maps_uri?: string
  latitude?: number
  longitude?: number
  open_now?: boolean | null
  contact_status?: string
  contact_outcome?: string
  contact_notes?: string
  visit_date?: string
  visit_time?: string
  clear_visit_date?: boolean
  call_date?: string
  call_time?: string
  clear_call_date?: boolean
}

export interface ContactStatusRecord {
  place_id: string
  name: string
  address: string
  contact_status: string
  contact_outcome?: string
  contact_notes?: string
  updated_at: string
}

export interface UpsertContactStatusPayload {
  name: string
  address: string
  contact_status: string
  contact_outcome?: string
  contact_notes?: string
}

export interface AccessSettings {
  sistecontact_enabled: boolean
  updated_at?: string
}

export interface SchedulingSettings {
  appointment_interval_minutes: number
  updated_at?: string
}

export interface UpsertSchedulingSettingsPayload {
  appointment_interval_minutes: number
}

export interface GoogleCalendarStatus {
  configured: boolean
  connected: boolean
  email?: string
  connected_at?: string
}

export interface GoogleCalendarConnectResponse {
  auth_url: string
}
