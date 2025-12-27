import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

interface CityPopulation {
  city: string;
  state: string;
  population: number;
}

// Known city populations (can be expanded or moved to database)
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
  "washington,dc": 670050,
  "new york,ny": 8336817,
  "los angeles,ca": 3898747,
  "chicago,il": 2693976,
  "houston,tx": 2320268,
  "phoenix,az": 1608139,
  "philadelphia,pa": 1603797,
  "san antonio,tx": 1547253,
  "san diego,ca": 1423851,
  "dallas,tx": 1343573,
  "san jose,ca": 1021795,
  "austin,tx": 978908,
  "jacksonville,fl": 971319,
  "fort worth,tx": 918915,
  "columbus,oh": 913921,
  "charlotte,nc": 900350,
  "san francisco,ca": 873965,
  "indianapolis,in": 887642,
  "seattle,wa": 753675,
  "denver,co": 715522,
  "boston,ma": 692600,
  "el paso,tx": 678815,
  "nashville,tn": 678851,
  "detroit,mi": 639111,
  "oklahoma city,ok": 681054,
  "portland,or": 652503,
  "las vegas,nv": 641903,
  "memphis,tn": 633104,
  "louisville,ky": 633045,
  "baltimore,md": 576498,
  "milwaukee,wi": 577222,
  "albuquerque,nm": 564559,
  "tucson,az": 542629,
  "fresno,ca": 542107,
  "sacramento,ca": 525041,
  "kansas city,mo": 508090,
  "mesa,az": 504258,
  "atlanta,ga": 498715,
  "omaha,ne": 486051,
  "colorado springs,co": 478221,
  "raleigh,nc": 474069,
  "virginia beach,va": 459470,
  "miami,fl": 442241,
  "oakland,ca": 433031,
  "minneapolis,mn": 429954,
  "tulsa,ok": 413066,
  "cleveland,oh": 385525,
  "wichita,ks": 397532,
  "arlington,tx": 394266,
  "new orleans,la": 383997,
  "tampa,fl": 384959,
};

// State average metro population as fallback
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
};

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: corsHeaders,
      status: 200 
    });
  }

  try {
    const { city, state } = await req.json();

    if (!state) {
      return new Response(
        JSON.stringify({ error: "State is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stateUpper = state.toUpperCase().trim();
    let population: number | undefined;
    
    // If city is provided, try to find city population
    const cityKey = city && city.trim() ? `${city.toLowerCase().trim()},${stateUpper}` : null;
    if (cityKey) {
      population = CITY_POPULATIONS[cityKey];
    }

    // If city not found or not provided, try state average
    if (!population) {
      population = STATE_AVERAGES[stateUpper] || 400000; // Default fallback
    }

    const source = cityKey && CITY_POPULATIONS[cityKey] ? "city" : "state_average";

    return new Response(
      JSON.stringify({
        city,
        state,
        population,
        source,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

