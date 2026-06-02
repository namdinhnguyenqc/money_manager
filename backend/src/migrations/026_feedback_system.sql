-- Migration: Feedback & Bug Report System tables
-- Date: 2026-06-02

CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  type TEXT NOT NULL, -- 'bug', 'suggestion', 'support'
  category TEXT, -- 'ui', 'function', 'data', 'payment', 'invoice', 'other'
  priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  status TEXT NOT NULL DEFAULT 'new', -- 'new', 'in_progress', 'resolved', 'reopened', 'closed'
  related_screen TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ NULL,
  closed_at TIMESTAMPTZ NULL
);

CREATE TABLE IF NOT EXISTS public.feedback_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'owner', 'admin'
  message TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL, -- Data URI or external URL
  file_name TEXT,
  file_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_status_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.feedback_reports(id) ON DELETE CASCADE,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add useful indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_reports_reporter ON public.feedback_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_status ON public.feedback_reports(status);
CREATE INDEX IF NOT EXISTS idx_feedback_comments_report ON public.feedback_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_feedback_attachments_report ON public.feedback_attachments(report_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status_logs_report ON public.feedback_status_logs(report_id);
