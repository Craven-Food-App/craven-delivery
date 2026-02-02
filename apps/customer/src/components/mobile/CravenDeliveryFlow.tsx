import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatCustomerNameForDriver } from '@/utils/nameFormatting';
import { toast } from 'sonner';
import FullscreenCamera from './FullscreenCamera';
import { speakDeliveryInstructions } from './ActiveFeedingMenu';
import feederAppIcon from '@/assets/feeder_app_icon.png';

// ===== TYPES =====

type DeliveryStage = 'navigate_to_restaurant' | 'arrived_at_restaurant' | 'verify_pickup' | 'pickup_photo_verification' | 'navigate_to_customer' | 'capture_proof' | 'delivered';

interface OrderItem {
  name: string;
  quantity: number;
  price_cents?: number;
}

interface ActiveDeliveryProps {
  orderDetails: {
    id: string;
    order_id?: string;
    order_number?: string;
    restaurant_name: string;
    pickup_address: string;
    dropoff_address: string;
    customer_name?: string;
    customer_phone?: string;
    delivery_notes?: string;
    payout_cents: number;
    subtotal_cents?: number;
    estimated_time?: number;
    items?: OrderItem[];
    isTestOrder?: boolean;
  };
  onCompleteDelivery: () => void;
  onProgressChange?: (progress: number) => void;
  onCameraStateChange?: (isOpen: boolean) => void;
}

// ===== DRIVER STATUS =====

const DRIVER_STATUS = {
  TO_STORE: 'to_store',
  AT_STORE: 'at_store',
  TO_CUSTOMER: 'to_customer',
  AT_CUSTOMER: 'at_customer',
  COMPLETE: 'complete',
};

// ===== UTILITY FUNCTIONS =====

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  } catch (err) {
    toast.error('Failed to copy');
  }
};

// ===== THEME =====

const C = {
  orange: "#FF6A00",
  text: "#111111",
  muted: "#777777",
  border: "#EEEEEE",
  bg: "#FFFFFF",
  bgMuted: "#F8F9FA",
  green: "#2E7D32",
} as const;

// ===== MAIN COMPONENT =====

