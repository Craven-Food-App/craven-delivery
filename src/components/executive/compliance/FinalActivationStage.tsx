// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Stack, Loader, Center } from '@mantine/core';
import { supabase } from '@/integrations/supabase/client';
import ComplianceEntryScreen from './ComplianceEntryScreen';
import TaxIntakeForm from './TaxIntakeForm';
import EligibilityForm from './EligibilityForm';
import DirectDepositForm from './DirectDepositForm';
import ComplianceReviewScreen from './ComplianceReviewScreen';
import ComplianceSignatureScreen from './ComplianceSignatureScreen';
import CompliancePendingReview from './CompliancePendingReview';

interface FinalActivationStageProps {
  appointmentId: string;
  executiveId: string;
  executiveName: string;
}

type ComplianceStep = 'entry' | 'tax' | 'eligibility' | 'deposit' | 'review' | 'sign' | 'pending';

const FinalActivationStage: React.FC<FinalActivationStageProps> = ({
  appointmentId, executiveId, executiveName,
}) => {
  const [intake, setIntake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<ComplianceStep>('entry');

  useEffect(() => {
    loadIntake();
  }, [appointmentId]);

  const loadIntake = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('executive_compliance_intake')
        .select('*')
        .eq('appointment_id', appointmentId)
        .maybeSingle();

      setIntake(data);

      // Determine which step to show
      if (data) {
        const status = data.compliance_status;
        if (status === 'submitted' || status === 'review_pending' || status === 'approved' || status === 'payroll_ready') {
          setStep('pending');
        } else {
          setStep('entry');
        }
      } else {
        setStep('entry');
      }
    } catch (err) {
      console.error('Error loading compliance intake:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStepComplete = () => {
    loadIntake();
    setStep('entry');
  };

  if (loading) {
    return <Center py="xl"><Loader size="lg" /></Center>;
  }

  if (step === 'pending') {
    return (
      <CompliancePendingReview
        intake={intake}
        complianceStatus={intake?.compliance_status || 'submitted'}
      />
    );
  }

  if (step === 'tax') {
    return (
      <TaxIntakeForm
        intakeId={intake?.id || null}
        appointmentId={appointmentId}
        executiveId={executiveId}
        onComplete={handleStepComplete}
        onBack={() => setStep('entry')}
      />
    );
  }

  if (step === 'eligibility') {
    return (
      <EligibilityForm
        intakeId={intake?.id || null}
        appointmentId={appointmentId}
        executiveId={executiveId}
        onComplete={handleStepComplete}
        onBack={() => setStep('entry')}
      />
    );
  }

  if (step === 'deposit') {
    return (
      <DirectDepositForm
        intakeId={intake?.id || null}
        appointmentId={appointmentId}
        executiveId={executiveId}
        onComplete={handleStepComplete}
        onBack={() => setStep('entry')}
      />
    );
  }

  if (step === 'review') {
    return (
      <ComplianceReviewScreen
        intake={intake}
        onSign={() => setStep('sign')}
        onBack={() => setStep('entry')}
      />
    );
  }

  if (step === 'sign') {
    return (
      <ComplianceSignatureScreen
        intakeId={intake?.id}
        appointmentId={appointmentId}
        executiveId={executiveId}
        executiveName={executiveName}
        onComplete={() => {
          loadIntake();
          setStep('pending');
        }}
        onBack={() => setStep('review')}
      />
    );
  }

  return (
    <ComplianceEntryScreen
      taxComplete={intake?.tax_complete || false}
      eligibilityComplete={intake?.eligibility_complete || false}
      directDepositComplete={intake?.direct_deposit_complete || false}
      complianceStatus={intake?.compliance_status || 'not_started'}
      onNavigate={(s) => setStep(s)}
    />
  );
};

export default FinalActivationStage;