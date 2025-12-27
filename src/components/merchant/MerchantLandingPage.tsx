import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { calculateEarnings, formatEarningsRange, type EarningsEstimate } from '@/utils/marketTiers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MerchantSignupForm {
  storeName: string;
  storeAddress: string;
  city: string;
  state: string;
  zipCode: string;
  email: string;
  phone: string;
  businessType: string;
}

export default function MerchantLandingPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<MerchantSignupForm>({
    storeName: '',
    storeAddress: '',
    city: '',
    state: '',
    zipCode: '',
    email: '',
    phone: '',
    businessType: '',
  });
  
  const [earningsEstimate, setEarningsEstimate] = useState<EarningsEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<{ city: string; state: string } | null>(null);
  const isAutoDetectingRef = useRef(false);

  // Automatically detect user location on page load
  useEffect(() => {
    const detectLocation = async () => {
      setIsCalculating(true);
      isAutoDetectingRef.current = true;
      
      try {
        // Method 1: Try IP-based location detection first (works without permission)
        const ipLocation = await detectLocationFromIP();
        if (ipLocation) {
          setDetectedLocation(ipLocation);
          const population = await fetchCityPopulation(ipLocation.city, ipLocation.state);
          if (population) {
            const estimate = calculateEarnings(population, ipLocation.city, ipLocation.state);
            if (estimate) {
              setEarningsEstimate(estimate);
              setFormData(prev => ({ ...prev, city: ipLocation.city, state: ipLocation.state }));
            }
          }
          setIsCalculating(false);
          isAutoDetectingRef.current = false;
          return;
        }
      } catch (error) {
        console.warn('IP-based location detection failed:', error);
      }

      // Method 2: Try browser geolocation API (requires permission)
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              const location = await reverseGeocode(latitude, longitude);
              if (location) {
                setDetectedLocation(location);
                const population = await fetchCityPopulation(location.city, location.state);
                if (population) {
                  const estimate = calculateEarnings(population, location.city, location.state);
                  if (estimate) {
                    setEarningsEstimate(estimate);
                    setFormData(prev => ({ ...prev, city: location.city, state: location.state }));
                  }
                }
              }
            } catch (error) {
              console.error('Reverse geocoding failed:', error);
              // Fallback to default
              setDefaultEarnings();
            } finally {
              setIsCalculating(false);
              isAutoDetectingRef.current = false;
            }
          },
          (error) => {
            console.warn('Geolocation permission denied or failed:', error);
            // Fallback to default
            setDefaultEarnings();
            setIsCalculating(false);
            isAutoDetectingRef.current = false;
          },
          { timeout: 5000, enableHighAccuracy: false }
        );
      } else {
        // No geolocation support, use default
        setDefaultEarnings();
        setIsCalculating(false);
        isAutoDetectingRef.current = false;
      }
    };

    detectLocation();
  }, []);

  // Set default earnings (national average) as fallback
  const setDefaultEarnings = () => {
    const defaultPopulation = 500000; // National average
    const defaultEstimate = calculateEarnings(defaultPopulation, '', '');
    if (defaultEstimate) {
      setEarningsEstimate({
        ...defaultEstimate,
        city: '',
        state: '',
        tier: defaultEstimate.tier,
      });
    }
  };

  // Detect location from IP address using free API
  const detectLocationFromIP = async (): Promise<{ city: string; state: string } | null> => {
    try {
      // Use ipapi.co free tier (1000 requests/day)
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('IP API failed');
      
      const data = await response.json();
      if (data.city && data.region_code) {
        return {
          city: data.city,
          state: data.region_code, // State code like "MI", "CA", etc.
        };
      }
    } catch (error) {
      console.warn('IP-based location detection error:', error);
    }
    return null;
  };

  // Reverse geocode coordinates to city/state using free Nominatim API
  const reverseGeocode = async (lat: number, lng: number): Promise<{ city: string; state: string } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CravenDelivery/1.0', // Required by Nominatim
          },
        }
      );
      
      if (!response.ok) throw new Error('Reverse geocoding failed');
      
      const data = await response.json();
      const address = data.address;
      
      if (address) {
        const city = address.city || address.town || address.village || address.municipality || '';
        const state = address.state_code || address.state || '';
        
        if (city && state) {
          return {
            city,
            state: state.length === 2 ? state.toUpperCase() : state,
          };
        }
      }
    } catch (error) {
      console.warn('Reverse geocoding error:', error);
    }
    return null;
  };

  // Handle city/state change with debounce for population lookup (when user manually enters address)
  useEffect(() => {
    // Skip if this is the initial automatic detection
    if (isAutoDetectingRef.current || !formData.city || !formData.state) {
      return;
    }

    // Only recalculate if user manually changed city/state (not from automatic detection)
    const timer = setTimeout(async () => {
      setIsCalculating(true);
      try {
        const population = await fetchCityPopulation(formData.city, formData.state);
        if (population) {
          const estimate = calculateEarnings(population, formData.city, formData.state);
          if (estimate) {
            setEarningsEstimate(estimate);
          }
        } else {
          // Fallback: use state average if city population not found
          const stateAverage = await fetchStateAveragePopulation(formData.state);
          if (stateAverage) {
            const estimate = calculateEarnings(stateAverage, formData.city, formData.state);
            if (estimate) {
              setEarningsEstimate(estimate);
            }
          }
        }
      } catch (error) {
        console.error('Error calculating earnings:', error);
      } finally {
        setIsCalculating(false);
      }
    }, 1000); // Debounce 1 second

    return () => clearTimeout(timer);
  }, [formData.city, formData.state]);

  // Client-side city population lookup (fallback if edge function fails)
  const CITY_POPULATIONS: Record<string, number> = {
    "detroit,mi": 639111,
    "toledo,oh": 270871,
    "akron,oh": 197597,
    "lansing,mi": 112644,
    "chicago,il": 2693976,
    "cleveland,oh": 385525,
    "grand rapids,mi": 198917,
    "warren,mi": 139387,
    "sterling heights,mi": 134346,
    "ann arbor,mi": 123851,
    "livonia,mi": 96942,
    "troy,mi": 87694,
    "westland,mi": 84494,
    "flint,mi": 81752,
    "columbus,oh": 913921,
    "cincinnati,oh": 309317,
    "pittsburgh,pa": 302971,
    "buffalo,ny": 276486,
    "milwaukee,wi": 577222,
    "minneapolis,mn": 429954,
    "st. paul,mn": 311527,
    "indianapolis,in": 887642,
    "nashville,tn": 678851,
    "atlanta,ga": 498715,
    "miami,fl": 442241,
    "tampa,fl": 384959,
    "orlando,fl": 307573,
    "charlotte,nc": 900350,
    "raleigh,nc": 474069,
    "phoenix,az": 1608139,
    "tucson,az": 542629,
    "denver,co": 715522,
    "seattle,wa": 753675,
    "portland,or": 652503,
    "san francisco,ca": 873965,
    "san jose,ca": 1021795,
    "los angeles,ca": 3898747,
    "san diego,ca": 1423851,
    "dallas,tx": 1343573,
    "houston,tx": 2320268,
    "austin,tx": 978908,
    "san antonio,tx": 1547253,
    "boston,ma": 692600,
    "new york,ny": 8336817,
    "philadelphia,pa": 1603797,
    "washington,dc": 670050,
  };

  const STATE_AVERAGES: Record<string, number> = {
    "MI": 600000,
    "OH": 500000,
    "IL": 1000000,
    "IN": 450000,
    "NY": 1500000,
    "CA": 800000,
    "TX": 700000,
    "FL": 550000,
    "PA": 500000,
    "AZ": 600000,
    "NC": 450000,
    "WA": 500000,
    "CO": 450000,
    "MA": 600000,
    "WI": 450000,
    "MN": 450000,
    "GA": 550000,
    "TN": 500000,
    "OR": 450000,
    "NV": 500000,
    "UT": 400000,
    "MD": 550000,
    "MO": 450000,
    "LA": 450000,
    "AL": 400000,
    "KY": 400000,
    "SC": 400000,
    "OK": 450000,
    "CT": 400000,
    "IA": 350000,
    "MS": 350000,
    "AR": 350000,
    "KS": 350000,
    "NM": 400000,
    "NE": 350000,
    "WV": 300000,
    "ID": 300000,
    "HI": 400000,
    "NH": 300000,
    "ME": 300000,
    "MT": 250000,
    "RI": 350000,
    "DE": 300000,
    "SD": 250000,
    "ND": 250000,
    "AK": 250000,
    "VT": 200000,
    "DC": 670050,
    "WY": 200000,
  };

  // Fetch city population from Supabase edge function with client-side fallback
  const fetchCityPopulation = async (city: string, state: string): Promise<number | null> => {
    // Try edge function first
    try {
      const { data, error } = await supabase.functions.invoke('get-city-population', {
        body: { city, state },
      });

      if (!error && data?.population) {
        return data.population;
      }
    } catch (error) {
      console.warn('Edge function unavailable, using client-side fallback:', error);
    }

    // Client-side fallback
    const cityKey = `${city.toLowerCase().trim()},${state.toUpperCase().trim()}`;
    const population = CITY_POPULATIONS[cityKey];
    
    if (population) {
      return population;
    }

    // Try state average
    const stateAvg = STATE_AVERAGES[state.toUpperCase().trim()];
    return stateAvg || 400000; // Default fallback
  };

  const fetchStateAveragePopulation = async (state: string): Promise<number | null> => {
    // Try edge function first
    try {
      const { data, error } = await supabase.functions.invoke('get-city-population', {
        body: { city: '', state },
      });

      if (!error && data?.population) {
        return data.population;
      }
    } catch (error) {
      console.warn('Edge function unavailable, using client-side fallback:', error);
    }

    // Client-side fallback
    return STATE_AVERAGES[state.toUpperCase().trim()] || 400000;
  };

  const handleInputChange = (field: keyof MerchantSignupForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.storeName || !formData.storeAddress || !formData.email || !formData.phone || !formData.businessType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.city || !formData.state) {
      toast.error('Please enter your city and state to continue');
      return;
    }

    // Try to get earnings estimate if not already calculated
    if (!earningsEstimate && formData.city && formData.state) {
      setIsCalculating(true);
      try {
        const population = await fetchCityPopulation(formData.city, formData.state);
        if (population) {
          const estimate = calculateEarnings(population, formData.city, formData.state);
          if (estimate) {
            setEarningsEstimate(estimate);
          }
        }
      } catch (error) {
        console.error('Error calculating earnings:', error);
      } finally {
        setIsCalculating(false);
      }
    }

    setIsLoading(true);

    try {
      // Store form data in localStorage to pass to onboarding wizard
      localStorage.setItem('merchant_signup_data', JSON.stringify({
        ...formData,
        earningsEstimate,
      }));

      // Navigate to onboarding wizard
      navigate('/restaurant/register');
    } catch (error) {
      console.error('Error starting signup:', error);
      toast.error('Failed to start signup process. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const businessTypes = [
    'Restaurant',
    'Cafe',
    'Fast Food',
    'Pizza',
    'Bakery',
    'Food Truck',
    'Catering',
    'Grocery Store',
    'Other',
  ];

  // Format earnings for display in heading
  const getEarningsHeading = () => {
    if (isCalculating) {
      return 'CALCULATING EARNINGS...';
    }
    if (earningsEstimate) {
      const cityName = earningsEstimate.city || 'YOUR AREA';
      const range = formatEarningsRange(earningsEstimate);
      // Format: "YOUR BUSINESS AROUND DETROIT COULD EARN $52,000 - $98,000 PER YEAR"
      return `YOUR BUSINESS AROUND ${cityName.toUpperCase()} COULD EARN ${range} PER YEAR`;
    }
    return 'YOUR BUSINESS COULD EARN SIGNIFICANT REVENUE PER YEAR';
  };

  return (
    <div className="min-h-screen bg-red-800">
      {/* Header */}
      <header className="bg-red-800 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-red-600 font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-bold text-white">Crave'n</span>
          </div>
          <Button variant="ghost" size="sm" className="text-white hover:bg-red-700" onClick={() => navigate('/restaurant/auth')}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-lg mx-auto">
          {/* Hero Section with Earnings Estimate */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold uppercase text-red-700 mb-3 leading-tight">
              {getEarningsHeading()}
            </h1>
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // TODO: Add earnings estimation explanation modal/page
              }}
              className="text-sm text-gray-700 underline hover:text-red-600"
            >
              How we estimate earnings
            </a>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Store Name */}
            <div>
              <Input
                value={formData.storeName}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                placeholder="Store name"
                className="h-12 bg-gray-50 border-gray-300 rounded-md"
                required
              />
            </div>

            {/* Store Address */}
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={formData.storeAddress}
                onChange={(e) => {
                  const address = e.target.value;
                  handleInputChange('storeAddress', address);
                  
                  // Mark that user is manually entering address (not auto-detecting)
                  isAutoDetectingRef.current = false;
                  
                  // Extract city/state from address - handles formats like:
                  // "123 Main St, Detroit, MI 48201"
                  // "Detroit, MI"
                  // "Detroit, MI 48201"
                  const cityStateMatch = address.match(/([^,]+),\s*([A-Z]{2})(?:\s+\d{5})?/i);
                  if (cityStateMatch && cityStateMatch.length >= 3) {
                    const city = cityStateMatch[1].trim();
                    const state = cityStateMatch[2].trim().toUpperCase();
                    setFormData(prev => {
                      if (prev.city !== city || prev.state !== state) {
                        return { ...prev, city, state };
                      }
                      return prev;
                    });
                  }
                }}
                placeholder="Store address"
                className="pl-10 h-12 bg-gray-50 border-gray-300 rounded-md"
                required
              />
            </div>

            {/* Email and Phone - Side by Side */}
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Email Address"
                className="h-12 bg-gray-50 border-gray-300 rounded-md"
                required
              />
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Store phone"
                className="h-12 bg-gray-50 border-gray-300 rounded-md"
                required
              />
            </div>

            {/* Business Type Dropdown */}
            <Select
              value={formData.businessType}
              onValueChange={(value) => handleInputChange('businessType', value)}
              required
            >
              <SelectTrigger className="h-12 bg-gray-50 border-gray-300 rounded-md">
                <SelectValue placeholder="Select your business type" />
              </SelectTrigger>
              <SelectContent>
                {businessTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>


            {/* Legal Disclaimer */}
            <p className="text-xs text-gray-600 leading-relaxed">
              By clicking "Start Free Trial," I agree to receive marketing electronic communications from Crave'n.
            </p>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md"
              disabled={isLoading || isCalculating}
            >
              {isLoading ? 'Starting...' : 'Start Free Trial'}
            </Button>
          </form>
          </div>
        </div>
      </div>
      {/* Bottom red background */}
      <div className="bg-red-800 h-16"></div>
    </div>
  );
}






