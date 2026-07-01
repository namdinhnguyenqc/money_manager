# TrọCare News CMS — SEO Platform Spec (BA Master Doc)

> **Mục tiêu**: Xây trang tin tức/luật/thông báo dạng "báo điện tử chuyên ngành nhà trọ" (như VNExpress thu nhỏ) — đẩy nội dung lên **Top 10 Google** và được **AI (SGE / ChatGPT / Gemini / Perplexity)** trích dẫn.
>
> **Phạm vi**: Public frontend (trang đọc) + Admin CMS (quản lý) + Backend API + DB migration + SEO technical.
>
> **Status**: `DEFINED` — sẵn sàng cho dev. Author: BA. Ngày: 2026-07-01.

---

## 0. Hiện trạng (Baseline đã có)

| Thành phần | Trạng thái hiện tại | Ghi chú |
|---|---|---|
| Bảng `articles` | ✅ Có (migration `029`) | Tối giản: title, slug, category, description, content, image_url, status, views |
| API `/public/articles` | ✅ Có | List + detail theo slug + auto-increment views |
| API `/admin/articles` | ✅ Có | CRUD đầy đủ, đã bảo vệ `requireAuth + requireAdmin` |
| Admin CMS `/admin/articles` | ✅ Có | Textarea HTML thô + bảng quản lý |
| Landing `/` (section Tin tức) | ✅ Có | Hiển thị 4 bài, mở bằng **modal** (không có URL riêng) |
| Storage pattern | ✅ Có | `supabaseAdmin.storage.from("feedback-attachments")` — tái dụng cho ảnh bài |
| Sitemap | ⚠️ Tĩnh | Chỉ 4 URL cứng, chưa có bài viết |

**3 điểm chí mạng khiến hiện tại KHÔNG rank được:**
1. Bài viết mở bằng **modal** → không có URL → Google không index được → **không bao giờ rank**.
2. Không có **Schema JSON-LD** → không có rich snippet, AI không hiểu cấu trúc.
3. Không có **meta title/description riêng, sitemap động, tác giả (E-E-A-T)**.

---

## 1. Kiến trúc thông tin (IA) & Routes

### 1.1 Public routes (Next.js App Router — `web-admin/src/app/`)

| Route | File | Rendering | Mục đích SEO |
|---|---|---|---|
| `/tin-tuc` | `tin-tuc/page.tsx` | ISR (revalidate 60s) | Trang chủ tin tức: hero + grid + trending |
| `/tin-tuc/[slug]` | `tin-tuc/[slug]/page.tsx` | ISR (revalidate 300s) | Bài chi tiết — trang rank chính |
| `/tin-tuc/danh-muc/[categorySlug]` | `tin-tuc/danh-muc/[categorySlug]/page.tsx` | ISR | Trang danh mục — cluster keyword |
| `/tin-tuc/tag/[tagSlug]` | `tin-tuc/tag/[tagSlug]/page.tsx` | ISR | Trang tag |
| `/tin-tuc/tac-gia/[authorSlug]` | `tin-tuc/tac-gia/[authorSlug]/page.tsx` | ISR | Trang tác giả — E-E-A-T |
| `/tin-tuc?q=...` | (search param trên `/tin-tuc`) | Dynamic | Tìm kiếm — `noindex` |

> **Nguyên tắc URL**: slug tiếng Việt không dấu, chứa từ khóa, tối đa ~60 ký tự. Ví dụ: `/tin-tuc/cach-tinh-tien-dien-phong-tro-2026`.

### 1.2 Admin routes (`web-admin/src/app/admin/`)

| Route | Mục đích |
|---|---|
| `/admin/articles` | Danh sách bài + filter + phân trang (đã có, cần nâng cấp) |
| `/admin/articles/new` · `/admin/articles/[id]` | Editor Tiptap + SEO Panel |
| `/admin/articles/categories` | Quản lý danh mục |
| `/admin/articles/tags` | Quản lý tag |
| `/admin/articles/authors` | Quản lý tác giả |
| `/admin/articles/media` | Media Library (ảnh Supabase Storage) |
| `/admin/articles/analytics` | Thống kê lượt xem |

### 1.3 Backend routes (Hono — `backend/src/routes/`)

Mở rộng file có sẵn + thêm mới:

