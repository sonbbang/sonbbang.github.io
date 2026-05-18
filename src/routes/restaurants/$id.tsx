import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import {
  getRestaurantDetails,
  toggleLike,
  addReview,
} from '../../server/restaurants.functions'
import { useIdentity } from '../../lib/identity-context'
import { Heart, Star, ArrowLeft, MapPin, Phone, Globe, MessageSquare } from 'lucide-react'

export const Route = createFileRoute('/restaurants/$id')({
  loader: async ({ params }) => {
    const data = await getRestaurantDetails({ data: { id: params.id } })
    return data
  },
  component: RestaurantDetailPage,
})

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange?: (v: number) => void
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange?.(star)}
          onMouseEnter={() => onChange && setHover(star)}
          onMouseLeave={() => onChange && setHover(0)}
          className={`text-2xl transition-transform ${onChange ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            size={24}
            className={
              star <= (hover || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }
          />
        </button>
      ))}
    </div>
  )
}

function RestaurantDetailPage() {
  const { restaurant, reviews, likeCount } = Route.useLoaderData()
  const { id } = Route.useParams()
  const { user, ready } = useIdentity()
  const navigate = useNavigate()

  const [liked, setLiked] = useState(false)
  const [localLikeCount, setLocalLikeCount] = useState(likeCount)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localReviews, setLocalReviews] = useState(reviews)
  const [likeLoading, setLikeLoading] = useState(false)

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-4">식당 정보를 찾을 수 없습니다</p>
          <Link to="/" className="text-orange-500 hover:underline">홈으로 돌아가기</Link>
        </div>
      </div>
    )
  }

  const avgRating =
    localReviews.length > 0
      ? localReviews.reduce((s, r) => s + r.rating, 0) / localReviews.length
      : 0

  const handleLike = async () => {
    if (!user) {
      navigate({ to: '/login' })
      return
    }
    setLikeLoading(true)
    try {
      const result = await toggleLike({ data: { restaurantId: id } })
      setLiked(result.liked)
      setLocalLikeCount((c) => c + (result.liked ? 1 : -1))
    } finally {
      setLikeLoading(false)
    }
  }

  const handleReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      navigate({ to: '/login' })
      return
    }
    if (!comment.trim()) return
    setSubmitting(true)
    try {
      const review = await addReview({
        data: { restaurantId: id, rating, comment },
      })
      if (review) {
        setLocalReviews((prev) => [review as any, ...prev])
        setComment('')
        setRating(5)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 text-sm"
        >
          <ArrowLeft size={16} /> 목록으로
        </Link>

        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {restaurant.cuisine && (
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                    {restaurant.cuisine}
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-bold mb-2">{restaurant.name}</h1>

              {avgRating > 0 && (
                <div className="flex items-center gap-2 mb-3">
                  <StarRating value={Math.round(avgRating)} />
                  <span className="text-sm text-gray-500">
                    {avgRating.toFixed(1)} ({localReviews.length}개 리뷰)
                  </span>
                </div>
              )}

              <div className="space-y-1 text-sm text-gray-600">
                {restaurant.address && (
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-orange-400 flex-shrink-0" />
                    <span>{restaurant.address}</span>
                  </div>
                )}
                {restaurant.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={14} className="text-orange-400 flex-shrink-0" />
                    <a href={`tel:${restaurant.phone}`} className="hover:text-orange-500">{restaurant.phone}</a>
                  </div>
                )}
                {restaurant.website && (
                  <div className="flex items-center gap-2">
                    <Globe size={14} className="text-orange-400 flex-shrink-0" />
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 truncate">
                      {restaurant.website.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleLike}
              disabled={likeLoading}
              className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-red-50 transition-colors"
            >
              <Heart
                size={28}
                className={liked ? 'fill-red-500 text-red-500' : 'text-gray-300'}
              />
              <span className="text-sm font-semibold text-gray-600">{localLikeCount}</span>
            </button>
          </div>
        </div>

        {/* Map preview */}
        <a
          href={`https://www.google.com/maps?q=${restaurant.lat},${restaurant.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block bg-white rounded-2xl shadow-sm overflow-hidden mb-6 hover:shadow-md transition-shadow"
        >
          <img
            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${restaurant.lat},${restaurant.lng}&zoom=16&size=600x200&markers=${restaurant.lat},${restaurant.lng},red`}
            alt="지도"
            className="w-full h-40 object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
          <div className="p-3 text-center text-sm text-orange-500 font-medium">
            📍 Google Maps에서 보기
          </div>
        </a>

        {/* Review Form */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <MessageSquare size={20} className="text-orange-500" /> 리뷰 작성
          </h2>
          {!ready ? null : !user ? (
            <div className="text-center py-4">
              <p className="text-gray-500 mb-3">리뷰를 작성하려면 로그인이 필요합니다</p>
              <Link
                to="/login"
                className="inline-block px-6 py-2 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition-colors"
              >
                로그인하기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleReview} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">별점</label>
                <StarRating value={rating} onChange={setRating} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">리뷰</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="이 식당에 대한 경험을 공유해주세요..."
                  rows={3}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-orange-400 focus:outline-none resize-none transition-colors"
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors disabled:opacity-50"
              >
                {submitting ? '등록 중...' : '리뷰 등록'}
              </button>
            </form>
          )}
        </div>

        {/* Reviews */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Star size={20} className="text-yellow-400 fill-yellow-400" />
            리뷰 {localReviews.length > 0 && `(${localReviews.length})`}
          </h2>
          {localReviews.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-400">
              아직 리뷰가 없습니다. 첫 번째 리뷰를 남겨보세요!
            </div>
          ) : (
            localReviews.map((review) => (
              <div key={review.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold text-sm">{review.userName}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(review.createdAt!).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <StarRating value={review.rating} />
                </div>
                <p className="text-gray-700 text-sm leading-relaxed">{review.comment}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
