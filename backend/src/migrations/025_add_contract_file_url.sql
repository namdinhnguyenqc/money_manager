-- Migration: Add file_url column to contracts table for storing Word/PDF contract files
-- Date: 2026-05-31

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS file_url TEXT;

COMMENT ON COLUMN public.contracts.file_url IS 'Word (.docx) or PDF contract file attachment URL';
