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
  /** Original thrown value (for display when error.message is empty) */
  rawError: unknown;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      rawError: null
    };
  }

  /** Pull message from Error or common API/shape so we don't show "Unknown error". */
  private static messageFrom(error: unknown): string {
    if (error == null) return String(error);
    if (error instanceof Error) {
      if (error.message) return error.message;
      const cause = (error as Error & { cause?: unknown }).cause;
      if (cause != null) {
        if (cause instanceof Error && cause.message) return cause.message;
        const s = typeof cause === "string" ? cause : String(cause);
        if (s && s !== "[object Object]") return s;
      }
      return error.name || "Error";
    }
    if (typeof error === "string") return error;
    if (typeof error === "object") {
      const o = error as Record<string, unknown>;
      const msg =
        o.message ?? o.error ?? o.error_description ?? o.description ?? o.msg ?? o.err ?? o.reason;
      if (msg != null && typeof msg === "string") return msg;
      const code = o.code ?? o.status ?? o.statusCode;
      const details = o.details ?? o.hint;
      if (code != null || details != null) {
        const parts = [code != null ? `code: ${code}` : "", details != null ? String(details) : ""].filter(Boolean);
        return parts.join(" — ") || "Error";
      }
      try {
        return JSON.stringify(o);
      } catch {
        return Object.prototype.toString.call(o);
      }
    }
    return String(error);
  }

  /** Stringify raw error for technical details (enumerable props so we see code, details, hint, cause). */
  private static stringifyRawError(raw: unknown): string {
    if (raw == null) return String(raw);
    if (typeof raw === "string") return raw;
    if (raw instanceof Error) {
      const err = raw as Error & { cause?: unknown; code?: unknown; details?: unknown; hint?: unknown };
      const extra: Record<string, unknown> = {};
      if (err.cause != null) extra.cause = err.cause instanceof Error ? { message: err.cause.message, name: err.cause.name } : err.cause;
      if (err.code != null) extra.code = err.code;
      if (err.details != null) extra.details = err.details;
      if (err.hint != null) extra.hint = err.hint;
      const base = { message: err.message, name: err.name, ...extra };
      try {
        return JSON.stringify(base, null, 2);
      } catch {
        return err.stack || err.toString();
      }
    }
    if (typeof raw === "object") {
      try {
        return JSON.stringify(raw, null, 2);
      } catch {
        return Object.prototype.toString.call(raw);
      }
    }
    return String(raw);
  }

  static getDerivedStateFromError(error: Error | unknown): State {
    const msg = ErrorBoundary.messageFrom(error);
    const err = error instanceof Error ? error : new Error(msg);
    if (!err.message) err.message = msg;
    return {
      hasError: true,
      error: err,
      errorInfo: null,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rawError: error
    };
  }

  componentDidCatch(error: Error | unknown, errorInfo: ErrorInfo) {
    const msg = ErrorBoundary.messageFrom(error);
    const err = error instanceof Error ? error : new Error(msg);
    if (!err.message) err.message = msg;
    const stack = err.stack ?? errorInfo?.componentStack ?? "";
    console.error("ErrorBoundary caught:", msg);
    if (stack) console.error(stack);
    console.error("ErrorBoundary componentStack:", errorInfo?.componentStack);
    console.error("ErrorBoundary raw error:", error);
    this.setState({
      error: err,
      errorInfo,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      rawError: error
    });

    if (process.env.NODE_ENV === "production") {
      this.reportError(err, errorInfo, error);
    }

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(err, errorInfo);
    }
  }

  private reportError = async (error: Error, errorInfo: ErrorInfo, rawError?: unknown) => {
    try {
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        rawError: rawError ?? this.state.rawError,
        rawErrorStringified: rawError != null ? ErrorBoundary.stringifyRawError(rawError) : undefined,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId
      };
      console.error("Error Report:", errorReport);
      
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
      errorId: '',
      rawError: null
    });
  };

  private handleGoHome = () => {
    // Use hash for in-app routing (e.g. Capacitor HashRouter); fallback to full reload
    try {
      if (window.location.hash !== undefined) {
        window.location.hash = '#/';
        return;
      }
    } catch {}
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI: minimal HTML + inline styles so it never throws (e.g. in Capacitor)
      const err = this.state.error;
      const raw = this.state.rawError;
      const componentStack = this.state.errorInfo?.componentStack ?? "";
      let displayMessage =
        (err?.message ?? (err != null && typeof err === "object" && "toString" in err ? (err as Error).toString() : String(err))) || "";
      if (!displayMessage || displayMessage === "Unknown error") {
        displayMessage = ErrorBoundary.messageFrom(raw) || "Unknown error";
      }
      if (!displayMessage || displayMessage === "Unknown error") {
        try {
          displayMessage =
            (raw != null && typeof raw === "object"
              ? JSON.stringify(raw, null, 2).slice(0, 1000)
              : String(raw)) || "Unknown error";
        } catch {
          displayMessage = String(raw ?? "Unknown error");
        }
      }
      const technicalDetails = ErrorBoundary.stringifyRawError(raw);
      const hasUsefulTechnical = technicalDetails && technicalDetails.length > 10 && technicalDetails !== displayMessage;
      const isGenericError = displayMessage === "Error" || displayMessage === "Unknown error";
      let userMessage = displayMessage;
      if (isGenericError) {
        if (hasUsefulTechnical) {
          const firstLine = technicalDetails.split("\n")[0]?.trim().slice(0, 200) ?? technicalDetails.slice(0, 200);
          userMessage = firstLine || "Connection or session issue. See Technical details below.";
        } else {
          userMessage = "Connection or session issue. Tap Try Again or log out and log back in.";
        }
      }
      const displayStack = err?.stack ?? componentStack;
      const hasExtra = componentStack && componentStack !== displayStack;
      return (
        <div style={{ minHeight: "100vh", background: "#f9fafb", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ maxWidth: 448, width: "100%", background: "#fff", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", padding: 24, textAlign: "center" }}>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111", marginBottom: 8 }}>
              Something went wrong
            </h1>
            <p style={{ color: "#4b5563", marginBottom: 16 }}>
              We're sorry, but something unexpected happened.
            </p>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, padding: 12, marginBottom: 16, textAlign: "left" }}>
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#991b1b", marginBottom: 4 }}>Error:</p>
              <p style={{ fontSize: "0.75rem", color: "#b91c1c", fontFamily: "monospace", wordBreak: "break-all" }}>
                {userMessage}
              </p>
              {isGenericError && hasUsefulTechnical && (
                <p style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 6 }}>
                  (Original message was empty; see Technical details below.)
                </p>
              )}
              {isGenericError && !hasUsefulTechnical && (
                <p style={{ fontSize: "0.7rem", color: "#6b7280", marginTop: 6 }}>
                  (Original: {displayMessage})
                </p>
              )}
              {hasUsefulTechnical && (
                <details style={{ marginTop: 8 }} open={isGenericError}>
                  <summary style={{ fontSize: "0.75rem", color: "#991b1b", cursor: "pointer" }}>Technical details (code, cause, etc.)</summary>
                  <pre style={{ fontSize: "0.7rem", color: "#b91c1c", marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-all", maxHeight: 200, overflow: "auto" }}>
                    {technicalDetails.slice(0, 2000)}
                  </pre>
                </details>
              )}
              {displayStack && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: "0.75rem", color: "#b91c1c", cursor: "pointer" }}>Stack trace</summary>
                  <pre style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {displayStack}
                  </pre>
                </details>
              )}
              {hasExtra && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ fontSize: "0.75rem", color: "#991b1b", cursor: "pointer" }}>Component stack</summary>
                  <pre style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: 4, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                    {componentStack}
                  </pre>
                </details>
              )}
            </div>
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