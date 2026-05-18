import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { MapPin, Search, RefreshCw, LogOut, User, ChevronRight } from 'lucide-react'
import { RouletteWheel } from '../components/RouletteWheel'
import { KakaoMap } from '../components/KakaoMap'
import { upsertRestaurant, searchKakaoRestaurants, geocodeKakaoAddress } from '../server/restaurants.functions'
import { useIdentity } from '../lib/identity-context'

export const Route = createFileRoute('/')({
  component: Home,
})

interface KakaoRestaurant {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  cuisine?: string
  phone?: string
  website?: string
}

function getCuisineEmoji(cuisine?: string): string {
  if (!cuisine) return '🍽️'
  const c = cuisine
  if (c.includes('한식') || c.includes('국밥') || c.includes('설렁탕')) return '🥘'
  if (c.includes('삼겹살') || c.includes('구이') || c.includes('갈비')) return '🥩'
  if (c.includes('족발') || c.includes('보쌈')) return '🍖'
  if (c.includes('일식') || c.includes('스시') || c.includes('초밥') || c.includes('라멘')) return '🍱'
  if (c.includes('중식') || c.includes('중국집')) return '🥡'
  if (c.includes('이탈리안') || c.includes('피자') || c.includes('파스타')) return '🍕'
  if (c.includes('패스트푸드') || c.includes('햄버거')) return '🍔'
  if (c.includes('치킨')) return '🍗'
  if (c.includes('카페') || c.includes('커피') || c.includes('디저트')) return '☕'
  if (c.includes('술집') || c.includes('호프') || c.includes('이자카야')) return '🍺'
  if (c.includes('분식') || c.includes('떡볶이')) return '🍢'
  if (c.includes('해물') || c.includes('해산물') || c.includes('회')) return '🦞'
  if (c.includes('태국') || c.includes('베트남') || c.includes('쌀국수')) return '🍜'
  if (c.includes('인도') || c.includes('카레')) return '🍛'
  return '🍽️'
}

function Home() {
  const { user, ready, logout } = useIdentity()
  const navigate = useNavigate()
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [restaurants, setRestaurants] = useState<KakaoRestaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedRestaurant, setSelectedRestaurant] = useState<KakaoRestaurant | null>(null)
  const [radius, setRadius] = useState(1500)
  const [showRoulette, setShowRoulette] = useState(false)
  const [searchMode, setSearchMode] = useState<'location' | 'address'>('location')
  const [addressQuery, setAddressQuery] = useState('')
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const search = useCallback(async (lat: number, lng: number) => {
    setLoading(true)
    setError('')
    setSelectedRestaurant(null)
    setShowRoulette(false)
    try {
      const results = await searchKakaoRestaurants({ data: { lat, lng, radius } })
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
      },
    )
  }

  const handleAddressSearch = async () => {
    if (!addressQuery.trim()) return
    setLoading(true)
    setError('')
    try {
      const result = await geocodeKakaoAddress({ data: { query: addressQuery } })
      if (!result) {
        setError('위치를 찾을 수 없습니다. 다른 검색어를 시도해보세요.')
        setLoading(false)
        return
      }
      setLocation({ lat: result.lat, lng: result.lng })
      await search(result.lat, result.lng)
    } catch {
      setError('위치 검색에 실패했습니다.')
      setLoading(false)
    }
  }

  const handleRouletteResult = async (restaurant: KakaoRestaurant) => {
    setSelectedRestaurant(restaurant)
    try {
      await upsertRestaurant({ data: restaurant })
    } catch {}
  }

  const handleRestaurantClick = async (restaurant: KakaoRestaurant) => {
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
              onClick={() => setSearchMode('address')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${searchMode === 'address' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}
            >
              🔍 주소/지역 검색
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
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="지역이나 주소 입력 (예: 서울 강남구, 홍대입구역)"
                  value={addressQuery}
                  onChange={(e) => setAddressQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddressSearch()}
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none text-sm"
                />
                <button
                  onClick={handleAddressSearch}
                  disabled={loading || !addressQuery.trim()}
                  className="px-5 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold rounded-xl flex items-center gap-2 hover:shadow-lg transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search size={18} />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-400">예시: 강남역, 서울 마포구 연남동, 부산 해운대</p>
            </div>
          )}

          {error && (
            <p className="mt-3 text-red-500 text-sm text-center">{error}</p>
          )}
        </div>

        {/* Kakao Map */}
        {location && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <KakaoMap
              lat={location.lat}
              lng={location.lng}
              restaurants={restaurants}
              height="320px"
              selectedId={hoveredId}
              onMarkerClick={(id) => {
                const r = restaurants.find(res => res.id === id)
                if (r) handleRestaurantClick(r)
              }}
            />
            {restaurants.length > 0 && (
              <p className="text-xs text-gray-400 text-center py-2">
                마커를 클릭하면 상세 페이지로 이동합니다
              </p>
            )}
          </div>
        )}

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
                    onResult={(r) => {
                      const full = restaurants.find(res => res.id === r.id)
                      if (full) handleRouletteResult(full)
                    }}
                  />
                  {selectedRestaurant && (
                    <div className="w-full bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-2xl p-5 text-center">
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
                    onMouseEnter={() => setHoveredId(r.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    className={`w-full text-left px-4 py-4 transition-colors flex items-center gap-3 group ${hoveredId === r.id ? 'bg-orange-50' : 'hover:bg-orange-50'}`}
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
