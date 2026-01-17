import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Star, Clock, Truck, Plus, Minus, ShoppingCart, TrendingUp, Award, X, 
  ChevronLeft, Utensils, Zap, Heart, Share2, MapPin, Phone, Camera,
  Navigation, MessageCircle, CheckCircle, Filter, Search, ChefHat, Leaf, DollarSign
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { toast as showToast } from 'sonner';

// Enhanced Types
interface Restaurant {
  id: string;
  name: string;
  description: string;
  cuisine_type: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  delivery_fee_cents: number;
  min_delivery_time: number;
  max_delivery_time: number;
  rating: number;
  total_reviews: number;
  image_url: string;
  latitude?: number;
  longitude?: number;
  chef_name?: string;
  established_year?: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string;
  display_order: number;
  icon?: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  category_id: string;
  preparation_time: number;
  is_featured?: boolean;
  order_count?: number;
  spice_level?: number;
  calories?: number;
  chef_recommended?: boolean;
}

interface CartItem extends MenuItem {
  key: string;
  quantity: number;
  special_instructions?: string;
  modifiers?: any[];
}

// Premium Button Component
const PremiumButton = ({ 
  children, 
  onClick, 
  variant = 'primary', 
  size = 'md', 
  disabled = false,
  className = '',
  icon = null,
  style = {}
}: {
  children: any;
  onClick: any;
  variant?: string;
  size?: string;
  disabled?: boolean;
  className?: string;
  icon?: any;
  style?: React.CSSProperties;
}) => {
  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    borderRadius: '20px',
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    position: 'relative',
    overflow: 'hidden',
    touchAction: 'manipulation'
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 100%)',
      color: 'white',
      boxShadow: '0 8px 32px rgba(255, 107, 53, 0.3)'
    },
    secondary: {
      background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,248,240,0.9) 100%)',
      color: '#d2691e',
      border: '2px solid rgba(255, 183, 0, 0.3)',
      backdropFilter: 'blur(10px)'
    },
    ghost: {
      background: 'transparent',
      color: '#ff6b35',
      boxShadow: 'none'
    },
    danger: {
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      color: 'white'
    }
  };

  const sizes = {
    sm: {
      fontSize: '0.95rem',
      padding: '0.5rem 1.2rem',
      minHeight: '40px',
      minWidth: '40px'
    },
    md: {
      fontSize: '1.1rem',
      padding: '0.75rem 1.8rem',
      minHeight: '48px',
      minWidth: '48px'
    },
    lg: {
      fontSize: '1.3rem',
      padding: '1rem 2.5rem',
      minHeight: '56px',
      minWidth: '56px'
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...baseStyles,
        ...variants[variant],
        ...sizes[size],
        opacity: disabled ? 0.6 : 1,
        ...style
      }}
      className={className}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(255, 107, 53, 0.4)';
          }
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          if (variant === 'primary') {
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(255, 107, 53, 0.3)';
          }
        }
      }}
    >
      {icon && <span style={{ marginRight: '0.5rem' }}>{icon}</span>}
      {children}
    </button>
  );
};

// Premium Card Component
const PremiumCard = ({
  children,
  className = '',
  hoverable = true,
  gradient = false,
  style = {}
}: {
  children: any;
  className?: string;
  hoverable?: boolean;
  gradient?: boolean;
  style?: React.CSSProperties;
}) => {
  const baseStyles = {
    background: gradient 
      ? 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,248,240,0.9) 100%)'
      : 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '25px',
    border: '2px solid rgba(255, 183, 0, 0.2)',
    boxShadow: '0 20px 60px rgba(255, 107, 53, 0.1)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden'
  };

  return (
    <div
      style={{ ...baseStyles, ...style }}
      className={className}
      onMouseEnter={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(-8px)';
          e.currentTarget.style.boxShadow = '0 30px 80px rgba(255, 107, 53, 0.2)';
        }
      }}
      onMouseLeave={(e) => {
        if (hoverable) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 20px 60px rgba(255, 107, 53, 0.1)';
        }
      }}
    >
      {children}
    </div>
  );
};

