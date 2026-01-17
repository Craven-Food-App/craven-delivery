// src/screens/OrderVerificationScreen.tsx
// @ts-nocheck
import React, { useState } from "react";
import {
  Package,
  User,
  MapPin,
  Phone,
  MessageSquare,
  Camera,
  CheckCircle,
  Clock,
  DollarSign,
  ChevronDown,
  ChevronUp,
  StickyNote,
  Store,
  Truck,
  Home,
  Star,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DeliveryCamera } from "./DeliveryCamera";
import { supabase } from "@/integrations/supabase/client";
import cravenLogo from "@/assets/craven-c.png";
import { 
  DeliveryCard, 
  DeliveryButton, 
  DeliveryHeader, 
  DeliveryInfoCard, 
  DeliveryActionGroup,
  DeliveryDivider,
  DeliveryPhotoPreview,
  typography 
} from '@/components/delivery/DeliveryDesignSystem';

interface OrderItem {
  name: string;
  quantity: number;
  price_cents: number;
  special_instructions?: string;
}

interface OrderVerificationProps {
  orderDetails: {
    id: string;
    order_number: string;
    restaurant_name: string;
    customer_name: string;
    customer_phone?: string;
    pickup_address: any;
    dropoff_address: any;
    items: OrderItem[];
    subtotal_cents: number;
    delivery_notes?: string;
    payout_cents: number;
    pickup_by?: string;
    isTestOrder?: boolean;
  };
  onPickupConfirmed: (pickupPhotoUrl?: string) => void;
  onCancel: () => void;
}

