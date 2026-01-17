import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Globe, Plus, X, Upload, FileText } from "lucide-react";
import { WebScrapingService } from '@/utils/WebScrapingService';
import { supabase } from '@/integrations/supabase/client';

interface MenuImportToolProps {
  restaurantId: string;
  onItemsImported: () => void;
}

interface ExtractedMenuItem {
  name: string;
  price_cents: number;
  category: string;
  description: string;
  source_url: string;
}

const MenuImportTool: React.FC<MenuImportToolProps> = ({ restaurantId, onItemsImported }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [extractedItems, setExtractedItems] = useState<ExtractedMenuItem[]>([]);
  const [showSampleOptions, setShowSampleOptions] = useState(false);
  const { toast } = useToast();

  const handleExtractMenu = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const result = await WebScrapingService.parseMenuFromUrl(url);
      
      if (result.success && result.menuItems) {
        setExtractedItems(result.menuItems);
        toast({
          title: "Success",
          description: `Extracted ${result.menuItems.length} menu items`
        });
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to extract menu items",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error extracting menu:', error);
      toast({
        title: "Error",
        description: "Failed to extract menu items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadSampleMenu = (type: string) => {
    const sampleItems = WebScrapingService.generateSampleMenuItems(type);
    setExtractedItems(sampleItems);
    setShowSampleOptions(false);
    toast({
      title: "Sample Menu Loaded",
      description: `Loaded ${sampleItems.length} sample ${type} menu items`
    });
  };
  const handleImportItems = async () => {
    if (loading) return; // Prevent multiple submissions

    setLoading(true);
    try {
      // Remove duplicates from extracted items first
      const uniqueItems = extractedItems.filter((item, index, self) => 
        index === self.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase())
      );

      if (uniqueItems.length !== extractedItems.length) {
        toast({
          title: "Duplicates Removed",
          description: `Removed ${extractedItems.length - uniqueItems.length} duplicate items`
        });
      }

      // Check for existing items in database
      const { data: existingItems } = await supabase
        .from('menu_items')
        .select('name')
        .eq('restaurant_id', restaurantId);

      const existingNames = new Set(existingItems?.map(item => item.name.toLowerCase()) || []);
      const newItems = uniqueItems.filter(item => !existingNames.has(item.name.toLowerCase()));

      if (newItems.length === 0) {
        toast({
          title: "No New Items",
          description: "All items already exist in your menu"
        });
        setLoading(false);
        return;
      }

      if (newItems.length !== uniqueItems.length) {
        toast({
          title: "Existing Items Skipped",
          description: `${uniqueItems.length - newItems.length} items already exist and will be skipped`
        });
      }

      // Create categories first
      const categories = [...new Set(newItems.map(item => item.category))];
      const categoryMap: Record<string, string> = {};

      for (const categoryName of categories) {
        const { data: existingCategory } = await supabase
          .from('menu_categories')
          .select('id')
          .eq('restaurant_id', restaurantId)
          .eq('name', categoryName)
          .maybeSingle();

        if (existingCategory) {
          categoryMap[categoryName] = existingCategory.id;
        } else {
          const { data: newCategory, error } = await supabase
            .from('menu_categories')
            .insert({
              restaurant_id: restaurantId,
              name: categoryName,
              display_order: Object.keys(categoryMap).length
            })
            .select('id')
            .single();

          if (error) throw error;
          categoryMap[categoryName] = newCategory.id;
        }
      }

      // Import only new menu items
      const itemsToInsert = newItems.map((item, index) => ({
        restaurant_id: restaurantId,
        category_id: categoryMap[item.category],
        name: item.name,
        description: item.description,
        price_cents: item.price_cents,
        display_order: index,
        is_available: true
      }));

      const { error } = await supabase
        .from('menu_items')
        .insert(itemsToInsert);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Imported ${newItems.length} new menu items successfully`
      });

      setExtractedItems([]);
      setUrl('');
      onItemsImported();
    } catch (error) {
      console.error('Error importing items:', error);
      toast({
        title: "Error",
        description: "Failed to import menu items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const removeItem = (index: number) => {
    setExtractedItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Import Menu Items
          </CardTitle>
          <CardDescription>
            Extract menu items from a website URL or load sample menu items
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter restaurant website URL (e.g., https://restaurant.com/menu)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleExtractMenu} disabled={loading || !url.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Globe className="mr-2 h-4 w-4" />
              Extract
            </Button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Or try sample menu items</p>
            <div className="flex gap-2 justify-center flex-wrap">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleLoadSampleMenu('italian')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Italian Sample
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleLoadSampleMenu('mexican')}
              >
                <FileText className="mr-2 h-4 w-4" />
                Mexican Sample
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => handleLoadSampleMenu('general')}
              >
                <FileText className="mr-2 h-4 w-4" />
                General Sample
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground p-3 bg-muted rounded-lg">
            <strong>Note:</strong> Due to browser security restrictions, direct website scraping may not work for all sites. 
            CORS policies prevent access to many external websites. Try the sample menus to see how the import feature works.
          </div>
        </CardContent>
      </Card>

      {extractedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Extracted Menu Items ({extractedItems.length})</CardTitle>
            <CardDescription>
              Review and import the extracted menu items
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {extractedItems.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="outline">{item.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-sm font-medium">${(item.price_cents / 100).toFixed(2)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setExtractedItems([])}>
                Clear All
              </Button>
              <Button onClick={handleImportItems} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                Import {extractedItems.length} Items
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MenuImportTool;