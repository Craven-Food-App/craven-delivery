import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, User, Phone, Mail } from "lucide-react";
import { AddressAutocomplete } from "@/components/common/AddressAutocomplete";

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
  deliveryAddress: string;
  specialInstructions?: string;
  addressCoordinates?: { lat: number; lng: number };
}

interface CustomerOrderFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customerInfo: CustomerInfo) => void;
  deliveryMethod: 'delivery' | 'pickup';
  isProcessing: boolean;
  orderTotal: number;
}

export const CustomerOrderForm = ({
  isOpen,
  onClose,
  onSubmit,
  deliveryMethod,
  isProcessing,
  orderTotal
}: CustomerOrderFormProps) => {
  const [formData, setFormData] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    deliveryAddress: '',
    specialInstructions: ''
  });

  const [errors, setErrors] = useState<Partial<CustomerInfo>>({});
  const [isValidAddress, setIsValidAddress] = useState(false);

  const validateForm = () => {
    const newErrors: Partial<CustomerInfo> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (deliveryMethod === 'delivery' && !formData.deliveryAddress.trim()) {
      newErrors.deliveryAddress = 'Delivery address is required';
    } else if (deliveryMethod === 'delivery' && !isValidAddress) {
      newErrors.deliveryAddress = 'Please select a valid address from the suggestions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const updateField = (field: keyof CustomerInfo, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Contact Information
            </h3>
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Enter your full name"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your@email.com"
                  className={errors.email ? 'border-destructive' : ''}
                />
                {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                  className={errors.phone ? 'border-destructive' : ''}
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Delivery Address (only for delivery orders) */}
          {deliveryMethod === 'delivery' && (
            <div className="space-y-2">
              <Label htmlFor="address" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Delivery Address *
              </Label>
              <AddressAutocomplete
                value={formData.deliveryAddress}
                onChange={(value, coordinates) => {
                  updateField('deliveryAddress', value);
                  if (coordinates) {
                    setFormData(prev => ({ ...prev, addressCoordinates: coordinates }));
                  }
                }}
                onValidAddress={(isValid) => setIsValidAddress(isValid)}
                placeholder="123 Main St, City, State 12345"
                required
                error={errors.deliveryAddress}
              />
            </div>
          )}

          {/* Special Instructions */}
          <div className="space-y-2">
            <Label htmlFor="instructions">Special Instructions (Optional)</Label>
            <Textarea
              id="instructions"
              value={formData.specialInstructions}
              onChange={(e) => updateField('specialInstructions', e.target.value)}
              placeholder="Any special delivery instructions or food allergies..."
              rows={3}
            />
          </div>

          {/* Order Summary */}
          <div className="bg-muted p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Order Total</span>
              <span className="font-bold text-lg">${(orderTotal / 100).toFixed(2)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {deliveryMethod === 'delivery' 
                ? 'Estimated delivery: 25-40 minutes'
                : 'Ready for pickup in 15-25 minutes'
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              Back to Cart
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isProcessing}
            >
              {isProcessing ? 'Placing Order...' : `Place Order • $${(orderTotal / 100).toFixed(2)}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};