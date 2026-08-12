-- Content pipeline for Sư Tử Xanh / Chelsea fan media.
-- Draft-first by design: sources are collected and articles are reviewed before
-- they can be published or sent to a social platform.

CREATE TABLE IF NOT EXISTS public.content_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('official', 'reporter', 'publisher', 'community')),
  url TEXT NOT NULL,
  feed_url TEXT,
  trust_level SMALLINT NOT NULL DEFAULT 1 CHECK (trust_level BETWEEN 1 AND 3),
  usage_policy TEXT NOT NULL DEFAULT 'lead_only'
    CHECK (usage_policy IN ('facts_only', 'link_and_paraphrase', 'lead_only', 'licensed')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.content_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.content_sources(id) ON DELETE CASCADE,
  external_id TEXT,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'news'
    CHECK (content_type IN ('news', 'transfer', 'injury', 'match', 'academy', 'retro', 'opinion')),
  published_at TIMESTAMPTZ,
  summary TEXT,
  content_hash TEXT,
  raw_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_id, url)
);

CREATE INDEX IF NOT EXISTS idx_content_items_source_published
  ON public.content_items(source_id, published_at DESC);

CREATE TABLE IF NOT EXISTS public.article_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  excerpt TEXT,
  body_markdown TEXT NOT NULL,
  article_type TEXT NOT NULL
    CHECK (article_type IN ('post_match', 'transfer', 'injury', 'academy', 'retro', 'opinion')),
  confidence TEXT NOT NULL DEFAULT 'reported'
    CHECK (confidence IN ('confirmed', 'reported', 'rumor')),
  status TEXT NOT NULL DEFAULT 'review'
    CHECK (status IN ('generated', 'review', 'approved', 'rejected', 'published')),
  ai_model TEXT,
  ai_prompt_version TEXT,
  fact_check_notes TEXT,
  reviewer_notes TEXT,
  published_article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_article_drafts_status_created
  ON public.article_drafts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.article_draft_sources (
  draft_id UUID NOT NULL REFERENCES public.article_drafts(id) ON DELETE CASCADE,
  content_item_id UUID REFERENCES public.content_items(id) ON DELETE SET NULL,
  source_url TEXT NOT NULL,
  source_role TEXT NOT NULL DEFAULT 'supporting'
    CHECK (source_role IN ('primary', 'supporting', 'context')),
  PRIMARY KEY (draft_id, source_url)
);

CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.article_drafts(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'audio')),
  url TEXT NOT NULL,
  license_type TEXT NOT NULL
    CHECK (license_type IN ('owned', 'licensed', 'generated', 'official_embed', 'unknown')),
  attribution TEXT,
  usage_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (usage_status IN ('pending', 'approved', 'rejected')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id UUID NOT NULL REFERENCES public.article_drafts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('website', 'youtube', 'facebook', 'tiktok', 'telegram', 'x')),
  body TEXT NOT NULL,
  media_asset_id UUID REFERENCES public.media_assets(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'approved', 'published', 'failed', 'cancelled')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  external_post_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (draft_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_social_posts_queue
  ON public.social_posts(status, scheduled_at);

-- These tables contain editorial workflow and source metadata. They are not
-- public API tables. The backend uses the service role, while admin users get
-- access through the existing users.role contract.
ALTER TABLE public.content_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_draft_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_sources' AND policyname = 'Admin all content sources') THEN
    CREATE POLICY "Admin all content sources" ON public.content_sources
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'content_items' AND policyname = 'Admin all content items') THEN
    CREATE POLICY "Admin all content items" ON public.content_items
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'article_drafts' AND policyname = 'Admin all article drafts') THEN
    CREATE POLICY "Admin all article drafts" ON public.article_drafts
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'article_draft_sources' AND policyname = 'Admin all article draft sources') THEN
    CREATE POLICY "Admin all article draft sources" ON public.article_draft_sources
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'media_assets' AND policyname = 'Admin all media assets') THEN
    CREATE POLICY "Admin all media assets" ON public.media_assets
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'social_posts' AND policyname = 'Admin all social posts') THEN
    CREATE POLICY "Admin all social posts" ON public.social_posts
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN', 'SUPER_ADMIN')));
  END IF;
END $$;
