import React, { useState } from 'react';
import { Car, Bike, Zap, PersonStanding, Calendar, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type VehicleType = 'car' | 'bike' | 'scooter' | 'walk' | 'motorcycle';

interface VehicleOption {
  type: VehicleType;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  docsComplete: boolean;
}

interface VehicleSelectorProps {
  selectedVehicle: VehicleType;
  onVehicleSelect: (vehicle: VehicleType) => void;
  docsStatus: Record<VehicleType, boolean>;
}

const vehicleOptions: Omit<VehicleOption, 'docsComplete'>[] = [
  { type: 'car', icon: Car, label: 'Car' },
  { type: 'bike', icon: Bike, label: 'Bike' },
  { type: 'scooter', icon: Zap, label: 'Scooter' },
  { type: 'walk', icon: PersonStanding, label: 'Walk' },
  { type: 'motorcycle', icon: Calendar, label: 'Motorcycle' },
];

export const VehicleSelector: React.FC<VehicleSelectorProps> = ({
  selectedVehicle,
  onVehicleSelect,
  docsStatus
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = vehicleOptions.find(v => v.type === selectedVehicle);
  const SelectedIcon = selectedOption?.icon || Car;
  
  return (
    <div className="w-full relative">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Vehicle</h3>
      
      {/* Dropdown Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between h-12 bg-card hover:bg-accent"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <SelectedIcon className="h-5 w-5" />
            <Badge
              variant={docsStatus[selectedVehicle] ? "secondary" : "destructive"}
              className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
            >
              {docsStatus[selectedVehicle] ? '✓' : '✗'}
            </Badge>
          </div>
          <span className="font-medium">{selectedOption?.label}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-40 overflow-hidden">
            {vehicleOptions.map((vehicle) => {
              const Icon = vehicle.icon;
              const isSelected = selectedVehicle === vehicle.type;
              const docsComplete = docsStatus[vehicle.type];
              
              return (
                <button
                  key={vehicle.type}
                  onClick={() => {
                    onVehicleSelect(vehicle.type);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-accent transition-smooth ${
                    isSelected ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="relative">
                    <Icon className="h-5 w-5" />
                    <Badge
                      variant={docsComplete ? "secondary" : "destructive"}
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 text-[10px] flex items-center justify-center"
                    >
                      {docsComplete ? '✓' : '✗'}
                    </Badge>
                  </div>
                  <span className="font-medium flex-1 text-left">{vehicle.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};