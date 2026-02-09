import React, { useEffect, useRef } from 'react';
import { AlertCircle, X, CreditCard, WifiOff, RefreshCw, AlertTriangle } from 'lucide-react';
import type { ParsedPaymentError, PaymentErrorType } from '@/utils/paymentErrors';

interface CheckoutErrorBannerProps {
  error: ParsedPaymentError | null;
  onDismiss: () => void;
  onRetry?: () => void;
}

const ICON_MAP: Record<PaymentErrorType, React.ReactNode> = {
  payment_declined: <CreditCard className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />,
  card_invalid:     <CreditCard className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />,
  network:          <WifiOff className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />,
  validation:       <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />,
  general:          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />,
};

const BG_MAP: Record<PaymentErrorType, string> = {
  payment_declined: 'bg-red-50 border-red-200',
  card_invalid:     'bg-red-50 border-red-200',
  network:          'bg-amber-50 border-amber-200',
  validation:       'bg-amber-50 border-amber-200',
  general:          'bg-red-50 border-red-200',
};

const TEXT_MAP: Record<PaymentErrorType, string> = {
  payment_declined: 'text-red-900',
  card_invalid:     'text-red-900',
  network:          'text-amber-900',
  validation:       'text-amber-900',
  general:          'text-red-900',
};

const LINK_MAP: Record<PaymentErrorType, string> = {
  payment_declined: 'text-red-700 hover:text-red-800',
  card_invalid:     'text-red-700 hover:text-red-800',
  network:          'text-amber-700 hover:text-amber-800',
  validation:       'text-amber-700 hover:text-amber-800',
  general:          'text-red-700 hover:text-red-800',
};

export const CheckoutErrorBanner: React.FC<CheckoutErrorBannerProps> = ({ error, onDismiss, onRetry }) => {
  const bannerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to banner when it appears
  useEffect(() => {
    if (error && bannerRef.current) {
      bannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [error]);

  if (!error) return null;

  return (
    <div
      ref={bannerRef}
      role="alert"
      aria-live="assertive"
      className={`${BG_MAP[error.type]} border rounded-xl p-4 mb-4 animate-in slide-in-from-top-2 fade-in duration-300`}
    >
      <div className="flex items-start gap-3">
        {ICON_MAP[error.type]}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${TEXT_MAP[error.type]}`}>{error.title}</p>
          <p className={`text-sm ${TEXT_MAP[error.type]} opacity-80 mt-0.5`}>{error.message}</p>

          {/* Retry link for network errors */}
          {(error.type === 'network' || error.type === 'general') && onRetry && (
            <button
              onClick={onRetry}
              className={`text-sm font-semibold ${LINK_MAP[error.type]} mt-2 inline-flex items-center gap-1.5 underline underline-offset-2`}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          )}

          {error.errorCode && (
            <p className="text-[11px] text-gray-400 mt-1.5 font-mono">
              Code: {error.errorCode}
            </p>
          )}
        </div>

        <button
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-black/5 transition-colors"
          aria-label="Dismiss error"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default CheckoutErrorBanner;

