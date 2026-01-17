export interface MenuItemData {
  name: string;
  description: string;
  price: number;
  category?: string;
  dietary?: {
    vegetarian?: boolean;
    vegan?: boolean;
    glutenFree?: boolean;
  };
}

export class MenuParser {
  static parseMenuText(text: string): MenuItemData[] {
    const menuItems: MenuItemData[] = [];
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentCategory = '';
    let currentItem: Partial<MenuItemData> | null = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line) continue;
      
      // Detect category headers (lines without prices that might be categories)
      if (!line.match(/\$\d+/) && line.length < 50 && !line.includes('.') && 
          (line === line.toUpperCase() || line.split(' ').length <= 4)) {
        // Could be a category
        currentCategory = line;
        continue;
      }
      
      // Look for items with prices
      const priceMatch = line.match(/\$(\d+(?:\.\d{2})?)/);
      if (priceMatch) {
        // Save previous item if exists
        if (currentItem && currentItem.name && currentItem.price) {
          menuItems.push({
            name: currentItem.name,
            description: currentItem.description || '',
            price: currentItem.price,
            category: currentCategory || undefined,
            dietary: currentItem.dietary || {}
          });
        }
        
        // Start new item
        const price = parseFloat(priceMatch[1]);
        const nameText = line.replace(/\$\d+(?:\.\d{2})?.*/, '').trim();
        
        if (nameText) {
          currentItem = {
            name: nameText,
            price,
            category: currentCategory || undefined,
            dietary: {},
            description: ''
          };
        }
        continue;
      }
      
      // Look for descriptions (lines after an item name that don't contain prices)
      if (currentItem && currentItem.name && !line.match(/\$\d+/) && line.length > 5) {
        // Add to description
        if (currentItem.description) {
          currentItem.description += ' ' + line;
        } else {
          currentItem.description = line;
        }
        
        // Check for dietary information
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('vegetarian') && !lowerLine.includes('non-vegetarian')) {
          currentItem.dietary!.vegetarian = true;
        }
        if (lowerLine.includes('vegan')) {
          currentItem.dietary!.vegan = true;
        }
        if (lowerLine.includes('gluten-free') || lowerLine.includes('gluten free')) {
          currentItem.dietary!.glutenFree = true;
        }
      }
    }
    
    // Don't forget the last item
    if (currentItem && currentItem.name && currentItem.price) {
      menuItems.push({
        name: currentItem.name,
        description: currentItem.description || '',
        price: currentItem.price,
        category: currentCategory || undefined,
        dietary: currentItem.dietary || {}
      });
    }
    
    return menuItems.filter(item => item.name && item.price > 0);
  }
  
  static parseCSV(csvText: string): MenuItemData[] {
    const lines = csvText.split('\n').map(line => line.trim()).filter(line => line);
    const menuItems: MenuItemData[] = [];
    
    // Skip header row if it exists
    const startIndex = lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('item') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(',').map(col => col.trim().replace(/['"]/g, ''));
      
      if (columns.length >= 3) {
        const name = columns[0];
        const description = columns[1] || '';
        const priceText = columns[2];
        
        // Extract price from text
        const priceMatch = priceText.match(/(\d+(?:\.\d{2})?)/);
        if (priceMatch && name) {
          const price = parseFloat(priceMatch[1]);
          
          const item: MenuItemData = {
            name,
            description,
            price,
            category: columns[3] || undefined,
            dietary: {
              vegetarian: description.toLowerCase().includes('vegetarian'),
              vegan: description.toLowerCase().includes('vegan'),
              glutenFree: description.toLowerCase().includes('gluten-free') || description.toLowerCase().includes('gluten free')
            }
          };
          
          menuItems.push(item);
        }
      }
    }
    
    return menuItems;
  }
}