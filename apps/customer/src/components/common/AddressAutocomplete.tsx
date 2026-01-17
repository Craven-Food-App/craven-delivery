import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface AddressSuggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  place_type: string[];
  address: string;
  text?: string; // Street name from Mapbox
  properties?: any; // Additional properties including unit numbers
  context?: any[]; // Mapbox context for parsing address components
}

interface ParsedAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  unitNumber?: string;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string, coordinates?: { lat: number; lng: number }) => void;
  onValidAddress?: (isValid: boolean, suggestion?: AddressSuggestion) => void;
  onAddressParsed?: (parsed: ParsedAddress) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  error?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  value,
  onChange,
  onValidAddress,
  onAddressParsed,
  placeholder = "Enter address...",
  className,
  required = false,
  error
}) => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch address predictions from Mapbox
  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setIsValidAddress(false);
      onValidAddress?.(false);
      return;
    }

    setIsLoading(true);
    try {
      let mapboxToken = '';
      
      // Try to get token from edge function first (production)
      try {
        const { data } = await supabase.functions.invoke('get-mapbox-token');
        if (data?.token) {
          mapboxToken = data.token;
        }
      } catch (edgeFunctionError) {
        console.warn('Edge function not available, using fallback token for development');
      }

      // Fallback to development token if edge function fails
      if (!mapboxToken) {
        mapboxToken = 'pk.eyJ1IjoiY3JhdmUtbiIsImEiOiJjbWVxb21qbTQyNTRnMm1vaHg5bDZwcmw2In0.aOsYrL2B0cjfcCGW1jHAdw';
      }

      if (!mapboxToken) {
        throw new Error('Mapbox token not available');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?` +
        `access_token=${mapboxToken}&` +
        `country=US&` + // Limit to US addresses
        `autocomplete=true&` +
        `types=address,poi&` + // Focus on addresses and points of interest
        `limit=5`
      );

      const result = await response.json();

      let formatted: AddressSuggestion[] = [];
      if (response.ok && Array.isArray(result?.features)) {
        formatted = result.features.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center,
          place_type: feature.place_type,
          address: feature.address || '', // House number
          text: feature.text || '', // Street name
          properties: feature.properties,
          context: feature.context
        }));
      }

      // Fallback: use Nominatim (OpenStreetMap) if Mapbox fails or returns no features
      if (!formatted.length) {
        try {
          const nominatimResp = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`
          );
          const nomiJson = await nominatimResp.json();
          if (Array.isArray(nomiJson)) {
            formatted = nomiJson.map((item: any) => ({
              id: `nominatim:${item.place_id}`,
              place_name: item.display_name,
              center: [Number(item.lon), Number(item.lat)] as [number, number],
              place_type: ['address'],
              address: item.display_name
            }));
          }
        } catch (fallbackErr) {
          console.warn('Nominatim fallback failed:', fallbackErr);
        }
      }

      if (formatted.length) {
        setSuggestions(formatted);
        setShowSuggestions(true);

        const exactMatch = formatted.find(s => 
          s.place_name.toLowerCase() === query.toLowerCase()
        );
        
        if (exactMatch) {
          setIsValidAddress(true);
          onValidAddress?.(true, exactMatch);
        } else {
          setIsValidAddress(false);
          onValidAddress?.(false);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsValidAddress(false);
        onValidAddress?.(false);
      }
    } catch (error) {
      console.error('Address prediction failed:', error);
      setSuggestions([]);
      setIsValidAddress(false);
      onValidAddress?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce address input
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if address is already validated
    if (isValidAddress) {
      return;
    }

    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        fetchSuggestions(value.trim());
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        setIsValidAddress(false);
        onValidAddress?.(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, isValidAddress]);

  const parseAddress = (suggestion: AddressSuggestion): ParsedAddress => {
    console.log('Parsing address suggestion:', suggestion);
    const parts = suggestion.place_name.split(',').map(p => p.trim());
    
    // Initialize variables
    let city = '';
    let state = '';
    let zipCode = '';
    let unitNumber = '';
    
    // Extract from Mapbox context (most reliable)
    if (suggestion.context && Array.isArray(suggestion.context)) {
      console.log('Mapbox context:', suggestion.context);
      for (const ctx of suggestion.context) {
        if (ctx.id.startsWith('place.')) {
          city = ctx.text;
          console.log('Found city from context:', city);
        } else if (ctx.id.startsWith('region.')) {
          state = ctx.short_code?.replace('US-', '') || ctx.text;
          console.log('Found state from context:', state);
        } else if (ctx.id.startsWith('postcode.')) {
          zipCode = ctx.text;
          console.log('Found zip from context:', zipCode);
        }
      }
    }
    
    // Fallback parsing from place_name parts if context didn't provide values
    if (!city || !state || !zipCode) {
      console.log('Using fallback parsing from place_name parts:', parts);
      // Format: "Street Address, City, State ZIP, Country"
      // Example: "6757 Nebraska Avenue, Toledo, Ohio 43615, United States"
      if (parts.length >= 3) {
        // City is typically the second part
        if (!city && parts[1]) {
          city = parts[1];
          console.log('Fallback city:', city);
        }
        
        // State and ZIP are in the third part
        const stateZipPart = parts[2] || '';
        if (!state) {
          // Look for 2-letter state code
          const stateMatch = stateZipPart.match(/\b([A-Z]{2})\b/);
          if (stateMatch) {
            state = stateMatch[1];
            console.log('Fallback state:', state);
          } else {
            // Look for full state name
            const stateNameMatch = stateZipPart.match(/([A-Za-z\s]+)\s+\d{5}/);
            if (stateNameMatch) {
              // Convert state name to abbreviation if needed
              const stateName = stateNameMatch[1].trim();
              state = stateName; // You could add a state name to abbreviation map here
              console.log('Fallback state name:', state);
            }
          }
        }
        
        if (!zipCode) {
          const zipMatch = stateZipPart.match(/(\d{5}(-\d{4})?)/);
          if (zipMatch) {
            zipCode = zipMatch[1];
            console.log('Fallback zip:', zipCode);
          }
        }
      }
    }
    
    // Build street address from Mapbox components
    let street = '';
    
    // Use Mapbox's address (house number) and text (street name) if available
    if (suggestion.address && suggestion.text) {
      street = `${suggestion.address} ${suggestion.text}`;
      console.log('Street from Mapbox components:', street);
    } else {
      // Fallback: extract from place_name (first part only, without unit info)
      const firstPart = parts[0] || '';
      const streetMatch = firstPart.match(/^(.*?)(?:\s+(?:apt|apartment|unit|ste|suite|#)\s*\w+.*)?$/i);
      street = streetMatch ? streetMatch[1].trim() : firstPart;
      console.log('Fallback street:', street);
    }
    
    // Extract unit/apartment number from the first part of place_name
    const firstPart = parts[0] || '';
    const unitMatch = firstPart.match(/(?:apt|apartment|unit|ste|suite|#)\s*(\w+.*?)(?:,|$)/i);
    if (unitMatch) {
      unitNumber = unitMatch[1].trim();
      console.log('Found unit number:', unitNumber);
    } else if (suggestion.properties?.unit) {
      unitNumber = suggestion.properties.unit;
      console.log('Unit from properties:', unitNumber);
    }
    
    console.log('Final parsed address:', { street, city, state, zipCode, unitNumber });
    
    return {
      street,
      city,
      state,
      zipCode,
      unitNumber
    };
  };

  const handleSuggestionClick = (suggestion: AddressSuggestion) => {
    const [lng, lat] = suggestion.center;
    
    console.log('=== ADDRESS PARSING DEBUG ===');
    console.log('Full suggestion object:', suggestion);
    console.log('Place name:', suggestion.place_name);
    console.log('Place name parts:', suggestion.place_name.split(','));
    
    // Initialize variables
    let street = '';
    let city = '';
    let state = '';
    let zipCode = '';
    let unitNumber = '';
    
    // PRIORITY 1: Extract from Mapbox context (most accurate)
    if (suggestion.context && Array.isArray(suggestion.context)) {
      console.log('Mapbox context available:', suggestion.context);
      
      for (const ctx of suggestion.context) {
        console.log('Context item:', ctx);
        // Only extract city, state, and ZIP from context
        if (ctx.id.startsWith('place.')) {
          city = ctx.text; // This is the actual city
          console.log('✓ Found city from context:', city);
        } else if (ctx.id.startsWith('region.')) {
          state = ctx.short_code?.replace('US-', '') || ctx.text;
          console.log('✓ Found state from context:', state);
        } else if (ctx.id.startsWith('postcode.')) {
          zipCode = ctx.text;
          console.log('✓ Found ZIP from context:', zipCode);
        }
        // Ignore: district, locality, neighborhood, county, etc.
      }
    } else {
      console.log('No Mapbox context available, will use fallback parsing');
    }
    
    // Build street address from Mapbox address components
    if (suggestion.address && suggestion.text) {
      // Mapbox provides: address = house number, text = street name
      street = `${suggestion.address} ${suggestion.text}`;
      console.log('✓ Street from Mapbox components:', street);
    } else {
      // Fallback: use first TWO parts of place_name => "<house number> <street name>"
      const parts = suggestion.place_name.split(',').map(p => p.trim());
      if (parts.length >= 2) {
        street = `${parts[0]} ${parts[1]}`.trim();
      } else {
        street = parts[0] || '';
      }
      console.log('✓ Fallback street from parts[0]+parts[1]:', street);
    }
    
    // Extract unit number from street if present
    const unitMatch = street.match(/^(.*?)(?:\s+(?:apt|apartment|unit|ste|suite|#)\s*(\w+.*?))?$/i);
    if (unitMatch && unitMatch[2]) {
      street = unitMatch[1].trim();
      unitNumber = unitMatch[2];
      console.log('✓ Extracted unit:', unitNumber);
      console.log('✓ Clean street:', street);
    }
    
    // FALLBACK: If context didn't provide city/state/zip, parse from place_name
    if (!city || !state || !zipCode) {
      const parts = suggestion.place_name.split(',').map(p => p.trim());
      console.log('Fallback parsing from parts:', parts);
      
      // Find ZIP first
      let zipIndex = -1;
      
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        
        // Look for ZIP code (5 digits, optionally with +4)
        if (!zipCode) {
          const zipMatch = part.match(/\b(\d{5}(-\d{4})?)\b/);
          if (zipMatch) {
            zipCode = zipMatch[1];
            zipIndex = i;
            console.log('✓ Fallback ZIP:', zipCode, 'at index', i);
          }
        }
      }
      
      // Find state ONLY in the part that contains ZIP or adjacent parts (not in street name)
      if (!state && zipIndex >= 0) {
        // Look in the same part as ZIP and one part before it
        const searchParts = [parts[zipIndex]];
        if (zipIndex > 0) searchParts.unshift(parts[zipIndex - 1]);
        
        for (const part of searchParts) {
          if (state) break;
          
          // Look for 2-letter state code OR full state name
          const stateMatch = part.match(/\b([A-Z]{2})\b/) || 
                            part.match(/\b(Ohio|California|Texas|Florida|New York|Illinois|Pennsylvania|Georgia|North Carolina|Michigan|New Jersey|Virginia|Washington|Arizona|Massachusetts|Tennessee|Indiana|Missouri|Maryland|Wisconsin|Colorado|Minnesota|South Carolina|Alabama|Louisiana|Kentucky|Oregon|Oklahoma|Connecticut|Utah|Iowa|Nevada|Arkansas|Mississippi|Kansas|New Mexico|Nebraska|West Virginia|Idaho|Hawaii|New Hampshire|Maine|Montana|Rhode Island|Delaware|South Dakota|North Dakota|Alaska|Vermont|Wyoming)\b/i);
          
          if (stateMatch) {
            let foundState = stateMatch[1].toUpperCase();
            
            // Convert full state names to abbreviations
            const stateAbbr: Record<string, string> = {
              'OHIO': 'OH', 'CALIFORNIA': 'CA', 'TEXAS': 'TX', 'FLORIDA': 'FL', 'NEW YORK': 'NY',
              'ILLINOIS': 'IL', 'PENNSYLVANIA': 'PA', 'GEORGIA': 'GA', 'NORTH CAROLINA': 'NC',
              'MICHIGAN': 'MI', 'NEW JERSEY': 'NJ', 'VIRGINIA': 'VA', 'WASHINGTON': 'WA',
              'ARIZONA': 'AZ', 'MASSACHUSETTS': 'MA', 'TENNESSEE': 'TN', 'INDIANA': 'IN',
              'MISSOURI': 'MO', 'MARYLAND': 'MD', 'WISCONSIN': 'WI', 'COLORADO': 'CO',
              'MINNESOTA': 'MN', 'SOUTH CAROLINA': 'SC', 'ALABAMA': 'AL', 'LOUISIANA': 'LA',
              'KENTUCKY': 'KY', 'OREGON': 'OR', 'OKLAHOMA': 'OK', 'CONNECTICUT': 'CT',
              'UTAH': 'UT', 'IOWA': 'IA', 'NEVADA': 'NV', 'ARKANSAS': 'AR', 'MISSISSIPPI': 'MS',
              'KANSAS': 'KS', 'NEW MEXICO': 'NM', 'NEBRASKA': 'NE', 'WEST VIRGINIA': 'WV',
              'IDAHO': 'ID', 'HAWAII': 'HI', 'NEW HAMPSHIRE': 'NH', 'MAINE': 'ME',
              'MONTANA': 'MT', 'RHODE ISLAND': 'RI', 'DELAWARE': 'DE', 'SOUTH DAKOTA': 'SD',
              'NORTH DAKOTA': 'ND', 'ALASKA': 'AK', 'VERMONT': 'VT', 'WYOMING': 'WY'
            };
            
            state = stateAbbr[foundState] || foundState;
            console.log('✓ Fallback state:', state);
          }
        }
      }
      
      // Find city - it should be the part just before state/ZIP
      if (!city && zipIndex > 1) {
        city = parts[zipIndex - 1];
        console.log('✓ Fallback city (before ZIP):', city);
      } else if (!city && parts.length > 2) {
        city = parts[parts.length - 2];
        console.log('✓ Fallback city (second-to-last):', city);
      }
    }
    
    console.log('Final parsed components:', { 
      street, 
      city, 
      state, 
      zipCode, 
      unitNumber 
    });
    
    // STOP SEARCHING - Clear suggestions and set as valid
    setSuggestions([]);
    setShowSuggestions(false);
    setIsValidAddress(true);
    
    // Set the street address in the main field
    onChange(street, { lat, lng });
    onValidAddress?.(true, suggestion);
    
    // Call the parsed address callback
    if (onAddressParsed) {
      onAddressParsed({
        street,
        city,
        state,
        zipCode,
        unitNumber
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Reset validation state when user starts typing new address
    if (newValue !== value) {
      setIsValidAddress(false);
      onValidAddress?.(false);
    }
  };

  const handleBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={cn(
            "pl-10 pr-10",
            error && "border-destructive",
            isValidAddress && "border-green-500",
            className
          )}
          required={required}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {isValidAddress && !isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 h-2 w-2 bg-green-500 rounded-full" />
        )}
      </div>

      {/* Address Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="w-full px-4 py-3 text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none border-b border-border last:border-b-0"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {suggestion.place_name.split(',')[0]}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {suggestion.place_name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive mt-1">{error}</p>
      )}
      
      {required && !isValidAddress && value.length > 0 && (
        <p className="text-sm text-orange-600 mt-1">
          Please select a valid address from the suggestions
        </p>
      )}
    </div>
  );
};