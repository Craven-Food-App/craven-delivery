interface ExtractedMenuItem {
  name: string;
  price_cents: number;
  category: string;
  description: string;
  source_url: string;
}

export class WebScrapingService {
  private static API_KEY_STORAGE_KEY = 'menu_scraping_api_key';

  static saveApiKey(apiKey: string): void {
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
    console.log('API key saved successfully');
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async parseMenuFromUrl(url: string): Promise<{ success: boolean; menuItems?: ExtractedMenuItem[]; error?: string }> {
    try {
      // Use Supabase edge function to bypass CORS restrictions
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data, error } = await supabase.functions.invoke('scrape-menu', {
        body: { url }
      });

      if (error) {
        console.error('Error calling scrape-menu function:', error);
        return {
          success: false,
          error: 'Failed to fetch menu from website. Please check the URL and try again.'
        };
      }

      if (!data.success) {
        return {
          success: false,
          error: data.error || 'Failed to extract menu items from the website.'
        };
      }

      return {
        success: true,
        menuItems: data.menuItems
      };
    } catch (error) {
      console.error('Error parsing menu from URL:', error);
      return {
        success: false,
        error: 'Failed to parse menu. Please check the URL and try again.'
      };
    }
  }

  private static extractMenuItemsFromHtml(html: string, sourceUrl: string): ExtractedMenuItem[] {
    const menuItems: ExtractedMenuItem[] = [];
    
    // Create a DOM parser to parse the HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Remove scripts and style elements
    const scripts = doc.querySelectorAll('script, style');
    scripts.forEach(el => el.remove());
    
    // Get all text content
    const textContent = doc.body?.textContent || '';
    const lines = textContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentCategory = 'Main';
    
    lines.forEach((line, index) => {
      // Detect potential category headers (short lines that might be headings)
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
        line.toLowerCase().includes('sandwich')
      )) {
        currentCategory = line;
        return;
      }
      
      // Look for menu items with prices
      const priceMatches = line.match(/(.+?)[\s\.\-]*\$(\d+\.?\d*)/);
      if (priceMatches) {
        const [, itemName, price] = priceMatches;
        const cleanName = itemName.trim().replace(/^[\d\.\-\s]+/, ''); // Remove leading numbers/dots
        
        if (cleanName.length > 2 && cleanName.length < 100) {
          // Look for description in next line
          let description = '';
          if (index + 1 < lines.length) {
            const nextLine = lines[index + 1];
            if (!nextLine.match(/\$/) && nextLine.length > 10 && nextLine.length < 200) {
              description = nextLine;
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

  // Alternative: Create sample menu items for demonstration
  static generateSampleMenuItems(restaurantType: string = 'general'): ExtractedMenuItem[] {
    const samples: Record<string, ExtractedMenuItem[]> = {
      italian: [
        { name: 'Margherita Pizza', price_cents: 1899, category: 'Pizza', description: 'Fresh tomatoes, mozzarella, basil', source_url: 'sample' },
        { name: 'Pepperoni Pizza', price_cents: 2199, category: 'Pizza', description: 'Pepperoni, mozzarella, tomato sauce', source_url: 'sample' },
        { name: 'Caesar Salad', price_cents: 1299, category: 'Salads', description: 'Romaine lettuce, parmesan, croutons', source_url: 'sample' },
        { name: 'Spaghetti Carbonara', price_cents: 1699, category: 'Pasta', description: 'Eggs, cheese, pancetta, black pepper', source_url: 'sample' },
      ],
      mexican: [
        { name: 'Chicken Tacos', price_cents: 1299, category: 'Tacos', description: 'Grilled chicken, onions, cilantro', source_url: 'sample' },
        { name: 'Beef Burrito', price_cents: 1599, category: 'Burritos', description: 'Seasoned beef, rice, beans, cheese', source_url: 'sample' },
        { name: 'Guacamole & Chips', price_cents: 899, category: 'Appetizers', description: 'Fresh avocado, lime, tortilla chips', source_url: 'sample' },
        { name: 'Quesadilla', price_cents: 1199, category: 'Mains', description: 'Cheese, chicken, peppers in flour tortilla', source_url: 'sample' },
      ],
      general: [
        { name: 'Cheeseburger', price_cents: 1499, category: 'Burgers', description: 'Beef patty, cheese, lettuce, tomato', source_url: 'sample' },
        { name: 'Chicken Wings', price_cents: 1299, category: 'Appetizers', description: 'Buffalo or BBQ sauce', source_url: 'sample' },
        { name: 'Fish & Chips', price_cents: 1799, category: 'Mains', description: 'Beer battered cod, crispy fries', source_url: 'sample' },
        { name: 'Garden Salad', price_cents: 999, category: 'Salads', description: 'Mixed greens, vegetables, dressing', source_url: 'sample' },
      ]
    };
    
    return samples[restaurantType] || samples.general;
  }
}