const CravenDeliveryFlow: React.FC<ActiveDeliveryProps> = ({ 
  orderDetails, 
  onCompleteDelivery, 
  onProgressChange,
  onCameraStateChange 
}) => {
  const [status, setStatus] = useState(DRIVER_STATUS.TO_STORE);
  const [pickupCode, setPickupCode] = useState<string | null>(null);
  const [pickupPhotoUrl, setPickupPhotoUrl] = useState<string>();
  const [deliveryPhotoUrl, setDeliveryPhotoUrl] = useState<string>();
  const [showCamera, setShowCamera] = useState(false);
  const [photoType, setPhotoType] = useState<'pickup' | 'delivery'>('pickup');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [restaurantLogo, setRestaurantLogo] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasSpokenInstructions, setHasSpokenInstructions] = useState(false);

  // Fetch pickup code
  useEffect(() => {
    const fetchPickupCode = async () => {
      try {
        const orderId = orderDetails.order_id || orderDetails.id;
        const { data, error } = await supabase
          .from('orders')
          .select('pickup_code')
          .eq('id', orderId)
          .maybeSingle();

        if (!error && data?.pickup_code) {
          setPickupCode(data.pickup_code);
        }
      } catch (error) {
        console.error('Error fetching pickup code:', error);
      }
    };

    fetchPickupCode();
  }, [orderDetails]);

  // Fetch order items
  useEffect(() => {
    if (orderDetails.items && orderDetails.items.length > 0) {
      setOrderItems(orderDetails.items);
    }
  }, [orderDetails.items]);

  // Fetch restaurant logo
  useEffect(() => {
    const fetchRestaurantLogo = async () => {
      try {
        const { data, error } = await supabase
          .from('restaurants')
          .select('logo_url')
          .eq('name', orderDetails.restaurant_name)
          .maybeSingle();

        if (!error && data?.logo_url) {
          setRestaurantLogo(data.logo_url);
        }
      } catch (error) {
        console.error('Error fetching restaurant logo:', error);
      }
    };

    if (orderDetails.restaurant_name) {
      fetchRestaurantLogo();
    }
  }, [orderDetails.restaurant_name]);

  // GPS tracking for automatic instruction reading
  useEffect(() => {
    if (status !== DRIVER_STATUS.TO_CUSTOMER || !orderDetails.delivery_notes || hasSpokenInstructions) {
      return;
    }

    const watchId = navigator.geolocation?.watchPosition(
      (position) => {
        setDriverLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      if (watchId) navigator.geolocation?.clearWatch(watchId);
    };
  }, [status, orderDetails.delivery_notes, hasSpokenInstructions]);

  // Auto-read instructions when approaching customer
  useEffect(() => {
    if (status === DRIVER_STATUS.TO_CUSTOMER && 
        driverLocation && 
        orderDetails.delivery_notes && 
        !hasSpokenInstructions) {
      setHasSpokenInstructions(true);
      speakDeliveryInstructions(orderDetails.delivery_notes);
    }
  }, [driverLocation, status, orderDetails.delivery_notes, hasSpokenInstructions]);

  // Camera state change callback
  useEffect(() => {
    onCameraStateChange?.(showCamera);
  }, [showCamera, onCameraStateChange]);

  // Progress tracking
  useEffect(() => {
    const progressMap: Record<string, number> = {
      [DRIVER_STATUS.TO_STORE]: 0,
      [DRIVER_STATUS.AT_STORE]: 25,
      [DRIVER_STATUS.TO_CUSTOMER]: 50,
      [DRIVER_STATUS.AT_CUSTOMER]: 75,
      [DRIVER_STATUS.COMPLETE]: 100,
    };
    onProgressChange?.(progressMap[status] || 0);
  }, [status, onProgressChange]);

  // Handlers
  const handleArrivedAtStore = () => {
    setStatus(DRIVER_STATUS.AT_STORE);
    toast.success('Arrived at kitchen!');
  };

  const handleConfirmItems = () => {
    if (checkedItems.size !== orderItems.length) {
      toast.error('Please confirm all items before proceeding');
      return;
    }
    setStatus(DRIVER_STATUS.TO_CUSTOMER);
    toast.success('Order confirmed! Head to customer.');
  };

  const handleArrivedAtCustomer = () => {
    setStatus(DRIVER_STATUS.AT_CUSTOMER);
    toast.success('Arrived at drop-off location!');
  };

  const handleCompleteDelivery = () => {
    setStatus(DRIVER_STATUS.COMPLETE);
    toast.success('Delivery completed!');
    setTimeout(() => {
      onCompleteDelivery();
    }, 1500);
  };

  const handleToggleItem = (itemName: string) => {
    setCheckedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemName)) {
        newSet.delete(itemName);
      } else {
        newSet.add(itemName);
      }
      return newSet;
    });
  };

  const formatMoney = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusText = () => {
    switch (status) {
      case DRIVER_STATUS.TO_STORE:
        return 'Routing to Kitchen';
      case DRIVER_STATUS.AT_STORE:
        return 'Awaiting Hand-off';
      case DRIVER_STATUS.TO_CUSTOMER:
        return 'En Route to Customer';
      case DRIVER_STATUS.AT_CUSTOMER:
        return 'At Drop-off Location';
      default:
        return 'In Progress';
    }
  };

  const getCustomerDisplayName = () => {
    if (!orderDetails.customer_name) return 'Customer';
    return formatCustomerNameForDriver(orderDetails.customer_name);
  };

  if (showCamera) {
    return (
      <FullscreenCamera
        onCapture={(photoUrl) => {
          if (photoType === 'pickup') {
            setPickupPhotoUrl(photoUrl);
          } else {
            setDeliveryPhotoUrl(photoUrl);
          }
          setShowCamera(false);
        }}
        onClose={() => setShowCamera(false)}
      />
    );
  }

  if (status === DRIVER_STATUS.COMPLETE) {
    return (
      <div style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: C.bg,
        padding: '0 24px',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#2E7D32',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 style={{
          fontSize: 24,
          fontWeight: 900,
          color: C.text,
          marginBottom: 8,
          textAlign: 'center',
        }}>
          Delivery Complete!
        </h1>
        <p style={{
          fontSize: 14,
          color: C.muted,
          textAlign: 'center',
          marginBottom: 24,
        }}>
          Great job! Ready for your next order.
        </p>
        <div style={{
          fontSize: 32,
          fontWeight: 900,
          color: C.green,
        }}>
          {formatMoney(orderDetails.payout_cents)}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: C.bg,
      overflow: 'hidden',
    }}>
      {/* Header with status */}
      <div style={{
        background: C.orange,
        color: 'white',
        padding: '48px 16px 16px 16px',
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 48px)',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                {status === DRIVER_STATUS.TO_STORE || status === DRIVER_STATUS.AT_STORE ? (
                  <>
                    <path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 7h14M7 13h10m0 0l1 4M7 13l-1 4" />
                    <circle cx="9" cy="20" r="1" />
                    <circle cx="16" cy="20" r="1" />
                  </>
                ) : (
                  <>
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </>
                )}
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.9, marginBottom: 2 }}>{getStatusText()}</div>
              <div style={{ fontSize: 16, fontWeight: 900 }}>
                {status === DRIVER_STATUS.TO_STORE || status === DRIVER_STATUS.AT_STORE
                  ? orderDetails.restaurant_name
                  : getCustomerDisplayName()}
              </div>
            </div>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 13,
            fontWeight: 700,
          }}>
            ON FIRE 🔥
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
      }}>
        {/* Customer Name & Order Number */}
        <div style={{ marginBottom: 16 }}>
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            color: C.muted,
            letterSpacing: '0.5px',
            marginBottom: 4,
          }}>
            {getCustomerDisplayName()}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <h1 style={{
              fontSize: 20,
              fontWeight: 900,
              color: C.text,
              margin: 0,
            }}>
              Order #{orderDetails.order_number || orderDetails.id.slice(-8)}
            </h1>
            {orderDetails.isTestOrder && (
              <div style={{
                border: '1px solid #FF6A00',
                color: '#FF6A00',
                borderRadius: 4,
                padding: '4px 8px',
                fontSize: 11,
                fontWeight: 700,
              }}>
                TEST ORDER
              </div>
            )}
          </div>
        </div>

        {/* Address Card */}
        {(status === DRIVER_STATUS.TO_STORE || status === DRIVER_STATUS.AT_STORE) && (
          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '12px',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: C.muted,
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}>
              PICKUP ADDRESS
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 12,
            }}>
              {restaurantLogo ? (
                <img src={restaurantLogo} alt="" style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  objectFit: 'cover',
                }} />
              ) : (
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  background: C.bgMuted,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
              )}
              <div style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                {orderDetails.pickup_address}
              </div>
            </div>
            <button
              onClick={() => {
                const address = encodeURIComponent(orderDetails.pickup_address || '');
                window.open(`https://maps.apple.com/?daddr=${address}`, '_blank');
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                background: C.bg,
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Navigate
            </button>
          </div>
        )}

        {(status === DRIVER_STATUS.TO_CUSTOMER || status === DRIVER_STATUS.AT_CUSTOMER) && (
          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '12px',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: C.muted,
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}>
              CUSTOMER ADDRESS
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              marginBottom: 12,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: C.bgMuted,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                {orderDetails.dropoff_address}
              </div>
            </div>
            <button
              onClick={() => {
                const address = encodeURIComponent(orderDetails.dropoff_address || '');
                window.open(`https://maps.apple.com/?daddr=${address}`, '_blank');
              }}
              style={{
                width: '100%',
                padding: '10px',
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                background: C.bg,
                fontSize: 13,
                fontWeight: 700,
                color: C.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              Navigate
            </button>
          </div>
        )}

        {/* Pickup Code */}
        {pickupCode && (status === DRIVER_STATUS.TO_STORE || status === DRIVER_STATUS.AT_STORE) && (
          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '12px',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: C.muted,
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}>
              ORDER CODE (FOR KITCHEN)
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{
                fontSize: 24,
                fontWeight: 900,
                color: C.text,
                letterSpacing: '2px',
              }}>
                {pickupCode}
              </div>
              <button
                onClick={() => copyToClipboard(pickupCode)}
                style={{
                  padding: '8px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: C.bg,
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Order Items (when at store) */}
        {status === DRIVER_STATUS.AT_STORE && orderItems.length > 0 && (
          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '12px',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 13,
              fontWeight: 800,
              color: C.text,
              marginBottom: 12,
            }}>
              Order Items ({orderItems.length})
            </div>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}>
              {orderItems.map((item, index) => (
                <div
                  key={index}
                  onClick={() => handleToggleItem(item.name)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px',
                    border: `1px solid ${C.border}`,
                    borderRadius: 6,
                    cursor: 'pointer',
                    background: checkedItems.has(item.name) ? '#F0F9FF' : C.bg,
                  }}
                >
                  <div style={{
                    width: 20,
                    height: 20,
                    borderRadius: 4,
                    border: `2px solid ${checkedItems.has(item.name) ? C.green : C.border}`,
                    background: checkedItems.has(item.name) ? C.green : C.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {checkedItems.has(item.name) && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <div style={{ flex: 1, fontSize: 13, color: C.text }}>
                    {item.name}
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: C.muted,
                    background: C.bgMuted,
                    borderRadius: 4,
                    padding: '4px 8px',
                  }}>
                    x{item.quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Special Instructions */}
        {orderDetails.delivery_notes && (status === DRIVER_STATUS.TO_CUSTOMER || status === DRIVER_STATUS.AT_CUSTOMER) && (
          <div style={{
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            padding: '12px',
            marginBottom: 12,
          }}>
            <div style={{
              fontSize: 10,
              fontWeight: 800,
              color: C.muted,
              letterSpacing: '0.5px',
              marginBottom: 8,
            }}>
              SPECIAL INSTRUCTIONS
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 4,
                background: '#FFF4E6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FF6A00" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ flex: 1, fontSize: 13, color: C.text, lineHeight: 1.4 }}>
                {orderDetails.delivery_notes}
              </div>
              <button
                onClick={() => speakDeliveryInstructions(orderDetails.delivery_notes || '')}
                style={{
                  padding: '8px',
                  border: `1px solid ${C.border}`,
                  borderRadius: 6,
                  background: C.bg,
                  cursor: 'pointer',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.text} strokeWidth="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Estimated Pay */}
        <div style={{
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          padding: '12px',
          marginBottom: 12,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.muted,
            }}>
              $ Estimated Pay
            </div>
            <div style={{
              fontSize: 20,
              fontWeight: 900,
              color: C.green,
            }}>
              {formatMoney(orderDetails.payout_cents)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Button */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '12px 16px',
        paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
        background: C.bg,
        borderTop: `1px solid ${C.border}`,
      }}>
        {status === DRIVER_STATUS.TO_STORE && (
          <button
            onClick={handleArrivedAtStore}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 8,
              border: 'none',
              background: '#5A6C7D',
              color: 'white',
              fontSize: 15,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Arrived at Craven Kitchen
          </button>
        )}

        {status === DRIVER_STATUS.AT_STORE && (
          <button
            onClick={handleConfirmItems}
            disabled={checkedItems.size !== orderItems.length}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 8,
              border: 'none',
              background: checkedItems.size === orderItems.length ? '#5A6C7D' : C.bgMuted,
              color: checkedItems.size === orderItems.length ? 'white' : C.muted,
              fontSize: 15,
              fontWeight: 900,
              cursor: checkedItems.size === orderItems.length ? 'pointer' : 'not-allowed',
            }}
          >
            Confirm {orderItems.length} item(s) first
          </button>
        )}

        {status === DRIVER_STATUS.TO_CUSTOMER && (
          <button
            onClick={handleArrivedAtCustomer}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 8,
              border: 'none',
              background: '#5A6C7D',
              color: 'white',
              fontSize: 15,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Arrived at Customer's Location
          </button>
        )}

        {status === DRIVER_STATUS.AT_CUSTOMER && (
          <button
            onClick={handleCompleteDelivery}
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: 8,
              border: 'none',
              background: '#5A6C7D',
              color: 'white',
              fontSize: 15,
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            Drop-off & Complete Delivery
          </button>
        )}
      </div>
    </div>
  );
};

export default CravenDeliveryFlow;
