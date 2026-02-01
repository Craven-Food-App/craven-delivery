/**
 * Example Usage of NewDeliveryRequest Component
 * Shows how to integrate the delivery request screen with countdown timer
 */

import React, { useState, useEffect } from 'react';
import { NewDeliveryRequest } from './NewDeliveryRequest';

// Example: Your existing Mapbox component wrapper
// import { MobileMapbox } from './MobileMapbox';

export const NewDeliveryRequestExample: React.FC = () => {
  const [showRequest, setShowRequest] = useState(true);
  const [timeLeft, setTimeLeft] = useState(33); // 33 seconds initial timeout

  // Countdown timer
  useEffect(() => {
    if (!showRequest || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Auto-decline when timer hits 0
          handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showRequest, timeLeft]);

  const handleAccept = () => {
    console.log('Order accepted!');
    setShowRequest(false);
    // Your logic: navigate to active delivery screen, etc.
  };

  const handleDecline = () => {
    console.log('Order declined or timed out');
    setShowRequest(false);
    // Your logic: return to idle state, etc.
  };

  const handleClose = () => {
    console.log('Request dismissed');
    setShowRequest(false);
    // Your logic: same as decline
  };

  if (!showRequest) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>No active delivery request</p>
        <button
          onClick={() => {
            setTimeLeft(33);
            setShowRequest(true);
          }}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            background: '#E8652A',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Simulate New Request
        </button>
      </div>
    );
  }

  return (
    <NewDeliveryRequest
      orderId="51e114"
      timeLeft={timeLeft}
      totalSeconds={33}
      merchant={{
        name: 'CMIH Kitchen',
        address: '6759 Nebraska Avenue',
      }}
      customer={{
        name: 'Torrance Stroman',
        address: '6759 Nebraska Ave, Toledo, OH 43617',
      }}
      distance={5.6}
      eta={18}
      earnings={28.05}
      subtotal={33.0}
      tip={4.95}
      feePercentage={70}
      // mapComponent={
      //   <MobileMapbox
      //     pickupLocation={{ lat: 41.6639, lng: -83.5552 }}
      //     dropoffLocation={{ lat: 41.6528, lng: -83.5378 }}
      //   />
      // }
      onAccept={handleAccept}
      onDecline={handleDecline}
      onClose={handleClose}
    />
  );
};

