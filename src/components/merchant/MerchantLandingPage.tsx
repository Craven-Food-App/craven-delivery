import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, TrendingUp, Building2, Phone, Mail, Store, ArrowRight, Sparkles } from 'lucide-react';
import { calculateEarnings, formatEarningsRange, type EarningsEstimate } from '@/utils/marketTiers';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface AddressComponents {
  street_number?: string;
  route?: string;
  locality?: string; // city
  administrative_area_level_1?: string; // state
  postal_code?: string;
  country?: string;
}

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

  // Show default earnings estimate on page load (using national average)
  useEffect(() => {
    // Calculate default earnings using average US metro population (~500,000)
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
  }, []);

  // Handle city/state change with debounce for population lookup
  useEffect(() => {
    if (!formData.city || !formData.state) {
      // Reset to default if city/state cleared
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
    
    if (!formData.storeName || !formData.storeAddress || !formData.email) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Crave'n</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">
              Help
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate('/restaurant/auth')}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 rounded-full mb-6">
              <Sparkles className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Start Earning Today</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-4">
              Join Crave'n and Grow Your Business
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
              Connect with customers in your area and increase your revenue with our delivery platform
            </p>
          </div>

          {/* Earnings Estimate Card - Always visible */}
          <Card className="mb-8 border-2 border-orange-300 bg-gradient-to-br from-orange-50 via-white to-orange-50 shadow-2xl">
            <CardContent className="p-10">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="p-4 bg-orange-500 rounded-xl shadow-lg">
                  <TrendingUp className="h-10 w-10 text-white" />
                </div>
                <div className="flex-1">
                  {isCalculating ? (
                    <>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                        Calculating your potential earnings...
                      </h2>
                      <p className="text-lg text-gray-600">Please wait while we analyze your market</p>
                    </>
                  ) : earningsEstimate ? (
                    <>
                      <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                        {earningsEstimate.city && earningsEstimate.state ? (
                          <>Your business in <span className="text-orange-600">{earningsEstimate.city}, {earningsEstimate.state}</span> could earn</>
                        ) : (
                          <>Your business could earn</>
                        )}
                      </h2>
                      <div className="mb-4">
                        <p className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-orange-400 bg-clip-text text-transparent">
                          {formatEarningsRange(earningsEstimate)}
                        </p>
                        <p className="text-xl font-semibold text-gray-700 mt-2">per year in incremental sales</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full font-medium">
                          {earningsEstimate.tier.label} Market
                        </span>
                        <span>•</span>
                        <span>
                          {earningsEstimate.city && earningsEstimate.state 
                            ? 'Based on local demand and comparable merchant performance'
                            : 'Enter your location below for a personalized estimate'}
                        </span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signup Form Card */}
          <Card className="shadow-xl border-2">
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Store Name */}
                  <div className="space-y-2">
                    <Label htmlFor="storeName" className="text-base font-semibold">
                      Store Name *
                    </Label>
                    <div className="relative">
                      <Store className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="storeName"
                        value={formData.storeName}
                        onChange={(e) => handleInputChange('storeName', e.target.value)}
                        placeholder="Enter your store name"
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  {/* Business Type */}
                  <div className="space-y-2">
                    <Label htmlFor="businessType" className="text-base font-semibold">
                      Business Type *
                    </Label>
                    <select
                      id="businessType"
                      value={formData.businessType}
                      onChange={(e) => handleInputChange('businessType', e.target.value)}
                      className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    >
                      <option value="">Select business type</option>
                      {businessTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Store Address */}
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="storeAddress" className="text-base font-semibold">
                      Store Address *
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="storeAddress"
                        value={formData.storeAddress}
                        onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                        placeholder="123 Main St"
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  {/* City and State */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-base font-semibold">
                        City *
                      </Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="Detroit"
                        className="h-12"
                        required
                      />
                      {isCalculating && formData.city && formData.state && (
                        <p className="text-xs text-orange-600">Calculating earnings...</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="state" className="text-base font-semibold">
                        State *
                      </Label>
                      <select
                        id="state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        required
                      >
                        <option value="">Select State</option>
                        <option value="AL">Alabama</option>
                        <option value="AK">Alaska</option>
                        <option value="AZ">Arizona</option>
                        <option value="AR">Arkansas</option>
                        <option value="CA">California</option>
                        <option value="CO">Colorado</option>
                        <option value="CT">Connecticut</option>
                        <option value="DE">Delaware</option>
                        <option value="FL">Florida</option>
                        <option value="GA">Georgia</option>
                        <option value="HI">Hawaii</option>
                        <option value="ID">Idaho</option>
                        <option value="IL">Illinois</option>
                        <option value="IN">Indiana</option>
                        <option value="IA">Iowa</option>
                        <option value="KS">Kansas</option>
                        <option value="KY">Kentucky</option>
                        <option value="LA">Louisiana</option>
                        <option value="ME">Maine</option>
                        <option value="MD">Maryland</option>
                        <option value="MA">Massachusetts</option>
                        <option value="MI">Michigan</option>
                        <option value="MN">Minnesota</option>
                        <option value="MS">Mississippi</option>
                        <option value="MO">Missouri</option>
                        <option value="MT">Montana</option>
                        <option value="NE">Nebraska</option>
                        <option value="NV">Nevada</option>
                        <option value="NH">New Hampshire</option>
                        <option value="NJ">New Jersey</option>
                        <option value="NM">New Mexico</option>
                        <option value="NY">New York</option>
                        <option value="NC">North Carolina</option>
                        <option value="ND">North Dakota</option>
                        <option value="OH">Ohio</option>
                        <option value="OK">Oklahoma</option>
                        <option value="OR">Oregon</option>
                        <option value="PA">Pennsylvania</option>
                        <option value="RI">Rhode Island</option>
                        <option value="SC">South Carolina</option>
                        <option value="SD">South Dakota</option>
                        <option value="TN">Tennessee</option>
                        <option value="TX">Texas</option>
                        <option value="UT">Utah</option>
                        <option value="VT">Vermont</option>
                        <option value="VA">Virginia</option>
                        <option value="WA">Washington</option>
                        <option value="WV">West Virginia</option>
                        <option value="WI">Wisconsin</option>
                        <option value="WY">Wyoming</option>
                      </select>
                    </div>
                  </div>

                  {/* Zip Code */}
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-base font-semibold">
                      ZIP Code *
                    </Label>
                    <Input
                      id="zipCode"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="48201"
                      className="h-12"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base font-semibold">
                      Email Address *
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="your@email.com"
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-base font-semibold">
                      Store Phone *
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="(555) 123-4567"
                        className="pl-10 h-12"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Legal Disclaimer */}
                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Estimates are based on local demand, comparable merchant performance, and average order values. 
                    Actual earnings vary based on availability, menu pricing, customer demand, and operational factors. 
                    These estimates do not guarantee future performance.
                  </p>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600"
                  disabled={isLoading || isCalculating}
                >
                  {isLoading ? (
                    <>Starting Your Journey...</>
                  ) : (
                    <>
                      Start Your Journey <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>

                <p className="text-center text-sm text-gray-500">
                  By continuing, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            </CardContent>
          </Card>

          {/* Features Section */}
          <div className="mt-16 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="inline-flex p-4 bg-orange-100 rounded-lg mb-4">
                <Building2 className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Easy Setup</h3>
              <p className="text-gray-600">Get started in minutes with our simple onboarding process</p>
            </div>
            <div className="text-center">
              <div className="inline-flex p-4 bg-orange-100 rounded-lg mb-4">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Grow Your Revenue</h3>
              <p className="text-gray-600">Reach new customers and increase your sales</p>
            </div>
            <div className="text-center">
              <div className="inline-flex p-4 bg-orange-100 rounded-lg mb-4">
                <Sparkles className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Full Support</h3>
              <p className="text-gray-600">Dedicated support team to help you succeed</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

