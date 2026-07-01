-- Migration 030: News CMS SEO expansion
-- Date: 2026-07-01
-- Adds SEO fields to articles + categories/authors/tags tables for a full news platform.
-- Order matters: create referenced tables (categories, authors) BEFORE altering articles.

-- ────────────────────────────────────────────────────────────
-- 1. New tables
-- ────────────────────────────────────────────────────────────

-- Article categories (danh mục)
CREATE TABLE IF NOT EXISTS public.article_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(120) NOT NULL,
  slug             VARCHAR(120) UNIQUE NOT NULL,
  description      TEXT,
  meta_title       TEXT,
  meta_description TEXT,
  image_url        TEXT,
  sort_order       INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Article authors (tác giả — E-E-A-T)
CREATE TABLE IF NOT EXISTS public.article_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name         VARCHAR(120) NOT NULL,
  slug         VARCHAR(120) UNIQUE NOT NULL,
  avatar_url   TEXT,
  title        VARCHAR(160),        -- "Luật sư", "Chuyên gia BĐS"
  bio          TEXT,
  social_links JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tags
CREATE TABLE IF NOT EXISTS public.article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Article ↔ Tag (many-to-many)
CREATE TABLE IF NOT EXISTS public.article_tag_map (
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES public.article_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

-- ────────────────────────────────────────────────────────────
-- 2. Extend articles with SEO + editorial fields
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS seo_title        TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT,
  ADD COLUMN IF NOT EXISTS focus_keyword    TEXT,
  ADD COLUMN IF NOT EXISTS canonical_url    TEXT,
  ADD COLUMN IF NOT EXISTS og_image_url     TEXT,
  ADD COLUMN IF NOT EXISTS schema_type      VARCHAR(20) DEFAULT 'Article',
  ADD COLUMN IF NOT EXISTS no_index         BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS excerpt          TEXT,
  ADD COLUMN IF NOT EXISTS reading_time     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS faq              JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS author_id        UUID REFERENCES public.article_authors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id      UUID REFERENCES public.article_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_featured      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order       INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMPTZ;

-- schema_type allowed values
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_schema_type_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_schema_type_check
  CHECK (schema_type IN ('Article','NewsArticle','HowTo','FAQPage'));

-- Expand status: draft / scheduled / published / archived
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft','scheduled','published','archived'));

-- Backfill published_at for already-published rows
UPDATE public.articles
   SET published_at = COALESCE(published_at, created_at)
 WHERE status = 'published' AND published_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- 3. Indexes
-- ────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_articles_featured ON public.articles(is_featured, sort_order)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_author ON public.articles(author_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_article_categories_slug ON public.article_categories(slug);
CREATE INDEX IF NOT EXISTS idx_article_authors_slug ON public.article_authors(slug);
CREATE INDEX IF NOT EXISTS idx_article_tags_slug ON public.article_tags(slug);
CREATE INDEX IF NOT EXISTS idx_article_tag_map_tag ON public.article_tag_map(tag_id);

-- ────────────────────────────────────────────────────────────
-- 4. RLS policies (public read, admin all)
-- ────────────────────────────────────────────────────────────

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_authors    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tags       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_tag_map    ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Categories
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_categories' AND policyname='Public read active categories') THEN
    CREATE POLICY "Public read active categories" ON public.article_categories FOR SELECT USING (is_active = true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_categories' AND policyname='Admin all categories') THEN
    CREATE POLICY "Admin all categories" ON public.article_categories FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN','SUPER_ADMIN'))
    );
  END IF;
  -- Authors
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_authors' AND policyname='Public read authors') THEN
    CREATE POLICY "Public read authors" ON public.article_authors FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_authors' AND policyname='Admin all authors') THEN
    CREATE POLICY "Admin all authors" ON public.article_authors FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN','SUPER_ADMIN'))
    );
  END IF;
  -- Tags
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_tags' AND policyname='Public read tags') THEN
    CREATE POLICY "Public read tags" ON public.article_tags FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_tags' AND policyname='Admin all tags') THEN
    CREATE POLICY "Admin all tags" ON public.article_tags FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN','SUPER_ADMIN'))
    );
  END IF;
  -- Tag map
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_tag_map' AND policyname='Public read tag map') THEN
    CREATE POLICY "Public read tag map" ON public.article_tag_map FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='article_tag_map' AND policyname='Admin all tag map') THEN
    CREATE POLICY "Admin all tag map" ON public.article_tag_map FOR ALL TO authenticated USING (
      EXISTS (SELECT 1 FROM public.users WHERE users.id = auth.uid() AND users.role IN ('ADMIN','SUPER_ADMIN'))
    );
  END IF;
END $$;

-- ────────────────────────────────────────────────────────────
-- 5. No seed data. Categories, tags and authors are created via the
--    Admin CRUD UI (Admin → Danh mục & Tác giả) in a later phase.
--    This migration only creates the schema/relations — no hardcoded rows.
-- ────────────────────────────────────────────────────────────

-- Once real categories are created via CRUD with names matching the legacy
-- articles.category text values, this mapping can be re-run to link them:
--   UPDATE public.articles a SET category_id = c.id
--     FROM public.article_categories c
--    WHERE a.category_id IS NULL AND a.category = c.name;
