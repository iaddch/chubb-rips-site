import React, { useState } from 'react'
import { reviewsService } from '../services/supabaseService'
import { useAuthStore } from '../store/index'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { SelectNative } from '@/components/ui/select-native'
import { Textarea } from '@/components/ui/textarea'

export default function ReviewForm({ productId, onReviewAdded }) {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rating: 5,
    comment: '',
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!user) {
      alert('Please log in to leave a review')
      return
    }

    try {
      setLoading(true)
      await reviewsService.create({
        product_id: productId,
        user_id: user.id,
        user_name: user.email || 'Anonymous',
        rating: formData.rating,
        comment: formData.comment,
        created_at: new Date().toISOString(),
      })

      setFormData({ rating: 5, comment: '' })
      alert('Review posted successfully!')
      onReviewAdded()
    } catch (err) {
      console.error('Error posting review:', err)
      alert('Error posting review')
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
        <Label htmlFor="review-comment">Comment</Label>
        <Textarea
          id="review-comment"
          name="comment"
          value={formData.comment}
          onChange={handleInputChange}
          placeholder="Share your thoughts about this product..."
          rows="4"
          required
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Posting...' : 'Post Review'}
      </Button>
    </form>
  )
}
