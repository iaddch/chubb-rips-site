import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore, useCartStore } from '../store/index'
import { supabase } from '../config/supabase'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isAdmin, logout } = useAuthStore()
  const cartCount = useCartStore((state) => state.getItemCount())
  const [menuOpen, setMenuOpen] = React.useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    navigate('/')
  }

  const navLinks = [
    { label: 'Shop', to: '/' },
    { label: 'Where to find us', to: '/shows' },
    ...(isAdmin ? [{ label: 'Sales', to: '/sales' }, { label: 'Inventory', to: '/inventory' }, { label: 'Manage Shows', to: '/shows-admin' }] : []),
  ]

  const authLinks = [
    ...(isAdmin ? [{ label: 'Dashboard', to: '/inventory' }] : !user ? [{ label: 'Sign In', to: '/login' }] : []),
  ]

  // Close the mobile menu automatically whenever the route changes (link
  // click, back/forward, programmatic navigate) so it never lingers open
  // over the new page.
  React.useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  React.useEffect(() => {
    if (!menuOpen) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-50 bg-black">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <Button
            className="text-gray-400 hover:bg-white/10 hover:text-white md:hidden"
            size="icon"
            variant="ghost"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
              <path className={`origin-center transition ${menuOpen ? 'translate-y-0 rotate-45' : '-translate-y-1.5'}`} d="M4 12h16" />
              <path className={`origin-center transition ${menuOpen ? 'rotate-45' : ''}`} d="M4 12h16" />
              <path className={`origin-center transition ${menuOpen ? '-translate-y-0 rotate-135' : 'translate-y-1.5'}`} d="M4 12h16" />
            </svg>
          </Button>

          <div className="flex items-center gap-7">
            <Link className="flex items-center gap-2 text-white no-underline" to="/">
              <img src="/oshawott (1).png" alt="" className="size-8 shrink-0 rounded-lg object-cover shadow-sm" />
              <span className="hidden text-base font-semibold tracking-tight sm:inline">Chubb&apos;s Vault</span>
            </Link>

            <NavigationMenu className="hidden md:flex" viewport={false} aria-label="Main navigation">
              <NavigationMenuList className="gap-1">
              {navLinks.map((link) => (
                <NavigationMenuItem key={link.to}>
                <NavigationMenuLink
                  asChild
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 no-underline transition hover:bg-transparent hover:text-white data-active:bg-slate-800 data-active:text-white data-active:hover:bg-slate-800"
                  active={location.pathname === link.to}
                >
                  <Link to={link.to}>{link.label}</Link>
                </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>

        <div className="flex items-center gap-5">
          {user ? (
            <button type="button" className="hidden text-sm font-medium text-gray-400 no-underline transition hover:text-white sm:inline-flex" onClick={handleLogout}>
              Sign out
            </button>
          ) : null}
          {isAdmin ? (
            <Link className="hidden text-sm font-semibold text-white no-underline transition hover:text-gray-300 sm:inline-flex" to="/inventory">
              Dashboard
            </Link>
          ) : !user ? (
            <Link className="hidden text-sm font-semibold text-white no-underline transition hover:text-gray-300 sm:inline-flex" to="/login">
              Sign In
            </Link>
          ) : null}
          <Link className="relative flex items-center text-gray-400 no-underline transition hover:text-white" to="/cart" aria-label={`Cart, ${cartCount} item${cartCount === 1 ? '' : 's'}`}>
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293A1 1 0 005 17h12M9 21a1 1 0 100-2 1 1 0 000 2zm8 0a1 1 0 100-2 1 1 0 000 2z" /></svg>
            {cartCount > 0 ? (
              <span className="absolute -right-2 -top-2 grid size-4 place-items-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">{cartCount > 9 ? '9+' : cartCount}</span>
            ) : null}
          </Link>
          <Button
            asChild
            size="sm"
            className="rounded-full bg-white text-black shadow-sm hover:bg-gray-100"
          >
            <a href="https://www.instagram.com/chubbsvaultt/" target="_blank" rel="noopener noreferrer">
              Follow our Instagram!
            </a>
          </Button>
        </div>
      </div>

      <div
        id="mobile-nav-menu"
        className={`absolute inset-x-0 top-full grid overflow-hidden border-b border-slate-900 bg-slate-950/95 shadow-lg shadow-black/40 backdrop-blur-md transition-[grid-template-rows,opacity] duration-300 ease-in-out md:hidden ${
          menuOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <nav className="min-h-0 overflow-hidden" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1 px-4 py-3">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className={`rounded-lg px-4 py-3 text-base font-medium no-underline transition ${
                  location.pathname === link.to
                    ? 'bg-slate-800 text-white'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {authLinks.length || user ? (
            <div className="flex flex-col gap-1 border-t border-slate-800 px-4 py-3">
              {authLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-4 py-3 text-base font-medium text-gray-400 no-underline transition hover:bg-white/5 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <button
                  type="button"
                  className="rounded-lg px-4 py-3 text-left text-base font-medium text-gray-400 transition hover:bg-white/5 hover:text-white"
                  onClick={() => { setMenuOpen(false); handleLogout() }}
                >
                  Sign out
                </button>
              ) : null}
            </div>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
