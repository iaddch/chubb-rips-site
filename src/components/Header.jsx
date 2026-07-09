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

        <nav className="nav-menu">
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
          >
            Shop
          </Link>
        </nav>
      </div>
    </header>
  )
}