```
GET    /public/articles                 # list (published) — filter category/tag/search/page
GET    /public/articles/:slug           # detail + auto views++
GET    /public/articles/featured        # bài nổi bật (hero)
GET    /public/articles/popular         # top views (sidebar trending)
GET    /public/categories               # danh mục active
GET    /public/tags                     # tag list
GET    /public/authors/:slug            # tác giả + bài của họ
GET    /public/articles/sitemap-data    # dữ liệu cho sitemap.xml + news-sitemap

# Admin (requireAuth + requireAdmin)
CRUD   /admin/articles                  # + full SEO fields
POST   /admin/articles/upload-image     # upload ảnh → Supabase Storage "article-images"
CRUD   /admin/categories
CRUD   /admin/tags
CRUD   /admin/authors
GET    /admin/articles/stats            # dashboard analytics
```

---

## 2. Database — Migration mới

> Migration file: `backend/src/migrations/030_news_cms_seo.sql`

### 2.1 Mở rộng bảng `articles`

```sql
ALTER TABLE public.articles
  -- SEO on-page
  ADD COLUMN IF NOT EXISTS seo_title        TEXT,           -- ≤60 ký tự, fallback = title
  ADD COLUMN IF NOT EXISTS meta_description  TEXT,           -- 150-160 ký tự, fallback = description
  ADD COLUMN IF NOT EXISTS focus_keyword     TEXT,           -- từ khóa chính
  ADD COLUMN IF NOT EXISTS canonical_url     TEXT,           -- override nếu cần
  ADD COLUMN IF NOT EXISTS og_image_url      TEXT,           -- 1200×630, fallback = image_url
  ADD COLUMN IF NOT EXISTS schema_type       VARCHAR(20) DEFAULT 'Article'
      CHECK (schema_type IN ('Article','NewsArticle','HowTo','FAQPage')),
  ADD COLUMN IF NOT EXISTS no_index          BOOLEAN DEFAULT false,
  -- Content meta
  ADD COLUMN IF NOT EXISTS excerpt           TEXT,           -- đoạn trả lời thẳng cho AI/snippet (40-60 từ)
  ADD COLUMN IF NOT EXISTS reading_time      INTEGER DEFAULT 0,  -- phút
  ADD COLUMN IF NOT EXISTS faq               JSONB DEFAULT '[]', -- [{q,a}] → FAQPage schema
  -- Editorial
  ADD COLUMN IF NOT EXISTS author_id         UUID REFERENCES public.article_authors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id       UUID REFERENCES public.article_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_featured       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sort_order        INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_at      TIMESTAMPTZ,    -- ngày đăng thực tế (hiển thị + schema)
  ADD COLUMN IF NOT EXISTS last_reviewed_at  TIMESTAMPTZ;    -- dateModified — freshness signal

-- Mở rộng status enum: draft / scheduled / published / archived
ALTER TABLE public.articles DROP CONSTRAINT IF EXISTS articles_status_check;
ALTER TABLE public.articles ADD CONSTRAINT articles_status_check
  CHECK (status IN ('draft','scheduled','published','archived'));

CREATE INDEX IF NOT EXISTS idx_articles_featured ON public.articles(is_featured, sort_order)
  WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles(category_id);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles(published_at DESC)
  WHERE status = 'published';
```

### 2.2 Bảng mới

```sql
-- Danh mục
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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tác giả (E-E-A-T)
CREATE TABLE IF NOT EXISTS public.article_authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name         VARCHAR(120) NOT NULL,
  slug         VARCHAR(120) UNIQUE NOT NULL,
  avatar_url   TEXT,
  title        VARCHAR(160),        -- "Luật sư", "Chuyên gia BĐS", "Kế toán trưởng"
  bio          TEXT,                -- ≤300 từ, chứng minh chuyên môn
  social_links JSONB DEFAULT '{}',  -- {facebook, linkedin, website}
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tag
CREATE TABLE IF NOT EXISTS public.article_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(80) NOT NULL,
  slug VARCHAR(80) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Many-to-many article ↔ tag
CREATE TABLE IF NOT EXISTS public.article_tag_map (
  article_id UUID REFERENCES public.articles(id) ON DELETE CASCADE,
  tag_id     UUID REFERENCES public.article_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);
```

> **Seed**: 4 danh mục hiện có (`Kinh nghiệm`, `Hướng dẫn`, `Thủ tục`, `Quy định`) + thêm `Pháp lý`. 1 author mặc định "Ban biên tập TrọCare". Migrate `articles.category` (text) → `category_id`.

### 2.3 Supabase Storage bucket

