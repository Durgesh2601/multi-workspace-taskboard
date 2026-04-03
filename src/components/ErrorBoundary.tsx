import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="login-page">
          <section className="login-card">
            <h1>Something went wrong</h1>
            <p className="muted">
              The app ran into an unexpected error. Try refreshing the page.
            </p>
            <pre style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap', color: 'var(--danger)' }}>
              {this.state.error.message}
            </pre>
            <button
              type="button"
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </section>
        </div>
      )
    }

    return this.props.children
  }
}
