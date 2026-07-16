import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/index'
import { supabase } from '../config/supabase'
import { Button } from '@/components/ui/button'
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from '@/components/ui/navigation-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
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
      setMenuOpen(false)
      navigate('/sales')
    }
  }

  const navLinks = [
    { label: 'Shop', to: '/' },
    ...(isAdmin ? [{ label: 'Sales', to: '/sales' }, { label: 'Inventory', to: '/inventory' }] : []),
  ]

  return (
    <header className="sticky top-0 z-50 bg-black">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-2">
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button className="group text-gray-400 hover:bg-white/10 hover:text-white md:hidden" size="icon" variant="ghost" aria-label="Toggle navigation menu">
              <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
                <path className={`origin-center transition ${menuOpen ? 'translate-y-0 rotate-45' : '-translate-y-1.5'}`} d="M4 12h16" />
                <path className={`origin-center transition ${menuOpen ? 'rotate-45' : ''}`} d="M4 12h16" />
                <path className={`origin-center transition ${menuOpen ? '-translate-y-0 rotate-135' : 'translate-y-1.5'}`} d="M4 12h16" />
              </svg>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-44 p-1.5 md:hidden">
                <NavigationMenu className="max-w-none *:w-full" viewport={false}>
                  <NavigationMenuList className="flex-col items-stretch gap-1">
                  {navLinks.map((link) => (
                    <NavigationMenuItem className="w-full" key={link.to}>
                    <NavigationMenuLink
                      asChild
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 no-underline transition hover:bg-slate-50 hover:text-slate-950 data-active:bg-emerald-50 data-active:text-emerald-700 data-active:hover:bg-emerald-50"
                      active={location.pathname === link.to}
                    >
                      <Link to={link.to} onClick={() => setMenuOpen(false)}>{link.label}</Link>
                    </NavigationMenuLink>
                    </NavigationMenuItem>
                  ))}
                  </NavigationMenuList>
                </NavigationMenu>
            </PopoverContent>
          </Popover>

          <div className="flex items-center gap-7">
            <Link className="flex items-center gap-2 text-white no-underline" to="/">
              <span className="grid size-8 place-items-center rounded-lg bg-emerald-500 text-sm font-black text-white shadow-sm">C</span>
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
          ) : (
            <button type="button" className="hidden text-sm font-semibold text-white no-underline transition hover:text-gray-300 sm:inline-flex" onClick={handleAdminLogin}>
              Admin Login
            </button>
          )}
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
    </header>
  )
}
