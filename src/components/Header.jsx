import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useCartStore, useAuthStore, useProductStore } from '../store/index'
import { supabase } from '../config/supabase'
import '../styles/Header.css'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { getItemCount } = useCartStore()
  const { user, setUser } = useAuthStore()
  const cartCount = getItemCount()
  const { setFilters, filters } = useProductStore()
  const [searchTerm, setSearchTerm] = React.useState(filters?.search || '')
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setFilters({ search: searchTerm }), 350)
    return () => clearTimeout(t)
  }, [searchTerm])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    navigate('/')
  }

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <h1>Chubb's Vault</h1>
        </Link>

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

        <nav className={`nav-menu ${menuOpen ? 'open' : ''}`}>
          <div className="header-search">
            <input
              type="search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search products"
              className="search-input"
            />
          </div>
          <Link
            to="/"
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            onClick={() => setMenuOpen(false)}
          >
            Shop
          </Link>
          <div className="social-bar">
            <a
              href="https://www.instagram.com/chubbsvaultt/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-link"
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
          </div>
        </nav>
      </div>
    </header>
  )
}
