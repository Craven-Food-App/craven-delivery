// Hook: useTesterFeedback
// Submit micro-feedback prompts

import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useTesterFeedback = () => {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const submitFeedback = async (
    promptKey: string,
    rating?: number,
    comment?: string
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: 'Error',
          description: 'Please sign in to submit feedback',
          variant: 'destructive',
        });
        return false;
      }

      setSubmitting(true);

      const { data, error } = await supabase.rpc('submit_tester_feedback', {
        p_user_id: user.id,
        p_prompt_key: promptKey,
        p_rating: rating || null,
        p_comment: comment || null,
      });

      if (error) throw error;

      // Trigger evaluation after feedback submission
      await supabase.functions.invoke('tester-evaluate-and-issue', {
        body: { user_id: user.id }
      });

      return true;
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit feedback. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  return { submitFeedback, submitting };
};

