/**
 * API Client - Uses Supabase Edge Functions (like all other forms in the app)
 */
import { supabase } from "@/integrations/supabase/client";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  ok: boolean;
}

/**
 * Support API endpoints - uses Supabase Edge Functions
 */
export const supportApi = {
  async verifyAccess(accessCode: string, email: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('verify-invite-access', {
        body: {
          accessCode: accessCode.toUpperCase().trim(),
          email: email.trim().toLowerCase(),
        },
      });

      if (error) {
        return {
          ok: false,
          error: error.message || 'Unable to verify access',
        };
      }

      return {
        ok: true,
        data,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  },

  async createCheckout(inviteId: string, amountCents: number, email: string): Promise<ApiResponse> {
    try {
      const { data, error } = await supabase.functions.invoke('create-invite-checkout', {
        body: {
          inviteId,
          amountCents,
          email,
        },
      });

      if (error) {
        return {
          ok: false,
          error: error.message || 'Unable to create checkout session',
        };
      }

      return {
        ok: true,
        data,
      };
    } catch (error: any) {
      return {
        ok: false,
        error: error.message || 'An unexpected error occurred',
      };
    }
  },
};

