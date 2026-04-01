import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login, session, sessionState } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('durgesh@example.com')
  const [password, setPassword] = useState('demo1234')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (session) {
    return <Navigate to="/app" replace />
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await login({ email, password })
      navigate(location.state?.from ?? '/app')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to log in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <p className="eyebrow">Frontend engineering assignment</p>
        <h1>Sign in to your workspaces</h1>
        <p className="muted">
          Demo auth is mocked locally. Use any valid-looking email and password to continue.
        </p>

        {sessionState === 'expired' ? (
          <div className="alert warning">
            Your session expired. Sign in again to keep the board in sync.
          </div>
        ) : null}

        {error ? <div className="alert error">{error}</div> : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
            />
          </label>
          <button type="submit" className="primary-button" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </section>
    </div>
  )
}
