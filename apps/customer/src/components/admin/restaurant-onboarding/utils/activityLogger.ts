// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

export interface LogActivityParams {
  restaurantId: string;
  actionType: string;
  actionDescription: string;
  metadata?: any;
}

export async function logActivity({
  restaurantId,
  actionType,
  actionDescription,
  metadata
}: LogActivityParams): Promise<void> {
  try {
    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.warn('No user found, skipping activity log');
      return;
    }

    // Insert activity log
    const { error } = await supabase
      .from('restaurant_onboarding_activity_log')
      .insert({
        restaurant_id: restaurantId,
        admin_id: user.id,
        action_type: actionType,
        action_description: actionDescription,
        metadata: metadata || null,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error logging activity:', error);
      // Don't throw - activity logging should not break the main flow
    }
  } catch (error) {
    console.error('Error in logActivity:', error);
    // Silent fail - activity logging should not break the main flow
  }
}

// Predefined action types for consistency
export const ActivityActionTypes = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  UPDATED: 'updated',
  EMAIL_SENT: 'email_sent',
  DOCUMENT_VERIFIED: 'document_verified',
  ASSIGNED: 'assigned',
  NOTE_ADDED: 'note_added',
  STATUS_CHANGED: 'status_changed',
  EXPORTED: 'exported',
  IMPORTED: 'imported',
  MENU_UPDATED: 'menu_updated',
  BANKING_UPDATED: 'banking_updated',
  TABLET_SHIPPED: 'tablet_shipped',
  GO_LIVE: 'go_live',
} as const;

