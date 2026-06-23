import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../config/supabase'
import { useAuthStore } from '../store/index'
import '../styles/Login.css'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
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

    try {
      if (isSignUp) {
        if (formData.password !== formData.confirmPassword) {
          alert('Passwords do not match')
          return
        }

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
        })

        if (error) throw error

        alert('Check your email for the confirmation link!')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        })

        if (error) throw error

        setUser(data.user)
        navigate('/')
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{isSignUp ? 'Create Account' : 'Sign In'}</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              minLength="6"
            />
          </div>

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                minLength="6"
              />
            </div>
          )}

          <button
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="auth-toggle">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="btn-toggle"
          >
            {isSignUp
              ? 'Already have an account? Sign In'
              : 'Need an account? Sign Up'
            }
          </button>
        </div>

        <div className="back-link">
          <button onClick={() => navigate('/')} className="btn-back">
            ← Back to Store
          </button>
        </div>
      </div>
    </div>
  )
}