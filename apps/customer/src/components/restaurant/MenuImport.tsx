// @ts-nocheck
import { useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MenuParser, MenuItemData } from '@/utils/MenuParser';
import { supabase } from "@/integrations/supabase/client";
import { Download, FileText, Upload, AlertCircle } from 'lucide-react';

interface MenuImportProps {
  restaurantId: string;
  onImportComplete: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MenuImport = ({ restaurantId, onImportComplete, isOpen, onClose }: MenuImportProps) => {
  const { toast } = useToast();
  const [menuText, setMenuText] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [parsedItems, setParsedItems] = useState<MenuItemData[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [importStep, setImportStep] = useState<'input' | 'preview' | 'importing'>('input');
  const [importType, setImportType] = useState<'text' | 'csv'>('text');

  const handleParseText = () => {
    if (!menuText.trim()) {
      toast({
        title: "Error",
        description: "Please enter your menu text",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const items = MenuParser.parseMenuText(menuText);
      
      if (items.length === 0) {
        toast({
          title: "No menu items found",
          description: "We couldn't parse any menu items from the text. Make sure to include item names and prices (e.g., 'Pizza $12.99').",
          variant: "destructive",
        });
      } else {
        setParsedItems(items);
        setSelectedItems(new Set(items.map((_, index) => index)));
        setImportStep('preview');
        toast({
          title: "Success",
          description: `Found ${items.length} menu items ready for import`,
        });
      }
    } catch (error) {
      console.error('Error parsing menu text:', error);
      toast({
        title: "Error",
        description: "Failed to parse menu data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setCsvFile(file);
  };

  const handleParseCSV = async () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const text = await csvFile.text();
      const items = MenuParser.parseCSV(text);
      
      if (items.length === 0) {
        toast({
          title: "No menu items found",
          description: "We couldn't parse any menu items from the CSV. Make sure your file has Name, Description, and Price columns.",
          variant: "destructive",
        });
      } else {
        setParsedItems(items);
        setSelectedItems(new Set(items.map((_, index) => index)));
        setImportStep('preview');
        toast({
          title: "Success",
          description: `Found ${items.length} menu items ready for import`,
        });
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        title: "Error",
        description: "Failed to parse CSV file",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    const itemsToImport = parsedItems.filter((_, index) => selectedItems.has(index));
    
    if (itemsToImport.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item to import",
        variant: "destructive",
      });
      return;
    }

    setImportStep('importing');
    
    try {
      // Remove duplicates from selected items
      const uniqueItems = itemsToImport.filter((item, index, self) => 
        index === self.findIndex(i => i.name.toLowerCase() === item.name.toLowerCase())
      );

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
          description: "All selected items already exist in your menu"
        });
        setImportStep('preview');
        return;
      }

      // Batch insert new items with category mapping
      const menuItemsData = await Promise.all(newItems.map(async (item, index) => {
        let categoryId = null;
        
        // Try to match or create category based on item data
        if (item.category) {
          const { data: existingCategory } = await supabase
            .from('menu_categories')
            .select('id')
            .eq('restaurant_id', restaurantId)
            .ilike('name', item.category)
            .single();
          
          if (existingCategory) {
            categoryId = existingCategory.id;
          } else {
            // Create new category
            const { data: newCategory } = await supabase
              .from('menu_categories')
              .insert({
                restaurant_id: restaurantId,
                name: item.category,
                display_order: index,
                is_active: true
              })
              .select('id')
              .single();
            
            if (newCategory) {
              categoryId = newCategory.id;
            }
          }
        }
        
        return {
          restaurant_id: restaurantId,
          name: item.name,
          description: item.description,
          price_cents: Math.round(item.price * 100),
          is_vegetarian: item.dietary?.vegetarian || false,
          is_vegan: item.dietary?.vegan || false,
          is_gluten_free: item.dietary?.glutenFree || false,
          is_available: true,
          display_order: index,
          category_id: categoryId
        };
      }));

      const { error } = await supabase
        .from('menu_items')
        .insert(menuItemsData);

      if (error) throw error;

      if (newItems.length !== uniqueItems.length) {
        toast({
          title: "Some Items Skipped",
          description: `${uniqueItems.length - newItems.length} items already exist. Imported ${newItems.length} new items.`,
        });
      } else {
        toast({
          title: "Success",
          description: `Successfully imported ${newItems.length} new menu items`,
        });
      }

      onImportComplete();
      handleClose();
    } catch (error) {
      console.error('Error importing menu items:', error);
      toast({
        title: "Error",
        description: "Failed to import some menu items",
        variant: "destructive",
      });
    }
  };

  const toggleItemSelection = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const selectAll = () => {
    setSelectedItems(new Set(parsedItems.map((_, index) => index)));
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleClose = () => {
    setMenuText('');
    setCsvFile(null);
    setParsedItems([]);
    setSelectedItems(new Set());
    setImportStep('input');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Import Menu Items
          </DialogTitle>
          <DialogDescription>
            Import menu items by copying text from Cookin.com or uploading a CSV file.
          </DialogDescription>
        </DialogHeader>

        {importStep === 'input' && (
          <div className="space-y-4">
            <Tabs value={importType} onValueChange={(value) => setImportType(value as 'text' | 'csv')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </TabsTrigger>
              </TabsList>

              <TabsContent value="text" className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p><strong>How to copy from Cookin.com:</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Go to your Cookin.com chef profile</li>
                        <li>Select and copy your menu text (Ctrl/Cmd + A, then Ctrl/Cmd + C)</li>
                        <li>Paste it in the text area below</li>
                      </ol>
                      <p className="text-muted-foreground">Make sure items include prices like "Pizza $12.99"</p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="menu-text">Menu Text</Label>
                  <Textarea
                    id="menu-text"
                    value={menuText}
                    onChange={(e) => setMenuText(e.target.value)}
                    placeholder="Paste your menu text here...
Example:
APPETIZERS
Garlic Bread $8.99
Fresh baked bread with garlic butter

MAIN DISHES  
Margherita Pizza $18.99
Fresh mozzarella, basil, tomato sauce"
                    rows={10}
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>

              <TabsContent value="csv" className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="space-y-2 text-sm">
                      <p><strong>CSV Format:</strong></p>
                      <p>Your CSV should have columns: Name, Description, Price, Category (optional)</p>
                      <p className="font-mono text-xs bg-background px-2 py-1 rounded">
                        "Pizza","Margherita pizza","$12.99","Main Dishes"
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="csv-file">Upload CSV File</Label>
                  <input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {csvFile && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Selected: {csvFile.name}
                    </p>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {importStep === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">Preview Items ({parsedItems.length} found)</h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>
                  Deselect All
                </Button>
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {parsedItems.map((item, index) => (
                <Card key={index} className={`cursor-pointer transition-colors ${
                  selectedItems.has(index) ? 'ring-2 ring-primary' : ''
                }`} onClick={() => toggleItemSelection(index)}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedItems.has(index)}
                        onChange={() => toggleItemSelection(index)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{item.name}</h5>
                          <span className="font-semibold text-primary">${item.price.toFixed(2)}</span>
                        </div>
                        {item.description && (
                          <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                        )}
                        <div className="flex gap-2 mt-2">
                          {item.category && <Badge variant="secondary">{item.category}</Badge>}
                          {item.dietary?.vegetarian && <Badge variant="outline">Vegetarian</Badge>}
                          {item.dietary?.vegan && <Badge variant="outline">Vegan</Badge>}
                          {item.dietary?.glutenFree && <Badge variant="outline">Gluten Free</Badge>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {importStep === 'importing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Importing menu items...</p>
          </div>
        )}

        <DialogFooter>
          {importStep === 'input' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              {importType === 'text' ? (
                <Button onClick={handleParseText} disabled={isLoading || !menuText.trim()}>
                  {isLoading ? 'Parsing...' : 'Parse Menu'}
                </Button>
              ) : (
                <Button onClick={handleParseCSV} disabled={isLoading || !csvFile}>
                  {isLoading ? 'Parsing...' : 'Parse CSV'}
                </Button>
              )}
            </>
          )}
          {importStep === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setImportStep('input')}>
                Back
              </Button>
              <Button onClick={handleImport} disabled={selectedItems.size === 0}>
                Import {selectedItems.size} Items
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};