/** @jsxImportSource react */
import React, { Component } from 'react';

/**
 * @typedef {Object} Props
 * @property {React.ReactNode} children
 * @property {React.ReactNode} [fallback]
 * @property {Function} [onError]
 */

/**
 * @typedef {Object} State
 * @property {boolean} hasError
 * @property {Error} [error]
 */

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    /** @type {{ hasError: boolean; error?: Error }} */
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <>
          <div className="flex min-h-[300px] items-center justify-center p-6">
            <div className="text-center space-y-4 rounded-2xl border border-border bg-card p-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <svg className="h-8 w-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77-1.333.192 3 1.732 3h13.856z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">Something went wrong</h2>
                <p className="text-sm text-muted-foreground">We encountered an unexpected error. Our team has been notified.</p>
                {import.meta.env.DEV && this.state.error && (
                  <details className="mt-4 text-left text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Error details</summary>
                    <pre className="mt-2 overflow-auto rounded bg-muted p-2">{this.state.error.stack}</pre>
                  </details>
                )}
              </div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                Reload page
              </button>
            </div>
          </div>
        </>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;