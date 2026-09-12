import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-paper p-6 text-center">
          <div className="max-w-md w-full bg-white rounded-card p-6 border border-paperDim shadow-glass">
            <span className="text-3xl mb-2 block">⚠️</span>
            <h2 className="font-display text-xl font-bold text-ink mb-2">Something went wrong</h2>
            <p className="text-slate text-sm mb-4">
              An unhandled UI error occurred. Please refresh or return home.
            </p>
            <div className="bg-paper p-3 rounded text-left font-mono text-xs text-vital overflow-x-auto mb-4">
              {this.state.error?.toString()}
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-primary w-full py-2 text-sm"
            >
              Return to Home
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