export const OrderVerificationScreen: React.FC<OrderVerificationProps> = ({
  orderDetails,
  onPickupConfirmed,
  onCancel,
}) => {
  const [showCamera, setShowCamera] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [pickupPhoto, setPickupPhoto] = useState<string | null>(null);
  const [showOrderItems, setShowOrderItems] = useState(false);
  const { toast } = useToast();

  // Calculate payout if not set (70% of delivery fee + base amount)
  const calculatePayout = () => {
    if (orderDetails.payout_cents && orderDetails.payout_cents > 0) {
      return orderDetails.payout_cents;
    }
    const deliveryFee = 299;
    const baseAmount = 300;
    return Math.round(deliveryFee * 0.7 + baseAmount);
  };

  const formatAddress = (address: any, fallbackAddress?: string) => {
    if (typeof address === "string") return address;
    if (typeof address === "object" && address) {
      return `${address.street || ""} ${address.city || ""} ${
        address.state || ""
      } ${address.zip || ""}`.trim();
    }
    if (fallbackAddress) return fallbackAddress;
    return "Address not available";
  };

  const updateOrderStatus = async (status: string, fields: Record<string, any> = {}) => {
    if (orderDetails.isTestOrder) return;
    const { error } = await supabase
      .from("orders")
      .update({ order_status: status, ...fields })
      .eq("id", orderDetails.id);
    if (error) console.error("Order update error:", error);
  };

  const handlePhotoCapture = async (photoBlob: Blob) => {
    setIsUploadingPhoto(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      const fileName = `pickup-${orderDetails.order_number}-${Date.now()}.jpg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("delivery-photos")
        .upload(filePath, photoBlob, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("delivery-photos").getPublicUrl(filePath);

      await updateOrderStatus("picked_up", {
        pickup_photo_url: publicUrl,
        pickup_confirmed_at: new Date().toISOString(),
      });

      setPickupPhoto(publicUrl);
      setShowCamera(false);

      toast({
        title: "Pickup Confirmed!",
        description: "Order photo captured and pickup confirmed.",
      });

      setTimeout(() => {
        onPickupConfirmed(publicUrl);
      }, 1500);
    } catch (error: any) {
      console.error("Error uploading pickup photo:", error);
      toast({
        title: "Upload Failed",
        description: "Failed to upload pickup photo. Please try again.",
        variant: "destructive",
      });
    }
    setIsUploadingPhoto(false);
  };

  const handleConfirmWithoutPhoto = async () => {
    try {
      await updateOrderStatus("picked_up", {
        pickup_confirmed_at: new Date().toISOString(),
      });

      toast({
        title: "Pickup Confirmed!",
        description: orderDetails.isTestOrder
          ? "Test pickup confirmed"
          : "Ready to deliver to customer.",
      });

      onPickupConfirmed();
    } catch (error: any) {
      console.error("Error confirming pickup:", error);
      toast({
        title: "Update Failed",
        description: "Failed to confirm pickup. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (showCamera) {
    return (
      <div className="absolute inset-0 z-10 bg-background">
        <div className="p-4">
          <h2 className="text-xl font-bold text-center">Take Pickup Photo</h2>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Capture a photo of the order for verification
          </p>
          <DeliveryCamera
            onPhotoCapture={handlePhotoCapture}
            onCancel={() => setShowCamera(false)}
            isUploading={isUploadingPhoto}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 bg-gray-50">
      <div className="h-full flex flex-col">
        {/* Professional Header */}
        <DeliveryHeader
          title="Order Verification"
          subtitle={`Order #${orderDetails.order_number}`}
          onBack={onCancel}
          rightAction={
            <div className="flex items-center space-x-2">
              {orderDetails.customer_phone && (
                <button
                  onClick={() =>
                    orderDetails.isTestOrder
                      ? toast({
                          title: "Test Mode",
                          description: "Would call " + orderDetails.customer_phone,
                        })
                      : window.open(`tel:${orderDetails.customer_phone}`)
                  }
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Phone className="h-4 w-4 text-gray-600" />
                </button>
              )}
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MessageSquare className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          }
        />

        {/* Pickup Time Alert */}
        {orderDetails.pickup_by && (
          <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-orange-700 font-semibold">
                Pick up by {new Date(orderDetails.pickup_by).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Test Order Badge */}
          {orderDetails.isTestOrder && (
            <DeliveryCard className="bg-yellow-50 border-yellow-200">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🧪</span>
                <div>
                  <h3 className="font-semibold text-yellow-900">Test Order</h3>
                  <p className="text-sm text-yellow-700">This is a test order. You can skip the photo or take one for testing.</p>
                </div>
              </div>
            </DeliveryCard>
          )}

          {/* Customer Information */}
          <DeliveryInfoCard
            title="Order for"
            subtitle={orderDetails.customer_name || "Customer"}
            icon={Users}
          >
            <div className="flex items-center space-x-2">
              <img src={cravenLogo} alt="Crave'N" className="w-6 h-6" />
              <span className="text-sm text-gray-600">Crave'n Delivery</span>
            </div>
          </DeliveryInfoCard>

          {/* Delivery Notes */}
          {orderDetails.delivery_notes && (
            <DeliveryCard className="bg-yellow-50 border-yellow-200">
              <div className="flex items-start space-x-3">
                <StickyNote className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Delivery Notes</h3>
                  <p className="text-sm text-yellow-700">{orderDetails.delivery_notes}</p>
                </div>
              </div>
            </DeliveryCard>
          )}

          {/* Order Summary */}
          <DeliveryCard>
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setShowOrderItems(!showOrderItems)}
            >
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-900">
                  {orderDetails.items.length} items
                </span>
              </div>
              {showOrderItems ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            
            {showOrderItems && (
              <div className="mt-4 space-y-3">
                <DeliveryDivider />
                {orderDetails.items.map((item, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-orange-600">{item.quantity}×</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900">{item.name}</h4>
                      {item.special_instructions && (
                        <p className="text-sm text-gray-600 mt-1">
                          {item.special_instructions}
                        </p>
                      )}
                      <p className="text-sm text-gray-500 mt-1">
                        ${(item.price_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DeliveryCard>

          {/* Photo Verification */}
          {pickupPhoto && (
            <DeliveryCard className="bg-green-50 border-green-200">
              <div className="text-center space-y-3">
                <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                <div>
                  <h3 className="font-semibold text-green-900">Pickup Confirmed!</h3>
                  <p className="text-sm text-green-700">Photo uploaded successfully</p>
                </div>
                <DeliveryPhotoPreview
                  src={pickupPhoto}
                  alt="Pickup photo"
                  onRemove={() => setPickupPhoto(null)}
                />
              </div>
            </DeliveryCard>
          )}

          {/* Earnings Summary */}
          <DeliveryCard className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-900">Your Earnings</h3>
                <p className="text-sm text-orange-600">For this delivery</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-orange-900">
                  ${(calculatePayout() / 100).toFixed(2)}
                </div>
                <div className="text-sm text-orange-600">
                  Base + tips
                </div>
              </div>
            </div>
          </DeliveryCard>

          {/* Action Buttons */}
          <div className="space-y-3">
            <DeliveryButton
              onClick={() => updateOrderStatus("arrived_at_store")}
              fullWidth
              icon={<Store className="w-5 h-5" />}
            >
              Arrived at Store
            </DeliveryButton>

            <DeliveryButton
              onClick={() => setShowCamera(true)}
              fullWidth
              size="lg"
              variant="primary"
              icon={<Camera className="w-5 h-5" />}
            >
              Verify Pickup with Photo
            </DeliveryButton>

            <DeliveryButton
              onClick={handleConfirmWithoutPhoto}
              fullWidth
              variant="outline"
              icon={<CheckCircle className="w-5 h-5" />}
            >
              {orderDetails.isTestOrder ? "Test: Confirm Pickup" : "Confirm Pickup (No Photo)"}
            </DeliveryButton>

            <div className="grid grid-cols-2 gap-3">
              <DeliveryButton
                onClick={() => updateOrderStatus("delivering")}
                variant="secondary"
                icon={<Truck className="w-4 h-4" />}
              >
                Start Delivery
              </DeliveryButton>

              <DeliveryButton
                onClick={() => updateOrderStatus("delivered")}
                variant="success"
                icon={<Home className="w-4 h-4" />}
              >
                Confirm Delivery
              </DeliveryButton>
            </div>

            <DeliveryButton
              onClick={onCancel}
              variant="ghost"
              fullWidth
            >
              Back to Navigation
            </DeliveryButton>
          </div>
        </div>
      </div>
    </div>
  );
};
