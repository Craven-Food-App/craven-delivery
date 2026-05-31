import React from 'react';

export interface CompletedOrderDetailsInput {
  displayOrderId: string;
  restaurantName?: string;
  pickupAddress?: string;
  dropoffAddress?: unknown;
  totalMiles: number;
  elapsedTime: string | number;
  deliveryCompletedAt: string | null;
  offerAcceptedAt: string | null;
  pickupConfirmedAt: string | null;
  orderStatus: string;
  items: Array<{ name: string; quantity: number; special_instructions?: string }>;
  stopCount?: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  details: CompletedOrderDetailsInput;
}

const FeederCompletedOrderDetailsModal: React.FC<Props> = ({ open, onClose, details }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md rounded-2xl shadow-xl p-6 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-foreground">Order {details.displayOrderId}</h2>
        {details.restaurantName && (
          <p className="text-sm text-muted-foreground">{details.restaurantName}</p>
        )}
        <div className="text-sm text-foreground space-y-1">
          <div>Status: <span className="font-medium">{details.orderStatus}</span></div>
          <div>Distance: {details.totalMiles.toFixed(1)} mi</div>
          <div>Time: {String(details.elapsedTime)}</div>
        </div>
        {details.items.length > 0 && (
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">Items</h3>
            <ul className="text-sm text-muted-foreground space-y-1">
              {details.items.map((it, i) => (
                <li key={i}>{it.quantity}× {it.name}</li>
              ))}
            </ul>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 font-semibold hover:bg-primary/90 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default FeederCompletedOrderDetailsModal;