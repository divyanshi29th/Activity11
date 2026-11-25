import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/useAuth'

export default function LoginPage({ onShowToast }) {
  const [mode, setMode] = useState('signin')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const { isAuthenticated, loading, signIn, signUp } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const redirectTo = location.state?.from?.pathname || '/book'
  const redirectState = location.state?.from?.state

  if (!loading && isAuthenticated) {
    return <Navigate to={redirectTo} state={redirectState} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMessage('')
    setInfoMessage('')
    setSubmitting(true)

    if (mode === 'signin') {
      const { error } = await signIn({ email: email.trim(), password })
      setSubmitting(false)

      if (error) {
        setErrorMessage(error.message)
        return
      }

      onShowToast?.('Signed in successfully!')
      navigate(redirectTo, { state: redirectState, replace: true })
      return
    }

    const { data, error } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
    })
    setSubmitting(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    if (data?.session) {
      onShowToast?.('Account created and signed in!')
      navigate(redirectTo, { state: redirectState, replace: true })
    } else {
      setInfoMessage(
        'Check your email inbox for the confirmation link, then sign in with your password.'
      )
      setMode('signin')
    }
  }

  return (
    <section className="card auth-card">
      <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signin'}
          className={`btn-small view-btn ${mode === 'signin' ? 'active' : ''}`}
          onClick={() => {
            setMode('signin')
            setErrorMessage('')
            setInfoMessage('')
          }}
        >
          Sign In
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'signup'}
          className={`btn-small view-btn ${mode === 'signup' ? 'active' : ''}`}
          onClick={() => {
            setMode('signup')
            setErrorMessage('')
            setInfoMessage('')
          }}
        >
          Create Account
        </button>
      </div>

      <h2>{mode === 'signin' ? 'Sign In to Book IPL Tickets' : 'Create Your Account'}</h2>
      <p className="auth-subtitle">
        {location.state?.from
          ? 'Please sign in to access booking and your saved ticket history.'
          : 'Sign in with your Supabase Auth email and password.'}
      </p>

      {errorMessage && (
        <div className="auth-alert auth-alert-error" role="alert">
          {errorMessage}
        </div>
      )}

      {infoMessage && (
        <div className="auth-alert auth-alert-info" role="status">
          {infoMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <div className="form-group">
            <label htmlFor="auth-fullname">Full Name:</label>
            <input
              id="auth-fullname"
              type="text"
              minLength={3}
              maxLength={50}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
              required
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor="auth-email">Email Address:</label>
          <input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@email.com"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="auth-password">Password:</label>
          <input
            id="auth-password"
            type="password"
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" disabled={submitting}>
            {submitting
              ? 'Please wait...'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </div>
      </form>
    </section>
  )
}
