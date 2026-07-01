-- Migration 029: Create articles table for CMS
CREATE TABLE IF NOT EXISTS public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;

-- Create Policies for RLS
CREATE POLICY "Public can view published articles" ON public.articles
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admin can do everything on articles" ON public.articles
  FOR ALL TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() AND (users.role = 'ADMIN' OR users.role = 'SUPER_ADMIN')
    )
  );

-- Create index for search and sorting
CREATE INDEX IF NOT EXISTS idx_articles_status_created ON public.articles(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles(slug);
