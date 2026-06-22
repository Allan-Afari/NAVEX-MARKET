-- Migration: add signature image url fields for e-signature storage
-- Adds nullable text columns to store a public URL for uploaded signature images

ALTER TABLE document_signatures
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

ALTER TABLE signature_signers
  ADD COLUMN IF NOT EXISTS signature_image_url TEXT;

CREATE INDEX IF NOT EXISTS idx_document_signatures_signature_image_url ON document_signatures(signature_image_url);
CREATE INDEX IF NOT EXISTS idx_signature_signers_signature_image_url ON signature_signers(signature_image_url);

-- Note: Signature images are stored in the Supabase Storage bucket named "signatures".
-- Create that bucket in the Supabase console or via the Management API.
