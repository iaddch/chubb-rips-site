import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LockIcon } from 'lucide-react'
import { supabase } from '../config/supabase'
import { useAuthStore } from '../store/index'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const darkInputClassName = 'border-slate-800 bg-slate-900 text-slate-100 shadow-none has-focus-visible:border-indigo-500 has-focus-visible:ring-[3px] has-focus-visible:ring-indigo-500/40'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setNotice('')

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match.')
          return
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (signUpError) throw signUpError

        setNotice('Check your email for the confirmation link!')
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (signInError) throw signInError

        setUser(data.user)
        navigate('/')
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-4rem)] place-items-center bg-gradient-to-br from-slate-900 via-slate-950 to-black p-6">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950/80 p-8 shadow-2xl shadow-black/40 backdrop-blur-md">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
            <LockIcon className="size-5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-white">{isSignUp ? 'Create New Account' : 'Login'}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-slate-300">Email</Label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className={darkInputClassName}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-slate-300">Password</Label>
            <Input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength="6"
              className={darkInputClassName}
            />
          </div>

          {isSignUp && (
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-300">Confirm Password</Label>
              <Input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength="6"
                className={darkInputClassName}
              />
            </div>
          )}

          {error ? <div className="rounded-lg border border-red-900 bg-red-950/60 px-3 py-2 text-sm text-red-300" role="alert">{error}</div> : null}
          {notice ? <div className="rounded-lg border border-emerald-900 bg-emerald-950/60 px-3 py-2 text-sm text-emerald-300" role="status">{notice}</div> : null}

          <Button
            type="submit"
            className="mt-2 h-auto w-full py-3 px-6 text-base font-bold"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-800 pt-6 text-center">
          <Button
            variant="ghost"
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(''); setNotice('') }}
            className="text-sm font-medium text-indigo-400 hover:bg-white/5 hover:text-indigo-300"
          >
            {isSignUp
              ? 'Already have an account? Login'
              : 'Need an account? Create New Account'
            }
          </Button>
        </div>

        <div className="mt-2 text-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-sm text-slate-500 hover:bg-white/5 hover:text-slate-300">
            ← Back to Store
          </Button>
        </div>
      </div>
    </div>
  )
}
