import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  real,
  unique,
} from 'drizzle-orm/pg-core'

export const restaurants = pgTable('restaurants', {
  id: text('id').primaryKey(), // OSM node id or custom id
  name: text('name').notNull(),
  lat: real('lat').notNull(),
  lng: real('lng').notNull(),
  address: text('address'),
  cuisine: text('cuisine'),
  phone: text('phone'),
  website: text('website'),
  createdAt: timestamp('created_at').defaultNow(),
})

export const reviews = pgTable('reviews', {
  id: serial('id').primaryKey(),
  restaurantId: text('restaurant_id')
    .notNull()
    .references(() => restaurants.id),
  userId: text('user_id').notNull(),
  userName: text('user_name').notNull(),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export const likes = pgTable(
  'likes',
  {
    id: serial('id').primaryKey(),
    restaurantId: text('restaurant_id')
      .notNull()
      .references(() => restaurants.id),
    userId: text('user_id').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (t) => [unique('likes_unique').on(t.restaurantId, t.userId)]
)
