import React, { useState } from 'react'
import { reviewsService } from '../services/supabaseService'
import { useAuthStore } from '../store/index'
import '../styles/ReviewForm.css'

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
    <form onSubmit={handleSubmit} className="review-form">
      <div className="form-group">
        <label>Rating</label>
        <select
          name="rating"
          value={formData.rating}
          onChange={handleInputChange}
          className="rating-select"
        >
          <option value={1}>1 Star - Poor</option>
          <option value={2}>2 Stars - Fair</option>
          <option value={3}>3 Stars - Good</option>
          <option value={4}>4 Stars - Very Good</option>
          <option value={5}>5 Stars - Excellent</option>
        </select>
      </div>

      <div className="form-group">
        <label>Comment</label>
        <textarea
          name="comment"
          value={formData.comment}
          onChange={handleInputChange}
          placeholder="Share your thoughts about this product..."
          rows="4"
          required
        />
      </div>

      <button type="submit" className="btn-submit-review" disabled={loading}>
        {loading ? 'Posting...' : 'Post Review'}
      </button>
    </form>
  )
}
