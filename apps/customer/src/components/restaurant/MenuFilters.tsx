import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Filter, X, Star, Clock, DollarSign } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

interface MenuFiltersProps {
  onFiltersChange: (filters: FilterOptions) => void;
  className?: string;
}

export interface FilterOptions {
  priceRange: [number, number];
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
  };
  availability: boolean;
  rating: number;
  preparationTime: number;
}

const MenuFilters = ({ onFiltersChange, className }: MenuFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 50],
    dietary: {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
    },
    availability: true,
    rating: 0,
    preparationTime: 60,
  });

  const [activeFiltersCount, setActiveFiltersCount] = useState(0);

  const updateFilters = (newFilters: Partial<FilterOptions>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFiltersChange(updated);

    // Count active filters
    let count = 0;
    if (updated.priceRange[0] > 0 || updated.priceRange[1] < 50) count++;
    if (updated.dietary.vegetarian || updated.dietary.vegan || updated.dietary.glutenFree) count++;
    if (!updated.availability) count++;
    if (updated.rating > 0) count++;
    if (updated.preparationTime < 60) count++;
    
    setActiveFiltersCount(count);
  };

  const resetFilters = () => {
    const defaultFilters: FilterOptions = {
      priceRange: [0, 50],
      dietary: {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
      },
      availability: true,
      rating: 0,
      preparationTime: 60,
    };
    setFilters(defaultFilters);
    onFiltersChange(defaultFilters);
    setActiveFiltersCount(0);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className={`flex items-center gap-2 relative ${className}`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Menu Filters</span>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </SheetTitle>
          <SheetDescription>
            Filter menu items to find exactly what you're craving
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Price Range */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Price Range
            </Label>
            <div className="px-2">
              <Slider
                value={filters.priceRange}
                onValueChange={(value) => updateFilters({ priceRange: value as [number, number] })}
                max={50}
                min={0}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>${filters.priceRange[0]}</span>
                <span>${filters.priceRange[1]}+</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dietary Preferences */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Dietary Preferences</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="vegetarian" className="flex items-center gap-2 cursor-pointer">
                  🥗 Vegetarian
                </Label>
                <Switch
                  id="vegetarian"
                  checked={filters.dietary.vegetarian}
                  onCheckedChange={(checked) => 
                    updateFilters({ 
                      dietary: { ...filters.dietary, vegetarian: checked } 
                    })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="vegan" className="flex items-center gap-2 cursor-pointer">
                  🌱 Vegan
                </Label>
                <Switch
                  id="vegan"
                  checked={filters.dietary.vegan}
                  onCheckedChange={(checked) => 
                    updateFilters({ 
                      dietary: { ...filters.dietary, vegan: checked } 
                    })
                  }
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="glutenFree" className="flex items-center gap-2 cursor-pointer">
                  🌾 Gluten Free
                </Label>
                <Switch
                  id="glutenFree"
                  checked={filters.dietary.glutenFree}
                  onCheckedChange={(checked) => 
                    updateFilters({ 
                      dietary: { ...filters.dietary, glutenFree: checked } 
                    })
                  }
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Availability */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="availability" className="text-base font-medium cursor-pointer">
                Only Available Items
              </Label>
              <Switch
                id="availability"
                checked={filters.availability}
                onCheckedChange={(checked) => updateFilters({ availability: checked })}
              />
            </div>
          </div>

          <Separator />

          {/* Minimum Rating */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Star className="h-4 w-4" />
              Minimum Rating
            </Label>
            <div className="px-2">
              <Slider
                value={[filters.rating]}
                onValueChange={(value) => updateFilters({ rating: value[0] })}
                max={5}
                min={0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between items-center text-sm text-muted-foreground mt-2">
                <span>Any rating</span>
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-current text-yellow-400" />
                  <span>{filters.rating.toFixed(1)}+</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Preparation Time */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Max Preparation Time
            </Label>
            <div className="px-2">
              <Slider
                value={[filters.preparationTime]}
                onValueChange={(value) => updateFilters({ preparationTime: value[0] })}
                max={60}
                min={5}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground mt-2">
                <span>5 min</span>
                <span>{filters.preparationTime === 60 ? 'Any time' : `${filters.preparationTime} min`}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <Button onClick={() => setIsOpen(false)} className="w-full">
            Apply Filters
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MenuFilters;