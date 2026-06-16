/**
 * Email Event Triggers
 * Handles event-driven email notifications for all critical business actions
 * Integrates with emailNotifications.ts for actual sending
 */

import { supabase } from "@/integrations/supabase/client";
import { sendEmailNotification } from "./emailNotifications";

export interface EmailEvent {
  type: string;
  recipientId: string;
  recipientEmail: string;
  subject: string;
  data: Record<string, any>;
}

/**
 * Send email when a deal room invitation is received
 */
export const sendDealRoomInvitationEmail = async (
  recipientEmail: string,
  dealRoomTitle: string,
  dealRoomId: string,
  invitedByName: string
) => {
  try {
    const unsubscribeLink = `${window.location.origin}/preferences`;
    
    await sendEmailNotification({
      to_email: recipientEmail,
      subject: `You're invited to: ${dealRoomTitle}`,
      body_plain: `${invitedByName} invited you to join the deal room ${dealRoomTitle}. View it here: ${window.location.origin}/deal-room/${dealRoomId}`,
      body_html: `
        <h2>Deal Room Invitation</h2>
        <p>Hi there,</p>
        <p><strong>${invitedByName}</strong> has invited you to join the deal room:</p>
        <h3>${dealRoomTitle}</h3>
        <p>
          <a href="${window.location.origin}/deal-room/${dealRoomId}" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            View Deal Room
          </a>
        </p>
        <p>
          <a href="${unsubscribeLink}" style="color: #666; font-size: 12px;">Manage email preferences</a>
        </p>
      `,
      type: "message",
      related_id: dealRoomId,
      data: { dealRoomTitle, invitedByName },
    });

    // Log event
    console.log(`[EMAIL] Deal room invitation sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send deal room invitation email:", error);
  }
};

/**
 * Send email when a document is uploaded to a deal room
 */
export const sendDocumentUploadEmail = async (
  participantEmails: string[],
  dealRoomTitle: string,
  documentName: string,
  uploadedByName: string,
  dealRoomId: string
) => {
  try {
    const subject = `New document in ${dealRoomTitle}: ${documentName}`;
    
    const emailPromises = participantEmails.map((email) =>
      sendEmailNotification({
        to_email: email,
        subject,
        body_plain: `${uploadedByName} uploaded a new document to ${dealRoomTitle}: ${documentName}. View it here: ${window.location.origin}/deal-room/${dealRoomId}`,
        body_html: `
          <h2>Document Uploaded</h2>
          <p>Hi there,</p>
          <p><strong>${uploadedByName}</strong> uploaded a new document to <strong>${dealRoomTitle}</strong>:</p>
          <h3>${documentName}</h3>
          <p>
            <a href="${window.location.origin}/deal-room/${dealRoomId}" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
              View Document
            </a>
          </p>
        `,
        type: "message",
        related_id: dealRoomId,
        data: { documentName, uploadedByName },
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const failedCount = results.filter((result) => result.status === "rejected").length;
    if (failedCount > 0) {
      console.warn(`Document upload notification failed for ${failedCount} of ${participantEmails.length} recipients`);
    }
    console.log(`[EMAIL] Document upload notification sent to ${participantEmails.length - failedCount} users`);
  } catch (error) {
    console.error("Failed to send document upload email:", error);
  }
};

/**
 * Send email when negotiation terms are proposed
 */
export const sendNegotiationTermEmail = async (
  recipientEmail: string,
  dealRoomTitle: string,
  termTitle: string,
  proposedByName: string,
  dealRoomId: string
) => {
  try {
    await sendEmailNotification({
      to_email: recipientEmail,
      subject: `New term proposed in ${dealRoomTitle}`,
      body_plain: `${proposedByName} proposed a new negotiation term in ${dealRoomTitle}: ${termTitle}. Review it here: ${window.location.origin}/deal-room/${dealRoomId}`,
      body_html: `
        <h2>Negotiation Term Proposed</h2>
        <p>Hi there,</p>
        <p><strong>${proposedByName}</strong> proposed a new term in <strong>${dealRoomTitle}</strong>:</p>
        <h3>${termTitle}</h3>
        <p>Review and respond to the proposal:</p>
        <p>
          <a href="${window.location.origin}/deal-room/${dealRoomId}" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            Review Terms
          </a>
        </p>
      `,
      type: "message",
      related_id: dealRoomId,
      data: { termTitle, proposedByName },
    });

    console.log(`[EMAIL] Negotiation term notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send negotiation term email:", error);
  }
};

/**
 * Send email when a dispute is initiated
 */
export const sendDisputeInitiatedEmail = async (
  recipientEmail: string,
  dealRoomTitle: string,
  disputeReason: string,
  initiatedByName: string,
  dealRoomId: string
) => {
  try {
    await sendEmailNotification({
      to_email: recipientEmail,
      subject: `Dispute initiated in ${dealRoomTitle}`,
      body_plain: `${initiatedByName} initiated a dispute in ${dealRoomTitle}. Reason: ${disputeReason}. Review: ${window.location.origin}/deal-room/${dealRoomId}`,
      body_html: `
        <h2>Dispute Initiated</h2>
        <p>Hi there,</p>
        <p><strong>${initiatedByName}</strong> has initiated a dispute in <strong>${dealRoomTitle}</strong>.</p>
        <h3>Reason: ${disputeReason}</h3>
        <p>Please review the details and respond if needed:</p>
        <p>
          <a href="${window.location.origin}/deal-room/${dealRoomId}" style="background: #ff6b6b; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            View Dispute
          </a>
        </p>
      `,
      type: "message",
      related_id: dealRoomId,
      data: { disputeReason, initiatedByName },
    });

    console.log(`[EMAIL] Dispute initiated notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send dispute email:", error);
  }
};

/**
 * Send email when compliance flag is raised
 */
export const sendComplianceFlagEmail = async (
  adminEmail: string,
  userName: string,
  dealRoomTitle: string,
  riskScore: number,
  flagReasons: string[]
) => {
  try {
    await sendEmailNotification({
      to_email: adminEmail,
      subject: `⚠️ Compliance flag: ${userName} (Risk: ${riskScore}/100)`,
      body_plain: `A new compliance flag has been raised for ${userName} in ${dealRoomTitle}. Risk Score: ${riskScore}/100. Reasons: ${flagReasons.join(", ")}`,
      body_html: `
        <h2>Compliance Flag Alert</h2>
        <p>A new compliance flag has been raised that requires review.</p>
        <p><strong>User:</strong> ${userName}</p>
        <p><strong>Deal Room:</strong> ${dealRoomTitle}</p>
        <p><strong>Risk Score:</strong> ${riskScore}/100</p>
        <h3>Reasons:</h3>
        <ul>
          ${flagReasons.map((reason) => `<li>${reason}</li>`).join('')}
        </ul>
        <p>
          <a href="${window.location.origin}/admin" style="background: #ff6b6b; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            Review in Admin Panel
          </a>
        </p>
      `,
      type: "message",
      related_id: dealRoomTitle,
      data: { riskScore, flagReasons },
    });

    console.log(`[EMAIL] Compliance flag notification sent to ${adminEmail}`);
  } catch (error) {
    console.error("Failed to send compliance flag email:", error);
  }
};

/**
 * Send email when agreement is ready for signature
 */
export const sendAgreementReadyEmail = async (
  recipientEmail: string,
  agreementTitle: string,
  senderName: string,
  agreementId: string
) => {
  try {
    await sendEmailNotification({
      to_email: recipientEmail,
      subject: `Agreement ready for signature: ${agreementTitle}`,
      body_plain: `${senderName} sent you an agreement titled ${agreementTitle}. Review and sign: ${window.location.origin}/agreements/${agreementId}`,
      body_html: `
        <h2>Agreement Ready for Signature</h2>
        <p>Hi there,</p>
        <p><strong>${senderName}</strong> sent you an agreement to review and sign:</p>
        <h3>${agreementTitle}</h3>
        <p>
          <a href="${window.location.origin}/agreements/${agreementId}" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            Review & Sign Agreement
          </a>
        </p>
      `,
      type: "agreement",
      related_id: agreementId,
      data: { agreementTitle, senderName },
    });

    console.log(`[EMAIL] Agreement ready notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send agreement email:", error);
  }
};

/**
 * Send email when deal is featured/promoted
 */
export const sendDealPromotionEmail = async (
  recipientEmail: string,
  dealTitle: string,
  dealId: string
) => {
  try {
    await sendEmailNotification({
      to_email: recipientEmail,
      subject: `Your deal is now featured: ${dealTitle}`,
      body_plain: `Your deal ${dealTitle} is now featured on Navex Market. View it here: ${window.location.origin}/marketplace/${dealId}`,
      body_html: `
        <h2>Deal Featured on Marketplace</h2>
        <p>Congratulations!</p>
        <p>Your deal <strong>${dealTitle}</strong> is now featured on the Navex Market marketplace, gaining increased visibility.</p>
        <p>
          <a href="${window.location.origin}/marketplace/${dealId}" style="background: #22c55e; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            View Featured Deal
          </a>
        </p>
      `,
      type: "deal_interest",
      related_id: dealId,
      data: { dealTitle },
    });

    console.log(`[EMAIL] Deal promotion notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send deal promotion email:", error);
  }
};

/**
 * Send digest email with weekly activity summary
 */
export const sendActivityDigestEmail = async (
  recipientEmail: string,
  userName: string,
  activitySummary: {
    newDeals: number;
    invitations: number;
    documentUploads: number;
    termsProposed: number;
  }
) => {
  try {
    await sendEmailNotification({
      to: recipientEmail,
      subject: `Your Navex Market weekly summary`,
      html: `
        <h2>Weekly Activity Summary</h2>
        <p>Hi ${userName},</p>
        <p>Here's what happened on Navex Market this week:</p>
        <ul>
          <li><strong>${activitySummary.newDeals}</strong> new deals in your interests</li>
          <li><strong>${activitySummary.invitations}</strong> new deal room invitations</li>
          <li><strong>${activitySummary.documentUploads}</strong> documents uploaded to your rooms</li>
          <li><strong>${activitySummary.termsProposed}</strong> negotiation terms awaiting response</li>
        </ul>
        <p>
          <a href="${window.location.origin}/dashboard" style="background: #0066cc; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            View Dashboard
          </a>
        </p>
      `,
    });

    console.log(`[EMAIL] Activity digest sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send activity digest:", error);
  }
};

/**
 * Send email for user verification completion
 */
export const sendVerificationCompleteEmail = async (
  recipientEmail: string,
  userName: string
) => {
  try {
    await sendEmailNotification({
      to: recipientEmail,
      subject: `Your Navex Market verification is complete`,
      html: `
        <h2>Verification Complete ✓</h2>
        <p>Hi ${userName},</p>
        <p>Your identity verification on Navex Market has been completed successfully. Your account now has a verified badge, which will help build trust with other users.</p>
        <p>
          <a href="${window.location.origin}/profile" style="background: #22c55e; color: white; padding: 10px 20px; border-radius: 5px; text-decoration: none; display: inline-block;">
            View Your Profile
          </a>
        </p>
      `,
    });

    console.log(`[EMAIL] Verification complete notification sent to ${recipientEmail}`);
  } catch (error) {
    console.error("Failed to send verification complete email:", error);
  }
};
