import React, { useState, useEffect } from 'react';
import { Text, Box } from '@mantine/core';
import { TermsAndPrivacyStep } from './steps/TermsAndPrivacyStep';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { SmsOptInStep } from './steps/SmsOptInStep';
import { AppDownloadStep } from './steps/AppDownloadStep';
import { WaitlistSuccessStep } from './steps/WaitlistSuccessStep';
import { supabase } from '@/integrations/supabase/client';
import { useLocation } from 'react-router-dom';

export const DriverApplicationWizard: React.FC = () => {
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [applicationData, setApplicationData] = useState<any>({});
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(null);

  const steps = [
    {
      title: 'Terms & Privacy',
      description: 'Review agreements'
    },
    {
      title: 'Basic Information',
      description: 'Tell us about yourself'
    },
    {
      title: 'SMS Opt-in',
      description: 'Stay connected'
    },
    {
      title: 'Download App',
      description: 'Get the mobile app'
    },
    {
      title: 'Application Complete',
      description: 'Waitlist confirmation'
    }
  ];

  const handleStepComplete = (stepData: any) => {
    setApplicationData({ ...applicationData, ...stepData });
    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  useEffect(() => {
    const fetchBackgroundImage = async () => {
      try {
        const { data, error } = await supabase
          .from('marketing_settings')
          .select('application_background_image_url')
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          // Handle case where column might not exist yet
          if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('does not exist')) {
            console.warn('Column application_background_image_url does not exist. Using default gradient.');
            return;
          }
          console.error('Error fetching application background image:', error);
          return;
        }

        if (data?.application_background_image_url) {
          setBackgroundImageUrl(data.application_background_image_url);
        }
      } catch (error: any) {
        // If it's a 400 error, column doesn't exist yet
        if (error?.status === 400 || error?.code === 400) {
          console.warn('Application background image column does not exist yet. Using default gradient.');
        } else {
          console.error('Error fetching application background image:', error);
        }
      }
    };

    fetchBackgroundImage();
  }, []);

  // Load email and phone from location state or secure storage
  useEffect(() => {
    const loadData = async () => {
      const state = location.state as { phone?: string; email?: string } | null;
      const { secureGetItem } = await import('@/utils/storage');
      const savedEmail = secureGetItem('feeder_signup_email');
      const savedPhone = secureGetItem('feeder_signup_phone');

      if (state?.email || state?.phone || savedEmail || savedPhone) {
        setApplicationData((prev: any) => ({
          ...prev,
          email: state?.email || savedEmail || prev.email,
          phone: state?.phone || savedPhone || prev.phone
        }));
      }
    };
    loadData();
  }, [location.state]);

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <TermsAndPrivacyStep
            onNext={handleStepComplete}
            applicationData={applicationData}
          />
        );
      case 1:
        return (
          <BasicInfoStep
            onNext={handleStepComplete}
            onBack={handleBack}
            applicationData={applicationData}
          />
        );
      case 2:
        return (
          <SmsOptInStep
            onNext={handleStepComplete}
            onBack={handleBack}
            applicationData={applicationData}
          />
        );
      case 3:
        return (
          <AppDownloadStep
            onNext={handleStepComplete}
            onBack={handleBack}
            applicationData={applicationData}
          />
        );
      case 4:
        return (
          <WaitlistSuccessStep
            applicationData={applicationData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Box
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#FFFFFF',
        position: 'relative'
      }}
    >
      {/* Minimal Progress Indicator - Top Bar */}
      <Box
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: '#F5F5F5',
          zIndex: 1000
        }}
      >
        <Box
          style={{
            height: '100%',
            width: `${((currentStep + 1) / steps.length) * 100}%`,
            backgroundColor: '#DC2626',
            transition: 'width 0.3s ease'
          }}
        />
      </Box>

      {/* Step Counter - Minimal */}
      <Box
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 1000
        }}
      >
        <Text size="sm" c="dimmed" fw={500}>
          {currentStep + 1} of {steps.length}
        </Text>
      </Box>

      {/* Full Page Step Content */}
      <Box
        style={{
          width: '100%',
          minHeight: '100vh',
          paddingTop: '0px'
        }}
      >
        {renderStepContent()}
      </Box>
    </Box>
  );
};
