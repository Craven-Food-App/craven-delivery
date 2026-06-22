import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';
import { calculateEarnings, formatEarningsRange, type EarningsEstimate, MARKET_TIERS } from '@/utils/marketTiers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import cravenLogo from '@/assets/craven-logo.png';
import { AddressAutocomplete } from '@/components/common/AddressAutocomplete';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { MERCHANT_TERMS_PATH } from '@/constants/merchantTerms';

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
  const [searchParams] = useSearchParams();
  const preselectType = searchParams.get('type');

  // Redirect courier signups to the dedicated CX application page
  useEffect(() => {
    if (preselectType === 'courier') {
      navigate('/cx/apply', { replace: true });
    }
  }, [preselectType, navigate]);

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
  const [showEarningsExplanation, setShowEarningsExplanation] = useState(false);
  const [agreedToMerchantTerms, setAgreedToMerchantTerms] = useState(false);
  const isAutoDetectingRef = useRef(false);

  // Automatically detect user location on page load
  useEffect(() => {
    const detectLocation = async () => {
      setIsCalculating(true);
      isAutoDetectingRef.current = true;
      
      // Method 1: Try browser geolocation API first (most accurate, requires permission)
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              console.log('GPS coordinates:', latitude, longitude);
              const location = await reverseGeocode(latitude, longitude);
              if (location) {
                console.log('Reverse geocoded location:', location);
                setDetectedLocation(location);
                const population = await fetchCityPopulation(location.city, location.state);
                if (population) {
                  const estimate = calculateEarnings(population, location.city, location.state);
                  if (estimate) {
                    setEarningsEstimate(estimate);
                    setFormData(prev => ({ ...prev, city: location.city, state: location.state }));
                  }
                }
                setIsCalculating(false);
                isAutoDetectingRef.current = false;
                return;
              }
            } catch (error) {
              console.error('Reverse geocoding failed:', error);
            }
            
            // If geolocation succeeded but reverse geocoding failed, try IP fallback for estimate only
            try {
              const ipLocation = await detectLocationFromIP();
              if (ipLocation) {
                console.log('IP-based location (reverse geocode failed, for estimate only):', ipLocation);
                setDetectedLocation(ipLocation);
                const population = await fetchCityPopulation(ipLocation.city, ipLocation.state);
                if (population) {
                  const estimate = calculateEarnings(population, ipLocation.city, ipLocation.state);
                  if (estimate) {
                    setEarningsEstimate(estimate);
                    // DO NOT auto-fill form - IP location is inaccurate
                  }
                }
              } else {
                setDefaultEarnings();
              }
            } catch (ipError) {
              console.warn('IP-based location detection failed:', ipError);
              setDefaultEarnings();
            } finally {
              setIsCalculating(false);
              isAutoDetectingRef.current = false;
            }
          },
          async (error) => {
            console.warn('Geolocation permission denied or failed:', error);
            // Method 2: Fallback to IP-based location detection if geolocation fails
            // NOTE: IP-based location is inaccurate, so we only use it for earnings estimate display
            // We do NOT auto-fill the form with IP-based location
            try {
              const ipLocation = await detectLocationFromIP();
              if (ipLocation) {
                console.log('IP-based location (geolocation failed, for estimate only):', ipLocation);
                setDetectedLocation(ipLocation);
                const population = await fetchCityPopulation(ipLocation.city, ipLocation.state);
                if (population) {
                  const estimate = calculateEarnings(population, ipLocation.city, ipLocation.state);
                  if (estimate) {
                    setEarningsEstimate(estimate);
                    // DO NOT auto-fill form - IP location is inaccurate
                    // User will enter their actual address manually
                  }
                }
              } else {
                setDefaultEarnings();
              }
            } catch (ipError) {
              console.warn('IP-based location detection failed:', ipError);
              setDefaultEarnings();
            } finally {
              setIsCalculating(false);
              isAutoDetectingRef.current = false;
            }
          },
          { timeout: 10000, enableHighAccuracy: true, maximumAge: 300000 } // 10s timeout, high accuracy, 5min cache
        );
      } else {
        // No geolocation support, use IP-based detection for estimate only
        try {
          const ipLocation = await detectLocationFromIP();
          if (ipLocation) {
            console.log('IP-based location (no geolocation support, for estimate only):', ipLocation);
            setDetectedLocation(ipLocation);
            const population = await fetchCityPopulation(ipLocation.city, ipLocation.state);
            if (population) {
              const estimate = calculateEarnings(population, ipLocation.city, ipLocation.state);
              if (estimate) {
                setEarningsEstimate(estimate);
                // DO NOT auto-fill form - IP location is inaccurate
              }
            }
          } else {
            setDefaultEarnings();
          }
        } catch (ipError) {
          console.warn('IP-based location detection failed:', ipError);
          setDefaultEarnings();
        } finally {
          setIsCalculating(false);
          isAutoDetectingRef.current = false;
        }
      }
    };

    detectLocation();
  }, []);

  // Set default earnings (national average) as fallback
  const setDefaultEarnings = () => {
    const defaultPopulation = 500000;
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
      const response = await fetch('https://ipapi.co/json/');
      if (!response.ok) throw new Error('IP API failed');
      
      const data = await response.json();
      if (data.city && data.region_code) {
        return {
          city: data.city,
          state: data.region_code,
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
      // Use higher zoom level (18) for more precise location
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'CravenDelivery/1.0',
          },
        }
      );
      
      if (!response.ok) throw new Error('Reverse geocoding failed');
      
      const data = await response.json();
      const address = data.address;
      
      if (address) {
        // Try multiple city fields in order of preference
        // For areas like Sylvania, it might be in "suburb" or "city" field
        const city = address.city || 
                     address.town || 
                     address.village || 
                     address.municipality || 
                     address.suburb || // Sylvania might be here
                     address.county || // Fallback to county if no city
                     '';
        
        // State should be in state_code (2-letter) or state (full name)
        let state = address.state_code || address.state || '';
        
        // Convert full state name to abbreviation if needed
        if (state && state.length > 2) {
          const stateNameMap: Record<string, string> = {
            'Ohio': 'OH',
            'Michigan': 'MI',
            'Indiana': 'IN',
            'Pennsylvania': 'PA',
            'Kentucky': 'KY',
            'West Virginia': 'WV',
          };
          state = stateNameMap[state] || state;
        }
        
        if (city && state) {
          console.log('Reverse geocoded:', { city, state, fullAddress: address });
          return {
            city: city.trim(),
            state: state.length === 2 ? state.toUpperCase() : state.toUpperCase(),
          };
        }
      }
    } catch (error) {
      console.warn('Reverse geocoding error:', error);
    }
    return null;
  };

  // Handle city/state change with debounce for population lookup
  useEffect(() => {
    if (isAutoDetectingRef.current || !formData.city || !formData.state) {
      return;
    }

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
    }, 1000);

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

    const cityKey = `${city.toLowerCase().trim()},${state.toUpperCase().trim()}`;
    const population = CITY_POPULATIONS[cityKey];
    
    if (population) {
      return population;
    }

    const stateAvg = STATE_AVERAGES[state.toUpperCase().trim()];
    return stateAvg || 400000;
  };

  const fetchStateAveragePopulation = async (state: string): Promise<number | null> => {
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

    return STATE_AVERAGES[state.toUpperCase().trim()] || 400000;
  };

  const handleInputChange = (field: keyof MerchantSignupForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('Form submission started', formData);
    
    if (!formData.storeName || !formData.storeAddress || !formData.email || !formData.phone || !formData.businessType) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!agreedToMerchantTerms) {
      toast.error('Please agree to the Merchant Terms of Service to continue');
      return;
    }

    let finalCity = formData.city;
    let finalState = formData.state;
    
    if (!finalCity || !finalState) {
      const cityStateMatch = formData.storeAddress.match(/([^,]+),\s*([A-Z]{2})(?:\s+\d{5})?/i);
      if (cityStateMatch && cityStateMatch.length >= 3) {
        finalCity = cityStateMatch[1].trim();
        finalState = cityStateMatch[2].trim().toUpperCase();
        console.log('Extracted city/state from address:', finalCity, finalState);
      }
    }

    if (!finalCity || !finalState) {
      toast.error('Please enter your city and state in the address (e.g., "123 Main St, Detroit, MI")');
      return;
    }

    setIsLoading(true);

    try {
      let finalEarningsEstimate = earningsEstimate;
      if (!finalEarningsEstimate && finalCity && finalState) {
        setIsCalculating(true);
        try {
          const population = await fetchCityPopulation(finalCity, finalState);
          if (population) {
            const estimate = calculateEarnings(population, finalCity, finalState);
            if (estimate) {
              finalEarningsEstimate = estimate;
            }
          }
        } catch (error) {
          console.error('Error calculating earnings:', error);
        } finally {
          setIsCalculating(false);
        }
      }

      const signupData = {
        ...formData,
        city: finalCity,
        state: finalState,
        earningsEstimate: finalEarningsEstimate,
      };
      
      console.log('Storing signup data:', signupData);
      localStorage.setItem('merchant_signup_data', JSON.stringify(signupData));
      console.log('Navigating to /restaurant/register');

      await new Promise(resolve => setTimeout(resolve, 100));
      
      navigate('/restaurant/register', { replace: true });
    } catch (error) {
      console.error('Error starting signup:', error);
      toast.error('Failed to start signup process. Please try again.');
      setIsLoading(false);
    }
  };

  const businessTypes = [
    'Restaurant',
    'Retail',
    'Convenience store',
    'Grocery',
    'Bakery',
    'Coffee',
  ];

  // Prioritize user-entered city, then detected location, then fallback
  const cityName = formData.city || detectedLocation?.city || 'your area';
  const earningsRange = earningsEstimate ? formatEarningsRange(earningsEstimate) : '$55,000 – $75,000';

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar - Sticky Header */}
      <header className="sticky top-0 z-50 bg-[#8B1A1A] h-[92px] flex items-center">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-[980px] flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={cravenLogo} alt="CRAVE'N" className="h-8 sm:h-10" style={{ filter: 'brightness(0) saturate(100%) invert(70%) sepia(100%) saturate(500%) hue-rotate(0deg)' }} />
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-white hover:bg-[#6B1414] hover:text-white" 
            onClick={() => navigate('/restaurant/auth')}
          >
            Sign In
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="bg-gray-100 py-8 sm:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 w-full max-w-[980px]">
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-[22px]">
            
            {/* LEFT HERO PANEL */}
            <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[18px] p-6 sm:p-8 lg:p-10 text-white relative overflow-hidden">
              {/* Subtle orange glow accent */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-400/5 rounded-full blur-2xl"></div>
              
              <div className="relative z-10">
                {/* Kicker */}
                <div className="text-xs sm:text-sm uppercase tracking-wider text-gray-400 mb-4">
                  Merchant onboarding • {cityName}
                </div>

                {/* Headline */}
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                  Businesses in {cityName} are keeping more of every order.
                </h1>

                {/* Subline */}
                <p className="text-sm sm:text-base text-gray-300 mb-8 leading-relaxed">
                  Crave'n charges 15%. No contracts. No forced promos. Built for restaurants, retail, and local operators who care about margin.
                </p>

                {/* Trust Pills */}
                <div className="flex flex-wrap gap-2 sm:gap-3 mb-8">
                  <div className="px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-xs sm:text-sm border border-white/20">
                    <span className="font-bold">15%</span> commission
                  </div>
                  <div className="px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-xs sm:text-sm border border-white/20">
                    No exclusivity
                  </div>
                  <div className="px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-xs sm:text-sm border border-white/20">
                    Leave anytime
                  </div>
                  <div className="px-3 sm:px-4 py-2 bg-white/10 backdrop-blur-sm rounded-lg text-xs sm:text-sm border border-white/20">
                    Local support
                  </div>
                </div>

                {/* Estimate Block */}
                <div className="bg-white/10 backdrop-blur-sm rounded-[12px] p-4 sm:p-5 mb-6 border border-white/20">
                  <div className="text-xs sm:text-sm text-gray-300 mb-3">
                    Estimated annual delivery revenue for similar businesses in {cityName}.
                  </div>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setShowEarningsExplanation(true)}
                      className="text-xs sm:text-sm text-orange-400 hover:text-orange-300 underline"
                    >
                      See how the math works
                    </button>
                    <div className="text-right">
                      {isCalculating ? (
                        <div className="text-lg sm:text-xl font-bold text-gray-400">Calculating...</div>
                      ) : (
                        <div className="text-lg sm:text-xl font-bold">{earningsRange}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hero Footer */}
                <div className="pt-6 border-t border-white/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm text-gray-400">
                  <div>Location-based estimate. Actual results vary by area and hours.</div>
                  <div>Setup takes ~60 seconds.</div>
                </div>
              </div>
            </div>

            {/* RIGHT FORM CARD */}
            <div className="bg-white rounded-[18px] p-6 sm:p-8 shadow-lg">
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
                  Start merchant onboarding
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Create your merchant profile and begin onboarding. No long-term contract. If it doesn't make sense, you walk.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Section */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Business</Label>
                  <div className="space-y-4">
                    <Input
                      value={formData.storeName}
                      onChange={(e) => handleInputChange('storeName', e.target.value)}
                      placeholder="Store name"
                      className="h-11 border-gray-300 rounded-[12px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />

                    <AddressAutocomplete
                      value={formData.storeAddress}
                      onChange={(value) => {
                        handleInputChange('storeAddress', value);
                        isAutoDetectingRef.current = false;
                      }}
                      onAddressParsed={(parsed) => {
                        // Update form data with parsed address components
                        setFormData(prev => ({
                          ...prev,
                          storeAddress: parsed.street,
                          city: parsed.city,
                          state: parsed.state,
                          zipCode: parsed.zipCode,
                        }));
                        
                        // Trigger earnings calculation for the new city/state
                        if (parsed.city && parsed.state) {
                          setIsCalculating(true);
                          fetchCityPopulation(parsed.city, parsed.state).then(population => {
                            if (population) {
                              const estimate = calculateEarnings(population, parsed.city, parsed.state);
                              if (estimate) {
                                setEarningsEstimate(estimate);
                              }
                            }
                            setIsCalculating(false);
                          }).catch(() => {
                            setIsCalculating(false);
                          });
                        }
                      }}
                      placeholder="Store address"
                      className="h-11 border-gray-300 rounded-[12px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />

                    <Select
                      value={formData.businessType}
                      onValueChange={(value) => handleInputChange('businessType', value)}
                      required
                    >
                      <SelectTrigger className="h-11 border-gray-300 rounded-[12px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500">
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
                  </div>
                </div>

                {/* Contact Section */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-3 block">Contact</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Email"
                      className="h-11 border-gray-300 rounded-[12px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="Phone"
                      className="h-11 border-gray-300 rounded-[12px] focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-[12px] border border-gray-200 bg-gray-50 p-4">
                  <Checkbox
                    id="merchant-terms"
                    checked={agreedToMerchantTerms}
                    onCheckedChange={(v) => setAgreedToMerchantTerms(v === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="merchant-terms" className="text-sm text-gray-700 leading-snug cursor-pointer">
                    I agree to the{' '}
                    <Link
                      to={MERCHANT_TERMS_PATH}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 font-medium underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Merchant Terms of Service
                    </Link>
                    , including commission, payouts, refunds, and operational standards.
                  </label>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed">
                  By clicking &quot;Start Onboarding&quot;, you also agree to receive operational updates and onboarding messages from Crave&apos;n.
                </p>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={!agreedToMerchantTerms || isLoading || isCalculating}
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white rounded-[12px] transition-all shadow-md disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? 'Starting...' : 'Start Onboarding'}
                </Button>

                {/* Under-button note */}
                <p className="text-xs text-center text-gray-500">
                  Takes about 60 seconds to get started.
                </p>

                {/* Bottom assurance */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs sm:text-sm text-gray-600 text-center">
                    <span className="font-bold">No long-term contract.</span> If Crave'n doesn't make sense for your operation, you walk.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Earnings Explanation Dialog */}
      <Dialog open={showEarningsExplanation} onOpenChange={setShowEarningsExplanation}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">How we estimate earnings</DialogTitle>
            <DialogDescription>
              This estimate is calculated using local market data and operating metrics.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                This estimate is calculated using:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm text-gray-700">
                <li>Local order volume trends in {cityName}</li>
                <li>Typical average ticket size for your category</li>
                <li>Crave'n's 15% commission (no forced promos)</li>
                <li>Operating hours and distance coverage assumptions</li>
              </ul>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-900">
                <strong>It's an estimate, not a guarantee.</strong> Actual performance varies by area, menu pricing, hours, and demand.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
