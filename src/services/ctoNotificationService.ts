import { supabase } from '@/integrations/supabase/client';

export interface CTONotification {
  type: 'incident' | 'sprint' | 'review' | 'infrastructure' | 'budget' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

class CTONotificationService {
  // Send notification to CTO portal (in-app)
  async sendPortalNotification(notification: CTONotification) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Store in database for portal notifications
      const { error } = await supabase.from('cto_notifications').insert({
        user_id: user.id,
        notification_type: notification.type,
        severity: notification.severity,
        title: notification.title,
        message: notification.message,
        action_url: notification.actionUrl,
        metadata: notification.metadata || {},
        is_read: false,
      });

      if (error) {
        console.error('Failed to insert notification:', error);
      }
    } catch (error) {
      console.error('Failed to send portal notification:', error);
    }
  }

  // Send email notification via edge function (if it exists)
  async sendEmailNotification(email: string, notification: CTONotification) {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-executive-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type: notification.type,
          severity: notification.severity,
          title: notification.title,
          message: notification.message,
          actionUrl: notification.actionUrl,
        }),
      });
      
      if (!response.ok) {
        console.warn('Email notification endpoint may not exist:', response.status);
      }
    } catch (error) {
      console.warn('Email notification service not available:', error);
    }
  }

  // Send push notification
  async sendPushNotification(userId: string, notification: CTONotification) {
    try {
      const { error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          user_id: userId,
          title: notification.title,
          body: notification.message,
          data: {
            type: notification.type,
            actionUrl: notification.actionUrl,
            ...notification.metadata,
          },
        },
      });
      
      if (error) {
        console.warn('Push notification may not be configured:', error);
      }
    } catch (error) {
      console.warn('Push notification service not available:', error);
    }
  }

  // Notify CTO about critical incident
  async notifyCriticalIncident(incident: any) {
    const notification: CTONotification = {
      type: 'incident',
      severity: 'critical',
      title: `Critical Incident: ${incident.title}`,
      message: incident.description || 'A critical incident has been reported',
      actionUrl: `/cto?tab=incidents`,
      metadata: { incident_id: incident.id },
    };

    await this.sendPortalNotification(notification);
    
    // Also send email and push for critical incidents
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) {
      await this.sendEmailNotification(user.email, notification);
      await this.sendPushNotification(user.id, notification);
    }
  }

  // Notify about infrastructure issues
  async notifyInfrastructureIssue(service: any) {
    const notification: CTONotification = {
      type: 'infrastructure',
      severity: service.status === 'down' ? 'critical' : 'high',
      title: `Infrastructure Alert: ${service.service_name}`,
      message: `Service ${service.service_name} is ${service.status}`,
      actionUrl: `/cto?tab=morning-review`,
      metadata: { service_name: service.service_name },
    };

    await this.sendPortalNotification(notification);
  }

  // Notify about budget threshold exceeded
  async notifyBudgetThreshold(category: string, threshold: number, actual: number) {
    const notification: CTONotification = {
      type: 'budget',
      severity: 'high',
      title: `Budget Alert: ${category}`,
      message: `${category} has exceeded budget threshold. Actual: $${actual.toFixed(2)} vs Budget: $${threshold.toFixed(2)}`,
      actionUrl: `/cto?tab=costs`,
      metadata: { category, threshold, actual },
    };

    await this.sendPortalNotification(notification);
  }

  // Notify about sprint deadline
  async notifySprintDeadline(sprint: any, daysRemaining: number) {
    const notification: CTONotification = {
      type: 'sprint',
      severity: daysRemaining <= 1 ? 'high' : 'medium',
      title: `Sprint Deadline: ${sprint.sprint_name}`,
      message: `${daysRemaining} day${daysRemaining > 1 ? 's' : ''} remaining in sprint`,
      actionUrl: `/cto?tab=sprint`,
      metadata: { sprint_id: sprint.id },
    };

    await this.sendPortalNotification(notification);
  }

  // Notify about pending code reviews
  async notifyPendingReviews(count: number) {
    if (count === 0) return;
    
    const notification: CTONotification = {
      type: 'review',
      severity: count > 10 ? 'high' : 'medium',
      title: `${count} Pending Code Review${count > 1 ? 's' : ''}`,
      message: `You have ${count} code review${count > 1 ? 's' : ''} awaiting your attention`,
      actionUrl: `/cto?tab=code-review`,
      metadata: { review_count: count },
    };

    await this.sendPortalNotification(notification);
  }
}

export const ctoNotificationService = new CTONotificationService();













