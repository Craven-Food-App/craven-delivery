import React, { useState, useEffect } from 'react';
import { Button, Text, Stack, Box, Group, Checkbox } from '@mantine/core';
import { Smartphone, QrCode } from 'lucide-react';
import QRCode from 'qrcode';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
// Import logo - using public path since it's also in public folder
const craveLogoPath = '/crave-c-logo.png';

interface AppDownloadStepProps {
  onNext: (data: any) => void;
  onBack: () => void;
  applicationData: any;
}

export const AppDownloadStep: React.FC<AppDownloadStepProps> = ({ onNext, onBack, applicationData }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [resendLoading, setResendLoading] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [confirmedDownload, setConfirmedDownload] = useState(false);
  const { toast } = useToast();

  // Fetch phone number from database if not in applicationData
  useEffect(() => {
    const fetchPhoneNumber = async () => {
      // First check if phone is in applicationData
      if (applicationData?.phone) {
        setPhoneNumber(applicationData.phone);
        return;
      }

      // If not, try to fetch from database
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Try to get phone from craver_applications
        const { data: application } = await supabase
          .from('craver_applications')
          .select('phone')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (application?.phone) {
          setPhoneNumber(application.phone);
        } else {
          // Try user_profiles as fallback
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('phone')
            .eq('user_id', user.id)
            .maybeSingle();

          if (profile?.phone) {
            setPhoneNumber(profile.phone);
          }
        }
      } catch (error) {
        console.error('Error fetching phone number:', error);
      }
    };

    fetchPhoneNumber();
  }, [applicationData]);

  // Generate Play Store download URL
  const getDownloadUrl = () => {
    const downloadUrl = 'https://play.google.com/store/apps/details?id=com.craven.delivery.feeder&pcampaignid=web_share';
    return downloadUrl;
  };

  // Generate QR code with logo overlay
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const downloadUrl = getDownloadUrl();
        console.log('Generating QR code for URL:', downloadUrl);
        
        // Validate URL format
        if (!downloadUrl || !downloadUrl.startsWith('http')) {
          console.error('Invalid download URL:', downloadUrl);
          toast({
            title: "Error",
            description: "Failed to generate QR code: Invalid URL",
            variant: "destructive",
          });
          return;
        }
        
        // Create canvas for QR code
        const canvas = document.createElement('canvas');
        canvas.width = 300;
        canvas.height = 300;
        
        // Generate QR code with higher error correction for better scanning
        await QRCode.toCanvas(canvas, downloadUrl, {
          width: 300,
          margin: 3,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'H' // High error correction for better mobile scanning
        });

        // Verify the QR code was generated
        const testDataUrl = canvas.toDataURL('image/png');
        console.log('QR code base generated, data URL length:', testDataUrl.length);
        console.log('QR code base generated, adding logo...');
        
        // Test: Try to read back the URL from the QR code (if possible)
        // This is just for verification - the actual scanning happens on mobile

        // Create a new canvas to overlay the logo
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 300;
        logoCanvas.height = 300;
        const ctx = logoCanvas.getContext('2d');

        if (!ctx) {
          console.error('Failed to get canvas context');
          // Fallback to QR code without logo
          setQrCodeUrl(canvas.toDataURL('image/png'));
          return;
        }

        // Draw QR code first
        ctx.drawImage(canvas, 0, 0);

        // Load and draw logo in center
        const logo = new Image();
        logo.crossOrigin = 'anonymous';
        
        let logoLoaded = false;
        
        // Set a timeout to ensure QR code is set even if logo takes too long
        const logoTimeout = setTimeout(() => {
          if (!logoLoaded) {
            console.warn('Logo loading timeout, using QR code without logo');
            setQrCodeUrl(canvas.toDataURL('image/png'));
          }
        }, 3000);
        
        logo.onload = () => {
          clearTimeout(logoTimeout);
          logoLoaded = true;
            try {
              // Calculate logo size (20% of QR code size - smaller to not interfere with scanning)
              const logoSize = 60;
              const x = (logoCanvas.width - logoSize) / 2;
              const y = (logoCanvas.height - logoSize) / 2;

              // Draw white background circle for logo (smaller padding)
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.arc(
                logoCanvas.width / 2,
                logoCanvas.height / 2,
                logoSize / 2 + 3,
                0,
                2 * Math.PI
              );
              ctx.fill();

              // Draw logo
              ctx.drawImage(logo, x, y, logoSize, logoSize);

            // Convert to data URL
            const dataUrl = logoCanvas.toDataURL('image/png');
            setQrCodeUrl(dataUrl);
            console.log('QR code generated successfully with logo');
          } catch (error) {
            console.error('Error drawing logo on QR code:', error);
            // Fallback to QR code without logo
            setQrCodeUrl(canvas.toDataURL('image/png'));
          }
        };
        
        logo.onerror = (error) => {
          clearTimeout(logoTimeout);
          logoLoaded = true;
          console.warn('Logo failed to load, using QR code without logo:', error);
          // If logo fails to load, just use QR code without logo
          setQrCodeUrl(canvas.toDataURL('image/png'));
        };
        
        // Start loading logo
        logo.src = craveLogoPath;
      } catch (error) {
        console.error('Error generating QR code:', error);
        toast({
          title: "Error",
          description: "Failed to generate QR code. Please try refreshing the page.",
          variant: "destructive",
        });
      }
    };

    generateQRCode();
  }, []);

  const handleResendSMS = async () => {
    setResendLoading(true);
    try {
      const phone = phoneNumber || applicationData?.phone;
      if (!phone) {
        toast({
          title: "Error",
          description: "Phone number not found",
          variant: "destructive",
        });
        return;
      }

      const downloadUrl = getDownloadUrl();
      
      // Try to call edge function to send SMS (if it exists)
      const { error } = await supabase.functions.invoke('send-app-download-sms', {
        body: {
          phone: phone,
          downloadUrl: downloadUrl
        }
      });

      if (error) {
        // If function doesn't exist, that's okay - user can still use QR code
        if (error.message?.includes('not found') || error.message?.includes('Function')) {
          toast({
            title: "SMS Service",
            description: "SMS service not available. Please scan the QR code to download.",
            variant: "default",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "SMS Sent",
          description: "Download link sent to your phone",
        });
      }
    } catch (error: any) {
      console.error('Error sending SMS:', error);
      toast({
        title: "Note",
        description: "You can scan the QR code above to download the app.",
        variant: "default",
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleContinue = () => {
    if (!confirmedDownload) return;
    onNext({
      ...applicationData
    });
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display: (XXX) XXX-XXXX
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `+1 (${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <Box
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#FFFFFF',
        padding: '80px 24px 40px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <Stack gap="xl" style={{ maxWidth: '600px', width: '100%' }}>
        {/* Heading */}
        <Text fw={700} size="2xl" ta="center" style={{ fontSize: '32px', color: '#191919' }}>
          Time to download the Feeder app!
        </Text>

        {/* Instructions */}
        <Text size="sm" ta="center" style={{ color: '#191919', lineHeight: '1.6' }}>
          To continue signing-up, you must download the Feeder app. {phoneNumber && `We sent a text message with a Feeder app download link to ${formatPhoneNumber(phoneNumber)}. `}You can also scan the QR code below to download the app directly to your mobile device.
        </Text>

        {/* QR Code and Phone Illustration */}
        <Group justify="center" gap="xl" mt="md">
          {/* QR Code with Logo */}
          <Box
            style={{
              position: 'relative',
              padding: '20px',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              cursor: 'pointer'
            }}
            onClick={() => {
              const url = getDownloadUrl();
              window.open(url, '_blank');
            }}
            title="Click to open in new tab"
          >
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="Download QR Code" 
                style={{ 
                  width: '300px', 
                  height: '300px',
                  display: 'block',
                  pointerEvents: 'none'
                }} 
              />
            ) : (
              <Box
                style={{
                  width: '300px',
                  height: '300px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#F5F5F5'
                }}
              >
                <QrCode size={64} style={{ color: '#999' }} />
              </Box>
            )}
          </Box>
          
          {/* Display URL for debugging/accessibility */}
          <Box ta="center" mt="xs">
            <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all', maxWidth: '300px', margin: '0 auto' }}>
              {getDownloadUrl()}
            </Text>
            <Text size="xs" c="dimmed" mt="xs" mb="md">
              Scan QR code with your phone camera or click to open
            </Text>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const url = getDownloadUrl();
                window.open(url, '_blank');
              }}
              style={{ marginTop: '8px' }}
            >
              Open {getDownloadUrl().replace('https://', '')} in browser
            </Button>
          </Box>

          {/* Phone Illustration Placeholder */}
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '200px',
              height: '300px'
            }}
          >
            <Smartphone size={200} style={{ color: '#DC2626', opacity: 0.8 }} />
          </Box>
        </Group>

        {/* Resend SMS Link */}
        <Box ta="center" mt="md">
          <Button
            variant="subtle"
            onClick={handleResendSMS}
            loading={resendLoading}
            style={{
              color: '#DC2626',
              textDecoration: 'underline',
              padding: '8px 16px',
              height: 'auto'
            }}
          >
            Resend download link via text
          </Button>
        </Box>

        {/* Continue Button */}
        <Button
          size="lg"
          fullWidth
          onClick={handleContinue}
          style={{
            height: '48px',
            backgroundColor: '#DC2626',
            borderRadius: '8px',
            fontWeight: 600,
            marginTop: '24px'
          }}
        >
          Continue
        </Button>
      </Stack>
    </Box>
  );
};