- Bucket mới: **`article-images`** (public read).
- Path: `article-images/{articleId}/{timestamp}.webp` (ảnh trong bài) và `article-images/covers/{slug}-{timestamp}.webp` (ảnh bìa).
- Upload qua backend (`supabaseAdmin.storage`) — **giống hệt** pattern feedback đã chạy production. Ảnh convert WebP + resize server-side (dùng `sharp` đã có sẵn trong repo).

---

## 3. FEATURE LIST — Public Frontend (trang đọc)

### 3.1 `/tin-tuc` — Trang chủ tin tức `[P1-MUST]`
- **Hero article**: 1 bài `is_featured` cao nhất — ảnh lớn, H1, excerpt, badge danh mục, nút đọc.
- **Grid "Tin mới nhất"**: 3 cột × 9 bài, sắp theo `published_at DESC`. Card: thumbnail (lazy WebP), badge danh mục, tiêu đề, excerpt, ngày, lượt xem.
- **Sidebar "Xem nhiều nhất"**: top 5 theo `views` — số thứ tự + thumbnail nhỏ.
- **Tab lọc danh mục**: URL crawlable `/tin-tuc/danh-muc/[slug]` (không dùng hash/JS filter).
- **Phân trang**: `?page=2` SEO-friendly (prev/next + số trang).
- **Ô tìm kiếm**: `?q=...` full-text tiêu đề + nội dung.

### 3.2 `/tin-tuc/[slug]` — Bài chi tiết `[P1-MUST]` (trang rank chính)
- **Breadcrumb**: Trang chủ › Tin tức › {Danh mục} › {Tiêu đề} + JSON-LD `BreadcrumbList`.
- **Article header**: H1, badge danh mục, **tác giả (avatar + tên + chức danh, link author page)**, ngày đăng, "cập nhật {last_reviewed_at}", lượt xem, thời gian đọc.
- **Ảnh bìa**: `next/image`, WebP, srcset 400/800/1200, width/height cố định (CLS = 0), alt = tiêu đề.
- **Reading progress bar** sticky top.
- **Table of Contents**: auto-parse H2/H3, anchor scroll smooth, sticky desktop.
- **Nội dung**: render HTML từ Tiptap, typography chuẩn (prose).
- **FAQ section**: render từ `faq` JSONB + JSON-LD `FAQPage`.
- **Share**: Facebook, Zalo, Copy link (+ Web Share API mobile).
- **Bài liên quan**: 3 bài cùng danh mục.
- **CTA cuối bài**: banner "Dùng TrọCare miễn phí".

### 3.3 `/tin-tuc/danh-muc/[slug]` — Danh mục `[P2-HIGH]`
- H1 = tên danh mục + số bài. Meta riêng. Grid + phân trang. Canonical.

### 3.4 `/tin-tuc/tac-gia/[slug]` — Tác giả `[P2-HIGH]`
- Profile: avatar, tên, chức danh, bio, social. Danh sách bài đã đăng. JSON-LD `Person`.

### 3.5 `/tin-tuc/tag/[slug]` — Tag `[P3-MED]`
- Grid bài theo tag + phân trang.

---

## 4. FEATURE LIST — SEO Technical `[P1-MUST]`

### 4.1 Structured Data (JSON-LD) — bắt buộc mọi trang
| Schema | Áp dụng ở |
|---|---|
| `Article` / `NewsArticle` | Bài chi tiết (headline, author, datePublished, dateModified, image, publisher) |
| `BreadcrumbList` | Mọi trang có breadcrumb |
| `FAQPage` | Bài có `faq` |
| `HowTo` | Bài `schema_type=HowTo` (hướng dẫn từng bước) |
| `Organization` | Layout gốc (TrọCare — logo, sameAs) |
| `WebSite` + `SearchAction` | Layout gốc (sitelinks searchbox) |

### 4.2 Meta tags & Open Graph (dùng Next.js `generateMetadata`)
- `title` = `seo_title || title` + `| TrọCare` (≤60 ký tự).
- `description` = `meta_description || description` (150-160).
- `canonical` mọi trang.
- OG: `og:title`, `og:description`, `og:image` (`og_image_url || image_url`, 1200×630), `og:type=article`, `article:published_time`, `article:author`.
- Twitter: `summary_large_image`.
- `robots: noindex` cho `?q=` search & bài `no_index=true`.

### 4.3 Sitemap & Indexing
- **`sitemap.xml` động** (`web-admin/src/app/sitemap.ts`): fetch `/public/articles/sitemap-data`, thêm mọi bài published + trang danh mục/tác giả với `lastmod = published_at/last_reviewed_at`.
- **`news-sitemap.xml`** riêng (bài ≤48h) — chuẩn Google News.
- **`robots.txt`**: allow `/tin-tuc`, disallow `/admin`.
- Auto **ping Google** khi publish (gọi `https://www.google.com/ping?sitemap=...` từ backend sau khi set status=published).

