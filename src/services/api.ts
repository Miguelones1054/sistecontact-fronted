import type { ErrorResponse, SearchResponse, Zone } from '../types/api'

const API_BASE = '/api'

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    signal,
    // En desarrollo: siempre respuestas frescas (sin caché del navegador).
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
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
  return request<Zone[]>(`/zones?q=${q}`, signal)
}

export function searchBusinesses(
  type: string,
  zone: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const t = encodeURIComponent(type)
  const z = encodeURIComponent(zone)
  return request<SearchResponse>(`/search?type=${t}&zone=${z}`, signal)
}
