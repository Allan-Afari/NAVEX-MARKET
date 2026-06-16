import { supabase } from "@/integrations/supabase/client";

export interface EmailNotificationPayload {
  to_email: string;
  subject: string;
  body_plain: string;
  body_html?: string;
  type: 'deal_interest' | 'message' | 'milestone' | 'agreement' | 'verification';
  related_id?: string;
  data?: Record<string, any>;
}

/**
 * Trigger an email notification via Supabase Edge Function
 * Note: Email queue is populated by database triggers for core events.
 * Use this for manual/custom notifications.
 */
export const sendEmailNotification = async (payload: EmailNotificationPayload) => {
  try {
    // Call edge function
    const { data, error } = await supabase.functions.invoke('send-email-notification', {
      body: payload,
    });

    if (error) {
      console.error('Email notification error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Failed to send email notification:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
};

/**
 * Check email queue status (for admin)
 */
export const getEmailQueueStatus = async () => {
  const { data, error } = await supabase
    .from('email_queue')
    .select('status, count', { count: 'exact' })
    .group_by('status');

  if (error) {
    console.error('Error fetching email queue:', error);
    return null;
  }

  return data;
};

/**
 * Retry failed email (for admin)
 */
export const retryFailedEmail = async (emailId: string) => {
  const { error } = await supabase
    .from('email_queue')
    .update({ status: 'pending', send_attempts: 0, last_error: null })
    .eq('id', emailId)
    .eq('status', 'failed');

  if (error) {
    console.error('Error retrying email:', error);
    return false;
  }

  return true;
};
