import { supabase } from "@/integrations/supabase/client";

export interface DocumentSignature {
  id: string;
  document_id: string;
  deal_room_id: string;
  requested_by: string;
  signature_type: 'electronic' | 'digital';
  status: 'pending' | 'signed' | 'declined' | 'expired' | 'cancelled';
  expires_at?: string;
  signed_at?: string;
  signature_data?: any;
  metadata?: any;
  created_at: string;
  updated_at: string;
}

export interface SignatureSigner {
  id: string;
  signature_id: string;
  user_id?: string;
  email: string;
  name?: string;
  role?: string;
  order_index: number;
  status: 'pending' | 'signed' | 'declined' | 'bypassed';
  signature_data?: any;
  signed_at?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface SignatureAuditLog {
  id: string;
  signature_id: string;
  signer_id?: string;
  action: string;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: string;
}

export interface CreateSignatureRequest {
  document_id: string;
  deal_room_id: string;
  signature_type?: 'electronic' | 'digital';
  signers: Array<{
    email: string;
    name?: string;
    role?: string;
    order_index?: number;
  }>;
  expires_in_days?: number;
  metadata?: any;
}

/**
 * Create a new signature request for a document
 */
const mapSignerEmailsToUserIds = async (emails: string[]) => {
  if (emails.length === 0) return new Map<string, string>();

  const { data, error } = await supabase
    .from("auth.users")
    .select("id,email")
    .in("email", emails)
    .limit(100);

  if (error) {
    console.warn("Unable to resolve signer user ids by email:", error);
    return new Map<string, string>();
  }

  return new Map<string, string>(
    (data || []).map((user: any) => [user.email.toLowerCase(), user.id])
  );
};

export const createSignatureRequest = async (
  request: CreateSignatureRequest,
  userId: string
): Promise<DocumentSignature | null> => {
  try {
    const validSigners = request.signers.filter((signer) => signer.email.trim() !== "");
    const signerEmails = Array.from(
      new Set(validSigners.map((signer) => signer.email.trim().toLowerCase()))
    );
    const emailToUserId = await mapSignerEmailsToUserIds(signerEmails);

    // Calculate expiration date
    const expiresAt = request.expires_in_days
      ? new Date(Date.now() + request.expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // Default 30 days

    // Create signature record
    const { data: signature, error: signatureError } = await supabase
      .from("document_signatures")
      .insert({
        document_id: request.document_id,
        deal_room_id: request.deal_room_id,
        requested_by: userId,
        signature_type: request.signature_type || 'electronic',
        status: 'pending',
        expires_at: expiresAt,
        metadata: request.metadata || {},
      })
      .select()
      .single();

    if (signatureError) throw signatureError;

    // Create signer records
    const signers = validSigners.map((signer, index) => ({
      signature_id: signature.id,
      user_id: emailToUserId.get(signer.email.trim().toLowerCase()) || null,
      email: signer.email.trim(),
      name: signer.name,
      role: signer.role,
      order_index: signer.order_index ?? index,
      status: 'pending',
    }));

    const { error: signersError } = await supabase
      .from("signature_signers")
      .insert(signers);

    if (signersError) throw signersError;

    // Log the creation
    await logSignatureAudit(signature.id, null, 'created', userId, {
      signers: signers.map((signer) => ({ email: signer.email, role: signer.role })),
    });

    return signature;
  } catch (error) {
    console.error("Error creating signature request:", error);
    return null;
  }
};

/**
 * Get signature request by ID
 */
export const getSignatureRequest = async (
  signatureId: string
): Promise<DocumentSignature | null> => {
  try {
    const { data, error } = await supabase
      .from("document_signatures")
      .select("*")
      .eq("id", signatureId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error fetching signature request:", error);
    return null;
  }
};

/**
 * Get all signers for a signature request
 */
export const getSignatureSigners = async (
  signatureId: string
): Promise<SignatureSigner[]> => {
  try {
    const { data, error } = await supabase
      .from("signature_signers")
      .select("*")
      .eq("signature_id", signatureId)
      .order("order_index", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching signature signers:", error);
    return [];
  }
};

/**
 * Get signature request with signers
 */
export const getSignatureRequestWithSigners = async (
  signatureId: string
): Promise<{ signature: DocumentSignature; signers: SignatureSigner[] } | null> => {
  try {
    const [signature, signers] = await Promise.all([
      getSignatureRequest(signatureId),
      getSignatureSigners(signatureId),
    ]);

    if (!signature) return null;

    return { signature, signers };
  } catch (error) {
    console.error("Error fetching signature request with signers:", error);
    return null;
  }
};

/**
 * Sign a document (for a specific signer)
 */
export const signDocument = async (
  signerId: string,
  signatureData: any,
  userId: string
): Promise<boolean> => {
  try {
    // Get signer info
    const { data: signer } = await supabase
      .from("signature_signers")
      .select("*, signature_id")
      .eq("id", signerId)
      .single();

    if (!signer) throw new Error("Signer not found");

    // Update signer status
    const { error: updateError } = await supabase
      .from("signature_signers")
      .update({
        status: 'signed',
        // store minimal signature evidence on signer record; if image upload succeeds
        // we'll replace this with a URL below
        signature_data: signatureData,
        signed_at: new Date().toISOString(),
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
      })
      .eq("id", signerId);

    if (updateError) throw updateError;

    // Log the signing
    await logSignatureAudit(signer.signature_id, signerId, 'signed', userId, {
      signatureProvided: Boolean(signatureData),
    });

    // If the client provided a data URL for the signature image, upload it to storage
    let uploadedPath: string | null = null;
    try {
      if (typeof signatureData === 'string' && signatureData.startsWith('data:')) {
        const blob = await (await fetch(signatureData)).blob();
        const ext = blob.type?.split('/')?.[1] || 'png';
        const filePath = `${signer.signature_id}/${signerId}_${Date.now()}.${ext}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('signatures')
          .upload(filePath, blob, { contentType: blob.type, upsert: false });

        if (!uploadError && uploadData?.path) {
          uploadedPath = uploadData.path;

          // update signer record to store the storage path (not public URL)
          await supabase.from('signature_signers').update({
            signature_image_url: uploadedPath,
            signature_data: { content_type: blob.type },
          }).eq('id', signerId);
        } else {
          console.warn('Signature image upload failed', uploadError);
        }
      }
    } catch (err) {
      console.warn('Error uploading signature image:', err);
    }

    // Check if all signers have signed
    const { data: allSigners } = await supabase
      .from("signature_signers")
      .select("status")
      .eq("signature_id", signer.signature_id);

    const allSigned = allSigners?.every((s) => s.status === 'signed');

    // Update signature status if all signed
    if (allSigned) {
      const finalSignatureObj: any = {
        completed_at: new Date().toISOString(),
        completed_by: userId,
        signature_type: 'electronic',
        final_signature: uploadedPath || signatureData,
      };

      await supabase
        .from("document_signatures")
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          signature_data: finalSignatureObj,
        })
        .eq("id", signer.signature_id);
    }

    return true;
  } catch (error) {
    console.error("Error signing document:", error);
    return false;
  }
};

/**
 * Decline to sign a document
 */
export const declineSignature = async (
  signerId: string,
  reason?: string,
  userId: string
): Promise<boolean> => {
  try {
    // Get signer info
    const { data: signer } = await supabase
      .from("signature_signers")
      .select("signature_id")
      .eq("id", signerId)
      .single();

    if (!signer) throw new Error("Signer not found");

    // Update signer status
    const { error } = await supabase
      .from("signature_signers")
      .update({
        status: 'declined',
        signature_data: { reason },
        signed_at: new Date().toISOString(),
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent,
      })
      .eq("id", signerId);

    if (error) throw error;

    // Update signature status
    await supabase
      .from("document_signatures")
      .update({
        status: 'declined',
      })
      .eq("id", signer.signature_id);

    // Log the decline
    await logSignatureAudit(signer.signature_id, signerId, 'declined', userId, { reason });

    return true;
  } catch (error) {
    console.error("Error declining signature:", error);
    return false;
  }
};

/**
 * Cancel a signature request
 */
export const cancelSignatureRequest = async (
  signatureId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("document_signatures")
      .update({
        status: 'cancelled',
      })
      .eq("id", signatureId)
      .eq("requested_by", userId);

    if (error) throw error;

    // Log the cancellation
    await logSignatureAudit(signatureId, null, 'cancelled', userId);

    return true;
  } catch (error) {
    console.error("Error cancelling signature request:", error);
    return false;
  }
};

/**
 * Get signature audit log
 */
export const getSignatureAuditLog = async (
  signatureId: string
): Promise<SignatureAuditLog[]> => {
  try {
    const { data, error } = await supabase
      .from("signature_audit_log")
      .select("*")
      .eq("signature_id", signatureId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching audit log:", error);
    return [];
  }
};

/**
 * Log signature audit event
 */
const logSignatureAudit = async (
  signatureId: string,
  signerId: string | null,
  action: string,
  userId: string,
  metadata?: any
): Promise<void> => {
  try {
    await supabase.from("signature_audit_log").insert({
      signature_id: signatureId,
      signer_id: signerId,
      action,
      user_id: userId,
      ip_address: await getClientIP(),
      user_agent: navigator.userAgent,
      metadata: metadata || {},
    });
  } catch (error) {
    console.error("Error logging signature audit:", error);
  }
};

/**
 * Get client IP address (simplified - in production use proper IP detection)
 */
const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data?.ip || "0.0.0.0";
  } catch (error) {
    console.warn("Unable to resolve client IP address:", error);
    return "0.0.0.0";
  }
};

/**
 * Check if a user can sign a document
 */
export const canUserSign = async (
  signatureId: string,
  userId: string
): Promise<{ canSign: boolean; signer?: SignatureSigner }> => {
  try {
    // Get signature request
    const signature = await getSignatureRequest(signatureId);
    if (!signature || signature.status !== 'pending') {
      return { canSign: false };
    }

    // Get signers
    const signers = await getSignatureSigners(signatureId);

    const currentUser = await supabase.auth.getUser();
    const currentEmail = currentUser.data.user?.email?.toLowerCase();

    // Find if user is a signer by user ID or email
    const userSigner = signers.find(
      (s) => s.user_id === userId || (currentEmail && s.email.toLowerCase() === currentEmail)
    );

    if (!userSigner) {
      return { canSign: false };
    }

    // Check if signer's turn (sequential signing)
    if (userSigner.order_index > 0) {
      const previousSigner = signers.find((s) => s.order_index === userSigner.order_index - 1);
      if (previousSigner && previousSigner.status !== 'signed') {
        return { canSign: false, signer: userSigner };
      }
    }

    return { canSign: userSigner.status === 'pending', signer: userSigner };
  } catch (error) {
    console.error("Error checking if user can sign:", error);
    return { canSign: false };
  }
};

/**
 * Get pending signatures for a user
 */
export const getPendingSignaturesForUser = async (
  userId: string
): Promise<{ signature: DocumentSignature; signers: SignatureSigner[]; userSigner: SignatureSigner }[]> => {
  try {
    const { data: signers } = await supabase
      .from("signature_signers")
      .select("*, signature_id, document_signatures(*), deal_room_documents(*)")
      .eq("user_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!signers) return [];

    const results = await Promise.all(
      signers.map(async (signer: any) => {
        const signature = signer.document_signatures;
        const allSigners = await getSignatureSigners(signature.id);
        return {
          signature,
          signers: allSigners,
          userSigner: signer,
        };
      })
    );

    return results;
  } catch (error) {
    console.error("Error fetching pending signatures:", error);
    return [];
  }
};

/**
 * Remind signer to sign
 */
export const remindSigner = async (
  signerId: string,
  userId: string
): Promise<boolean> => {
  try {
    const { data: signer } = await supabase
      .from("signature_signers")
      .select("signature_id, email, name")
      .eq("id", signerId)
      .single();

    if (!signer) throw new Error("Signer not found");

    // Log the reminder
    await logSignatureAudit(signer.signature_id, signerId, 'reminded', userId);

    // In a real implementation, send email notification here
    console.log(`Reminder sent to ${signer.email}`);

    return true;
  } catch (error) {
    console.error("Error reminding signer:", error);
    return false;
  }
};

/**
 * Expire pending signatures (run periodically)
 */
export const expirePendingSignatures = async (): Promise<number> => {
  try {
    const { data } = await supabase.rpc('expire_pending_signatures');
    return data || 0;
  } catch (error) {
    console.error("Error expiring pending signatures:", error);
    return 0;
  }
};

/**
 * Get a signed URL for a signature image stored in the `signatures` bucket.
 * Returns null when not available.
 */
export const getSignatureImageSignedUrl = async (
  storagePath: string | null,
  expiresInSec = 300
): Promise<string | null> => {
  if (!storagePath) return null;
  try {
    const { data, error } = await supabase.storage
      .from('signatures')
      .createSignedUrl(storagePath, expiresInSec);
    if (error) {
      console.warn('Failed to create signed URL for signature image', error);
      return null;
    }
    return data?.signedUrl || null;
  } catch (err) {
    console.warn('Error creating signed URL for signature image', err);
    return null;
  }
};
