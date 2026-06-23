import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useCartStore } from '../store/index'
import '../styles/Cart.css'

export default function Cart() {
  const navigate = useNavigate()
  const { items, removeItem, updateItemQuantity, getTotal, clearCart } = useCartStore()

  if (items.length === 0) {
    return (
      <div className="cart-container">
        <h1>Shopping Cart</h1>
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <button className="btn-continue-shopping" onClick={() => navigate('/')}>
            Continue Shopping
          </button>
        </div>
      </div>
    )
  }

  const total = getTotal()

  return (
    <div className="cart-container">
      <h1>Shopping Cart</h1>

      <div className="cart-layout">
        {/* Cart Items */}
        <div className="cart-items-section">
          <table className="cart-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Quantity</th>
                <th>Total</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.product_id} className="cart-item">
                  <td className="product-name">
                    <div className="product-info">
                      {item.product?.image_url && (
                        <img src={item.product.image_url} alt={item.product.name} />
                      )}
                      <div>
                        <p className="name">{item.product?.name}</p>
                        <p className="set">{item.product?.set_name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="price">${item.product?.price.toFixed(2)}</td>
                  <td className="quantity">
                    <div className="qty-controls">
                      <button
                        className="qty-btn"
                        onClick={() =>
                          updateItemQuantity(
                            item.product_id,
                            Math.max(1, item.quantity - 1)
                          )
                        }
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max={item.product?.stock_quantity || 1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(item.product_id, parseInt(e.target.value) || 1)
                        }
                        className="qty-input"
                      />
                      <button
                        className="qty-btn"
                        onClick={() =>
                          updateItemQuantity(
                            item.product_id,
                            Math.min((item.product?.stock_quantity || 1), item.quantity + 1)
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </td>
                  <td className="item-total">
                    ${(item.product?.price * item.quantity).toFixed(2)}
                  </td>
                  <td className="action">
                    <button
                      className="btn-remove"
                      onClick={() => removeItem(item.product_id)}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Cart Summary */}
        <aside className="cart-summary">
          <h2>Order Summary</h2>

          <div className="summary-item">
            <span>Subtotal:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="summary-item">
            <span>Shipping:</span>
            <span>Calculated at checkout</span>
          </div>

          <div className="summary-total">
            <span>Estimated Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>

          <div className="cart-actions">
            <button className="btn-checkout" onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </button>
            <button className="btn-continue" onClick={() => navigate('/')}>
              Continue Shopping
            </button>
            <button className="btn-clear" onClick={() => {
              if (confirm('Clear all items from cart?')) {
                clearCart()
              }
            }}>
              Clear Cart
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
