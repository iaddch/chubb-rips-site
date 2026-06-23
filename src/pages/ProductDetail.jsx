import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsService, reviewsService } from '../services/supabaseService'
import { useAuthStore, useCartStore } from '../store/index'
import ReviewList from '../components/ReviewList'
import ReviewForm from '../components/ReviewForm'
import '../styles/ProductDetail.css'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { addItem } = useCartStore()
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [averageRating, setAverageRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)

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

  const handleAddToCart = () => {
    if (product.stock_quantity < quantity) {
      alert('Not enough stock available')
      return
    }
    addItem(product, quantity)
    alert(`Added ${quantity} to cart!`)
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
              <dt>Stock:</dt>
              <dd className={product.stock_quantity > 0 ? 'in-stock' : 'out-of-stock'}>
                {product.stock_quantity > 0 ? `${product.stock_quantity} available` : 'Out of Stock'}
              </dd>
            </dl>
          </div>

          {/* Add to Cart */}
          <div className="add-to-cart-section">
            <label>
              Quantity:
              <input
                type="number"
                min="1"
                max={product.stock_quantity || 1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                disabled={product.stock_quantity === 0}
              />
            </label>
            <button
              className="btn-add-to-cart-large"
              onClick={handleAddToCart}
              disabled={product.stock_quantity === 0}
            >
              Add to Cart
            </button>
          </div>
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