// Premium Badge Component
const PremiumBadge = ({ children, variant = 'default', icon = null }) => {
  const variants = {
    default: {
      background: 'linear-gradient(135deg, rgba(255, 107, 53, 0.1) 0%, rgba(255, 183, 0, 0.1) 100%)',
      color: '#ff6b35',
      border: '1px solid rgba(255, 107, 53, 0.2)'
    },
    success: {
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.1) 100%)',
      color: '#16a34a',
      border: '1px solid rgba(34, 197, 94, 0.2)'
    },
    featured: {
      background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 100%)',
      color: 'white',
      border: 'none'
    },
    popular: {
      background: 'linear-gradient(135deg, #e85a4f 0%, #dc2626 100%)',
      color: 'white',
      border: 'none'
    }
  };

  return (
    <span
      style={{
        ...variants[variant],
        padding: '0.5rem 1rem',
        borderRadius: '15px',
        fontSize: '0.75rem',
        fontWeight: '700',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
      }}
    >
      {icon}
      {children}
    </span>
  );
};

const RestaurantDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    priceRange: 'all' as 'all' | 'under10' | 'under20' | 'under30'
  });
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<'delivery' | 'pickup'>('delivery');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Enhanced Restaurant Images
  const restaurantImages = [
    restaurant?.image_url || '/placeholder-restaurant.jpg',
    '/restaurant-interior.jpg',
    '/restaurant-kitchen.jpg',
    '/restaurant-signature-dish.jpg'
  ];

  useEffect(() => {
    if (id) {
      fetchRestaurantData();
    }
  }, [id]);

  const fetchRestaurantData = async () => {
    try {
      setLoading(true);
      
      // Fetch restaurant data
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', id)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // Fetch categories and menu items
      const { data: categoriesData } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', id)
        .order('display_order');

      const { data: menuData } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', id)
        .eq('is_available', true);

      setCategories(categoriesData || []);
      setMenuItems(
        (menuData || []).map((item: any) => ({
          ...item,
          spice_level: item.spice_level !== undefined && item.spice_level !== null
            ? Number(item.spice_level)
            : undefined
        }))
      );
      
      if (categoriesData?.length > 0) {
        setSelectedCategory(categoriesData[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching restaurant data:', error);
      showToast.error("Failed to load restaurant details");
    } finally {
      setLoading(false);
    }
  };

  const addToCart = useCallback((item: MenuItem, quantity: number = 1) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + quantity }
          : cartItem
      ));
    } else {
      setCart([...cart, { ...item, quantity, key: item.id }]);
    }
    
    showToast.success(`${item.name} added to cart!`);
  }, [cart]);

  const getCartTotal = () => {
    const subtotal = cart.reduce((total, item) => total + (item.price_cents * item.quantity), 0);
    const deliveryFee = deliveryMethod === 'delivery' ? (restaurant?.delivery_fee_cents || 0) : 0;
    const tax = Math.round(subtotal * 0.08);
    
    return {
      subtotal,
      deliveryFee,
      tax,
      total: subtotal + deliveryFee + tax
    };
  };

  const getItemsByCategory = (categoryId: string) => {
    return menuItems.filter(item => item.category_id === categoryId);
  };

  const filteredItems = menuItems.filter(item => {
    // Search filter
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Dietary filters
    const matchesDietary = (!filters.vegetarian || item.is_vegetarian) &&
      (!filters.vegan || item.is_vegan) &&
      (!filters.glutenFree || item.is_gluten_free);
    
    // Price filter
    const priceInDollars = item.price_cents / 100;
    const matchesPrice = filters.priceRange === 'all' ||
      (filters.priceRange === 'under10' && priceInDollars < 10) ||
      (filters.priceRange === 'under20' && priceInDollars < 20) ||
      (filters.priceRange === 'under30' && priceInDollars < 30);
    
    return matchesSearch && matchesDietary && matchesPrice;
  });

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <PremiumCard hoverable={false} style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid #ff6b35',
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }} />
          <h3 style={{ color: '#ff6b35', fontSize: '1.5rem', fontWeight: '700' }}>
            Loading Restaurant...
          </h3>
        </PremiumCard>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <PremiumCard hoverable={false} style={{ padding: '3rem', textAlign: 'center', maxWidth: '400px' }}>
          <h2 style={{ color: '#ff6b35', fontSize: '2rem', marginBottom: '1rem' }}>
            Restaurant Not Found
          </h2>
          <PremiumButton onClick={() => navigate('/restaurants')}>
            Browse Restaurants
          </PremiumButton>
        </PremiumCard>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #fff8f0 0%, #ffeee6 100%)'
    }}>
      {/* Immersive Hero Section */}
      <section style={{ position: 'relative', height: '70vh', overflow: 'hidden' }}>
        {/* Dynamic Background */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(rgba(0,0,0,0.3), rgba(255,107,53,0.4)), url(${restaurantImages[activeImageIndex]})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          transition: 'all 0.8s ease'
        }} />
        
        {/* Floating Navigation */}
        <div style={{
          position: 'absolute',
          top: '2rem',
          left: '2rem',
          right: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10
        }}>
          <PremiumButton
            variant="secondary"
            size="sm"
            onClick={() => navigate(-1)}
            icon={<ChevronLeft style={{ width: '20px', height: '20px' }} />}
            style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }} children={undefined}          />
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <PremiumButton
              variant="secondary"
              size="sm"
              onClick={() => setIsFavorited(!isFavorited)}
              icon={<Heart style={{
                width: '20px',
                height: '20px',
                fill: isFavorited ? '#ff6b35' : 'transparent',
                color: isFavorited ? '#ff6b35' : '#666'
              }} />}
              style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }} children={undefined}            />
            <PremiumButton
              variant="secondary"
              size="sm"
              icon={<Share2 style={{ width: '20px', height: '20px' }} />}
              style={{ borderRadius: '50%', width: '50px', height: '50px', padding: 0 }} children={undefined} onClick={undefined}            />
          </div>
        </div>

        {/* Image Navigation Dots */}
        <div style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.5rem',
          zIndex: 10
        }}>
          {restaurantImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setActiveImageIndex(index)}
              style={{
                width: activeImageIndex === index ? '40px' : '12px',
                height: '12px',
                borderRadius: '6px',
                border: 'none',
                background: activeImageIndex === index 
                  ? 'rgba(255, 255, 255, 0.9)' 
                  : 'rgba(255, 255, 255, 0.5)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            />
          ))}
        </div>

        {/* Restaurant Info Overlay */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          padding: '4rem 2rem 2rem',
          color: 'white'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <h1 style={{
                fontSize: 'clamp(2rem, 4vw, 4rem)',
                fontWeight: '800',
                margin: 0,
                textShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
              }}>
                {restaurant.name}
              </h1>
              {restaurant.chef_name && (
                <PremiumBadge variant="featured" icon={<ChefHat style={{ width: '14px', height: '14px' }} />}>
                  Chef {restaurant.chef_name}
                </PremiumBadge>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '2rem',
              alignItems: 'center',
              marginBottom: '1rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Star style={{ width: '24px', height: '24px', fill: '#ffb700', color: '#ffb700' }} />
                <span style={{ fontSize: '1.5rem', fontWeight: '700' }}>{restaurant.rating}</span>
                <span style={{ opacity: 0.8 }}>({restaurant.total_reviews}+ reviews)</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Clock style={{ width: '20px', height: '20px' }} />
                <span>{restaurant.min_delivery_time}-{restaurant.max_delivery_time} min</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Truck style={{ width: '20px', height: '20px' }} />
                <span>${(restaurant.delivery_fee_cents / 100).toFixed(2)} delivery</span>
              </div>
              
              <PremiumBadge variant="success">
                Open Now
              </PremiumBadge>
            </div>
            
            <p style={{
              fontSize: '1.1rem',
              opacity: 0.9,
              maxWidth: '600px',
              lineHeight: 1.6
            }}>
              {restaurant.description}
            </p>
          </div>
        </div>
      </section>

      {/* Floating Delivery Method Selector */}
      <div style={{
        position: 'sticky',
        top: '1rem',
        zIndex: 50,
        margin: '2rem',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <PremiumCard hoverable={false} style={{ padding: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['delivery', 'pickup'].map((method) => (
              <PremiumButton
                key={method}
                variant={deliveryMethod === method ? 'primary' : 'ghost'}
                onClick={() => setDeliveryMethod(method as 'delivery' | 'pickup')}
                icon={method === 'delivery' ? <Truck style={{ width: '18px', height: '18px' }} /> : <MapPin style={{ width: '18px', height: '18px' }} />}
                style={{ textTransform: 'capitalize' }}
              >
                {method}
              </PremiumButton>
            ))}
          </div>
        </PremiumCard>
      </div>

      {/* Enhanced Search & Filter */}
      <div style={{
        padding: '0 2rem',
        maxWidth: '1200px',
        margin: '0 auto 2rem'
      }}>
        <PremiumCard hoverable={false} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#d2691e'
              }} />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  border: '2px solid rgba(255, 183, 0, 0.3)',
                  borderRadius: '20px',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  color: '#8b4513'
                }}
              />
            </div>
            
            <PremiumButton
                variant="secondary"
                icon={<Filter style={{ width: '16px', height: '16px' }} />}
                onClick={() => setShowFilters(true)}
              >
              Filters
              {(filters.vegetarian || filters.vegan || filters.glutenFree || filters.priceRange !== 'all') && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  background: '#ff6b35',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%'
                }} />
              )}
            </PremiumButton>
            
            <PremiumButton
              variant={cart.length > 0 ? 'primary' : 'secondary'}
              onClick={() => setShowCart(true)}
              icon={<ShoppingCart style={{ width: '18px', height: '18px' }} />}
            >
              Cart
              {cart.length > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-8px',
                  right: '-8px',
                  background: '#e85a4f',
                  color: 'white',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.8rem',
                  fontWeight: '700'
                }}>
                  {cart.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              )}
            </PremiumButton>
          </div>
        </PremiumCard>
      </div>

      {/* Menu Categories */}
      <div style={{
        padding: '0 2rem',
        maxWidth: '1200px',
        margin: '0 auto 3rem'
      }}>
        <div style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          paddingBottom: '1rem'
        }}>
          {categories.map((category) => (
            <PremiumButton
              key={category.id}
              variant={selectedCategory === category.id ? 'primary' : 'secondary'}
              onClick={() => setSelectedCategory(category.id)}
              style={{ whiteSpace: 'nowrap' }}
            >
              {category.icon && <span style={{ marginRight: '0.5rem' }}>{category.icon}</span>}
              {category.name}
            </PremiumButton>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div style={{
        padding: '0 2rem',
        maxWidth: '1200px',
        margin: '0 auto 4rem'
      }}>
        {searchQuery ? (
          <div>
            <h2 style={{
              fontSize: '2rem',
              fontWeight: '800',
              marginBottom: '2rem',
              background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Search Results ({filteredItems.length})
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '2rem'
            }}>
              {filteredItems.map((item) => (
                <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
              ))}
            </div>
          </div>
        ) : (
          categories.map((category) => {
            const categoryItems = getItemsByCategory(category.id);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.id} style={{ marginBottom: '4rem' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '2rem'
                }}>
                  <h2 style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    {category.icon} {category.name}
                  </h2>
                  <PremiumBadge>
                    {categoryItems.length} items
                  </PremiumBadge>
                </div>
                
                {category.description && (
                  <p style={{
                    fontSize: '1.1rem',
                    color: '#d2691e',
                    marginBottom: '2rem',
                    fontWeight: '500'
                  }}>
                    {category.description}
                  </p>
                )}
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '2rem'
                }}>
                  {categoryItems.map((item) => (
                    <MenuItemCard key={item.id} item={item} onAddToCart={addToCart} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Cart Summary */}
      {cart.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 100
        }}>
          <PremiumButton
            variant="primary"
            size="lg"
            onClick={() => setShowCart(true)}
            icon={<ShoppingCart style={{ width: '24px', height: '24px' }} />}
            style={{
              animation: 'bounce 2s infinite',
              boxShadow: '0 20px 60px rgba(255, 107, 53, 0.4)'
            }}
          >
            {cart.reduce((sum, item) => sum + item.quantity, 0)} items • ${(getCartTotal().total / 100).toFixed(2)}
          </PremiumButton>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateX(-50%) translateY(0); }
          40% { transform: translateX(-50%) translateY(-5px); }
          60% { transform: translateX(-50%) translateY(-3px); }
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Filter Dialog */}
      {showFilters && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={() => setShowFilters(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <PremiumCard
              hoverable={false}
              style={{
                maxWidth: '500px',
                width: '100%',
                padding: '2rem'
              }}
            >
              <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#ff6b35' }}>
                  Filter Menu
                </h3>
                <button
                  onClick={() => setShowFilters(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0.5rem'
                  }}
                >
                  <X style={{ width: '24px', height: '24px', color: '#8b4513' }} />
                </button>
              </div>
            </div>

            {/* Dietary Preferences */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#8b4513', marginBottom: '1rem' }}>
                <Leaf style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                Dietary Preferences
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { key: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
                  { key: 'vegan', label: 'Vegan', icon: '🌱' },
                  { key: 'glutenFree', label: 'Gluten-Free', icon: '🌾' }
                ].map(option => (
                  <label
                    key={option.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.75rem',
                      border: `2px solid ${(filters as any)[option.key] ? '#ff6b35' : 'rgba(255, 183, 0, 0.2)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: (filters as any)[option.key] ? 'rgba(255, 107, 53, 0.1)' : 'transparent'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={(filters as any)[option.key]}
                      onChange={(e) => setFilters({ ...filters, [option.key]: e.target.checked })}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer',
                        accentColor: '#ff6b35'
                      }}
                    />
                    <span style={{ fontSize: '1.5rem' }}>{option.icon}</span>
                    <span style={{ fontWeight: '500', color: '#8b4513' }}>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Price Range */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '1rem', fontWeight: '600', color: '#8b4513', marginBottom: '1rem' }}>
                <DollarSign style={{ width: '16px', height: '16px', display: 'inline', marginRight: '0.5rem' }} />
                Price Range
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { value: 'all', label: 'All Prices' },
                  { value: 'under10', label: 'Under $10' },
                  { value: 'under20', label: 'Under $20' },
                  { value: 'under30', label: 'Under $30' }
                ].map(option => (
                  <label
                    key={option.value}
                    style={{
                      padding: '0.75rem',
                      border: `2px solid ${filters.priceRange === option.value ? '#ff6b35' : 'rgba(255, 183, 0, 0.2)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      fontWeight: '500',
                      color: '#8b4513',
                      transition: 'all 0.2s',
                      background: filters.priceRange === option.value ? 'rgba(255, 107, 53, 0.1)' : 'transparent'
                    }}
                  >
                    <input
                      type="radio"
                      name="priceRange"
                      value={option.value}
                      checked={filters.priceRange === option.value}
                      onChange={(e) => setFilters({ ...filters, priceRange: e.target.value as any })}
                      style={{ display: 'none' }}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <PremiumButton
                variant="secondary"
                onClick={() => {
                  setFilters({
                    vegetarian: false,
                    vegan: false,
                    glutenFree: false,
                    priceRange: 'all'
                  });
                }}
                style={{ flex: 1 }}
              >
                Clear All
              </PremiumButton>
              <PremiumButton
                variant="primary"
                onClick={() => setShowFilters(false)}
                style={{ flex: 1 }}
              >
                Apply Filters
              </PremiumButton>
            </div>
            </PremiumCard>
          </div>
        </div>
      )}
    </div>
  );
};

// Enhanced Menu Item Card
const MenuItemCard = ({ item, onAddToCart }: { item: MenuItem; onAddToCart: (item: MenuItem) => void }) => {
  return (
    <PremiumCard style={{ position: 'relative', cursor: 'pointer' }}>
      {/* Special Badges */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        left: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        zIndex: 10
      }}>
        {item.chef_recommended && (
          <PremiumBadge variant="featured" icon={<ChefHat style={{ width: '12px', height: '12px' }} />}>
            Chef's Choice
          </PremiumBadge>
        )}
        {item.is_featured && (
          <PremiumBadge variant="popular" icon={<TrendingUp style={{ width: '12px', height: '12px' }} />}>
            Popular
          </PremiumBadge>
        )}
      </div>

      {/* Dietary Badges */}
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 10
      }}>
        {item.is_vegetarian && (
          <div style={{
            background: 'rgba(34, 197, 94, 0.9)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Leaf style={{ width: '16px', height: '16px' }} />
          </div>
        )}
        {item.is_gluten_free && (
          <div style={{
            background: 'rgba(168, 85, 247, 0.9)',
            color: 'white',
            padding: '0.5rem',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.8rem',
            fontWeight: '700'
          }}>
            GF
          </div>
        )}
      </div>

      {/* Item Image */}
      <div style={{
        height: '200px',
        background: `linear-gradient(rgba(0,0,0,0.1), rgba(255,107,53,0.1)), url(${item.image_url || '/placeholder-food.jpg'})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        borderRadius: '20px 20px 0 0',
        position: 'relative'
      }}>
        {/* Spice Level */}
        {item.spice_level && item.spice_level > 0 && (
          <div style={{
            position: 'absolute',
            bottom: '1rem',
            left: '1rem',
            display: 'flex',
            gap: '2px'
          }}>
            {[...Array(3)].map((_, i) => (
              <span
                key={i}
                style={{
                  fontSize: '1rem',
                  opacity: i < item.spice_level! ? 1 : 0.3
                }}
              >
                🌶️
              </span>
            ))}
          </div>
        )}

        {/* Quick Add Button */}
        <PremiumButton
          variant="primary"
          size="sm"
          onClick={(e) => {
            e?.stopPropagation();
            onAddToCart(item);
          } }
          icon={<Plus style={{ width: '20px', height: '20px' }} />}
          style={{
            position: 'absolute',
            bottom: '1rem',
            right: '1rem',
            borderRadius: '50%',
            width: '45px',
            height: '45px',
            padding: 0
          }} children={undefined}        />
      </div>

      {/* Item Details */}
      <div style={{ padding: '1.5rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '1rem'
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '800',
              color: '#8b4513',
              marginBottom: '0.5rem',
              lineHeight: 1.2
            }}>
              {item.name}
            </h3>
            <p style={{
              color: '#d2691e',
              fontSize: '0.95rem',
              lineHeight: 1.4,
              marginBottom: '1rem'
            }}>
              {item.description}
            </p>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #ff6b35 0%, #f97316 100%)',
            color: 'white',
            padding: '0.75rem 1rem',
            borderRadius: '20px',
            fontWeight: '800',
            fontSize: '1.1rem',
            marginLeft: '1rem'
          }}>
            ${(item.price_cents / 100).toFixed(2)}
          </div>
        </div>

        {/* Additional Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '1rem',
          borderTop: '1px solid rgba(255, 183, 0, 0.2)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            fontSize: '0.9rem',
            color: '#d2691e'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Clock style={{ width: '16px', height: '16px' }} />
              {item.preparation_time} min
            </div>
            {item.calories && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Zap style={{ width: '16px', height: '16px' }} />
                {item.calories} cal
              </div>
            )}
          </div>
        </div>
      </div>
    </PremiumCard>
  );
};

export default RestaurantDetail;