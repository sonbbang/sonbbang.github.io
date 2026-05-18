declare global {
  interface Window { kakao: any }
}

export interface KakaoRestaurant {
  id: string
  name: string
  lat: number
  lng: number
  address?: string
  cuisine?: string
  phone?: string
  placeUrl?: string
}

// SDK가 로드된 후 호출되어야 합니다
export function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radius: number,
): Promise<KakaoRestaurant[]> {
  return new Promise((resolve, reject) => {
    const ps = new window.kakao.maps.services.Places()
    const results: KakaoRestaurant[] = []
    let pending = 2

    const done = () => {
      pending--
      if (pending === 0) resolve(results)
    }

    const mapDoc = (doc: any): KakaoRestaurant => ({
      id: `kakao-${doc.id}`,
      name: doc.place_name,
      lat: parseFloat(doc.y),
      lng: parseFloat(doc.x),
      address: doc.road_address_name || doc.address_name || undefined,
      cuisine: (doc.category_name as string).split(' > ').pop() || undefined,
      phone: doc.phone || undefined,
      placeUrl: doc.place_url || undefined,
    })

    const callback = (data: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK) {
        results.push(...data.map(mapDoc))
      }
      done()
    }

    const opts = { x: lng, y: lat, radius: Math.min(radius, 20000), size: 15, sort: window.kakao.maps.services.SortBy.DISTANCE }

    ps.categorySearch('FD6', callback, opts)
    ps.categorySearch('CE7', callback, opts)
  })
}

export function geocodeAddress(
  query: string,
): Promise<{ lat: number; lng: number; name: string } | null> {
  return new Promise((resolve) => {
    const ps = new window.kakao.maps.services.Places()
    ps.keywordSearch(query, (data: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && data[0]) {
        resolve({
          lat: parseFloat(data[0].y),
          lng: parseFloat(data[0].x),
          name: data[0].place_name,
        })
      } else {
        resolve(null)
      }
    })
  })
}
