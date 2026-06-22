import React, { useState, useEffect } from "react";
import { MapPin, Search, User, ShoppingCart, ChevronDown, LogOut, Menu, X, Gift, Store, Building2, Plus, Minus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import cravenLogo from "@/assets/craven-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMerchantStatus } from "@/hooks/useMerchantStatus";
import AuthModal from "./auth/AuthModal";
import AddressSelector from "./address/AddressSelector";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useCart } from "@/contexts/CartContext";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface User {
  id: string;
  email?: string;
  user_metadata?: any;
}

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const { toast } = useToast();
  const { isMerchant, merchantLoading } = useMerchantStatus(user?.id || null);
  const restaurantsVisible = useFeatureFlag('feature_restaurants_visible');
  
  // Get cart from context
  const { cartItems, cartCount, removeFromCart, updateCartItem, getCartTotal, clearCart } = useCart();
  
  // Check if on feeder subdomain
  const isFeederSubdomain = typeof window !== 'undefined' && 
    (window.location.hostname === 'feeder.cravenusa.com' || 
     window.location.hostname === 'feed.cravenusa.com');
  
  // Check if on merchant subdomain
  const isMerchantSubdomain = typeof window !== 'undefined' && 
    window.location.hostname === 'merchant.cravenusa.com';

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account."
      });

      // After logout, always send customers to the customer login landing page
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <header className="bg-background border-b border-border sticky top-0 z-50 shadow-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/">
              <img src={cravenLogo} alt="CRAVE'N" className="h-10" />
            </Link>
            <div className="animate-pulse">Loading...</div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="bg-background border-b border-border sticky top-0 z-50 shadow-card">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/">
                <img src={cravenLogo} alt="CRAVE'N" className="h-10" />
              </Link>
            </div>

            {/* Desktop Navigation */}
            {!isFeederSubdomain && !isMerchantSubdomain && (
              <nav className="hidden lg:flex items-center space-x-6">
                {restaurantsVisible && (
                  <Link to="/restaurants" className="text-foreground hover:text-primary transition-colors">Place an Order</Link>
                )}
                <Link to="/cx/send" className="text-foreground hover:text-primary transition-colors">Send a Package</Link>
                <Link to="/feeder" className="text-foreground hover:text-primary transition-colors">Become a Feeder</Link>
                
              </nav>
            )}
            {isMerchantSubdomain && (
              <nav className="hidden lg:flex space-x-6">
                <a href="/solutions" className="text-foreground hover:text-primary transition-colors">Solutions</a>
                <a href="/register" className="text-foreground hover:text-primary transition-colors">Get Started</a>
              </nav>
            )}

            {/* Desktop Location/Address Selector */}
            <div className="hidden lg:flex">
              {user ? (
                <AddressSelector 
                  userId={user.id} 
                  onAddressChange={(address) => setSelectedAddress(address)} 
                />
              ) : (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm">Deliver to</span>
                  <span className="text-xs font-medium text-foreground">Current Location</span>
                </div>
              )}
            </div>

            {/* Desktop Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search restaurants, clothing stores, brands, cuisines or dishes"
                  className="pl-10 bg-muted border-0 focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center space-x-2">
              {isMerchantSubdomain && (
                <Button 
                  variant="outline" 
                  size="sm"
                  asChild
                >
                  <Link to="/auth">Sign In</Link>
                </Button>
              )}
              
              {user && (
                <Popover open={isCartOpen} onOpenChange={setIsCartOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="relative"
                    >
                      <ShoppingCart className="h-5 w-5" />
                      {cartCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                          {cartCount}
                        </span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0" align="end">
                    <div className="p-4 border-b">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">Cart</h3>
                        {cartItems.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              clearCart();
                              toast({
                                title: "Cart cleared",
                                description: "All items removed from cart",
                              });
                            }}
                            className="text-xs text-muted-foreground"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {cartItems.length === 0 ? (
                        <div className="p-8 text-center">
                          <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                          <p className="text-muted-foreground font-medium">Cart Empty</p>
                          <p className="text-sm text-muted-foreground mt-1">(No Items In Cart)</p>
                        </div>
                      ) : (
                        <div className="p-4 space-y-4">
                          {cartItems.map((item) => (
                            <div key={item.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
                              <div className="flex-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{item.name}</p>
                                    {item.special_instructions && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        Note: {item.special_instructions}
                                      </p>
                                    )}
                                    {item.modifiers && item.modifiers.length > 0 && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        {item.modifiers.map((mod: any, idx: number) => (
                                          <span key={idx}>
                                            {mod.name}
                                            {idx < item.modifiers!.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => updateCartItem(item.id, Math.max(1, item.quantity - 1))}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => updateCartItem(item.id, item.quantity + 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <p className="text-sm font-semibold">
                                    ${((item.price_cents * item.quantity) / 100).toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {cartItems.length > 0 && (
                      <div className="p-4 border-t space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Total</span>
                          <span className="font-bold text-lg">
                            ${(getCartTotal() / 100).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => {
                            setIsCartOpen(false);
                            navigate('/checkout');
                          }}
                        >
                          Proceed to Checkout
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              )}
              
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden lg:inline">{user.email}</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link to="/track-order" className="flex items-center cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        <span>Active Orders</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/account" className="flex items-center cursor-pointer">
                        <Gift className="mr-2 h-4 w-4" />
                        <span>Rewards</span>
                      </Link>
                    </DropdownMenuItem>
                    {isMerchant && !merchantLoading && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/merchant-portal" className="flex items-center cursor-pointer">
                            <Store className="mr-2 h-4 w-4" />
                            <span>Merchant Portal</span>
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="hidden lg:inline">Sign In</span>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Sign In to Crave'n</DialogTitle>
                    </DialogHeader>
                    <AuthModal onClose={() => setIsAuthModalOpen(false)} />
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {/* Mobile Burger Menu */}
            <div className="flex md:hidden items-center space-x-2">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-foreground hover:bg-background"
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg z-50">
            <div className="container mx-auto px-4 py-6 space-y-4">
              {/* Mobile Navigation */}
              <nav className="space-y-4">
                {!isFeederSubdomain && !isMerchantSubdomain && restaurantsVisible && (
                  <Link 
                    to="/restaurants" 
                    className="block text-lg font-semibold text-foreground hover:text-primary"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    Restaurants
                  </Link>
                )}
                {!isFeederSubdomain && !isMerchantSubdomain && (
                  <>
                    <Link 
                      to="/feeder" 
                      className="block text-lg font-semibold text-foreground hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Become a Feeder
                    </Link>
                    
                  </>
                )}
                {isMerchantSubdomain && (
                  <>
                    <a 
                      href="/solutions" 
                      className="block text-lg font-semibold text-foreground hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Solutions
                    </a>
                    <a 
                      href="/register" 
                      className="block text-lg font-semibold text-foreground hover:text-primary"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Get Started
                    </a>
                    <a 
                      href="/auth" 
                      className="block text-lg font-semibold text-primary hover:text-primary/80"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      Sign In
                    </a>
                  </>
                )}
              </nav>

              {/* Mobile Auth Section */}
              <div className="pt-4 border-t border-border">
                {user ? (
                  <div className="space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-lg h-12"
                      asChild
                    >
                      <Link to="/track-order" onClick={() => setIsMobileMenuOpen(false)}>
                        <User className="mr-3 h-5 w-5" />
                        Active Orders
                      </Link>
                    </Button>
                    {isMerchant && !merchantLoading && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start text-lg h-12"
                        asChild
                      >
                        <Link to="/merchant-portal" onClick={() => setIsMobileMenuOpen(false)}>
                          <Store className="mr-3 h-5 w-5" />
                          Merchant Portal
                        </Link>
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full justify-start text-lg h-12 text-destructive border-destructive/20 hover:bg-destructive/10"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleSignOut();
                      }}
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      Sign Out
                    </Button>
                  </div>
                ) : (
                  <Button 
                    variant="default" 
                    className="w-full text-lg h-12"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsAuthModalOpen(true);
                    }}
                  >
                    <User className="mr-3 h-5 w-5" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Auth Modal */}
      <Dialog open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In to Crave'n</DialogTitle>
          </DialogHeader>
          <AuthModal onClose={() => setIsAuthModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Header;