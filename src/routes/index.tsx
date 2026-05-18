import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { MapPin, Search, RefreshCw, LogOut, User, ChevronRight, Star } from 'lucide-react'
import { RouletteWheel } from '../components/RouletteWheel'
import { upsertRestaurant } from '../server/restaurants.functions'
import { useIdentity } from '../lib/identity-context'

export const Route = createFileRoute('/')({
  component: Home,
})

interface OsmRestaurant {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  cuisine?: string
  phone?: string
  website?: string
}

async function fetchNearbyRestaurants(lat: number, lng: number, radius = 1500): Promise<OsmRestaurant[]> {
  const query = `
    [out:json][timeout:10];
    node["amenity"~"restaurant|cafe|fast_food|bar"](around:${radius},${lat},${lng});
    out body 50;
  `
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query,
  })
  if (!res.ok) throw new Error('Overpass API 오류')
  const json = await res.json()

  return json.elements
    .filter((el: any) => el.tags?.name)
    .map((el: any) => ({
      id: `osm-${el.id}`,
      name: el.tags.name,
      lat: el.lat,
      lng: el.lon,
      address: [el.tags['addr:street'], el.tags['addr:housenumber'], el.tags['addr:city']]
        .filter(Boolean).join(' ') || undefined,
      cuisine: el.tags.cuisine?.replace(/_/g, ' ') || undefined,
      phone: el.tags.phone || el.tags['contact:phone'] || undefined,
      website: el.tags.website || el.tags['contact:website'] || undefined,
    }))
}

function getCuisineEmoji(cuisine?: string): string {
  if (!cuisine) return '🍽️'
  const c = cuisine.toLowerCase()
  if (c.includes('korean') || c.includes('korean_')) return '🥘'
  if (c.includes('japanese') || c.includes('sushi') || c.includes('ramen')) return '🍱'
  if (c.includes('chinese')) return '🥡'
  if (c.includes('italian') || c.includes('pizza') || c.includes('pasta')) return '🍕'
  if (c.includes('burger') || c.includes('american')) return '🍔'
  if (c.includes('chicken')) return '🍗'
  if (c.includes('cafe') || c.includes('coffee')) return '☕'
  if (c.includes('bar')) return '🍺'
  if (c.includes('thai')) return '🍜'
  if (c.includes('indian')) return '🍛'
  return '🍽️'
}