### 4.4 Core Web Vitals (mục tiêu: LCP ≤2.5s, INP ≤100ms, CLS ≤0.1)
- `next/image` WebP + lazy + blur placeholder.
- ISR cache (revalidate) — HTML tĩnh, fast TTFB.
- Font `Be Vietnam Pro` preload subset tiếng Việt.
- Prefetch link bài liên quan khi hover.
- Ảnh luôn có width/height → không layout shift.

### 4.5 AI Search Optimization (GEO) — để ChatGPT/Gemini/Perplexity trích dẫn
- **`excerpt`** = trả lời thẳng câu hỏi trong 40-60 từ (đặt ngay đầu bài + dùng cho snippet).
- Định nghĩa "X là gì?" trong 2 câu đầu.
- Danh sách đánh số rõ ràng (AI dễ trích).
- **FAQ** cuối bài (JSON-LD).
- **Cite nguồn uy tín**: Bộ Xây dựng, EVN, Tổng cục Thuế, Bộ Công an.
- **Author E-E-A-T**: bio chứng minh chuyên môn thật.
- Freshness: cập nhật `last_reviewed_at`.

---

## 5. FEATURE LIST — Admin CMS

### 5.1 Editor bài viết `[P1-MUST]` — `/admin/articles/new`
- **Rich Text Editor (Tiptap)**: Bold, Italic, H2, H3, bullet/numbered list, blockquote, divider, link, undo/redo.
- **Chèn ảnh inline**: drag & drop → upload `article-images` → chèn URL public, bắt buộc alt text.
- **Callout box**: Info / Warning / Tip.
- **Table** editor.
- **Tab "Xem thử"**: preview render.
- **Auto-save nháp** 30s/lần.
- **Word count + reading time** tự động (lưu `reading_time`).

### 5.2 SEO Panel (bên phải editor) `[P1-MUST]`
- SEO Title (live counter ≤60), Meta Description (live counter 150-160), Focus Keyword (+ check mật độ trong bài), Slug (auto-gen, editable), Canonical override, OG Image upload (1200×630), No-index toggle, Schema type select.
- **Google SERP preview** (mockup kết quả tìm kiếm live).
- **SEO checklist** kiểu Yoast: ✓ có focus keyword trong title/H1/first paragraph/meta, ✓ độ dài content, ✓ có ảnh alt, ✓ có internal link.

### 5.3 Excerpt & FAQ builder `[P1-MUST]`
- Field `excerpt` (đoạn trả lời thẳng — cho AI).
- FAQ builder: thêm/xóa cặp {câu hỏi, trả lời} → lưu `faq` JSONB.

### 5.4 Phân loại & xuất bản `[P1-MUST]`
- Chọn **Category** (dropdown từ DB), **Tags** (multi-select + tạo mới), **Author** (dropdown).
- Toggle **Featured** + **sort_order**.
- Trạng thái: Draft / Scheduled / Published / Archived.
- **Lên lịch**: `published_at` tương lai → cron/check tự publish.
- `last_reviewed_at` cập nhật khi sửa.

### 5.5 Media Library `[P2-HIGH]` — `/admin/articles/media`
- Upload drag&drop, multi, progress. Auto WebP + resize (sharp). Alt text bắt buộc. Grid + search. Max 5MB.

### 5.6 Quản lý Danh mục / Tag / Tác giả `[P1-P2]`
- CRUD category (name, slug, description, meta, ảnh, sort, active).
- CRUD tag.
- CRUD author (avatar upload, tên, chức danh, bio, social).

### 5.7 Analytics `[P3-MED]` — `/admin/articles/analytics`
- Tổng bài, views hôm nay/tuần/tháng. Top 10 bài. Views theo danh mục (chart). Tỷ lệ draft/published.
- (Phase sau) Tích hợp Google Search Console API — click/impression/position từng bài.

---

## 6. Content Strategy — Keyword plan (thị trường ngách, cạnh tranh thấp)

