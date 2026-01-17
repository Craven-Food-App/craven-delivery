import { forwardRef } from 'react';

interface ShippingLabelProps {
  restaurant: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip_code: string;
    phone?: string;
  };
  restaurantId: string;
  qrCodeDataUrl: string;
  shipDate: string;
}

export const ShippingLabel = forwardRef<HTMLDivElement, ShippingLabelProps>(
  ({ restaurant, restaurantId, qrCodeDataUrl, shipDate }, ref) => {
    return (
      <div 
        ref={ref}
        className="bg-white w-[8.5in] h-[11in] p-8 font-sans text-black"
        style={{ 
          colorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact'
        }}
      >
        {/* Header */}
        <div className="border-4 border-black p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-orange-600">Crave'N</h1>
              <p className="text-sm font-semibold">TABLET DELIVERY</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold">Ship Date</p>
              <p className="text-lg font-bold">{shipDate}</p>
            </div>
          </div>
        </div>

        {/* From Address */}
        <div className="border-2 border-black p-4 mb-6">
          <p className="text-xs font-bold mb-2">FROM:</p>
          <p className="text-lg font-bold">Crave'N Headquarters</p>
          <p className="text-base">123 Main Street</p>
          <p className="text-base">Suite 100</p>
          <p className="text-base">San Francisco, CA 94102</p>
          <p className="text-base font-semibold">(555) 123-4567</p>
        </div>

        {/* To Address */}
        <div className="border-4 border-black p-6 mb-6 bg-gray-50">
          <p className="text-xs font-bold mb-3">SHIP TO:</p>
          <p className="text-2xl font-bold mb-2">{restaurant.name}</p>
          <p className="text-xl">{restaurant.address}</p>
          <p className="text-xl">{restaurant.city}, {restaurant.state} {restaurant.zip_code}</p>
          {restaurant.phone && (
            <p className="text-xl font-semibold mt-2">{restaurant.phone}</p>
          )}
        </div>

        {/* Package Details */}
        <div className="border-2 border-black p-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-bold">CONTENTS:</p>
              <p className="text-base font-semibold">Crave'N POS Tablet</p>
              <p className="text-sm">+ Charging Cable</p>
              <p className="text-sm">+ Quick Start Guide</p>
            </div>
            <div>
              <p className="text-xs font-bold">WEIGHT:</p>
              <p className="text-base font-semibold">2.5 lbs</p>
              <p className="text-xs font-bold mt-2">DIMENSIONS:</p>
              <p className="text-base">12" x 10" x 3"</p>
            </div>
          </div>
        </div>

        {/* QR Code and Reference */}
        <div className="flex items-center justify-between border-2 border-black p-4">
          <div className="flex-1">
            <p className="text-xs font-bold">REFERENCE NUMBER:</p>
            <p className="text-2xl font-mono font-bold tracking-wider">{restaurantId.substring(0, 8).toUpperCase()}</p>
            <p className="text-xs text-gray-600 mt-2">Scan QR code for tracking</p>
          </div>
          <div className="border-2 border-black p-2">
            <img 
              src={qrCodeDataUrl} 
              alt="QR Code" 
              className="w-32 h-32"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-600">
          <p>Questions? Contact support@craven.com | (555) 123-4567</p>
          <p className="mt-1">This package contains fragile electronics - Handle with care</p>
        </div>
      </div>
    );
  }
);

ShippingLabel.displayName = 'ShippingLabel';
