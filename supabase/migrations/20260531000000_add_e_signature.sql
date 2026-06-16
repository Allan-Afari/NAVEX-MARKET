-- E-Signature Feature Migration
-- Creates tables for document signing workflow

-- Create document_signatures table to track signature requests
CREATE TABLE IF NOT EXISTS document_signatures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES deal_room_documents(id) ON DELETE CASCADE,
  deal_room_id UUID NOT NULL REFERENCES deal_rooms(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  signature_type VARCHAR(50) DEFAULT 'electronic' CHECK (signature_type IN ('electronic', 'digital')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired', 'cancelled')),
  expires_at TIMESTAMP WITH TIME ZONE,
  signed_at TIMESTAMP WITH TIME ZONE,
  signature_data JSONB, -- Stores signature image, coordinates, etc.
  metadata JSONB DEFAULT '{}', -- Additional signing metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);
CREATE INDEX idx_document_signatures_deal_room_id ON document_signatures(deal_room_id);
CREATE INDEX idx_document_signatures_status ON document_signatures(status);
CREATE INDEX idx_document_signatures_requested_by ON document_signatures(requested_by);

ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;

-- Create signature_signers table for multi-party signing
CREATE TABLE IF NOT EXISTS signature_signers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_id UUID NOT NULL REFERENCES document_signatures(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(100), -- e.g., 'investor', 'founder', 'legal'
  order_index INTEGER DEFAULT 0, -- Signing order for sequential signing
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'bypassed')),
  signature_data JSONB, -- Individual signature data
  signed_at TIMESTAMP WITH TIME ZONE,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(signature_id, email)
);

CREATE INDEX idx_signature_signers_signature_id ON signature_signers(signature_id);
CREATE INDEX idx_signature_signers_user_id ON signature_signers(user_id);
CREATE INDEX idx_signature_signers_status ON signature_signers(status);
CREATE INDEX idx_signature_signers_order ON signature_signers(signature_id, order_index);

ALTER TABLE signature_signers ENABLE ROW LEVEL SECURITY;

-- Create signature_audit_log for compliance
CREATE TABLE IF NOT EXISTS signature_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  signature_id UUID NOT NULL REFERENCES document_signatures(id) ON DELETE CASCADE,
  signer_id UUID REFERENCES signature_signers(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'viewed', 'signed', 'declined', 'expired', 'reminded'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_signature_audit_log_signature_id ON signature_audit_log(signature_id);
CREATE INDEX idx_signature_audit_log_created_at ON signature_audit_log(created_at DESC);

ALTER TABLE signature_audit_log ENABLE ROW LEVEL SECURITY;

-- Add signature status to deal_room_documents
ALTER TABLE deal_room_documents ADD COLUMN IF NOT EXISTS signature_status VARCHAR(50)
  CHECK (signature_status IN ('none', 'pending', 'partially_signed', 'fully_signed', 'declined'));
ALTER TABLE deal_room_documents ADD COLUMN IF NOT EXISTS signature_id UUID REFERENCES document_signatures(id);

-- Create RLS policies for document_signatures
CREATE POLICY "Users can view signatures for their deal rooms"
  ON document_signatures FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM deal_room_participants
      WHERE deal_room_participants.deal_room_id = document_signatures.deal_room_id
      AND deal_room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create signatures in their deal rooms"
  ON document_signatures FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM deal_room_participants
      WHERE deal_room_participants.deal_room_id = document_signatures.deal_room_id
      AND deal_room_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update signatures they requested"
  ON document_signatures FOR UPDATE
  USING (requested_by = auth.uid());

-- Create RLS policies for signature_signers
CREATE POLICY "Users can view signers for accessible signatures"
  ON signature_signers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_signatures
      WHERE document_signatures.id = signature_signers.signature_id
      AND EXISTS (
        SELECT 1 FROM deal_room_participants
        WHERE deal_room_participants.deal_room_id = document_signatures.deal_room_id
        AND deal_room_participants.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own signer records"
  ON signature_signers FOR UPDATE
  USING (
    user_id = auth.uid() OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Create RLS policies for signature_audit_log
CREATE POLICY "Users can view audit logs for accessible signatures"
  ON signature_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document_signatures
      WHERE document_signatures.id = signature_audit_log.signature_id
      AND EXISTS (
        SELECT 1 FROM deal_room_participants
        WHERE deal_room_participants.deal_room_id = document_signatures.deal_room_id
        AND deal_room_participants.user_id = auth.uid()
      )
    )
  );

-- Create function to update document signature status
CREATE OR REPLACE FUNCTION update_document_signature_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update document signature status based on signers
  UPDATE deal_room_documents
  SET signature_status = (
    CASE
      WHEN (SELECT COUNT(*) FROM signature_signers WHERE signature_id = NEW.signature_id AND status = 'signed') = 0
        THEN 'pending'
      WHEN (SELECT COUNT(*) FROM signature_signers WHERE signature_id = NEW.signature_id AND status = 'signed') = 
           (SELECT COUNT(*) FROM signature_signers WHERE signature_id = NEW.signature_id)
        THEN 'fully_signed'
      ELSE 'partially_signed'
    END
  ),
  signature_id = NEW.signature_id
  WHERE id = (SELECT document_id FROM document_signatures WHERE id = NEW.signature_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update document status when signer status changes
CREATE TRIGGER trigger_update_document_signature_status
AFTER UPDATE OF status ON signature_signers
FOR EACH ROW
EXECUTE FUNCTION update_document_signature_status();

-- Create function to expire pending signatures
CREATE OR REPLACE FUNCTION expire_pending_signatures()
RETURNS void AS $$
BEGIN
  UPDATE document_signatures
  SET status = 'expired',
      updated_at = now()
  WHERE status = 'pending'
  AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Create index for performance
CREATE INDEX idx_deal_room_documents_signature_status ON deal_room_documents(signature_status);