function Home() {
  const { user, ready, logout } = useIdentity()
  const navigate = useNavigate()
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [restaurants, setRestaurants] = useState<OsmRestaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<OsmRestaurant | null>(null)
  const [radius, setRadius] = useState(1500)
  const [showRoulette, setShowRoulette] = useState(false)
  const [searchMode, setSearchMode] = useState<'location' | 'manual'>('location')
  const [manualLat, setManualLat] = useState('')
  const [manualLng, setManualLng] = useState('')

  const search = useCallback(async (lat: number, lng: number) => {
    setLoading(true)
    setError('')
    setSelectedRestaurant(null)
    setShowRoulette(false)
    try {
      const results = await fetchNearbyRestaurants(lat, lng, radius)
      if (results.length === 0) {
        setError('근처에 등록된 식당이 없습니다. 반경을 늘려보세요.')
      }
      setRestaurants(results)
    } catch {
      setError('식당 정보를 불러오는데 실패했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }, [radius])

  const getLocation = () => {
    if (!navigator.geolocation) {
      setError('이 브라우저는 위치 서비스를 지원하지 않습니다')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setLocation({ lat: latitude, lng: longitude })
        search(latitude, longitude)
      },
      () => {
        setLoading(false)
        setError('위치 정보를 가져올 수 없습니다. 브라우저 위치 권한을 확인해주세요.')
      }
    )
  }

  const handleManualSearch = () => {
    const lat = parseFloat(manualLat)
    const lng = parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) {
      setError('올바른 위도/경도를 입력해주세요')
      return
    }
    setLocation({ lat, lng })
    search(lat, lng)
  }

  const handleRouletteResult = async (restaurant: OsmRestaurant) => {
    setSelectedRestaurant(restaurant)
    // Save restaurant to DB for future reviews/likes
    try {
      await upsertRestaurant({ data: restaurant })
    } catch {}
  }

  const handleRestaurantClick = async (restaurant: OsmRestaurant) => {
    try {
      await upsertRestaurant({ data: restaurant })
    } catch {}
    navigate({ to: '/restaurants/$id', params: { id: restaurant.id } })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍽️</span>
            <div>
              <h1 className="font-black text-lg leading-tight">맛집 룰렛</h1>
              <p className="text-xs text-gray-400">오늘 뭐 먹지?</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ready && (
              user ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 hidden sm:block">{user.name || user.email}</span>
                  <button
                    onClick={() => logout().then(() => navigate({ to: '/' }))}
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
                    title="로그아웃"
                  >
                    <LogOut size={18} />
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
                >
                  <User size={14} /> 로그인
                </Link>
              )
            )}
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

          {/* Mode tabs */}
          <div className="flex gap-2 mb-4 bg-gray-100 rounded-xl p-1">
            <button
              onClick={() => setSearchMode('location')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${searchMode === 'location' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
            >
              📍 현재 위치 사용
            </button>
            <button
              onClick={() => setSearchMode('manual')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${searchMode === 'manual' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
            >
              ✏️ 직접 입력
            </button>
          </div>

          {/* Radius */}
          <div className="flex items-center gap-3 mb-4">
            <label className="text-sm text-gray-600 whitespace-nowrap">검색 반경</label>
            <input
              type="range"
              min={500}
              max={5000}
              step={500}
              value={radius}
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
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search size={18} /> 내 주변 맛집 검색
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  placeholder="위도 (예: 37.5665)"
                  value={manualLat}
                  onChange={(e) => setManualLat(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="경도 (예: 126.9780)"
                  value={manualLng}
                  onChange={(e) => setManualLng(e.target.value)}
                  className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm"
                />
              </div>
              <p className="text-xs text-gray-400">예시: 서울 시청 - 위도 37.5665, 경도 126.9780</p>
              <button
                onClick={handleManualSearch}
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    검색 중...
                  </>
                ) : (
                  <>
                    <Search size={18} /> 검색
                  </>
                )}
              </button>
            </div>
          )}

          {error && (
            <p className="mt-3 text-red-500 text-sm text-center">{error}</p>
          )}

          {location && (
            <p className="mt-2 text-xs text-gray-400 text-center">
              📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          )}
        </div>

        {/* Results */}
        {restaurants.length > 0 && (
          <>
            {/* Roulette Section */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  🎰 오늘의 맛집 뽑기
                </h2>
                <button
                  onClick={() => setShowRoulette(!showRoulette)}
                  className="text-sm text-orange-500 font-semibold hover:underline"
                >
                  {showRoulette ? '숨기기' : '룰렛 열기'}
                </button>
              </div>

              {showRoulette ? (
                <div className="flex flex-col items-center gap-6">
                  <RouletteWheel
                    restaurants={restaurants}
                    onResult={handleRouletteResult}
                  />
                  {selectedRestaurant && (
                    <div className="w-full bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-5 text-center animate-[fadeIn_0.5s_ease]">
                      <p className="text-sm text-orange-600 font-medium mb-1">🎉 오늘의 맛집!</p>
                      <h3 className="text-xl font-black mb-1">{selectedRestaurant.name}</h3>
                      {selectedRestaurant.cuisine && (
                        <p className="text-sm text-gray-500 mb-3">{selectedRestaurant.cuisine}</p>
                      )}
                      <button
                        onClick={() => handleRestaurantClick(selectedRestaurant)}
                        className="px-6 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
                      >
                        자세히 보기 →
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="cursor-pointer rounded-xl border-2 border-dashed border-orange-200 p-6 text-center hover:border-orange-400 transition-colors"
                  onClick={() => setShowRoulette(true)}
                >
                  <div className="text-4xl mb-2">🎰</div>
                  <p className="text-gray-600 font-medium">클릭해서 룰렛 열기</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {restaurants.length}개의 식당 중 하나를 선택해 드려요
                  </p>
                </div>
              )}
            </div>

            {/* Restaurant List */}
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold flex items-center gap-2">
                  근처 맛집
                  <span className="text-sm font-normal text-gray-400">
                    ({restaurants.length}개)
                  </span>
                </h2>
                <button
                  onClick={() => location && search(location.lat, location.lng)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400"
                  title="새로고침"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <div className="divide-y divide-gray-50">
                {restaurants.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleRestaurantClick(r)}
                    className="w-full text-left px-4 py-4 hover:bg-orange-50 transition-colors flex items-center gap-3 group"
                  >
                    <span className="text-2xl flex-shrink-0">{getCuisineEmoji(r.cuisine)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 truncate">{r.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {r.cuisine && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                            {r.cuisine}
                          </span>
                        )}
                        {r.address && (
                          <span className="text-xs text-gray-400 truncate">{r.address}</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 flex-shrink-0 group-hover:text-orange-400 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
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
