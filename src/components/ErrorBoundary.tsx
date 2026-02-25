import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Report error to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }

    this.setState({
      error,
      errorInfo,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In a real app, you'd send this to Sentry, Bugsnag, or similar
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId
      };

      // For now, just log to console - replace with actual error reporting service
      console.error('Error Report:', errorReport);
      
      // Example: Send to your backend
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI: minimal HTML + inline styles so it never throws (e.g. in Capacitor if Button/icons fail)
      const err = this.state.error;
      const showDetails = !!err?.message;
      return (
        <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ maxWidth: 448, width: '100%', background: '#fff', borderRadius: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: 24, textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111', marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ color: '#4b5563', marginBottom: 16 }}>
              We're sorry, but something unexpected happened.
            </p>
            {/* Always show error message so users can report it (especially in Capacitor/mobile builds) */}
            {showDetails && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, padding: 12, marginBottom: 16, textAlign: 'left' }}>
                <p style={{ fontSize: '0.875rem', fontWeight: 500, color: '#991b1b', marginBottom: 4 }}>Error:</p>
                <p style={{ fontSize: '0.75rem', color: '#b91c1c', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {err.message}
                </p>
                {err.stack && (
                  <details style={{ marginTop: 8 }}>
                    <summary style={{ fontSize: '0.75rem', color: '#b91c1c', cursor: 'pointer' }}>Stack trace</summary>
                    <pre style={{ fontSize: '0.75rem', color: '#b91c1c', marginTop: 4, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {err.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                type="button"
                onClick={this.handleRetry}
                style={{ width: '100%', padding: '10px 16px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                style={{ width: '100%', padding: '10px 16px', background: 'transparent', color: '#374151', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
              >
                Go Home
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 16 }}>
              Error ID: {this.state.errorId}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

export default ErrorBoundary;