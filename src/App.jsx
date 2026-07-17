import { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { supabase } from './config/supabase'
import { siteSettingsService } from './services/supabaseService'
import { useAuthStore, useSiteSettingsStore } from './store/index'
import Header from './components/Header'
import AdminRoute from './components/AdminRoute'
import Catalog from './pages/Catalog'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import Login from './pages/Login'
import SalesPage from './pages/SalesPage'
import InventoryPage from './pages/InventoryPage'
import UpcomingShowsPage from './pages/UpcomingShowsPage'
import ShowsAdminPage from './pages/ShowsAdminPage'
import NotFound from './pages/NotFound'
import { ToastProvider } from '@/components/ui/toast'
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

  useEffect(() => {
    const { setCheckoutsEnabled } = useSiteSettingsStore.getState()

    siteSettingsService.get()
      .then((settings) => setCheckoutsEnabled(settings.checkouts_enabled))
      .catch((err) => console.error('Error fetching site settings:', err))

    // Pushes the current checkout status to every open tab the instant an
    // admin flips it, so customers mid-checkout don't need to refresh.
    const channel = supabase
      .channel('site_settings_changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'site_settings' },
        (payload) => setCheckoutsEnabled(payload.new.checkouts_enabled)
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return (
    <ToastProvider>
      <Router>
        <div className="app">
          <Header />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Catalog />} />
              <Route path="/shows" element={<UpcomingShowsPage />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/sales" element={<AdminRoute><SalesPage /></AdminRoute>} />
              <Route path="/inventory" element={<AdminRoute><InventoryPage /></AdminRoute>} />
              <Route path="/shows-admin" element={<AdminRoute><ShowsAdminPage /></AdminRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ToastProvider>
  )
}
