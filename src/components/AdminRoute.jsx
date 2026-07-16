import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/index'

// Client-side gate for admin-only pages. This is a UX convenience only -
// the real enforcement is the "is_admin" RLS check on the events/sales/
// inventory tables in Supabase, so a bypass here can't expose any data,
// it can only be an annoyance.
export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuthStore()
  const location = useLocation()

  if (loading) {
    return <div className="grid min-h-[50vh] place-items-center text-sm text-slate-500">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Access denied</h1>
        <p className="mt-2 text-sm text-slate-500">Your account does not have admin access.</p>
      </div>
    )
  }

  return children
}
