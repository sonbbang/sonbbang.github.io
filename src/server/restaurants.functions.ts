import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { restaurants, reviews, likes } from '../../db/schema.js'
import { eq, sql, desc } from 'drizzle-orm'
import { requireAuthMiddleware } from '../middleware/identity.js'

// ─── Kakao Local API ───────────────────────────────────────────────────────

interface KakaoDocument {
  id: string
  place_name: string
  category_name: string
  phone: string
  address_name: string
  road_address_name: string
  x: string // longitude
  y: string // latitude
  place_url: string
}

function mapKakaoDoc(doc: KakaoDocument) {
  return {
    id: `kakao-${doc.id}`,
    name: doc.place_name,
    lat: parseFloat(doc.y),
    lng: parseFloat(doc.x),
    address: doc.road_address_name || doc.address_name || undefined,
    cuisine: doc.category_name.split(' > ').pop() || undefined,
    phone: doc.phone || undefined,
    website: doc.place_url || undefined,
  }
}

const SearchSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  radius: z.number(),
})

export const searchKakaoRestaurants = createServerFn({ method: 'GET' })
  .inputValidator(SearchSchema)
  .handler(async ({ data }) => {
    const key = process.env.KAKAO_REST_KEY
    if (!key) throw new Error('KAKAO_REST_KEY가 설정되지 않았습니다')

    const { lat, lng, radius } = data
    const headers = { Authorization: `KakaoAK ${key}` }
    const safeRadius = Math.min(radius, 20000)
    const qs = `x=${lng}&y=${lat}&radius=${safeRadius}&size=15&sort=distance`

    const [foodRes, cafeRes] = await Promise.all([
      fetch(`https://dapi.kakao.com/v2/local/search/category.json?category_group_code=FD6&${qs}`, { headers }),
      fetch(`https://dapi.kakao.com/v2/local/search/category.json?category_group_code=CE7&${qs}`, { headers }),
    ])

    if (!foodRes.ok) throw new Error(`카카오 API 오류: ${foodRes.status}`)

    const [foodJson, cafeJson] = await Promise.all([foodRes.json(), cafeRes.json()])
    const all: KakaoDocument[] = [...(foodJson.documents ?? []), ...(cafeJson.documents ?? [])]
    return all.map(mapKakaoDoc)
  })

export const geocodeKakaoAddress = createServerFn({ method: 'GET' })
  .inputValidator((d: { query: string }) => d)
  .handler(async ({ data }) => {
    const key = process.env.KAKAO_REST_KEY
    if (!key) throw new Error('KAKAO_REST_KEY가 설정되지 않았습니다')

    const res = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(data.query)}&size=1`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    )
    const json = await res.json()
    const doc = json.documents?.[0] as KakaoDocument | undefined
    if (!doc) return null
    return { lat: parseFloat(doc.y), lng: parseFloat(doc.x), name: doc.place_name }
  })

// ─── Restaurant CRUD ───────────────────────────────────────────────────────

const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
  cuisine: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
})

export const upsertRestaurant = createServerFn({ method: 'POST' })
  .inputValidator(RestaurantSchema)
  .handler(async ({ data }) => {
    await db
      .insert(restaurants)
      .values(data)
      .onConflictDoUpdate({
        target: restaurants.id,
        set: { name: data.name, address: data.address, cuisine: data.cuisine },
      })
    return { success: true }
  })

export const getRestaurantDetails = createServerFn({ method: 'GET' })
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data }) => {
    const [restaurant] = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, data.id))

    const restaurantReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.restaurantId, data.id))
      .orderBy(desc(reviews.createdAt))

    const [likeCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(likes)
      .where(eq(likes.restaurantId, data.id))

    return {
      restaurant: restaurant ?? null,
      reviews: restaurantReviews,
      likeCount: likeCount?.count ?? 0,
    }
  })

export const getUserLike = createServerFn({ method: 'GET' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: { restaurantId: string }) => d)
  .handler(async ({ data, context }) => {
    const [like] = await db
      .select()
      .from(likes)
      .where(
        sql`${likes.restaurantId} = ${data.restaurantId} AND ${likes.userId} = ${context.user.id}`
      )
    return { liked: !!like }
  })

export const toggleLike = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator((d: { restaurantId: string }) => d)
  .handler(async ({ data, context }) => {
    const [existing] = await db
      .select()
      .from(likes)
      .where(
        sql`${likes.restaurantId} = ${data.restaurantId} AND ${likes.userId} = ${context.user.id}`
      )

    if (existing) {
      await db
        .delete(likes)
        .where(
          sql`${likes.restaurantId} = ${data.restaurantId} AND ${likes.userId} = ${context.user.id}`
        )
      return { liked: false }
    } else {
      await db
        .insert(likes)
        .values({ restaurantId: data.restaurantId, userId: context.user.id })
      return { liked: true }
    }
  })

const ReviewSchema = z.object({
  restaurantId: z.string(),
  rating: z.number().min(1).max(5),
  comment: z.string().min(1).max(1000),
})

export const addReview = createServerFn({ method: 'POST' })
  .middleware([requireAuthMiddleware])
  .inputValidator(ReviewSchema)
  .handler(async ({ data, context }) => {
    const [review] = await db
      .insert(reviews)
      .values({
        restaurantId: data.restaurantId,
        userId: context.user.id,
        userName: context.user.name || context.user.email || 'Unknown',
        rating: data.rating,
        comment: data.comment,
      })
      .returning()
    return review
  })
