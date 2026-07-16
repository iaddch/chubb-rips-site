import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { supabase } from './config/supabase'
import { useAuthStore } from './store/index'
import Header from './components/Header'
import AdminRoute from './components/AdminRoute'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import ThankYou from './pages/ThankYou'
import Login from './pages/Login'
import SalesPage from './pages/SalesPage'
import InventoryPage from './pages/InventoryPage'
import NotFound from './pages/NotFound'
import './App.css'

// Looks up the is_admin flag for a signed-in user. Never trust a client-
// side flag for this - it only reads a row that Supabase RLS restricts to
// "your own profile", so this is purely for showing/hiding admin UI. The
// tables the admin pages touch enforce is_admin again themselves via RLS.
const fetchIsAdmin = async (userId) => {
  if (!userId) return false
  const { data, error } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single()
  if (error) {
    console.error('Error fetching admin status:', error)
    return false
  }
  return Boolean(data?.is_admin)
}

export default function App() {
  const { setUser, setLoading, setIsAdmin } = useAuthStore()

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession()
        const sessionUser = data?.session?.user || null
        setUser(sessionUser)
        setIsAdmin(await fetchIsAdmin(sessionUser?.id))
      } catch (err) {
        console.error('Auth error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const sessionUser = session?.user || null
        setUser(sessionUser)
        fetchIsAdmin(sessionUser?.id).then(setIsAdmin)
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [setUser, setLoading, setIsAdmin])

  return (
    <Router>
      <div className="app">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Catalog />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/thank-you" element={<ThankYou />} />
            <Route path="/order-confirmation" element={<OrderConfirmation />} />
            <Route path="/login" element={<Login />} />
            <Route path="/sales" element={<AdminRoute><SalesPage /></AdminRoute>} />
            <Route path="/inventory" element={<AdminRoute><InventoryPage /></AdminRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}
