import React from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import CravenDeliveryFlow from './CravenDeliveryFlow';

// ===== TYPES =====

type DeliveryStage = 'navigate_to_restaurant' | 'arrived_at_restaurant' | 'verify_pickup' | 'pickup_photo_verification' | 'navigate_to_customer' | 'capture_proof' | 'delivered';

interface OrderItem {
  name: string;
  quantity: number;
  special_instructions?: string;
}

interface DeliveryProgress {
  currentStage: DeliveryStage;
  stageNumber: number;
  totalStages: number;
  stageName: string;
  isCompleted: boolean;
  pickupPhotoUrl?: string;
  deliveryPhotoUrl?: string;
}

interface ActiveDeliveryProps {
  orderDetails: any;
  onCompleteDelivery: () => void;
  onProgressChange?: (progress: DeliveryProgress) => void;
  onCameraStateChange?: (isOpen: boolean) => void;
}

const ActiveDeliveryFlow: React.FC<ActiveDeliveryProps> = (props) => {
  return (
    <ErrorBoundary>
      <CravenDeliveryFlow {...props} />
    </ErrorBoundary>
  );
};

export default ActiveDeliveryFlow;