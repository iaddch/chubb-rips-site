import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsService, reviewsService } from '../services/supabaseService'
import { useAuthStore } from '../store/index'
import ReviewList from '../components/ReviewList'
import ReviewForm from '../components/ReviewForm'
import '../styles/ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProduct()
  }, [id])

  const fetchProduct = async () => {
    try {
      setLoading(true)
      const productData = await productsService.getById(id)
      setProduct(productData)

      const reviewsData = await reviewsService.getByProductId(id)
      setReviews(reviewsData)

      const avgRating = await reviewsService.getAverageRating(id)
      setAverageRating(avgRating)
    } catch (err) {
      console.error('Error fetching product:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewAdded = () => {
    fetchProduct()
  }

  if (loading) return <div className="loading">Loading product...</div>
  if (!product) return <div className="not-found">Product not found</div>

  return (
    <div className="product-detail-container">
      <button className="btn-back" onClick={() => navigate('/')}>
        ← Back to Catalog
      </button>

      <div className="product-detail">
        {/* Product Image */}
        <div className="product-detail-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="no-image">No image available</div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-detail-info">
          <h1>{product.name}</h1>
          <p className="product-set-name">{product.set_name}</p>

          {/* Rating */}
          <div className="rating-section">
            <span className="stars">
              {'★'.repeat(Math.round(averageRating))}
              {'☆'.repeat(5 - Math.round(averageRating))}
            </span>
            <span className="rating-value">({averageRating.toFixed(1)})</span>
            <span className="review-count">({reviews.length} reviews)</span>
          </div>

          {/* Price */}
          <div className="price-section">
            <h2 className="price">${product.price.toFixed(2)}</h2>
          </div>

          {/* Description */}
          {product.description && (
            <div className="description">
              <h3>Description</h3>
              <p>{product.description}</p>
            </div>
          )}

          {/* Details */}
          <div className="details-section">
            <h3>Product Details</h3>
            <dl>
              {product.card_details && (
                <>
                  <dt>Card Type:</dt>
                  <dd>{product.card_details}</dd>
                </>
              )}
              {product.condition && (
                <>
                  <dt>Condition:</dt>
                  <dd>{product.condition}</dd>
                </>
              )}
              <dt>Availability:</dt>
              <dd className={product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}>
                {product.stock_quantity > 0 ? 'In Stock' : 'Out of Stock'}
              </dd>
            </dl>
          </div>

          <a
            className="instagram-inquiry-link"
            href="https://ig.me/m/chubbsvaultt"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Ask about ${product.name} on Instagram`}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
            </svg>
            Ask About Product
          </a>

        </div>
      </div>

      {/* Reviews Section */}
      <div className="reviews-section">
        <h2>Customer Reviews</h2>

        {user ? (
          <ReviewForm productId={id} onReviewAdded={handleReviewAdded} />
        ) : (
          <p className="login-prompt">
            <a href="/login">Log in</a> to leave a review
          </p>
        )}

        {reviews.length > 0 ? (
          <ReviewList reviews={reviews} />
        ) : (
          <p className="no-reviews">No reviews yet. Be the first to review!</p>
        )}
      </div>
    </div>
  )
}
