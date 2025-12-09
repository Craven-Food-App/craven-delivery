import { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import { Button, Card, Progress, Stepper, Stack, Group, Text, Box, Loader, Center } from "@mantine/core";
import { useApplicationState } from "@/hooks/useApplicationState";
import { validateStep } from "@/utils/applicationValidation";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AccountSetupStep } from "./application/AccountSetupStep";
import { AddressStep } from "./application/AddressStep";
import { VehicleStep } from "./application/VehicleStep";
import { BankingStep } from "./application/BankingStep";
import { DocumentsStep } from "./application/DocumentsStep";
import { ReviewStep } from "./application/ReviewStep";
import { WaitlistSuccessModal } from "./WaitlistSuccessModal";

interface DriverApplicationWizardProps {
  onClose: () => void;
}

const STEPS = [
  { number: 1, title: "Account Setup", component: AccountSetupStep },
  { number: 2, title: "Address", component: AddressStep },
  { number: 3, title: "Vehicle & License", component: VehicleStep },
  { number: 4, title: "Payment & Tax Info", component: BankingStep },
  { number: 5, title: "Documents", component: DocumentsStep },
  { number: 6, title: "Review", component: null }, // Special case
];

export const DriverApplicationWizard = ({ onClose }: DriverApplicationWizardProps) => {
  const {
    data,
    files,
    currentStep,
    existingUser,
    isLoading,
    updateData,
    updateFile,
    nextStep,
    prevStep,
    goToStep,
    clearDraft,
  } = useApplicationState();

  const { toast } = useToast();
  const [showWaitlistModal, setShowWaitlistModal] = useState(false);
  const [waitlistData, setWaitlistData] = useState<{
    position: number;
    city: string;
    state: string;
    regionName?: string | null;
  } | null>(null);

  if (isLoading) {
    return (
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Card p="xl" style={{ maxWidth: 448, width: '100%' }}>
          <Center>
            <Stack align="center" gap="md">
              <Loader size="md" />
              <Text c="dimmed">Loading your application...</Text>
            </Stack>
          </Center>
        </Card>
      </Box>
    );
  }

  const currentValidation = validateStep(currentStep, data, files);
  const progress = (currentStep / STEPS.length) * 100;

  const ensureRegionForApplication = async (
    applicationId: string,
    city: string,
    state: string,
    zipCode: string,
  ) => {
    try {
      const normalizedZip = (zipCode || '').trim().replace(/[^0-9]/g, '').slice(0, 5);
      if (!normalizedZip) {
        console.warn('Unable to auto-assign region: invalid ZIP', zipCode);
        return null;
      }

      const { data: regionData, error: regionError } = await supabase.functions.invoke(
        'ensure-region',
        {
          body: {
            city,
            state,
            zip_code: normalizedZip,
          },
        },
      );

      if (regionError) {
        console.error('ensure-region error:', regionError);
        return null;
      }

      const regionId = regionData?.region_id ?? null;
      const regionName = regionData?.region_name ?? null;

      if (!regionId) {
        return { regionId: null, regionName };
      }

      const { error: updateError } = await supabase
        .from('craver_applications')
        .update({ region_id: regionId })
        .eq('id', applicationId);

      if (updateError) {
        console.error('Failed to update application region:', updateError);
      }

      return { regionId, regionName };
    } catch (error) {
      console.error('Unexpected error assigning region:', error);
      return null;
    }
  };

  const handleSubmit = async (password: string) => {
    try {
      // Step 1: Authenticate user (or use existing session)
      let userId = existingUser?.id;
      let isNewUser = false;

      if (!existingUser) {
        // Create user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: data.email,
          password: password,
        });

        if (authError) throw authError;
        if (!authData.user) throw new Error('Failed to create user');
        
        userId = authData.user.id;
        isNewUser = true;

        // Create user profile
        await supabase.from('user_profiles').insert({
          user_id: userId,
          full_name: `${data.firstName} ${data.lastName}`,
          phone: data.phone,
          role: 'driver'
        });
      }

      // Step 2: Upload documents
      const documentPaths: Record<string, string> = {};
      const uploadPromises = Object.entries(files).map(async ([key, file]) => {
        if (file) {
          try {
            const filePath = `${userId}/${key}-${Date.now()}`;
            const { error: uploadError } = await supabase.storage
              .from('feeder-documents')
              .upload(filePath, file);
            
            if (!uploadError) {
              documentPaths[key] = filePath;
            }
          } catch (error) {
            console.error(`Failed to upload ${key}:`, error);
          }
        }
      });
      await Promise.all(uploadPromises);

      const documentColumnMap: Record<string, string> = {
        driversLicenseFront: 'drivers_license_front',
        driversLicenseBack: 'drivers_license_back',
        insuranceDocument: 'insurance_document',
        vehicleRegistration: 'vehicle_registration',
      };

      const documentColumns = Object.entries(documentPaths).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          const column = documentColumnMap[key] ?? key;
          acc[column] = value;
          return acc;
        },
        {},
      );

      // Step 3: Submit application (goes to waitlist now)
      const parsedVehicleYear = data.vehicleYear ? parseInt(data.vehicleYear, 10) : NaN;
      const vehicleYear = Number.isNaN(parsedVehicleYear) ? null : parsedVehicleYear;
      const sanitizedSsn = data.ssn?.replace(/\D/g, '') ?? '';
      const applicationPayload = Object.fromEntries(
        Object.entries({
          user_id: userId ?? null,
          first_name: data.firstName?.trim() || null,
          last_name: data.lastName?.trim() || null,
          email: data.email?.trim().toLowerCase() || null,
          phone: data.phone?.trim() || null,
          date_of_birth: data.dateOfBirth || null,
          street_address: data.streetAddress?.trim() || null,
          city: data.city?.trim() || null,
          state: data.state || null,
          zip_code: data.zipCode?.trim() || null,
          vehicle_type: data.vehicleType || null,
          vehicle_make: data.vehicleMake || null,
          vehicle_model: data.vehicleModel || null,
          vehicle_year: vehicleYear,
          vehicle_color: data.vehicleColor || null,
          license_plate: data.licensePlate || null,
          license_number: data.licenseNumber || null,
          license_state: data.licenseState || null,
          license_expiry: data.licenseExpiry || null,
          payout_method: data.payoutMethod || null,
          bank_account_type: data.bankAccountType || null,
          routing_number: data.routingNumber?.trim() || null,
          account_number_last_four: data.accountNumber
            ? data.accountNumber.replace(/\D/g, '').slice(-4)
            : null,
          cash_tag: data.cashTag?.trim() || null,
          ssn_last_four: sanitizedSsn ? sanitizedSsn.slice(-4) : null,
          background_check_consent: Boolean(data.backgroundCheckConsent),
          background_check_consent_date: data.backgroundCheckConsent ? new Date().toISOString() : null,
          ...documentColumns,
          status: 'pending',
        }).filter(([, value]) => value !== undefined)
      );

      const { data: application, error: appError } = await supabase
        .from('craver_applications')
        .insert(applicationPayload as any)
        .select()
        .single();

      if (appError) throw appError;

      let regionInfo: { regionId: number | null; regionName: string | null } | null = null;
      if (application?.id) {
        regionInfo = await ensureRegionForApplication(
          application.id,
          data.city,
          data.state,
          data.zipCode,
        );
      }

      // Step 4: Show waitlist success modal
      setWaitlistData({
        position: 1, // TODO: Implement proper waitlist position calculation
        city: data.city,
        state: data.state,
        regionName: regionInfo?.regionName ?? `${data.city}, ${data.state}`,
      });
      setShowWaitlistModal(true);

      // Clear draft on success
      clearDraft();

      toast({
        title: "Application Submitted!",
        description: "Your application has been submitted to the waitlist.",
      });
    } catch (error) {
      console.error("Failed to submit application:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderStep = () => {
    const commonProps = {
      data,
      files,
      onUpdate: updateData,
      onFileUpload: updateFile,
      onNext: nextStep,
      onBack: prevStep,
      isValid: currentValidation.isValid,
      errors: currentValidation.errors,
    };

    if (currentStep === 6) {
      return (
        <ReviewStep
          data={data}
          files={files}
          existingUser={existingUser}
          onBack={prevStep}
          onEdit={goToStep}
          onSubmit={handleSubmit}
        />
      );
    }

    const StepComponent = STEPS.find(step => step.number === currentStep)?.component;
    if (!StepComponent) return null;
    return <StepComponent {...commonProps} />;
  };

  return (
    <>
      <Box
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'var(--mantine-color-body)',
          zIndex: 50,
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <Box
          style={{
            backgroundColor: '#ff7a00',
            color: 'white',
            padding: '16px 0',
          }}
        >
          <Group justify="space-between" style={{ maxWidth: 896, margin: '0 auto', padding: '0 16px' }}>
            <Text fw={700} size="xl">Crave'N Driver Application</Text>
            <Button
              variant="subtle"
              size="sm"
              color="white"
              onClick={onClose}
              leftSection={<X size={16} />}
            >
              Close
            </Button>
          </Group>
        </Box>
        
        <Box style={{ maxWidth: 896, margin: '0 auto', padding: '16px', paddingBottom: '32px' }}>
          <Card p={0} style={{ width: '100%' }}>
            {/* Progress header */}
            <Box p="xl" style={{ borderBottom: '1px solid var(--mantine-color-gray-3)' }}>
              <Stack gap="md">
                <div>
                  <Text fw={700} size="xl" c="#ff7a00">Feeder Application</Text>
                  <Text size="sm" c="dimmed">Step {currentStep} of {STEPS.length}</Text>
                </div>
                
                <Progress value={progress} size="sm" color="#ff7a00" />
                
                {/* Step indicators */}
                <Stepper
                  active={currentStep - 1}
                  mt="md"
                >
                  {STEPS.map((step, index) => (
                    <Stepper.Step
                      key={step.number}
                      label={step.title}
                      description={index < currentStep - 1 ? 'Completed' : index === currentStep - 1 ? 'Current' : 'Upcoming'}
                      icon={step.number < currentStep ? <CheckCircle size={16} /> : step.number}
                    />
                  ))}
                </Stepper>
              </Stack>
            </Box>

            {/* Step content */}
            <Box p="xl">
              {renderStep()}
            </Box>
          </Card>
        </Box>
      </Box>
    
      {/* Waitlist Success Modal (appears on top of wizard) */}
      {showWaitlistModal && waitlistData && (
        <WaitlistSuccessModal
          firstName={data.firstName}
          city={waitlistData.city}
          state={waitlistData.state}
          regionName={waitlistData.regionName}
          waitlistPosition={waitlistData.position}
          onClose={() => {
            setShowWaitlistModal(false);
            onClose(); // Close wizard too
          }}
        />
      )}
    </>
  );
};
