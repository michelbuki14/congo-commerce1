import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    // Could send to error reporting service here (Sentry, LogRocket, etc.)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    const { t } = useTranslation();
    const { hasError, error } = this.state;

    if (hasError) {
      // If a fallback UI is provided as a prop, use it
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex min-h-[400px] items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="h-8 w-8" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-foreground">
              {t('errorBoundary.somethingWentWrong')}
            </h2>
            <p className="text-muted-foreground max-w-md">
              {t('errorBoundary.tryAgain')}
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t('errorBoundary.retry')}
            </button>
            {process.env.NODE_ENV !== 'production' && error && (
              <details className="text-left text-xs text-muted-foreground mt-4 max-w-md mx-auto">
                <summary className="cursor-pointer select-none mb-1">
                  {t('errorBoundary.details')}
                </summary>
                <pre className="overflow-auto rounded bg-muted p-3 text-[11px]">
                  {error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;