import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AutoAdvanceConfig {
  enabled: boolean;
  checkInterval?: number; // milliseconds
  onAdvance?: (step: number) => void;
  conditions: Array<{
    step: number;
    check: () => Promise<boolean> | boolean;
    description?: string;
  }>;
}

/**
 * Hook to automatically advance wizard steps when conditions are met
 */
export const useAutoAdvance = (
  activeStep: number,
  config: AutoAdvanceConfig
) => {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedStep = useRef<number>(-1);

  useEffect(() => {
    if (!config.enabled) {
      return;
    }

    const checkConditions = async () => {
      // Only check conditions for the current step
      const condition = config.conditions.find(c => c.step === activeStep);
      
      if (condition && lastCheckedStep.current !== activeStep) {
        lastCheckedStep.current = activeStep;
        
        try {
          const result = await condition.check();
          if (result && config.onAdvance) {
            console.log(`[AutoAdvance] Condition met for step ${activeStep}: ${condition.description || 'Unknown'}`);
            config.onAdvance(activeStep + 1);
          }
        } catch (error) {
          console.error(`[AutoAdvance] Error checking condition for step ${activeStep}:`, error);
        }
      }
    };

    // Check immediately
    checkConditions();

    // Set up interval if provided
    if (config.checkInterval && config.checkInterval > 0) {
      intervalRef.current = setInterval(checkConditions, config.checkInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      lastCheckedStep.current = -1;
    };
  }, [activeStep, config.enabled, config.checkInterval, config.conditions, config.onAdvance]);
};

/**
 * Utility functions for common auto-advance conditions
 */
export const AutoAdvanceConditions = {
  /**
   * Check if a board resolution has been adopted
   */
  async checkResolutionAdopted(resolutionId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('governance_board_resolutions')
      .select('status')
      .eq('id', resolutionId)
      .single();

    if (error || !data) return false;
    return data.status === 'ADOPTED' || data.status === 'EXECUTED';
  },

  /**
   * Check if all documents are signed for an appointment
   */
  async checkAllDocumentsSigned(appointmentId: string): Promise<boolean> {
    const { data: documents, error } = await supabase
      .from('executive_documents')
      .select('signature_status')
      .eq('appointment_id', appointmentId)
      .neq('status', 'generated_for_board_only');

    if (error || !documents || documents.length === 0) return false;
    
    return documents.every(doc => doc.signature_status === 'signed');
  },

  /**
   * Check if an appointment status has changed
   */
  async checkAppointmentStatus(
    appointmentId: string,
    targetStatus: string | string[]
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('executive_appointments')
      .select('status')
      .eq('id', appointmentId)
      .single();

    if (error || !data) return false;
    
    if (Array.isArray(targetStatus)) {
      return targetStatus.includes(data.status);
    }
    return data.status === targetStatus;
  },

  /**
   * Check if a workflow step is completed
   */
  async checkWorkflowStepCompleted(
    workflowId: string,
    stepName: string
  ): Promise<boolean> {
    const { data, error } = await supabase
      .from('exit_workflow_steps')
      .select('status')
      .eq('workflow_id', workflowId)
      .eq('step_name', stepName)
      .single();

    if (error || !data) return false;
    return data.status === 'completed';
  },

  /**
   * Check if board resolution voting is complete
   */
  async checkVotingComplete(resolutionId: string): Promise<boolean> {
    const { data: resolution, error: resError } = await supabase
      .from('governance_board_resolutions')
      .select('status')
      .eq('id', resolutionId)
      .single();

    if (resError || !resolution) return false;
    
    // If already adopted or rejected, voting is complete
    if (['ADOPTED', 'REJECTED', 'EXECUTED'].includes(resolution.status)) {
      return true;
    }

    // Check if we have enough votes
    const { data: votes, error: votesError } = await supabase
      .from('governance_resolution_votes')
      .select('vote')
      .eq('resolution_id', resolutionId);

    if (votesError || !votes) return false;

    const voteCounts = {
      YES: votes.filter(v => v.vote === 'YES').length,
      NO: votes.filter(v => v.vote === 'NO').length,
      ABSTAIN: votes.filter(v => v.vote === 'ABSTAIN').length,
    };

    const totalVotes = voteCounts.YES + voteCounts.NO + voteCounts.ABSTAIN;
    const majorityThreshold = 1; // Quorum requirement

    // Voting is complete if we have a majority decision
    return voteCounts.YES >= majorityThreshold || voteCounts.NO >= majorityThreshold;
  },

  /**
   * Check if equity grant was successfully created
   */
  async checkEquityGrantCreated(recipientEmail: string, sharesAmount: number): Promise<boolean> {
    const { data, error } = await supabase
      .from('equity_ledger')
      .select('id')
      .eq('recipient_email', recipientEmail)
      .eq('shares_amount', sharesAmount)
      .eq('transaction_type', 'grant')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) return false;
    return true;
  },
};




















