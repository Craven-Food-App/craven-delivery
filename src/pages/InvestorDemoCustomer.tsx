import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Search, 
  Star, 
  Clock, 
  DollarSign,
  Heart,
  MapPin,
  TrendingUp,
  Package,
  Phone
} from 'lucide-react';
import { 
  mockRestaurants, 
  mockCustomerOrders,
  mockMenuItems,
  formatCurrency,
  getOrderStatusLabel,
  getOrderStatusColor,
  type MockRestaurant,
  type MockMenuItem
} from '@/lib/mockDemoData';
import { Store, CheckCircle2 } from 'lucide-react';

export default function InvestorDemoCustomer() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRestaurant, setSelectedRestaurant] = useState<MockRestaurant | null>(null);
  const [cart, setCart] = useState<Array<{ item: MockMenuItem; quantity: number }>>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'order' | 'track'>('browse');

  const filteredRestaurants = mockRestaurants.filter(r =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.cuisine.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const featuredRestaurants = mockRestaurants.filter(r => r.featured);
  const mostLovedRestaurants = mockRestaurants.filter(r => r.mostLoved);

  function addToCart(item: MockMenuItem) {
    const existing = cart.find(c => c.item.id === item.id);
    if (existing) {
      setCart(cart.map(c => 
        c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c
      ));
    } else {
      setCart([...cart, { item, quantity: 1 }]);
    }
  }

  function getCartTotal() {
    return cart.reduce((sum, c) => sum + (c.item.price * c.quantity), 0);
  }

  const menuItems = selectedRestaurant ? mockMenuItems[selectedRestaurant.id] || [] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/investor-demo')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Customer View</h1>
                <p className="text-xs text-slate-500">Demo • Mock Data</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
                <ShoppingBag className="w-3 h-3 mr-1" />
                Cart ({cart.length})
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'browse' ? 'default' : 'outline'}
            onClick={() => { setActiveTab('browse'); setSelectedRestaurant(null); }}
            className={activeTab === 'browse' ? 'bg-violet-600' : ''}
          >
            Browse Restaurants
          </Button>
          <Button
            variant={activeTab === 'order' ? 'default' : 'outline'}
            onClick={() => setActiveTab('order')}
            className={activeTab === 'order' ? 'bg-violet-600' : ''}
          >
            My Orders
          </Button>
          <Button
            variant={activeTab === 'track' ? 'default' : 'outline'}
            onClick={() => setActiveTab('track')}
            className={activeTab === 'track' ? 'bg-violet-600' : ''}
          >
            Track Order
          </Button>
        </div>

        {/* Browse Tab */}
        {activeTab === 'browse' && !selectedRestaurant && (
          <div className="space-y-6">
            {/* Search Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Search restaurants or cuisines..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Featured Restaurants */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-violet-600" />
                Featured Restaurants
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredRestaurants.map((restaurant) => (
                  <Card 
                    key={restaurant.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    <div className="h-40 bg-gradient-to-br from-violet-400 to-purple-600 rounded-t-lg flex items-center justify-center">
                      <Store className="w-16 h-16 text-white opacity-50" />
                    </div>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-lg text-slate-900">{restaurant.name}</h3>
                          <p className="text-sm text-slate-600">{restaurant.cuisine}</p>
                        </div>
                        {restaurant.mostLoved && (
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                            <Heart className="w-3 h-3 mr-1 fill-red-700" />
                            Most Loved
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-medium">{restaurant.rating}</span>
                          <span className="text-slate-400">({restaurant.reviewCount})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {restaurant.deliveryTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(restaurant.deliveryFee)}
                        </div>
                      </div>
                      {!restaurant.isOpen && (
                        <Badge variant="outline" className="mt-2 bg-gray-50 text-gray-700">Closed</Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* All Restaurants */}
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">All Restaurants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRestaurants.map((restaurant) => (
                  <Card 
                    key={restaurant.id} 
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    <div className="h-32 bg-gradient-to-br from-slate-300 to-slate-400 rounded-t-lg flex items-center justify-center">
                      <Store className="w-12 h-12 text-white opacity-50" />
                    </div>
                    <CardContent className="pt-4">
                      <h3 className="font-bold text-lg text-slate-900">{restaurant.name}</h3>
                      <p className="text-sm text-slate-600 mb-2">{restaurant.cuisine}</p>
                      <div className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {restaurant.rating}
                        </div>
                        <span>•</span>
                        <span>{restaurant.deliveryTime}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Restaurant Menu */}
        {activeTab === 'browse' && selectedRestaurant && (
          <div>
            <Card className="mb-6">
              <div className="h-48 bg-gradient-to-br from-violet-400 to-purple-600 rounded-t-lg flex items-center justify-center relative">
                <Store className="w-24 h-24 text-white opacity-30" />
                <Button
                  variant="ghost"
                  onClick={() => setSelectedRestaurant(null)}
                  className="absolute top-4 left-4 bg-white/90 hover:bg-white"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </div>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">{selectedRestaurant.name}</h2>
                    <p className="text-slate-600 mb-2">{selectedRestaurant.cuisine}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{selectedRestaurant.rating}</span>
                        <span className="text-slate-400">({selectedRestaurant.reviewCount} reviews)</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {selectedRestaurant.deliveryTime}
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {formatCurrency(selectedRestaurant.deliveryFee)} delivery
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Menu Items */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-slate-900 mb-1">{item.name}</h3>
                        <p className="text-sm text-slate-600 mb-3">{item.description}</p>
                        <p className="text-lg font-bold text-violet-600">{formatCurrency(item.price)}</p>
                      </div>
                      {item.popular && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Popular
                        </Badge>
                      )}
                    </div>
                    <Button
                      onClick={() => addToCart(item)}
                      className="w-full mt-2 bg-violet-600 hover:bg-violet-700"
                    >
                      Add to Cart
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cart Summary */}
            {cart.length > 0 && (
              <Card className="fixed bottom-6 right-6 w-80 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Cart</span>
                    <Badge>{cart.length} items</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {cart.map((c, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{c.quantity}x {c.item.name}</span>
                        <span className="font-medium">{formatCurrency(c.item.price * c.quantity)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-3 mb-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-violet-600">{formatCurrency(getCartTotal())}</span>
                    </div>
                  </div>
                  <Button className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                    Proceed to Checkout
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* My Orders Tab */}
        {activeTab === 'order' && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Order History</h2>
            {mockCustomerOrders.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No orders yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {mockCustomerOrders.map((order) => (
                  <Card key={order.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{order.restaurantName}</CardTitle>
                          <CardDescription>Order {order.orderNumber} • Placed at {new Date(order.placedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</CardDescription>
                        </div>
                        <Badge className={getOrderStatusColor(order.status)}>
                          {getOrderStatusLabel(order.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span>{item.quantity}x {item.name}</span>
                            <span>{formatCurrency(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-3">
                        <div className="flex justify-between font-bold">
                          <span>Total</span>
                          <span>{formatCurrency(order.total)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Track Order Tab */}
        {activeTab === 'track' && mockCustomerOrders[0] && (
          <div>
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{mockCustomerOrders[0].restaurantName}</CardTitle>
                    <CardDescription>Order {mockCustomerOrders[0].orderNumber}</CardDescription>
                  </div>
                  <Badge className={getOrderStatusColor(mockCustomerOrders[0].status)}>
                    {getOrderStatusLabel(mockCustomerOrders[0].status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Order Timeline */}
                <div className="space-y-4 mb-6">
                  {[
                    { label: 'Order Placed', status: 'completed', time: new Date(mockCustomerOrders[0].placedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) },
                    { label: 'Confirmed', status: 'completed', time: '' },
                    { label: 'Preparing', status: 'completed', time: '' },
                    { label: 'Ready for Pickup', status: 'completed', time: '' },
                    { label: 'Picked Up', status: 'completed', time: '' },
                    { label: 'In Transit', status: 'current', time: 'Now' },
                    { label: 'Delivered', status: 'pending', time: mockCustomerOrders[0].estimatedDelivery },
                  ].map((step, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step.status === 'completed' ? 'bg-green-500' : 
                        step.status === 'current' ? 'bg-violet-600' : 
                        'bg-slate-200'
                      }`}>
                        {step.status === 'completed' && (
                          <CheckCircle2 className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          step.status === 'current' ? 'text-violet-600' : 'text-slate-900'
                        }`}>{step.label}</p>
                        {step.time && (
                          <p className="text-sm text-slate-500">{step.time}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Driver Info */}
                {mockCustomerOrders[0].driverName && (
                  <Card className="bg-slate-50">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-slate-600 mb-1">Your driver</p>
                          <p className="font-bold text-slate-900">{mockCustomerOrders[0].driverName}</p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-medium">4.9</span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Delivery Address */}
                <Card className="bg-slate-50 mt-4">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-slate-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-slate-600 mb-1">Delivery Address</p>
                        <p className="font-medium text-slate-900">{mockCustomerOrders[0].customerAddress}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

