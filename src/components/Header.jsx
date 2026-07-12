import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCartStore, useAuthStore } from '../store/index'
import { supabase } from '../config/supabase'
import '../styles/Header.css'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getItemCount } = useCartStore()
  const { user, setUser } = useAuthStore()
  const cartCount = getItemCount()
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/')
  }

  const handleAdminLogin = () => {
    const enteredPassword = window.prompt('Enter admin password')

    if (enteredPassword === 'Venezuela12?') {
      setIsAdmin(true)
      navigate('/sales')
    }
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <h1>Chubb's Vault</h1>
        </Link>

        <div className="header-actions">
          <a
            href="https://www.instagram.com/chubbsvaultt/"
            target="_blank"
            rel="noopener noreferrer"
            className="social-link header-social-link"
            aria-label="Follow us on Instagram"
            onClick={() => setMenuOpen(false)}
          >
            <span className="instagram-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
                <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
                <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
              </svg>
            </span>
            <span>Follow our Instagram!</span>
          </a>

          <button
            className="menu-toggle"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Shop
          </Link>

          {isAdmin && (
            <Link
              to="/sales"
              className={`nav-link ${location.pathname === '/sales' ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              Sales
            </Link>
          )}

          <button
            type="button"
            className="nav-link admin-login-link"
            onClick={handleAdminLogin}
          >
            Admin Login
          </button>
        </nav>
      </div>
    </header>
  )
}
