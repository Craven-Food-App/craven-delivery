import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Smartphone, 
  DollarSign,
  Package,
  Star,
  Navigation,
  Phone,
  MapPin,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { 
  mockDriverDeliveries,
  mockDriverStats,
  formatCurrency,
  type MockDelivery
} from '@/lib/mockDemoData';

export default function InvestorDemoDriver() {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState<MockDelivery[]>(mockDriverDeliveries);
  const [isOnline, setIsOnline] = useState(true);
  const [activeTab, setActiveTab] = useState<'deliveries' | 'earnings'>('deliveries');

  function acceptDelivery(deliveryId: string) {
    setDeliveries(deliveries.map(d => 
      d.id === deliveryId ? { ...d, status: 'accepted' } : d
    ));
  }

  function updateDeliveryStatus(deliveryId: string, newStatus: MockDelivery['status']) {
    setDeliveries(deliveries.map(d => 
      d.id === deliveryId ? { ...d, status: newStatus } : d
    ));
  }

  const availableDeliveries = deliveries.filter(d => d.status === 'available');
  const activeDeliveries = deliveries.filter(d => ['accepted', 'picked_up', 'in_transit'].includes(d.status));
  const completedDeliveries = deliveries.filter(d => d.status === 'delivered');

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50">
      {/* Mobile-optimized header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/investor-demo')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-lg font-bold text-slate-900">Driver View</h1>
                <p className="text-xs text-slate-500">Demo • Mock Data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isOnline ? 'default' : 'outline'}
                onClick={() => setIsOnline(!isOnline)}
                className={isOnline ? 'bg-green-600 hover:bg-green-700' : 'border-red-300 text-red-600'}
              >
                {isOnline ? 'Online' : 'Offline'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Driver Stats - Mobile Optimized */}
        <Card className="mb-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-emerald-100 text-sm mb-1">Today's Earnings</p>
                <p className="text-4xl font-bold">{formatCurrency(mockDriverStats.todayEarnings)}</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <DollarSign className="w-8 h-8" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-emerald-400/30">
              <div>
                <p className="text-emerald-100 text-xs mb-1">Deliveries</p>
                <p className="text-2xl font-bold">{mockDriverStats.todayDeliveries}</p>
              </div>
              <div>
                <p className="text-emerald-100 text-xs mb-1">Rating</p>
                <p className="text-2xl font-bold flex items-center gap-1">
                  <Star className="w-5 h-5 fill-white" />
                  {mockDriverStats.rating}
                </p>
              </div>
              <div>
                <p className="text-emerald-100 text-xs mb-1">Online</p>
                <p className="text-2xl font-bold">{mockDriverStats.onlineTime}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Tabs - Mobile Optimized */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'deliveries' ? 'default' : 'outline'}
            onClick={() => setActiveTab('deliveries')}
            className={`flex-1 ${activeTab === 'deliveries' ? 'bg-emerald-600' : ''}`}
          >
            <Package className="w-4 h-4 mr-2" />
            Deliveries
            {availableDeliveries.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{availableDeliveries.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'earnings' ? 'default' : 'outline'}
            onClick={() => setActiveTab('earnings')}
            className={`flex-1 ${activeTab === 'earnings' ? 'bg-emerald-600' : ''}`}
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Earnings
          </Button>
        </div>

        {/* Offline Warning */}
        {!isOnline && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">You're Offline</p>
                  <p className="text-sm text-yellow-800">Go online to receive delivery requests</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <div className="space-y-6">
            {/* Available Deliveries */}
            {isOnline && availableDeliveries.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <h2 className="text-xl font-bold text-slate-900">Available Now</h2>
                  <Badge className="bg-red-500 text-white">{availableDeliveries.length}</Badge>
                </div>
                <div className="space-y-3">
                  {availableDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="border-2 border-emerald-200 bg-emerald-50/30">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-lg text-slate-900">Order {delivery.orderNumber}</p>
                            <p className="text-sm text-slate-600">{delivery.restaurantName}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(delivery.earnings)}</p>
                            <p className="text-xs text-slate-500">{delivery.distance}</p>
                          </div>
                        </div>

                        {/* Pickup */}
                        <div className="bg-white rounded-lg p-3 mb-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-600 mb-1">Pickup</p>
                              <p className="text-sm font-medium text-slate-900 break-words">{delivery.restaurantAddress}</p>
                              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {delivery.pickupTime}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Dropoff */}
                        <div className="bg-white rounded-lg p-3 mb-3">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-600 mb-1">Dropoff</p>
                              <p className="text-sm font-medium text-slate-900 break-words">{delivery.customerAddress}</p>
                              <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {delivery.dropoffTime}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="bg-slate-50 rounded-lg p-2 mb-3">
                          <p className="text-xs text-slate-600 mb-1">Items ({delivery.items.length})</p>
                          <p className="text-xs text-slate-800">{delivery.items.join(', ')}</p>
                        </div>

                        <Button
                          onClick={() => acceptDelivery(delivery.id)}
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-lg py-6"
                        >
                          <CheckCircle2 className="w-5 h-5 mr-2" />
                          Accept Delivery • {formatCurrency(delivery.earnings)}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Active Deliveries */}
            {activeDeliveries.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Active Delivery</h2>
                <div className="space-y-3">
                  {activeDeliveries.map((delivery) => (
                    <Card key={delivery.id} className="border-2 border-blue-300">
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="font-bold text-lg text-slate-900">Order {delivery.orderNumber}</p>
                            <p className="text-sm text-slate-600">{delivery.restaurantName}</p>
                          </div>
                          <Badge className="bg-blue-500 text-white">
                            {delivery.status === 'accepted' ? 'En Route to Restaurant' :
                             delivery.status === 'picked_up' ? 'Picked Up' : 'In Transit'}
                          </Badge>
                        </div>

                        {/* Current Step */}
                        {delivery.status === 'accepted' && (
                          <div className="bg-blue-50 rounded-lg p-3 mb-3 border-2 border-blue-200">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-blue-600 mt-1" />
                              <div className="flex-1">
                                <p className="text-xs text-blue-600 font-semibold mb-1">PICKUP LOCATION</p>
                                <p className="text-sm font-medium text-slate-900">{delivery.restaurantAddress}</p>
                                <p className="text-xs text-slate-600 mt-1">{delivery.pickupTime}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {delivery.status === 'picked_up' && (
                          <div className="bg-green-50 rounded-lg p-3 mb-3 border-2 border-green-200">
                            <div className="flex items-start gap-2">
                              <MapPin className="w-5 h-5 text-green-600 mt-1" />
                              <div className="flex-1">
                                <p className="text-xs text-green-600 font-semibold mb-1">DELIVERY LOCATION</p>
                                <p className="text-sm font-medium text-slate-900">{delivery.customerAddress}</p>
                                <p className="text-xs text-slate-600 mt-1">{delivery.customerName}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Customer Info */}
                        <div className="bg-slate-50 rounded-lg p-3 mb-3">
                          <p className="text-xs text-slate-600 mb-2">Customer</p>
                          <p className="text-sm font-medium text-slate-900 mb-2">{delivery.customerName}</p>
                          <Button variant="outline" size="sm" className="w-full">
                            <Phone className="w-4 h-4 mr-2" />
                            Call Customer
                          </Button>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-2">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-lg py-6"
                            onClick={() => window.open('https://maps.google.com', '_blank')}
                          >
                            <Navigation className="w-5 h-5 mr-2" />
                            Open Navigation
                          </Button>
                          
                          {delivery.status === 'accepted' && (
                            <Button
                              onClick={() => updateDeliveryStatus(delivery.id, 'picked_up')}
                              className="w-full bg-green-600 hover:bg-green-700 text-lg py-6"
                            >
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Confirm Pickup
                            </Button>
                          )}

                          {delivery.status === 'picked_up' && (
                            <Button
                              onClick={() => updateDeliveryStatus(delivery.id, 'delivered')}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-lg py-6"
                            >
                              <CheckCircle2 className="w-5 h-5 mr-2" />
                              Complete Delivery
                            </Button>
                          )}
                        </div>

                        <div className="mt-3 text-center">
                          <p className="text-sm text-slate-600">Earning: <span className="font-bold text-emerald-600">{formatCurrency(delivery.earnings)}</span></p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {isOnline && availableDeliveries.length === 0 && activeDeliveries.length === 0 && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 font-medium mb-2">No deliveries available</p>
                  <p className="text-sm text-slate-500">New orders will appear here</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Earnings Tab */}
        {activeTab === 'earnings' && (
          <div className="space-y-4">
            {/* Today Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Today's Summary</CardTitle>
                <CardDescription>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Earnings</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(mockDriverStats.todayEarnings)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Deliveries</p>
                    <p className="text-3xl font-bold text-blue-600">{mockDriverStats.todayDeliveries}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Avg per Delivery</p>
                    <p className="text-xl font-bold text-violet-600">
                      {formatCurrency(mockDriverStats.todayEarnings / mockDriverStats.todayDeliveries)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Online Time</p>
                    <p className="text-xl font-bold text-slate-900">{mockDriverStats.onlineTime}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Week Summary */}
            <Card>
              <CardHeader>
                <CardTitle>This Week</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Earnings</p>
                      <p className="text-2xl font-bold text-green-600">{formatCurrency(mockDriverStats.weekEarnings)}</p>
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +12%
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Total Deliveries</p>
                      <p className="text-2xl font-bold text-blue-600">{mockDriverStats.weekDeliveries}</p>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +8%
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
                <CardDescription>Your driver stats</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm text-slate-600">Rating</span>
                    </div>
                    <span className="text-xl font-bold text-slate-900">{mockDriverStats.rating} / 5.0</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Total Deliveries</span>
                    <span className="text-xl font-bold text-slate-900">{mockDriverStats.totalDeliveries}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Acceptance Rate</span>
                    <span className="text-xl font-bold text-green-600">98%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">On-Time Rate</span>
                    <span className="text-xl font-bold text-emerald-600">96%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

