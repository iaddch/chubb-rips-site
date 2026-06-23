import React from 'react'
import '../styles/ReviewList.css'

export default function ReviewList({ reviews }) {
  return (
    <div className="review-list">
      {reviews.map((review) => (
        <div key={review.id} className="review-item">
          <div className="review-header">
            <div className="reviewer-info">
              <span className="reviewer-name">{review.user_name}</span>
              <span className="review-date">
                {new Date(review.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="review-rating">
              {'★'.repeat(review.rating)}
              {'☆'.repeat(5 - review.rating)}
            </div>
          </div>
          <p className="review-comment">{review.comment}</p>
        </div>
      ))}
    </div>
  )
}
