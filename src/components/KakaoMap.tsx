import { useEffect, useState } from 'react'
import { Map, MapMarker, CustomOverlayMap } from 'react-kakao-maps-sdk'

declare global {
  interface Window {
    kakao: any
  }
}

export interface MapRestaurant {
  id: string
  name: string
  lat: number
  lng: number
}

interface KakaoMapProps {
  lat: number
  lng: number
  restaurants?: MapRestaurant[]
  height?: string
  selectedId?: string | null
  onMarkerClick?: (id: string) => void
}

// Module-level SDK loading state — script is loaded once per page lifetime
let _sdkReady = false
let _sdkLoading = false
const _callbacks: Array<() => void> = []

function loadKakaoSdk(cb: () => void) {
  if (_sdkReady) { cb(); return }
  _callbacks.push(cb)
  if (_sdkLoading) return
  _sdkLoading = true

  const appkey = import.meta.env.VITE_KAKAO_JS_KEY as string
  if (!appkey || appkey === 'YOUR_JAVASCRIPT_KEY_HERE') {
    console.warn('[KakaoMap] VITE_KAKAO_JS_KEY가 설정되지 않았습니다')
    return
  }

  const script = document.createElement('script')
  script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${appkey}&autoload=false`
  script.async = true
  script.onload = () => {
    window.kakao.maps.load(() => {
      _sdkReady = true
      _callbacks.splice(0).forEach(fn => fn())
    })
  }
  script.onerror = () => {
    _sdkLoading = false
    console.error('[KakaoMap] SDK 로드 실패')
  }
  document.head.appendChild(script)
}

export function KakaoMap({
  lat,
  lng,
  restaurants = [],
  height = '300px',
  selectedId,
  onMarkerClick,
}: KakaoMapProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadKakaoSdk(() => setReady(true))
  }, [])

  if (!ready) {
    return (
      <div
        style={{ height }}
        className="bg-gray-100 rounded-2xl animate-pulse flex items-center justify-center"
      >
        <span className="text-gray-400 text-sm">지도 로딩 중...</span>
      </div>
    )
  }

  const selected = selectedId ? restaurants.find(r => r.id === selectedId) ?? null : null

  return (
    <Map
      center={{ lat, lng }}
      style={{ width: '100%', height }}
      level={5}
    >
      {restaurants.map(r => (
        <MapMarker
          key={r.id}
          position={{ lat: r.lat, lng: r.lng }}
          onClick={() => onMarkerClick?.(r.id)}
        />
      ))}
      {selected && (
        <CustomOverlayMap
          position={{ lat: selected.lat, lng: selected.lng }}
          yAnchor={1.6}
        >
          <div className="bg-white px-3 py-1.5 rounded-xl shadow-lg text-sm font-semibold border border-orange-300 text-orange-600 whitespace-nowrap pointer-events-none">
            {selected.name}
          </div>
        </CustomOverlayMap>
      )}
    </Map>
  )
}
