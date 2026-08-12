import { auth } from '../lib/firebase'
import type {
  ContactStatusRecord,
  ErrorResponse,
  GlobalScheduledVisit,
  GlobalVisitor,
  Prospect,
  SearchResponse,
  UpsertContactStatusPayload,
  UpsertProspectPayload,
  UpsertVisitPayload,
  Visit,
  Zone,
} from '../types/api'

const PROD_API_ORIGIN = 'https://apisistecontact.nodefex.com'

function resolveApiBase(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) {
    return `${fromEnv}/api`
  }
  // En Vercel / vite build (PROD) usa la API pública. En local, el proxy de Vite.
  if (import.meta.env.PROD) {
    return `${PROD_API_ORIGIN}/api`
  }
  return '/api'
}

const API_BASE = resolveApiBase()

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser
  if (!user) {
    throw new Error('Debes iniciar sesión')
  }
  const token = await user.getIdToken()
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
}

async function request<T>(
  path: string,
  init?: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    signal: init?.signal,
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      ...(init?.headers ?? {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as ErrorResponse)?.error ?? `Error ${res.status}`
    throw new Error(msg)
  }
  return data as T
}

export function fetchZones(query: string, signal?: AbortSignal): Promise<Zone[]> {
  const q = encodeURIComponent(query)
  return request<Zone[]>(`/zones?q=${q}`, { signal })
}

export function searchBusinesses(
  type: string,
  zone: string,
  signal?: AbortSignal,
  radiusKm?: number,
): Promise<SearchResponse> {
  const t = encodeURIComponent(type)
  const z = encodeURIComponent(zone)
  const radiusQuery =
    radiusKm != null && radiusKm > 0
      ? `&radius_km=${encodeURIComponent(String(radiusKm))}`
      : ''
  return request<SearchResponse>(`/search?type=${t}&zone=${z}${radiusQuery}`, {
    signal,
  })
}

export async function fetchVisits(
  placeIds: string[],
  signal?: AbortSignal,
): Promise<Visit[]> {
  const headers = await authHeaders()
  const q =
    placeIds.length > 0
      ? `?place_ids=${placeIds.map(encodeURIComponent).join(',')}`
      : ''
  return request<Visit[]>(`/visits${q}`, { signal, headers })
}

export async function upsertVisit(
  placeId: string,
  payload: UpsertVisitPayload,
): Promise<Visit> {
  const headers = await authHeaders()
  return request<Visit>(`/visits/${encodeURIComponent(placeId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function deleteVisit(placeId: string): Promise<void> {
  const headers = await authHeaders()
  await request<{ status: string }>(`/visits/${encodeURIComponent(placeId)}`, {
    method: 'DELETE',
    headers,
  })
}

export async function fetchBusinessVisitors(
  placeId: string,
  signal?: AbortSignal,
): Promise<GlobalVisitor[]> {
  const headers = await authHeaders()
  return request<GlobalVisitor[]>(
    `/businesses/${encodeURIComponent(placeId)}/visitors`,
    { signal, headers },
  )
}

export async function fetchBusinessScheduled(
  placeId: string,
  signal?: AbortSignal,
): Promise<GlobalScheduledVisit[]> {
  const headers = await authHeaders()
  return request<GlobalScheduledVisit[]>(
    `/businesses/${encodeURIComponent(placeId)}/scheduled`,
    { signal, headers },
  )
}

export async function fetchProspectsList(
  signal?: AbortSignal,
): Promise<Prospect[]> {
  const headers = await authHeaders()
  return request<Prospect[]>('/prospects', { signal, headers })
}

export async function fetchProspectsByPlaceIds(
  placeIds: string[],
  signal?: AbortSignal,
): Promise<Prospect[]> {
  const headers = await authHeaders()
  const q =
    placeIds.length > 0
      ? `?place_ids=${placeIds.map(encodeURIComponent).join(',')}`
      : ''
  return request<Prospect[]>(`/prospects${q}`, { signal, headers })
}

export async function upsertProspect(
  placeId: string,
  payload: UpsertProspectPayload,
): Promise<Prospect> {
  const headers = await authHeaders()
  return request<Prospect>(`/prospects/${encodeURIComponent(placeId)}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function deleteProspect(placeId: string): Promise<void> {
  const headers = await authHeaders()
  await request<{ status: string }>(
    `/prospects/${encodeURIComponent(placeId)}`,
    {
      method: 'DELETE',
      headers,
    },
  )
}

export async function fetchContactStatuses(
  placeIds: string[],
  signal?: AbortSignal,
): Promise<ContactStatusRecord[]> {
  const headers = await authHeaders()
  const q =
    placeIds.length > 0
      ? `?place_ids=${placeIds.map(encodeURIComponent).join(',')}`
      : ''
  return request<ContactStatusRecord[]>(`/contact-status${q}`, {
    signal,
    headers,
  })
}

export async function upsertContactStatus(
  placeId: string,
  payload: UpsertContactStatusPayload,
): Promise<ContactStatusRecord> {
  const headers = await authHeaders()
  return request<ContactStatusRecord>(
    `/contact-status/${encodeURIComponent(placeId)}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    },
  )
}
