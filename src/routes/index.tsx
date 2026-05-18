import { createFileRoute } from '@tanstack/react-router'
import { useState, useCallback, useEffect } from 'react'
import { MapPin, Search, RefreshCw, ChevronRight, Phone, Globe, X } from 'lucide-react'
import { RouletteWheel } from '../components/RouletteWheel'
import { KakaoMap } from '../components/KakaoMap'
import { searchNearbyRestaurants, geocodeAddress, type KakaoRestaurant } from '../lib/kakao-api'

export const Route = createFileRoute('/')({
  component: Home,
})

function getCuisineEmoji(cuisine?: string): string {
  if (!cuisine) return '🍽️'
  if (cuisine.includes('한식') || cuisine.includes('국밥')) return '🥘'
  if (cuisine.includes('삼겹살') || cuisine.includes('구이') || cuisine.includes('갈비')) return '🥩'
  if (cuisine.includes('족발') || cuisine.includes('보쌈')) return '🍖'
  if (cuisine.includes('일식') || cuisine.includes('스시') || cuisine.includes('라멘')) return '🍱'
  if (cuisine.includes('중식')) return '🥡'
  if (cuisine.includes('피자') || cuisine.includes('이탈리안') || cuisine.includes('파스타')) return '🍕'
  if (cuisine.includes('패스트푸드') || cuisine.includes('햄버거')) return '🍔'
  if (cuisine.includes('치킨')) return '🍗'
  if (cuisine.includes('카페') || cuisine.includes('커피') || cuisine.includes('디저트')) return '☕'
  if (cuisine.includes('술집') || cuisine.includes('호프')) return '🍺'
  if (cuisine.includes('분식')) return '🍢'
  if (cuisine.includes('해물') || cuisine.includes('회')) return '🦞'
  return '🍽️'
}

