import React, { useState } from 'react'
import { reviewsService } from '../services/supabaseService'
import { useAuthStore } from '../store/index'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'

const MAX_COMMENT_LENGTH = 1000

export default function ReviewForm({ productId, onReviewAdded }) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!user) {
      setError('Please log in to leave a review.')
      return
    }

    const comment = formData.comment.trim()
    if (!comment) {
      setError('Please share a few words before posting.')
      return
    }

    try {
      setLoading(true)
      await reviewsService.create({
        product_id: productId,
        user_id: user.id,
        user_name: user.email || 'Anonymous',
        rating: formData.rating,
        comment,
        created_at: new Date().toISOString(),
      })

      setFormData({ rating: 5, comment: '' })
      onReviewAdded()
    } catch (err) {
      console.error('Error posting review:', err)
      setError('We couldn’t post your review. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value,
    }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-1.5">
        <Label htmlFor="review-rating">Rating</Label>
        <SelectNative id="review-rating" name="rating" value={formData.rating} onChange={handleInputChange}>
          <option value={1}>1 Star - Poor</option>
          <option value={2}>2 Stars - Fair</option>
          <option value={3}>3 Stars - Good</option>
          <option value={4}>4 Stars - Very Good</option>
          <option value={5}>5 Stars - Excellent</option>
        </SelectNative>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="review-comment">Comment</Label>
          <span className="text-xs text-slate-500">{formData.comment.length}/{MAX_COMMENT_LENGTH}</span>
        </div>
        <Textarea
          id="review-comment"
          name="comment"
          value={formData.comment}
          onChange={handleInputChange}
          placeholder="Share your thoughts about this product..."
          rows="4"
          maxLength={MAX_COMMENT_LENGTH}
          required
        />
      </div>

      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</div> : null}

      <Button type="submit" disabled={loading}>
        {loading ? 'Posting...' : 'Post Review'}
      </Button>
    </form>
  )
}
