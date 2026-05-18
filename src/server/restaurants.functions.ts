import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { db } from '../../db/index.js'
import { restaurants, reviews, likes } from '../../db/schema.js'
import { eq, sql, desc } from 'drizzle-orm'
import { requireAuthMiddleware } from '../middleware/identity.js'

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
        userName: context.user.name || context.user.email,
        rating: data.rating,
        comment: data.comment,
      })
      .returning()
    return review
  })
