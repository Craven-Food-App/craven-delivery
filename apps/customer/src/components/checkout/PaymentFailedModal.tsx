import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { XCircle, CreditCard, ArrowRight, WifiOff, AlertTriangle } from 'lucide-react';
import type { ParsedPaymentError, PaymentErrorType } from '@/utils/paymentErrors';

interface PaymentFailedModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: ParsedPaymentError | null;
  onRetry: () => void;
  onChangePayment: () => void;
  cardLast4?: string;
}

const ICON_MAP: Record<PaymentErrorType, { icon: React.ReactNode; bg: string }> = {
  payment_declined: {
    icon: <XCircle className="h-9 w-9 text-red-500" />,
    bg: 'bg-red-50',
  },
  card_invalid: {
    icon: <CreditCard className="h-9 w-9 text-red-500" />,
    bg: 'bg-red-50',
  },
  network: {
    icon: <WifiOff className="h-9 w-9 text-amber-500" />,
    bg: 'bg-amber-50',
  },
  validation: {
    icon: <AlertTriangle className="h-9 w-9 text-amber-500" />,
    bg: 'bg-amber-50',
  },
  general: {
    icon: <XCircle className="h-9 w-9 text-red-500" />,
    bg: 'bg-red-50',
  },
};

export const PaymentFailedModal: React.FC<PaymentFailedModalProps> = ({
  isOpen,
  onClose,
  error,
  onRetry,
  onChangePayment,
  cardLast4,
}) => {
  if (!error) return null;

  const { icon, bg } = ICON_MAP[error.type] || ICON_MAP.general;
  const isDecline = error.type === 'payment_declined' || error.type === 'card_invalid';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[420px] p-0 gap-0 rounded-2xl overflow-hidden border-0 shadow-2xl [&>button]:hidden">
        {/* ── Coloured header ───────────────────────────── */}
        <div className={`${bg} px-6 pt-10 pb-7 flex flex-col items-center text-center`}>
          <div className="w-[72px] h-[72px] rounded-full bg-white/80 backdrop-blur flex items-center justify-center mb-5 shadow-sm">
            {icon}
          </div>
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{error.title}</h2>
          <p className="text-sm text-gray-600 mt-2 max-w-[300px] leading-relaxed">{error.message}</p>

          {cardLast4 && (
            <div className="flex items-center gap-2 mt-4 px-3.5 py-2 bg-white rounded-full border shadow-sm">
              <CreditCard className="h-4 w-4 text-gray-500" />
              <span className="text-xs font-semibold text-gray-700 tracking-wide">•••• •••• •••• {cardLast4}</span>
            </div>
          )}
        </div>

        {/* ── Actions ───────────────────────────────────── */}
        <div className="p-6 space-y-3 bg-white">
          <button
            onClick={onRetry}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-xl py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            Try Again
            <ArrowRight className="h-4 w-4" />
          </button>

          {isDecline && (
            <button
              onClick={onChangePayment}
              className="w-full border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 rounded-xl py-3.5 text-sm font-semibold transition-all"
            >
              Use Different Payment Method
            </button>
          )}

          <button
            onClick={onClose}
            className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* ── Error code footer ─────────────────────────── */}
        {error.errorCode && (
          <div className="px-6 pb-5 bg-white">
            <p className="text-[11px] text-gray-400 text-center font-mono">
              Error code: {error.errorCode}
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentFailedModal;