| Nhóm keyword | Ví dụ target | Danh mục | Volume/tháng | Độ khó |
|---|---|---|---|---|
| Quản lý nhà trọ | cách quản lý phòng trọ, phần mềm quản lý trọ miễn phí | Kinh nghiệm | 3k–8k | TB |
| Hợp đồng & pháp lý | mẫu hợp đồng thuê trọ, đăng ký kinh doanh nhà trọ | Thủ tục/Pháp lý | 5k–15k | Cao |
| Điện nước | cách tính tiền điện phòng trọ, giá điện nhà trọ 2026 | Hướng dẫn | 10k–30k | TB |
| PCCC & an toàn | quy định PCCC nhà trọ mới nhất | Quy định | 2k–5k | Thấp |
| Thuế & tài chính | thuế cho thuê nhà trọ, khai thuế nhà trọ cá nhân | Pháp lý | 4k–10k | TB |
| Khách thuê | cách tìm khách thuê, xác minh CCCD | Kinh nghiệm | 1.5k–4k | Thấp |

> **Kỳ vọng**: 10–15 bài chất lượng → Top 10 trong 2–3 tháng nhờ ngách ít cạnh tranh.

---

## 7. Delivery flow (luồng xuất bản chuẩn)

```
1. Admin soạn bài (Tiptap)
2. Điền SEO Panel (title/meta/keyword)
3. Upload ảnh bìa → article-images (WebP)
4. Chọn Category + Tags + Author
5. Viết Excerpt + FAQ
6. Preview render → SEO checklist pass
7. Set Published (hoặc Scheduled)
8. Backend: revalidate ISR + update sitemap + ping Google
9. Bài live tại /tin-tuc/[slug] — index trong vài giờ
```

---

## 8. Priority Matrix (thứ tự dev)

| # | Hạng mục | Ưu tiên | Effort |
|---|---|---|---|
| 1 | Migration `030` (SEO fields + bảng mới) + seed + bucket | P1 | 0.5d |
| 2 | Backend API mở rộng (public + admin + upload-image) | P1 | 1.5d |
| 3 | `/tin-tuc` + `/tin-tuc/[slug]` (ISR) | P1 | 3d |
| 4 | JSON-LD Schema + `generateMetadata` + OG | P1 | 1d |
| 5 | `sitemap.ts` động + news-sitemap + robots | P1 | 0.5d |
| 6 | Admin: Tiptap editor + SEO Panel + Excerpt/FAQ | P1 | 2.5d |
| 7 | Admin: Media Library + upload WebP | P1 | 1d |
| 8 | `/tin-tuc/danh-muc/[slug]` + quản lý category | P2 | 1.5d |
| 9 | Author + `/tin-tuc/tac-gia/[slug]` (E-E-A-T) | P2 | 1d |
| 10 | Cập nhật Landing: modal → link `/tin-tuc/[slug]` | P2 | 0.5d |
| 11 | Tags + trang tag | P3 | 1d |
| 12 | Analytics dashboard + Search Console API | P3 | 2d |

**Tổng P1 (MVP rank-ready): ~10 ngày** · P2: ~4.5 ngày · P3: ~3 ngày.

---

## 9. Chuẩn kỹ thuật & ràng buộc

- **Backend**: Hono + Supabase (`supabaseAdmin` cho storage/RLS-bypass), Zod validate, pattern giống `feedback.ts`/`adminArticles.ts`.
- **Frontend**: Next.js App Router, Server Components cho SEO pages (dùng `fetch` server-side, KHÔNG `'use client'` cho trang bài), Tailwind.
- **Ảnh**: chỉ Supabase Storage `article-images`, convert WebP + resize bằng `sharp` (đã có trong repo). **Không** lưu base64 vào DB.
- **Isolation**: bài viết là nội dung toàn hệ thống (không `user_id` isolation như rental) — chỉ Admin/Super_admin ghi, public đọc `status=published`.
- **RLS**: giữ policy migration 029, thêm policy cho bảng mới (public read, admin all).
- **Slug**: unique, tự sinh từ tiêu đề (bỏ dấu tiếng Việt), editable.
- **Bảo mật**: sanitize HTML content trước render (DOMPurify) để tránh XSS từ editor.

---

## 10. Rủi ro & lưu ý

| Rủi ro | Giảm thiểu |
|---|---|
| Modal cũ trên landing vẫn tồn tại → duplicate content | Chuyển hẳn sang link `/tin-tuc/[slug]`, xóa logic modal |
| HTML từ Tiptap chứa script độc | DOMPurify sanitize server-side |
| Ảnh nặng làm hỏng LCP | Bắt buộc WebP + resize ≤1200px + lazy |
| Slug đổi làm mất link cũ | Giữ slug ổn định; nếu đổi → 301 redirect (bảng `article_redirects` — Phase sau) |
| Scheduled publish cần cron | Dùng Vercel Cron hoặc check-on-read (published_at ≤ now) |
