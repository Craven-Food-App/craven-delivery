import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { 
  Home, Package, User, Heart, Clock, Star, ChevronRight, 
  ShoppingCart, MapPin, Plus, Gift, TrendingUp,
  Receipt, RefreshCw, MessageCircle, Phone, ArrowRight, Check, X,
  Menu, Coffee, Store, Shield, Search, ChevronDown
} from "lucide-react";
import { AccountSection } from "@/components/account/AccountSection";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { LoyaltyDashboard } from "@/components/loyalty/LoyaltyDashboard";
import cravemoreIcon from "@/assets/cravemore-icon.png";

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price_cents: number;
}

interface Order {
  id: string;
  restaurant_id: string;
  order_status: string;
  total_cents: number;
  created_at: string;
  estimated_delivery_time: string;
  items?: OrderItem[];
  order_type?: 'personal' | 'business';
}

interface Restaurant {
  id: string;
  name: string;
  image_url?: string;
}

interface FavoriteRestaurant {
  id: string;
  name: string;
  image_url?: string;
  cuisine_type?: string;
  rating: number;
  delivery_fee_cents: number;
}

const CustomerDashboard = () => {
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [restaurants, setRestaurants] = useState<Record<string, Restaurant>>({});
  const [favorites, setFavorites] = useState<FavoriteRestaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [orderTypeFilter, setOrderTypeFilter] = useState<'personal' | 'business'>('personal');
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [activeCategory, setActiveCategory] = useState('home');
  const navigate = useNavigate();
  const { toast } = useToast();

  const tabFromUrl = searchParams.get('tab') || 'account';
  const [activeTab, setActiveTab] = useState(tabFromUrl);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  const getUserFirstName = () => {
    if (!user) return 'Friend';
    if (user.user_metadata?.first_name) return user.user_metadata.first_name;
    if (user.raw_user_meta_data?.first_name) return user.raw_user_meta_data.first_name;
    if (user.user_metadata?.full_name) return user.user_metadata.full_name.split(' ')[0];
    if (user.email) return user.email.split('@')[0].split('.')[0];
    return 'Friend';
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;
      setOrders(ordersData || []);

      if (ordersData && ordersData.length > 0) {
        const restaurantIds = [...new Set(ordersData.map(order => order.restaurant_id))];
        const { data: restaurantsData, error: restaurantsError } = await supabase
          .from("restaurants")
          .select("id, name, image_url")
          .in("id", restaurantIds);

        if (restaurantsError) throw restaurantsError;
        
        const restaurantsMap: Record<string, Restaurant> = {};
        restaurantsData?.forEach(restaurant => {
          restaurantsMap[restaurant.id] = restaurant;
        });
        setRestaurants(restaurantsMap);
      }

      const { data: favoritesData, error: favoritesError } = await supabase
        .from("customer_favorites")
        .select(`
          restaurant_id,
          restaurants (
            id,
            name,
            image_url,
            cuisine_type,
            rating,
            delivery_fee_cents
          )
        `)
        .eq("customer_id", user.id);

      if (favoritesError) {
        console.error("Error fetching favorites:", favoritesError);
        setFavorites([]);
      } else if (favoritesData) {
        const formattedFavorites = favoritesData
          .filter(fav => fav.restaurants)
          .map(fav => fav.restaurants as any as FavoriteRestaurant);
        setFavorites(formattedFavorites);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
      toast({
        title: "Error loading data",
        description: "There was a problem loading your information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const formatOrderItems = (order: Order) => {
    if (order.items && order.items.length > 0) {
      return order.items.map(item => `${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}`).join(' • ');
    }
    return 'Order details not available';
  };

  const getItemCount = (order: Order) => {
    if (order.items && order.items.length > 0) {
      return order.items.reduce((total, item) => total + item.quantity, 0);
    }
    return 1;
  };

  const handleViewOrderDetails = (orderId: string) => {
    setDetailsOrderId(orderId);
  };

  const handleTrackOrder = (orderId: string) => {
    navigate(`/track-order/${orderId}`);
  };

  const removeFavorite = async (restaurantId: string) => {
    try {
      const { error } = await supabase
        .from("customer_favorites")
        .delete()
        .eq("customer_id", user?.id)
        .eq("restaurant_id", restaurantId);

      if (error) throw error;

      setFavorites(prev => prev.filter(fav => fav.id !== restaurantId));
      toast({
        title: "Removed from favorites",
        description: "Restaurant removed from your favorites"
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive"
      });
    }
  };


  // Mobile Header
  const MobileHeader = () => (
    <div className="lg:hidden sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3 flex-1">
            {/* X button to exit account - only on account tab, replaces hamburger menu */}
            {activeTab === 'account' && (
              <button 
                onClick={() => {
                  navigate('/restaurants');
                }}
                className="p-2 -ml-2 active:bg-gray-100 rounded-full transition-colors"
                aria-label="Back to restaurants"
              >
                <X className="w-6 h-6 text-gray-900" strokeWidth={2.5} />
              </button>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'home' ? `Good ${getGreeting()}!` : activeTab === 'orders' ? 'Orders' : 'Account'}
              </h1>
              {activeTab === 'home' && <p className="text-sm text-gray-600">{getUserFirstName()}</p>}
            </div>
          </div>
        </div>
        
        {activeTab === 'home' && (
          <button 
            className="flex items-center space-x-2 w-full py-2 px-3 bg-gray-50 rounded-lg"
            onClick={() => {/* Handle address change */}}
          >
            <MapPin className="w-4 h-4 text-gray-600 flex-shrink-0" />
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs text-gray-500">Deliver to</p>
              <p className="text-sm font-semibold text-gray-900 truncate">6759 Nebraska Ave</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </button>
        )}
      </div>
    </div>
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  };

  // Navigation categories for hamburger menu
  const navCategories = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'restaurants', label: 'Restaurants', icon: Store },
    { id: 'grocery', label: 'Grocery', icon: Store },
    { id: 'convenience', label: 'Quick Stops', icon: Coffee },
    { id: 'cravenz', label: "Craven'Z", icon: Store },
    { id: 'beauty', label: 'Cosmetics', icon: Heart },
    { id: 'pets', label: 'Animals', icon: Heart },
    { id: 'health', label: 'Self Care', icon: Shield },
    { id: 'cravemore', label: 'CraveMore', icon: Gift },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'account', label: 'Account', icon: User }
  ];

  const handleMenuClick = (categoryId: string) => {
    setShowMobileNav(false);
    
    if (categoryId === 'home') {
      navigate('?tab=home');
    } else if (categoryId === 'restaurants') {
      navigate('/restaurants');
    } else if (categoryId === 'cravenz') {
      navigate('/restaurants');
    } else if (categoryId === 'cravemore') {
      navigate('/cravemore');
    } else if (categoryId === 'orders') {
      navigate('?tab=orders');
    } else if (categoryId === 'account') {
      navigate('?tab=account');
    } else if (['grocery', 'convenience', 'beauty', 'pets', 'health'].includes(categoryId)) {
      navigate('/restaurants');
    }
  };

  // Active Order Card
  const ActiveOrderCard = ({ order }: { order: Order }) => {
    const restaurant = restaurants[order.restaurant_id];
    
    return (
      <div className="bg-white border-b border-gray-200 mb-3">
        <div className="bg-primary text-white px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-semibold">Order in progress</span>
          <span className="text-xs">15-25 min</span>
        </div>
        
        <div className="p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {restaurant?.image_url ? (
                <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-6 h-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 truncate">{restaurant?.name || 'Restaurant'}</h3>
              <p className="text-sm text-gray-600">{formatPrice(order.total_cents)} • {getItemCount(order)} items</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 mb-4">
            {['Confirmed', 'Preparing', 'On the way'].map((step, idx) => (
              <React.Fragment key={step}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  idx === 0 ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                }`}>
                  {idx === 0 ? '✓' : idx + 1}
                </div>
                {idx < 2 && <div className="flex-1 h-1 bg-gray-200" />}
              </React.Fragment>
            ))}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => handleTrackOrder(order.id)}
              className="flex-1 py-2.5 bg-black text-white rounded-lg font-semibold text-sm active:bg-gray-800 transition-colors"
            >
              Track Order
            </button>
            <button className="p-2.5 border border-gray-300 rounded-lg active:bg-gray-50 transition-colors">
              <Phone className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2.5 border border-gray-300 rounded-lg active:bg-gray-50 transition-colors">
              <MessageCircle className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Past Order Card
  const PastOrderCard = ({ order }: { order: Order }) => {
    const restaurant = restaurants[order.restaurant_id];
    
    return (
      <div 
        className="bg-white border-b border-gray-200 mb-3 active:bg-gray-50 transition-colors"
        onClick={() => handleViewOrderDetails(order.id)}
      >
        <div className="flex p-4">
          <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {restaurant?.image_url ? (
              <img 
                src={restaurant.image_url} 
                alt={restaurant.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 h-8 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 ml-3 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{restaurant?.name || 'Restaurant'}</h3>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2" />
            </div>
            
            <p className="text-sm text-gray-600 mb-2 line-clamp-1">
              {formatOrderItems(order)}
            </p>
            
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-sm font-semibold text-gray-900">
                {formatPrice(order.total_cents)}
              </span>
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast({ title: "Reorder", description: "Adding items to cart..." });
              }}
              className="w-full py-2 bg-gray-100 text-gray-900 rounded-lg font-semibold text-sm flex items-center justify-center space-x-1 active:bg-gray-200 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Order Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Mobile Home Tab
  const MobileHomeTab = () => {
    const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.order_status));
    const pastOrders = orders.filter(o => o.order_status === 'delivered').slice(0, 3);

    return (
      <div className="pb-20 bg-white">
        {activeOrders.length > 0 && (
          <div className="px-4 pt-4">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Active Orders</h2>
            {activeOrders.map(order => <ActiveOrderCard key={order.id} order={order} />)}
          </div>
        )}
        
        <div className="px-4 py-4 bg-gray-50">
          <div className="bg-gradient-to-br from-primary via-primary to-primary-glow rounded-2xl p-6 text-white">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <img src={cravemoreIcon} alt="CraveMore" className="w-10 h-10" />
                <div>
                  <h3 className="text-xl font-bold">CraveMore</h3>
                  <p className="text-white/90 text-sm">Unlimited benefits</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>$0 Delivery on orders $12+</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Exclusive member deals</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Check className="w-4 h-4 flex-shrink-0" />
                <span>Lower service fees</span>
              </div>
            </div>
            
            <button 
              onClick={() => navigate('/cravemore')}
              className="w-full bg-white text-primary py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-transform"
            >
              Start Free Trial
            </button>
          </div>
        </div>
        
        {pastOrders.length > 0 && (
          <div className="px-4 bg-white">
            <div className="flex items-center justify-between mb-3 pt-4">
              <h2 className="text-lg font-bold text-gray-900">Past Orders</h2>
              <button 
                onClick={() => navigate('?tab=orders')}
                className="text-sm text-primary font-semibold"
              >
                See all
              </button>
            </div>
            
            {pastOrders.map(order => <PastOrderCard key={order.id} order={order} />)}
          </div>
        )}
        
        {favorites.length > 0 && (
          <div className="px-4 bg-white pt-6">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Your Favorites</h2>
            <div className="flex space-x-3 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4">
              {favorites.map((restaurant) => (
                <div 
                  key={restaurant.id}
                  onClick={() => navigate(`/restaurant/${restaurant.id}/menu`)}
                  className="flex-shrink-0 w-40 bg-gray-50 rounded-xl overflow-hidden active:opacity-75 transition-opacity shadow-sm"
                >
                  <div className="h-24 bg-gray-100">
                    {restaurant.image_url && (
                      <img 
                        src={restaurant.image_url} 
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="p-2">
                    <h4 className="font-semibold text-sm text-gray-900 truncate">{restaurant.name}</h4>
                    <div className="flex items-center space-x-1 mt-1">
                      <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-xs text-gray-600">{restaurant.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div className="px-4 py-6 bg-gray-50">
          <button
            onClick={() => navigate('/restaurants')}
            className="w-full py-4 bg-white text-gray-900 rounded-xl font-semibold flex items-center justify-center space-x-2 active:bg-gray-50 transition-colors shadow-sm"
          >
            <span>Explore Restaurants</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  };

  // Mobile Orders Tab
  const MobileOrdersTab = () => {
    // Get active orders (in-progress) for pagination
    const activeOrders = orders.filter(o => !['delivered', 'cancelled'].includes(o.order_status));
    const pastOrders = orders.filter(o => o.order_status === 'delivered');
    
    // Pagination for active orders
    const [activeCurrentPage, setActiveCurrentPage] = useState(1);
    const ordersPerPage = 2;
    const maxPages = 10;
    
    // Pagination logic for active orders
    const totalActiveOrders = activeOrders.length;
    const activeTotalPages = Math.min(Math.ceil(totalActiveOrders / ordersPerPage), maxPages);
    const activeStartIndex = (activeCurrentPage - 1) * ordersPerPage;
    const activeEndIndex = activeStartIndex + ordersPerPage;
    const currentActiveOrders = activeOrders.slice(activeStartIndex, activeEndIndex);

    const goToActivePage = (page: number) => {
      setActiveCurrentPage(page);
    };

    const goToAllActiveOrders = () => {
      navigate('/customer-dashboard?tab=orders&view=all&filter=active');
    };

    // Pagination for past orders
    const [pastCurrentPage, setPastCurrentPage] = useState(1);
    
    // Pagination logic for past orders
    const totalPastOrders = pastOrders.length;
    const pastTotalPages = Math.min(Math.ceil(totalPastOrders / ordersPerPage), maxPages);
    const pastStartIndex = (pastCurrentPage - 1) * ordersPerPage;
    const pastEndIndex = pastStartIndex + ordersPerPage;
    const currentPastOrders = pastOrders.slice(pastStartIndex, pastEndIndex);

    const goToPastPage = (page: number) => {
      setPastCurrentPage(page);
    };

    const goToAllPastOrders = () => {
      navigate('/customer-dashboard?tab=orders&view=all&filter=past');
    };
      
    return (
      <div className="pb-20 bg-white">
        <div className="pt-4">
          {/* Active Orders Section */}
          {activeOrders.length > 0 && (
            <>
              <div className="px-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Active Orders</h3>
              </div>
              <div className="space-y-4">
                {currentActiveOrders.map(order => (
                  <ActiveOrderCard key={order.id} order={order} />
                ))}
              </div>

              {/* Pagination Controls for Active Orders */}
              {totalActiveOrders > ordersPerPage && (
                <div className="flex flex-col items-center space-y-3 pt-4 border-t mx-4">
                  {/* Page Numbers */}
                  <div className="flex items-center space-x-0">
                    {Array.from({ length: activeTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => goToActivePage(page)}
                        className={`px-1 text-xs font-medium transition-colors ${
                          activeCurrentPage === page 
                            ? 'text-red-500 font-bold' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  {/* More Button */}
                  {totalActiveOrders > maxPages * ordersPerPage && (
                    <button
                      onClick={goToAllActiveOrders}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      View All ({totalActiveOrders})
                    </button>
                  )}

                  {/* Page Info */}
                  <p className="text-xs text-gray-500">
                    {activeStartIndex + 1}-{Math.min(activeEndIndex, totalActiveOrders)} of {totalActiveOrders}
                  </p>
                </div>
              )}
            </>
          )}

          {/* Past Orders Section */}
          {pastOrders.length > 0 && (
            <>
              <div className="px-4 mb-4 mt-8">
                <h3 className="text-lg font-semibold text-gray-900">Past Orders</h3>
              </div>
              <div className="space-y-4">
                {currentPastOrders.map(order => (
                  <PastOrderCard key={order.id} order={order} />
                ))}
              </div>

              {/* Pagination Controls for Past Orders */}
              {totalPastOrders > ordersPerPage && (
                <div className="flex flex-col items-center space-y-3 pt-4 border-t mx-4">
                  {/* Page Numbers */}
                  <div className="flex items-center space-x-0">
                    {Array.from({ length: pastTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => goToPastPage(page)}
                        className={`px-1 text-xs font-medium transition-colors ${
                          pastCurrentPage === page 
                            ? 'text-red-500 font-bold' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                  </div>

                  {/* More Button */}
                  {totalPastOrders > maxPages * ordersPerPage && (
                    <button
                      onClick={goToAllPastOrders}
                      className="px-3 py-1.5 bg-red-500 text-white rounded-full text-sm font-medium hover:bg-red-600 transition-colors"
                    >
                      View All ({totalPastOrders})
                    </button>
                  )}

                  {/* Page Info */}
                  <p className="text-xs text-gray-500">
                    {pastStartIndex + 1}-{Math.min(pastEndIndex, totalPastOrders)} of {totalPastOrders}
                  </p>
                </div>
              )}

              {/* Modern CraveMore Banner */}
              <div className="mx-4 mt-8 mb-6">
                <div className="relative bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-3xl p-8 text-white overflow-hidden shadow-2xl border border-red-400/20">
                  {/* Modern Background Pattern */}
                  <div className="absolute inset-0 opacity-5">
                    <div className="absolute top-8 left-8 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                    <div className="absolute bottom-8 right-8 w-24 h-24 bg-white rounded-full blur-2xl"></div>
                    <div className="absolute top-1/2 left-1/4 w-16 h-16 bg-white rounded-full blur-xl"></div>
                  </div>
                  
                  {/* Content */}
                  <div className="relative z-10">
                    {/* Header with Icon */}
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <img 
                            src="/src/assets/cravemore-icon.png" 
                            alt="CraveMore" 
                            className="w-16 h-16 drop-shadow-lg object-contain"
                          />
                          <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                            <span className="text-red-600 text-xs font-bold">+</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold mb-1">CraveMore</h3>
                          <p className="text-red-100 text-lg">Premium Membership</p>
                        </div>
                      </div>
                      
                      {/* Status Badge */}
                      <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
                        <span className="text-sm font-semibold">30-Day Free Trial</span>
                      </div>
                    </div>
                    
                    {/* Benefits */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">🚚</span>
                        </div>
                        <span className="text-red-100">Free Delivery</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">💰</span>
                        </div>
                        <span className="text-red-100">50% Off Fees</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">⭐</span>
                        </div>
                        <span className="text-red-100">Priority Support</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm">🎁</span>
                        </div>
                        <span className="text-red-100">Exclusive Deals</span>
                      </div>
                    </div>
                    
                    {/* CTA */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold mb-1">$0.00</div>
                        <div className="text-red-200 text-sm">Then $9.99/month</div>
                      </div>
                      <button
                        onClick={() => navigate('/crave-more')}
                        className="bg-white text-red-600 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg text-lg"
                      >
                        Start Free Trial
                      </button>
                    </div>
                  </div>
                  
                  {/* Modern Shine Effect */}
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent transform -skew-x-12 animate-pulse"></div>
                  
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-red-400/20 via-transparent to-red-400/20 rounded-3xl"></div>
                </div>
              </div>
            </>
          )}

          {/* No Orders State */}
          {activeOrders.length === 0 && pastOrders.length === 0 && (
            <div className="text-center py-12 px-4">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
              <p className="text-gray-600 mb-6">Start exploring restaurants</p>
              <button
                onClick={() => navigate('/restaurants')}
                className="px-6 py-3 bg-black text-white rounded-full font-semibold"
              >
                Browse Restaurants
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <MobileHeader key={showMobileNav ? 'menu-open' : 'menu-closed'} />
      
      {activeTab === 'home' && <MobileHomeTab />}
      {activeTab === 'orders' && <MobileOrdersTab />}
      {activeTab === 'account' && (
        <div className="pt-4 pb-20 bg-white">
          <AccountSection />
        </div>
      )}
      
      {/* Mobile Navigation Overlay */}
      {showMobileNav && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black bg-opacity-50" onClick={() => setShowMobileNav(false)}>
          <div 
            className="fixed right-0 top-0 h-full w-72 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Browse</h3>
                <button 
                  onClick={() => setShowMobileNav(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="Close menu"
                >
                  <X className="w-6 h-6 text-gray-900" />
                </button>
              </div>
              <nav className="space-y-1">
                {navCategories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => handleMenuClick(category.id)}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-colors text-gray-700 hover:bg-gray-100 active:bg-gray-200"
                  >
                    <category.icon className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">{category.label}</span>
                    <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </div>
      )}
      
      
      <OrderDetailsModal 
        isOpen={detailsOrderId !== null}
        onClose={() => setDetailsOrderId(null)}
        orderId={detailsOrderId || ''}
      />
      
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  );
};

export default CustomerDashboard;