function Home() {
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [restaurants, setRestaurants] = useState<KakaoRestaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [radius, setRadius] = useState(1500)
  const [showRoulette, setShowRoulette] = useState(false)
  const [searchMode, setSearchMode] = useState<'location' | 'address'>('location')
  const [addressQuery, setAddressQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [selectedRestaurant, setSelectedRestaurant] = useState<KakaoRestaurant | null>(null)
  const [sdkReady, setSdkReady] = useState(false)

  // SDK 로드 완료 감지
  useEffect(() => {
    const check = () => {
      if (window.kakao?.maps?.services) {
        setSdkReady(true)
      } else {
        setTimeout(check, 200)
      }
    }
    check()
  }, [])

  const search = useCallback(async (lat: number, lng: number) => {
    if (!sdkReady) return
    setLoading(true)
    setError('')
    setSelectedRestaurant(null)
    setShowRoulette(false)
    try {
      const results = await searchNearbyRestaurants(lat, lng, radius)
      if (results.length === 0) setError('근처에 등록된 식당이 없습니다. 반경을 늘려보세요.')
      setRestaurants(results)
    } catch {
      setError('식당 정보를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [radius, sdkReady])

  const getLocation = () => {
    if (!navigator.geolocation) { setError('위치 서비스를 지원하지 않습니다'); return }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ lat: coords.latitude, lng: coords.longitude })
        search(coords.latitude, coords.longitude)
      },
      () => { setLoading(false); setError('위치 권한을 확인해주세요.') },
    )
  }

  const handleAddressSearch = async () => {
    if (!addressQuery.trim() || !sdkReady) return
    setLoading(true)
    setError('')
    try {
      const result = await geocodeAddress(addressQuery)
      if (!result) { setError('위치를 찾을 수 없습니다.'); setLoading(false); return }
      setLocation({ lat: result.lat, lng: result.lng })
      await search(result.lat, result.lng)
    } catch {
      setError('위치 검색에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <span className="text-2xl">🍽️</span>
          <div>
            <h1 className="font-black text-lg leading-tight">맛집 룰렛</h1>
            <p className="text-xs text-gray-400">오늘 뭐 먹지?</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Search Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MapPin size={20} className="text-orange-500" />
            내 주변 맛집 찾기
          </h2>

          <div className="flex gap-2 mb-4 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setSearchMode('location')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${searchMode === 'location' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
            >
              📍 현재 위치
            </button>
            <button
              onClick={() => setSearchMode('address')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${searchMode === 'address' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
            >
              🔍 주소 검색
            </button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600 whitespace-nowrap">검색 반경</label>
            <input
              type="range" min={500} max={5000} step={500} value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="flex-1 accent-orange-500"
            />
            <span className="text-sm font-semibold text-orange-600 w-16 text-right">
              {radius >= 1000 ? `${radius / 1000}km` : `${radius}m`}
            </span>
          </div>

          {searchMode === 'location' ? (
            <button
              onClick={getLocation}
              disabled={loading || !sdkReady}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />검색 중...</> : <><Search size={18} />내 주변 맛집 검색</>}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="지역 입력 (예: 서울 강남구, 홍대입구역)"
                value={addressQuery}
                onChange={(e) => setAddressQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm"
              />
              <button
                onClick={handleAddressSearch}
                disabled={loading || !addressQuery.trim() || !sdkReady}
                className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Search size={18} />}
              </button>
            </div>
          )}

          {error && <p className="mt-3 text-red-500 text-sm text-center">{error}</p>}
        </div>

        {/* Map */}
        {location && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <KakaoMap
              lat={location.lat}
              lng={location.lng}
              restaurants={restaurants}
              height="320px"
              selectedId={hoveredId ?? selectedRestaurant?.id}
              onMarkerClick={(id) => {
                const r = restaurants.find(res => res.id === id)
                if (r) setSelectedRestaurant(r)
              }}
            />
            {restaurants.length > 0 && (
              <p className="text-xs text-gray-400 text-center py-2">마커를 클릭하면 식당 정보가 표시됩니다</p>
            )}
          </div>
        )}

        {/* Selected restaurant card */}
        {selectedRestaurant && (
          <div className="bg-white rounded-2xl shadow-sm p-5 border-2 border-orange-200 relative">
            <button
              onClick={() => setSelectedRestaurant(null)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <X size={16} />
            </button>
            <p className="text-xs text-orange-500 font-semibold mb-1">선택된 식당</p>
            <h3 className="text-xl font-black mb-1">{selectedRestaurant.name}</h3>
            {selectedRestaurant.cuisine && (
              <span className="inline-block text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full mb-2">
                {selectedRestaurant.cuisine}
              </span>
            )}
            <div className="space-y-1 text-sm text-gray-600 mt-2">
              {selectedRestaurant.address && (
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-orange-400 flex-shrink-0" />
                  <span>{selectedRestaurant.address}</span>
                </div>
              )}
              {selectedRestaurant.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-orange-400 flex-shrink-0" />
                  <a href={`tel:${selectedRestaurant.phone}`} className="hover:text-orange-500">
                    {selectedRestaurant.phone}
                  </a>
                </div>
              )}
              {selectedRestaurant.placeUrl && (
                <div className="flex items-center gap-2">
                  <Globe size={13} className="text-orange-400 flex-shrink-0" />
                  <a href={selectedRestaurant.placeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500">
                    카카오 지도에서 보기
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Roulette */}
        {restaurants.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">🎰 오늘의 맛집 뽑기</h2>
              <button onClick={() => setShowRoulette(!showRoulette)} className="text-sm text-orange-500 font-semibold hover:underline">
                {showRoulette ? '숨기기' : '룰렛 열기'}
              </button>
            </div>
            {showRoulette ? (
              <div className="flex flex-col items-center gap-6">
                <RouletteWheel
                  restaurants={restaurants}
                  onResult={(r) => {
                    const full = restaurants.find(res => res.id === r.id)
                    if (full) setSelectedRestaurant(full)
                  }}
                />
              </div>
            ) : (
              <div
                className="cursor-pointer rounded-xl border-2 border-dashed border-orange-200 p-6 text-center hover:border-orange-400 transition-colors"
                onClick={() => setShowRoulette(true)}
              >
                <div className="text-4xl mb-2">🎰</div>
                <p className="text-gray-600 font-medium">클릭해서 룰렛 열기</p>
                <p className="text-sm text-gray-400 mt-1">{restaurants.length}개의 식당 중 하나를 선택해 드려요</p>
              </div>
            )}
          </div>
        )}

        {/* Restaurant List */}
        {restaurants.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold">
                근처 맛집 <span className="text-sm font-normal text-gray-400">({restaurants.length}개)</span>
              </h2>
              <button
                onClick={() => location && search(location.lat, location.lng)}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="divide-y divide-gray-50">
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRestaurant(r)}
                  onMouseEnter={() => setHoveredId(r.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className={`w-full text-left px-4 py-4 transition-colors flex items-center gap-3 group ${hoveredId === r.id || selectedRestaurant?.id === r.id ? 'bg-orange-50' : 'hover:bg-orange-50'}`}
                >
                  <span className="text-2xl flex-shrink-0">{getCuisineEmoji(r.cuisine)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{r.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {r.cuisine && <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{r.cuisine}</span>}
                      {r.address && <span className="text-xs text-gray-400 truncate">{r.address}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0 group-hover:text-orange-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {!loading && restaurants.length === 0 && !error && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-lg font-medium">위치를 설정해 주세요</p>
            <p className="text-sm mt-1">내 주변 맛집을 찾아드릴게요</p>
          </div>
        )}
      </div>
    </div>
  )
}
