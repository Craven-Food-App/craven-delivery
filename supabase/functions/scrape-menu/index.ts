// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from "../_shared/cors.ts";

interface ExtractedMenuItem {
  name: string;
  price_cents: number;
  category: string;
  description: string;
  source_url: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    
    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching menu from URL: ${url}`);

    // Fetch the website content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MenuScraper/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to fetch website: ${response.status} ${response.statusText}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const html = await response.text();
    console.log(`Successfully fetched ${html.length} characters from ${url}`);
    
    const menuItems = extractMenuItemsFromHtml(html, url);
    console.log(`Extracted ${menuItems.length} menu items`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        menuItems 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in scrape-menu function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to scrape menu' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

function extractMenuItemsFromHtml(html: string, sourceUrl: string): ExtractedMenuItem[] {
  const menuItems: ExtractedMenuItem[] = [];
  
  // Remove script and style tags
  const cleanHtml = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                       .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  
  // Remove HTML tags and get text content
  const textContent = cleanHtml.replace(/<[^>]*>/g, ' ')
                                .replace(/\s+/g, ' ')
                                .trim();
  
  const lines = textContent.split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0);
  
  let currentCategory = 'Main';
  
  lines.forEach((line, index) => {
    // Detect potential category headers
    if (line.length < 50 && !line.match(/\$/) && (
      line.toLowerCase().includes('appetizer') ||
      line.toLowerCase().includes('main') ||
      line.toLowerCase().includes('dessert') ||
      line.toLowerCase().includes('drink') ||
      line.toLowerCase().includes('starter') ||
      line.toLowerCase().includes('entree') ||
      line.toLowerCase().includes('salad') ||
      line.toLowerCase().includes('soup') ||
      line.toLowerCase().includes('pizza') ||
      line.toLowerCase().includes('burger') ||
      line.toLowerCase().includes('sandwich') ||
      line.toLowerCase().includes('pasta') ||
      line.toLowerCase().includes('seafood') ||
      line.toLowerCase().includes('chicken') ||
      line.toLowerCase().includes('beef') ||
      line.toLowerCase().includes('vegetarian') ||
      line.toLowerCase().includes('vegan')
    )) {
      currentCategory = line;
      return;
    }
    
    // Look for menu items with prices - more flexible price matching
    const priceMatches = line.match(/(.+?)[\s\.\-]*[\$](\d+\.?\d*)/);
    if (priceMatches) {
      const [, itemName, price] = priceMatches;
      const cleanName = itemName.trim()
                                .replace(/^[\d\.\-\s]+/, '') // Remove leading numbers/dots
                                .replace(/\s+/g, ' '); // Normalize whitespace
      
      if (cleanName.length > 2 && cleanName.length < 100) {
        // Look for description in surrounding lines
        let description = '';
        
        // Check next few lines for description
        for (let i = 1; i <= 3; i++) {
          if (index + i < lines.length) {
            const nextLine = lines[index + i];
            if (!nextLine.match(/\$/) && 
                nextLine.length > 10 && 
                nextLine.length < 200 &&
                !nextLine.toLowerCase().includes('appetizer') &&
                !nextLine.toLowerCase().includes('main') &&
                !nextLine.toLowerCase().includes('dessert')) {
              description = nextLine;
              break;
            }
          }
        }
        
        menuItems.push({
          name: cleanName,
          price_cents: Math.round(parseFloat(price) * 100),
          category: currentCategory,
          description: description,
          source_url: sourceUrl
        });
      }
    }
  });
  
  return menuItems;
}