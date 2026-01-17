import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RestaurantOnboardingData } from '../types';

interface ExportButtonProps {
  restaurants: RestaurantOnboardingData[];
  filteredRestaurants?: RestaurantOnboardingData[];
}

interface ExportField {
  id: string;
  label: string;
  selected: boolean;
}

export function ExportButton({ restaurants, filteredRestaurants }: ExportButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFields, setExportFields] = useState<ExportField[]>([
    { id: 'name', label: 'Restaurant Name', selected: true },
    { id: 'email', label: 'Email', selected: true },
    { id: 'phone', label: 'Phone', selected: true },
    { id: 'address', label: 'Address', selected: true },
    { id: 'city', label: 'City', selected: true },
    { id: 'state', label: 'State', selected: true },
    { id: 'zip_code', label: 'Zip Code', selected: true },
    { id: 'cuisine_type', label: 'Cuisine Type', selected: true },
    { id: 'restaurant_type', label: 'Restaurant Type', selected: true },
    { id: 'onboarding_status', label: 'Onboarding Status', selected: true },
    { id: 'business_verified', label: 'Business Verified', selected: true },
    { id: 'menu_status', label: 'Menu Status', selected: true },
    { id: 'banking_complete', label: 'Banking Complete', selected: true },
    { id: 'go_live_ready', label: 'Go Live Ready', selected: true },
    { id: 'tablet_shipped', label: 'Tablet Shipped', selected: false },
    { id: 'readiness_score', label: 'Readiness Score', selected: true },
    { id: 'created_at', label: 'Created Date', selected: true },
    { id: 'business_verified_at', label: 'Verified Date', selected: false },
    { id: 'menu_ready_at', label: 'Menu Ready Date', selected: false },
    { id: 'admin_notes', label: 'Admin Notes', selected: false },
  ]);

  const dataToExport = filteredRestaurants || restaurants;

  const toggleField = (fieldId: string) => {
    setExportFields(prev =>
      prev.map(field =>
        field.id === fieldId ? { ...field, selected: !field.selected } : field
      )
    );
  };

  const selectAll = () => {
    setExportFields(prev => prev.map(field => ({ ...field, selected: true })));
  };

  const selectNone = () => {
    setExportFields(prev => prev.map(field => ({ ...field, selected: false })));
  };

  const getFieldValue = (restaurant: RestaurantOnboardingData, fieldId: string): string => {
    switch (fieldId) {
      case 'name':
        return restaurant.restaurant.name || '';
      case 'email':
        return restaurant.restaurant.email || '';
      case 'phone':
        return restaurant.restaurant.phone || '';
      case 'address':
        return restaurant.restaurant.address || '';
      case 'city':
        return restaurant.restaurant.city || '';
      case 'state':
        return restaurant.restaurant.state || '';
      case 'zip_code':
        return restaurant.restaurant.zip_code || '';
      case 'cuisine_type':
        return restaurant.restaurant.cuisine_type || '';
      case 'restaurant_type':
        return restaurant.restaurant.restaurant_type || '';
      case 'onboarding_status':
        return restaurant.restaurant.onboarding_status || 'pending';
      case 'business_verified':
        return restaurant.business_info_verified ? 'Yes' : 'No';
      case 'menu_status':
        return restaurant.menu_preparation_status || 'not_started';
      case 'banking_complete':
        return restaurant.restaurant.banking_complete ? 'Yes' : 'No';
      case 'go_live_ready':
        return restaurant.go_live_ready ? 'Yes' : 'No';
      case 'tablet_shipped':
        return restaurant.tablet_shipped ? 'Yes' : 'No';
      case 'readiness_score':
        return restaurant.restaurant.readiness_score?.toString() || '0';
      case 'created_at':
        return new Date(restaurant.created_at).toLocaleDateString();
      case 'business_verified_at':
        return restaurant.business_verified_at
          ? new Date(restaurant.business_verified_at).toLocaleDateString()
          : '';
      case 'menu_ready_at':
        return restaurant.menu_ready_at
          ? new Date(restaurant.menu_ready_at).toLocaleDateString()
          : '';
      case 'admin_notes':
        return restaurant.admin_notes || '';
      default:
        return '';
    }
  };

  const escapeCSV = (value: string): string => {
    // Escape double quotes and wrap in quotes if contains comma, quote, or newline
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const generateCSV = (): string => {
    const selectedFields = exportFields.filter(f => f.selected);
    
    // Header row
    const headers = selectedFields.map(f => escapeCSV(f.label)).join(',');
    
    // Data rows
    const rows = dataToExport.map(restaurant => {
      return selectedFields
        .map(field => escapeCSV(getFieldValue(restaurant, field.id)))
        .join(',');
    });
    
    return [headers, ...rows].join('\n');
  };

  const handleExport = async () => {
    const selectedFields = exportFields.filter(f => f.selected);
    
    if (selectedFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    setIsExporting(true);

    try {
      // Generate CSV
      const csv = generateCSV();
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `restaurant-onboarding-${timestamp}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success(`Exported ${dataToExport.length} restaurants to ${filename}`);
      setShowDialog(false);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Export CSV
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-600" />
              Export Restaurant Data
            </DialogTitle>
            <DialogDescription>
              Select the fields you want to include in the CSV export. 
              {filteredRestaurants && filteredRestaurants.length < restaurants.length && (
                <span className="block mt-2 text-sm font-medium text-blue-600">
                  ℹ️ Exporting {filteredRestaurants.length} filtered restaurants (of {restaurants.length} total)
                </span>
              )}
              {(!filteredRestaurants || filteredRestaurants.length === restaurants.length) && (
                <span className="block mt-2 text-sm font-medium text-green-600">
                  ℹ️ Exporting all {restaurants.length} restaurants
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="outline" size="sm" onClick={selectNone}>
                Select None
              </Button>
            </div>

            {/* Field Selection Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 border rounded-lg bg-gray-50">
              {exportFields.map((field) => (
                <div key={field.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={field.id}
                    checked={field.selected}
                    onCheckedChange={() => toggleField(field.id)}
                  />
                  <Label
                    htmlFor={field.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {field.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Export Summary */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-800 font-medium">
                  Export Summary:
                </span>
                <span className="text-blue-600">
                  {exportFields.filter(f => f.selected).length} fields × {dataToExport.length} restaurants
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExport}
              disabled={isExporting || exportFields.filter(f => f.selected).length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export to CSV
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

