import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Store, 
  TrendingUp, 
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  BarChart3,
  AlertCircle
} from 'lucide-react';
import { 
  mockMerchantOrders,
  mockMerchantAnalytics,
  formatCurrency,
  formatTime,
  getOrderStatusLabel,
  getOrderStatusColor,
  type MockOrder
} from '@/lib/mockDemoData';

export default function InvestorDemoMerchant() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'analytics' | 'menu'>('orders');
  const [orders, setOrders] = useState<MockOrder[]>(mockMerchantOrders);

  function updateOrderStatus(orderId: string, newStatus: MockOrder['status']) {
    setOrders(orders.map(o => 
      o.id === orderId ? { ...o, status: newStatus } : o
    ));
  }

  const pendingOrders = orders.filter(o => ['confirmed', 'preparing'].includes(o.status));
  const activeOrders = orders.filter(o => ['ready', 'picked_up', 'in_transit'].includes(o.status));
  const completedOrders = orders.filter(o => o.status === 'delivered');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-slate-50">
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
                <h1 className="text-xl font-bold text-slate-900">Merchant Dashboard</h1>
                <p className="text-xs text-slate-500">Demo • Mock Data</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">Bella Italia</p>
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Open
                </Badge>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Today's Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {formatCurrency(mockMerchantAnalytics.todayRevenue)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                +12% from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Today's Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {mockMerchantAnalytics.todayOrders}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {pendingOrders.length} pending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Avg Order Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-violet-600">
                {formatCurrency(mockMerchantAnalytics.avgOrderValue)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                +5% from last week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Week Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {formatCurrency(mockMerchantAnalytics.weekRevenue)}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {mockMerchantAnalytics.weekOrders} orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'orders' ? 'default' : 'outline'}
            onClick={() => setActiveTab('orders')}
            className={activeTab === 'orders' ? 'bg-blue-600' : ''}
          >
            <Package className="w-4 h-4 mr-2" />
            Orders
            {pendingOrders.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{pendingOrders.length}</Badge>
            )}
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('analytics')}
            className={activeTab === 'analytics' ? 'bg-blue-600' : ''}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
          <Button
            variant={activeTab === 'menu' ? 'default' : 'outline'}
            onClick={() => setActiveTab('menu')}
            className={activeTab === 'menu' ? 'bg-blue-600' : ''}
          >
            <Store className="w-4 h-4 mr-2" />
            Menu
          </Button>
        </div>

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Pending Orders - Need Attention */}
            {pendingOrders.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h2 className="text-xl font-bold text-slate-900">Pending Orders</h2>
                  <Badge className="bg-red-500 text-white">{pendingOrders.length}</Badge>
                </div>
                <div className="space-y-4">
                  {pendingOrders.map((order) => (
                    <Card key={order.id} className="border-2 border-red-200 bg-red-50/30">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl">Order {order.orderNumber}</CardTitle>
                            <CardDescription>
                              <Clock className="w-4 h-4 inline mr-1" />
                              Placed {formatTime(order.placedAt)} • {order.customerName}
                            </CardDescription>
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
                              <span className="font-medium">{item.quantity}x {item.name}</span>
                              <span>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-3 mb-4">
                          <div className="flex justify-between font-bold">
                            <span>Total</span>
                            <span className="text-blue-600">{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                        <div className="bg-slate-100 p-3 rounded-lg mb-4">
                          <p className="text-sm text-slate-600 mb-1">Delivery Address</p>
                          <p className="text-sm font-medium text-slate-900">{order.customerAddress}</p>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'confirmed' && (
                            <Button
                              onClick={() => updateOrderStatus(order.id, 'preparing')}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Start Preparing
                            </Button>
                          )}
                          {order.status === 'preparing' && (
                            <Button
                              onClick={() => updateOrderStatus(order.id, 'ready')}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Mark as Ready
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="border-red-300 text-red-600 hover:bg-red-50"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Active Orders */}
            {activeOrders.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Active Orders</h2>
                <div className="space-y-4">
                  {activeOrders.map((order) => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg">Order {order.orderNumber}</CardTitle>
                            <CardDescription>
                              {order.customerName} • Placed {formatTime(order.placedAt)}
                            </CardDescription>
                          </div>
                          <Badge className={getOrderStatusColor(order.status)}>
                            {getOrderStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1 mb-3">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>{formatCurrency(item.price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="border-t pt-2">
                          <div className="flex justify-between font-bold text-sm">
                            <span>Total</span>
                            <span>{formatCurrency(order.total)}</span>
                          </div>
                        </div>
                        {order.driverName && (
                          <div className="mt-3 bg-blue-50 p-2 rounded-lg">
                            <p className="text-xs text-slate-600">Driver: <span className="font-medium text-slate-900">{order.driverName}</span></p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {pendingOrders.length === 0 && activeOrders.length === 0 && (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500">No active orders</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Overview</CardTitle>
                <CardDescription>Last 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Total Revenue</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(mockMerchantAnalytics.weekRevenue)}</p>
                    <p className="text-xs text-slate-500 mt-1">+18% from last week</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Total Orders</p>
                    <p className="text-3xl font-bold text-blue-600">{mockMerchantAnalytics.weekOrders}</p>
                    <p className="text-xs text-slate-500 mt-1">+15% from last week</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-2">Average Order</p>
                    <p className="text-3xl font-bold text-violet-600">{formatCurrency(mockMerchantAnalytics.avgOrderValue)}</p>
                    <p className="text-xs text-slate-500 mt-1">+3% from last week</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Selling Items</CardTitle>
                <CardDescription>This week</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMerchantAnalytics.topItems.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center text-white font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="font-medium text-slate-900">{item.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {item.count} orders
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Chart</CardTitle>
                <CardDescription>Daily breakdown (last 7 days)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2">
                  {[1234, 1567, 1890, 1456, 2100, 1923, 1847].map((value, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t-lg transition-all hover:from-blue-600 hover:to-cyan-500"
                        style={{ height: `${(value / 2100) * 100}%` }}
                      />
                      <p className="text-xs text-slate-600 mt-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]}
                      </p>
                      <p className="text-xs font-medium text-slate-900">${value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Menu Tab */}
        {activeTab === 'menu' && (
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Menu Management</CardTitle>
                <CardDescription>Manage your restaurant's menu items and pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Store className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-600 mb-4">Menu management interface would appear here</p>
                  <p className="text-sm text-slate-500">
                    Features: Add/edit items, pricing, categories, availability, photos
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

