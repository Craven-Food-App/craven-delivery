import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, Package, Star, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  price_cents: number;
  menu_items?: {
    name: string;
    image_url?: string;
    description?: string;
  };
}

interface OrderDetails {
  id: string;
  order_status: string;
  total_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  delivery_fee_cents: number;
  tip_cents: number;
  estimated_delivery_time: string;
  created_at: string;
  delivery_address?: any;
  restaurants?: {
    name: string;
    phone?: string;
    address: string;
    cuisine_type?: string;
    rating?: number;
  };
  order_items?: OrderItem[];
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, orderId }) => {
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          id,
          order_status,
          total_cents,
          subtotal_cents,
          tax_cents,
          delivery_fee_cents,
          tip_cents,
          estimated_delivery_time,
          created_at,
          delivery_address,
          restaurants (
            name,
            phone,
            address,
            cuisine_type,
            rating
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;

      // Fetch order items separately with basic data
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('id, quantity, price_cents, menu_item_id')
        .eq('order_id', orderId);

      // Transform items data to match interface
      const order_items: OrderItem[] = (itemsData || []).map(item => ({
        id: item.id,
        quantity: item.quantity,
        price_cents: item.price_cents,
        menu_items: {
          name: 'Menu Item', // Default name since we can't get the relationship
          image_url: undefined,
          description: undefined
        }
      }));

      setOrder({ ...data, order_items });
    } catch (error) {
      console.error('Error fetching order details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusMap = {
      pending: 'secondary',
      confirmed: 'secondary', 
      preparing: 'secondary',
      ready: 'secondary',
      picked_up: 'default',
      delivered: 'secondary',
      canceled: 'destructive'
    };
    return statusMap[status as keyof typeof statusMap] || 'secondary';
  };

  const getStatusText = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Order Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Header */}
            <div className="text-center">
              <h3 className="font-semibold text-lg">{order.restaurants?.name}</h3>
              <p className="text-sm text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
              <p className="text-xs text-muted-foreground mt-1">{formatDate(order.created_at)}</p>
              <Badge variant={getStatusColor(order.order_status) as any} className="mt-2">
                {getStatusText(order.order_status)}
              </Badge>
            </div>

            {/* Restaurant Info */}
            {order.restaurants && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h4 className="font-medium">{order.restaurants.name}</h4>
                      <p className="text-sm text-muted-foreground">{order.restaurants.cuisine_type}</p>
                    </div>
                    {order.restaurants.rating && (
                      <div className="ml-auto flex items-center gap-1">
                        <Star className="h-4 w-4 fill-current text-yellow-500" />
                        <span className="text-sm">{order.restaurants.rating}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <p>{order.restaurants.address}</p>
                  </div>
                  {order.restaurants.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Phone className="h-4 w-4" />
                      <p>{order.restaurants.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Items */}
            {order.order_items && order.order_items.length > 0 && (
              <Card>
                <CardContent className="pt-4">
                  <h4 className="font-medium mb-3">Items Ordered</h4>
                  <div className="space-y-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-border/30 last:border-0">
                        {item.menu_items?.image_url && (
                          <img 
                            src={item.menu_items.image_url} 
                            alt={item.menu_items.name}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h5 className="font-medium">{item.menu_items?.name || 'Menu Item'}</h5>
                          {item.menu_items?.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {item.menu_items.description}
                            </p>
                          )}
                          <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{formatPrice(item.price_cents * item.quantity)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatPrice(item.price_cents)} each
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Delivery Details */}
            {order.delivery_address && (
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Delivery Address</p>
                      <p className="text-sm text-muted-foreground">
                        {typeof order.delivery_address === 'string' 
                          ? order.delivery_address 
                          : `${order.delivery_address.street}, ${order.delivery_address.city}`
                        }
                      </p>
                    </div>
                  </div>
                  
                  {order.estimated_delivery_time && (
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/30">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Estimated Delivery</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(order.estimated_delivery_time).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Order Summary */}
            <Card>
              <CardContent className="pt-4">
                <h4 className="font-medium mb-3">Order Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatPrice(order.subtotal_cents)}</span>
                  </div>
                  {order.tax_cents > 0 && (
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatPrice(order.tax_cents)}</span>
                    </div>
                  )}
                  {order.delivery_fee_cents > 0 && (
                    <div className="flex justify-between">
                      <span>Delivery Fee</span>
                      <span>{formatPrice(order.delivery_fee_cents)}</span>
                    </div>
                  )}
                  {order.tip_cents > 0 && (
                    <div className="flex justify-between">
                      <span>Tip</span>
                      <span>{formatPrice(order.tip_cents)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatPrice(order.total_cents)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Close
              </Button>
              {!['delivered', 'cancelled'].includes(order.order_status) && (
                <Button variant="outline" className="flex-1">
                  Track Order
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Order not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;