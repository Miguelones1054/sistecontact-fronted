import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { searchBusinesses } from '../services/api'
import { APP_STRINGS } from '../constants/strings'
import type { Business, Zone } from '../types/api'

const DEFAULT_RADIUS_KM = 2

interface SearchContextValue {
  type: string
  setType: (value: string) => void
  zone: Zone | null
  radiusKm: number
  setRadiusKm: (km: number) => void
  mapEnabled: boolean
  setMapEnabled: (enabled: boolean) => void
  results: Business[]
  resultZone: Zone | null
  resultRadiusKm: number | undefined
  loading: boolean
  error: string
  hasSearched: boolean
  handleZoneChange: (next: Zone | null) => void
  runSearch: () => void
}

const SearchContext = createContext<SearchContextValue | null>(null)

export function SearchProvider({ children }: { children: ReactNode }) {
  const [type, setType] = useState('')
  const [zone, setZone] = useState<Zone | null>(null)
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM)
  const [mapEnabled, setMapEnabled] = useState(false)
  const [results, setResults] = useState<Business[]>([])
  const [resultZone, setResultZone] = useState<Zone | null>(null)
  const [resultRadiusKm, setResultRadiusKm] = useState<number | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const handleZoneChange = useCallback((next: Zone | null) => {
    setZone(next)
    setResults([])
    setResultZone(null)
    setResultRadiusKm(undefined)
    setHasSearched(false)
    setError('')
  }, [])

  const runSearch = useCallback(() => {
    if (!type.trim()) {
      setError(APP_STRINGS.search.typeRequired)
      return
    }
    if (!zone) {
      setError(APP_STRINGS.search.zoneRequired)
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    setLoading(true)
    setError('')
    setHasSearched(true)

    const zoneRef = zone.place_id ?? zone.formatted_address
    const radius = mapEnabled ? radiusKm : undefined
    searchBusinesses(type.trim(), zoneRef, ac.signal, radius)
      .then((resp) => {
        setResults(resp.businesses)
        setResultZone(resp.zone)
        setResultRadiusKm(mapEnabled ? resp.radius_km : undefined)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setError(err.message)
      })
      .finally(() => setLoading(false))
  }, [type, zone, mapEnabled, radiusKm])

  const value = useMemo(
    () => ({
      type,
      setType,
      zone,
      radiusKm,
      setRadiusKm,
      mapEnabled,
      setMapEnabled,
      results,
      resultZone,
      resultRadiusKm,
      loading,
      error,
      hasSearched,
      handleZoneChange,
      runSearch,
    }),
    [
      type,
      zone,
      radiusKm,
      mapEnabled,
      results,
      resultZone,
      resultRadiusKm,
      loading,
      error,
      hasSearched,
      handleZoneChange,
      runSearch,
    ],
  )

  return (
    <SearchContext.Provider value={value}>{children}</SearchContext.Provider>
  )
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext)
  if (!ctx) {
    throw new Error('useSearch debe usarse dentro de SearchProvider')
  }
  return ctx
}
