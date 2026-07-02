"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus, Search, Edit2, Trash2, Eye, Save, Loader2, FileText, Check, AlertCircle,
  ArrowLeft, FileCheck, Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Link2, Quote, Image as ImageIcon, X, Star, Upload,
} from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/apiClient";
import Link from "next/link";
import ArticlesModuleNav from "@/components/ArticlesModuleNav";
import { autoFormatContent, sanitizeHtml } from "@/lib/sanitize";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Article {
  id: string; title: string; slug: string; category: string;
  description: string | null; excerpt: string | null; content: string;
  image_url: string | null; og_image_url: string | null;
  seo_title: string | null; meta_description: string | null; focus_keyword: string | null;
  schema_type: string; no_index: boolean; faq: { q: string; a: string }[];
  category_id: string | null; author_id: string | null;
  is_featured: boolean; sort_order: number;
  status: "draft" | "scheduled" | "published" | "archived";
  published_at: string | null; views: number; created_at: string; updated_at: string;
  tag_ids?: string[];
}
interface Category { id: string; name: string; slug: string; }
interface Author { id: string; name: string; slug: string; }
interface Tag { id: string; name: string; slug: string; }

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://trocare-production.vercel.app";

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d").replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Taxonomy
  const [categories, setCategories] = useState<Category[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", slug: "", category: "", category_id: "" as string | null,
    author_id: "" as string | null, description: "", excerpt: "", content: "",
    image_url: "", og_image_url: "", seo_title: "", meta_description: "",
    focus_keyword: "", schema_type: "Article", no_index: false,
    is_featured: false, sort_order: 0, status: "draft" as Article["status"],
  });
  const [faqItems, setFaqItems] = useState<{ q: string; a: string }[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState("");
  const [editorTab, setEditorTab] = useState<"write" | "preview">("write");
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const [actionLoading, setActionLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  // ── Fetch ──
  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const query = new URLSearchParams({
        page: page.toString(), limit: "10",
        search: searchTerm, status: statusFilter, category: categoryFilter,
      });
      const res = await apiGet<{ data: Article[]; pagination: any }>(`/admin/articles?${query.toString()}`);
      if (res) {
        setArticles(res.data || []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err: any) {
      setErrorMsg("Không thể tải danh sách bài viết: " + (err.message || "Lỗi kết nối"));
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, statusFilter, categoryFilter]);

  const fetchTaxonomy = useCallback(async () => {
    try {
      const [cats, auth, tg] = await Promise.all([
        apiGet<{ data: Category[] }>("/admin/taxonomy/categories"),
        apiGet<{ data: Author[] }>("/admin/taxonomy/authors"),
        apiGet<{ data: Tag[] }>("/admin/taxonomy/tags"),
      ]);
      setCategories(cats?.data || []);
      setAuthors(auth?.data || []);
      setTags(tg?.data || []);
    } catch { /* non-fatal */ }
  }, []);

  useEffect(() => { fetchArticles(); }, [page, statusFilter, categoryFilter]); // eslint-disable-line
  useEffect(() => { fetchTaxonomy(); }, [fetchTaxonomy]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchArticles(); };

  // ── Editor open/close ──
  const resetForm = () => {
    setForm({
      title: "", slug: "", category: categories[0]?.name || "",
      category_id: categories[0]?.id || null, author_id: authors[0]?.id || null,
      description: "", excerpt: "", content: "", image_url: "", og_image_url: "",
      seo_title: "", meta_description: "", focus_keyword: "", schema_type: "Article",
      no_index: false, is_featured: false, sort_order: 0, status: "draft",
    });
    setFaqItems([]);
    setSelectedTagIds([]);
  };

  const openCreateForm = () => {
    setErrorMsg(null); setSuccessMsg(null); setEditId(null);
    resetForm(); setEditorTab("write"); setIsEditing(true);
  };

  const openEditForm = async (article: Article) => {
    setErrorMsg(null); setSuccessMsg(null); setEditId(article.id);
    // Fetch full detail (includes tag_ids)
    let full = article;
    try {
      const res = await apiGet<{ data: Article }>(`/admin/articles/${article.id}`);
      if (res?.data) full = res.data;
    } catch { /* fallback to list row */ }
    setForm({
      title: full.title, slug: full.slug, category: full.category,
      category_id: full.category_id || null, author_id: full.author_id || null,
      description: full.description || "", excerpt: full.excerpt || "",
      content: full.content, image_url: full.image_url || "", og_image_url: full.og_image_url || "",
      seo_title: full.seo_title || "", meta_description: full.meta_description || "",
      focus_keyword: full.focus_keyword || "", schema_type: full.schema_type || "Article",
      no_index: full.no_index || false, is_featured: full.is_featured || false,
      sort_order: full.sort_order || 0, status: full.status,
    });
    setFaqItems(full.faq || []);
    setSelectedTagIds(full.tag_ids || []);
    setEditorTab("write");
    setIsEditing(true);
  };

  const handleTitleChange = (title: string) => {
    set({ title });
    if (!editId) set({ slug: slugify(title) });
  };

  const handleCategoryChange = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    set({ category_id: categoryId, category: cat?.name || "" });
  };

  // ── HTML toolbar: wrap selection ──
  const wrapSelection = (before: string, after: string) => {
    const ta = contentRef.current;
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd;
    const sel = form.content.slice(start, end);
    const next = form.content.slice(0, start) + before + sel + after + form.content.slice(end);
    set({ content: next });
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = start + before.length;
      ta.selectionEnd = end + before.length;
    }, 0);
  };
  const insertLink = () => {
    const url = prompt("Nhập URL liên kết:", "https://");
    if (url) wrapSelection(`<a href="${url}">`, "</a>");
  };

  // ── Image upload ──
  const uploadImage = (file: File, scope: "cover" | "inline") => {
    if (file.size > 10 * 1024 * 1024) { setErrorMsg("Ảnh vượt quá 10MB"); return; }
    setUploading(true); setErrorMsg(null);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await apiPost<{ url: string }>("/admin/articles/upload-image", {
          fileUrl: reader.result, fileName: file.name, scope,
        });
        if (res?.url) {
          if (scope === "cover") set({ image_url: res.url });
          else wrapSelection(`<img src="${res.url}" alt="${form.focus_keyword || form.title}" />`, "");
          setSuccessMsg("Tải ảnh thành công!");
        }
      } catch (err: any) {
        setErrorMsg("Tải ảnh thất bại: " + (err.message || "Lỗi"));
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Tags ──
  const toggleTag = (id: string) =>
    setSelectedTagIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  const addNewTag = async () => {
    const name = newTagInput.trim();
    if (!name) return;
    try {
      const res = await apiPost<{ data: Tag }>("/admin/taxonomy/tags", { name });
      if (res?.data) {
        setTags((t) => t.some((x) => x.id === res.data.id) ? t : [...t, res.data]);
        setSelectedTagIds((ids) => ids.includes(res.data.id) ? ids : [...ids, res.data.id]);
        setNewTagInput("");
      }
    } catch (err: any) { setErrorMsg("Không thể tạo tag: " + err.message); }
  };

  // ── FAQ ──
  const addFaq = () => setFaqItems((f) => [...f, { q: "", a: "" }]);
  const updateFaq = (i: number, key: "q" | "a", val: string) =>
    setFaqItems((f) => f.map((item, idx) => idx === i ? { ...item, [key]: val } : item));
  const removeFaq = (i: number) => setFaqItems((f) => f.filter((_, idx) => idx !== i));

  // ── Save ──
  const saveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null); setSuccessMsg(null); setActionLoading(true);
    if (!form.title.trim()) { setErrorMsg("Tiêu đề không được để trống"); setActionLoading(false); return; }
    if (!form.slug.trim()) { setErrorMsg("Slug không được để trống"); setActionLoading(false); return; }
    if (!form.content.trim()) { setErrorMsg("Nội dung không được để trống"); setActionLoading(false); return; }
    if (!form.category.trim()) { setErrorMsg("Vui lòng chọn danh mục trước khi lưu bài viết"); setActionLoading(false); return; }

    const payload = {
      ...form,
      image_url: form.image_url.trim() || null,
      og_image_url: form.og_image_url.trim() || null,
      description: form.description.trim() || null,
      excerpt: form.excerpt.trim() || null,
      seo_title: form.seo_title.trim() || null,
      meta_description: form.meta_description.trim() || null,
      focus_keyword: form.focus_keyword.trim() || null,
      category_id: form.category_id || null,
      author_id: form.author_id || null,
      faq: faqItems.filter((f) => f.q.trim() && f.a.trim()),
      tag_ids: selectedTagIds,
    };

    try {
      const res = editId
        ? await apiPut<any>(`/admin/articles/${editId}`, payload)
        : await apiPost<any>("/admin/articles", payload);
      if (res) {
        setSuccessMsg(editId ? "Cập nhật bài viết thành công!" : "Tạo bài viết thành công!");
        setIsEditing(false);
        fetchArticles();
      }
    } catch (err: any) {
      if (err.message?.includes("SLUG_EXISTS")) setErrorMsg("Đường dẫn slug đã tồn tại, chọn slug khác.");
      else setErrorMsg("Lỗi khi lưu: " + (err.message || "Lỗi kết nối"));
    } finally {
      setActionLoading(false);
    }
  };

  const deleteArticle = async (id: string, title: string) => {
    if (!confirm(`Xóa bài viết "${title}"?`)) return;
    setErrorMsg(null); setSuccessMsg(null);
    try {
      await apiDelete<any>(`/admin/articles/${id}`);
      setSuccessMsg("Xóa thành công!");
      fetchArticles();
    } catch (err: any) {
      setErrorMsg("Không thể xóa: " + (err.message || "Lỗi kết nối"));
    }
  };

  // ── SEO checklist ──
  const kw = form.focus_keyword.trim().toLowerCase();
  const plainContent = form.content.replace(/<[^>]+>/g, " ").toLowerCase();
  const seoChecks = [
    { ok: !!kw, label: "Đã đặt từ khóa chính (focus keyword)" },
    { ok: !!kw && form.title.toLowerCase().includes(kw), label: "Từ khóa trong tiêu đề" },
    { ok: !!kw && (form.excerpt.toLowerCase().includes(kw) || plainContent.slice(0, 300).includes(kw)), label: "Từ khóa trong đoạn mở đầu" },
    { ok: !!kw && plainContent.includes(kw), label: "Từ khóa trong nội dung" },
    { ok: (form.meta_description || form.description).length >= 120, label: "Meta description ≥120 ký tự" },
    { ok: (form.seo_title || form.title).length <= 60, label: "SEO title ≤60 ký tự" },
    { ok: !!form.image_url, label: "Có ảnh bìa" },
    { ok: plainContent.split(" ").length >= 300, label: "Nội dung ≥300 từ" },
    { ok: form.content.includes("<a "), label: "Có ít nhất 1 liên kết nội bộ" },
  ];
  const passedChecks = seoChecks.filter((c) => c.ok).length;

  const metaDescLen = (form.meta_description || form.description).length;
  const seoTitleLen = (form.seo_title || form.title).length;

  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 p-6 lg:p-8 max-w-6xl mx-auto">
      {isEditing ? (
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mb-8">
          <FileText className="text-indigo-600 h-6 w-6" /> {editId ? "Chỉnh sửa bài viết" : "Viết bài mới"}
        </h1>
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-6">
          <ArticlesModuleNav />
          <button onClick={openCreateForm}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-4 py-2.5 rounded-xl shadow-sm transition-all shrink-0 mb-4">
            <Plus size={18} /> Viết bài mới
          </button>
        </div>
      )}

      {/* FEEDBACK */}
      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-center gap-3 text-sm">
          <AlertCircle size={20} className="shrink-0" /><span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl flex items-center gap-3 text-sm">
          <Check size={20} className="shrink-0" /><span>{successMsg}</span>
        </div>
      )}

      {isEditing ? (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <button onClick={() => setIsEditing(false)}
              className="flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-sm font-semibold">
              <ArrowLeft size={16} /> Quay lại danh sách
            </button>
            <span className="text-sm font-black text-slate-700">{editId ? "Chỉnh sửa bài viết" : "Viết bài mới"}</span>
          </div>

          <form onSubmit={saveArticle} className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* MAIN COLUMN */}
              <div className="lg:col-span-2 space-y-4">
                <Field label="Tiêu đề bài viết" required>
                  <input type="text" required value={form.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Ví dụ: Cách tính tiền điện phòng trọ chuẩn 2026..."
                    className={inputCls} />
                </Field>

                <Field label="Đường dẫn Slug" required>
                  <input type="text" required value={form.slug}
                    onChange={(e) => set({ slug: e.target.value })}
                    className={`${inputCls} bg-slate-50 text-slate-600 font-mono`} />
                </Field>

                <Field label="Đoạn tóm tắt (Excerpt — trả lời thẳng, hiển thị cho AI/snippet)">
                  <textarea rows={2} value={form.excerpt}
                    onChange={(e) => set({ excerpt: e.target.value })}
                    placeholder="40-60 từ trả lời thẳng câu hỏi chính của bài..."
                    className={`${inputCls} resize-none`} />
                </Field>

                {/* Content editor with toolbar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls}>Nội dung bài viết <span className="text-red-500">*</span></label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200/50">
                      <button type="button" onClick={() => setEditorTab("write")}
                        className={`px-3 py-1 text-xs font-bold rounded-md ${editorTab === "write" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Soạn thảo</button>
                      <button type="button" onClick={() => setEditorTab("preview")}
                        className={`px-3 py-1 text-xs font-bold rounded-md ${editorTab === "preview" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Xem thử</button>
                    </div>
                  </div>

                  {editorTab === "write" ? (
                    <>
                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center gap-1 border border-slate-200 border-b-0 rounded-t-xl px-2 py-1.5 bg-slate-50">
                        <ToolBtn onClick={() => wrapSelection("<strong>", "</strong>")} title="Đậm"><Bold size={15} /></ToolBtn>
                        <ToolBtn onClick={() => wrapSelection("<em>", "</em>")} title="Nghiêng"><Italic size={15} /></ToolBtn>
                        <span className="w-px h-5 bg-slate-200 mx-1" />
                        <ToolBtn onClick={() => wrapSelection("<h2>", "</h2>")} title="Tiêu đề H2"><Heading2 size={15} /></ToolBtn>
                        <ToolBtn onClick={() => wrapSelection("<h3>", "</h3>")} title="Tiêu đề H3"><Heading3 size={15} /></ToolBtn>
                        <span className="w-px h-5 bg-slate-200 mx-1" />
                        <ToolBtn onClick={() => wrapSelection("<ul>\n  <li>", "</li>\n</ul>")} title="Danh sách"><List size={15} /></ToolBtn>
                        <ToolBtn onClick={() => wrapSelection("<ol>\n  <li>", "</li>\n</ol>")} title="Danh sách số"><ListOrdered size={15} /></ToolBtn>
                        <ToolBtn onClick={() => wrapSelection("<blockquote>", "</blockquote>")} title="Trích dẫn"><Quote size={15} /></ToolBtn>
                        <ToolBtn onClick={insertLink} title="Liên kết"><Link2 size={15} /></ToolBtn>
                        <label className="p-1.5 rounded hover:bg-slate-200 cursor-pointer text-slate-600" title="Chèn ảnh">
                          <ImageIcon size={15} />
                          <input type="file" accept="image/*" hidden
                            onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "inline")} />
                        </label>
                        {uploading && <Loader2 size={14} className="animate-spin text-indigo-500 ml-1" />}
                      </div>
                      <textarea ref={contentRef} rows={16} required value={form.content}
                        onChange={(e) => set({ content: e.target.value })}
                        placeholder="Nhập nội dung. Dùng toolbar phía trên để chèn thẻ HTML, ảnh, liên kết..."
                        className="w-full border border-slate-200 rounded-b-xl px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none font-mono leading-relaxed" />
                    </>
                  ) : (
                    <div className="border border-slate-200 rounded-xl p-5 bg-white min-h-[300px] article-prose"
                      dangerouslySetInnerHTML={{ __html: form.content ? sanitizeHtml(autoFormatContent(form.content)) : "<span style='color:#94a3b8'>Chưa có nội dung để xem thử...</span>" }} />
                  )}
                </div>

                {/* FAQ builder */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className={labelCls}>Câu hỏi thường gặp (FAQ — tạo schema FAQPage)</label>
                    <button type="button" onClick={addFaq}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Plus size={14} /> Thêm câu hỏi
                    </button>
                  </div>
                  <div className="space-y-3">
                    {faqItems.map((item, i) => (
                      <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                        <div className="flex gap-2">
                          <input value={item.q} onChange={(e) => updateFaq(i, "q", e.target.value)}
                            placeholder="Câu hỏi..." className={`${inputCls} flex-grow`} />
                          <button type="button" onClick={() => removeFaq(i)}
                            className="p-2 text-slate-400 hover:text-red-500"><X size={16} /></button>
                        </div>
                        <textarea value={item.a} onChange={(e) => updateFaq(i, "a", e.target.value)}
                          rows={2} placeholder="Trả lời..." className={`${inputCls} resize-none`} />
                      </div>
                    ))}
                    {faqItems.length === 0 && <p className="text-xs text-slate-400 italic">Chưa có câu hỏi nào.</p>}
                  </div>
                </div>
              </div>

              {/* SIDEBAR: settings + SEO */}
              <div className="space-y-5">
                {/* Publish box */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-500">Xuất bản</h3>
                  <select value={form.status} onChange={(e) => set({ status: e.target.value as Article["status"] })} className={inputCls}>
                    <option value="draft">Nháp (Draft)</option>
                    <option value="published">Xuất bản (Published)</option>
                    <option value="scheduled">Lên lịch (Scheduled)</option>
                    <option value="archived">Lưu trữ (Archived)</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.is_featured}
                      onChange={(e) => set({ is_featured: e.target.checked })} className="rounded text-indigo-600" />
                    <Star size={14} className="text-amber-500" /> Bài nổi bật (Hero)
                  </label>
                  {form.is_featured && (
                    <input type="number" value={form.sort_order} onChange={(e) => set({ sort_order: parseInt(e.target.value) || 0 })}
                      placeholder="Thứ tự sắp xếp" className={inputCls} />
                  )}
                </div>

                {/* Taxonomy */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-500">Phân loại</h3>
                  <Field label="Danh mục">
                    {categories.length === 0 ? (
                      <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        Chưa có danh mục nào. Vào <Link href="/admin/articles/categories" className="font-bold underline">Danh mục</Link> để tạo trước khi viết bài.
                      </p>
                    ) : (
                      <select value={form.category_id || ""} onChange={(e) => handleCategoryChange(e.target.value)} className={inputCls}>
                        <option value="">— Chọn danh mục —</option>
                        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    )}
                  </Field>
                  <Field label="Tác giả">
                    <select value={form.author_id || ""} onChange={(e) => set({ author_id: e.target.value })} className={inputCls}>
                      <option value="">— Chọn tác giả —</option>
                      {authors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Tags">
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {tags.map((t) => (
                        <button key={t.id} type="button" onClick={() => toggleTag(t.id)}
                          className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                            selectedTagIds.includes(t.id)
                              ? "bg-indigo-100 border-indigo-300 text-indigo-700 font-semibold"
                              : "bg-white border-slate-200 text-slate-500"}`}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5">
                      <input value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addNewTag(); } }}
                        placeholder="Thêm tag mới..." className={`${inputCls} text-xs py-1.5`} />
                      <button type="button" onClick={addNewTag} className="px-2 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200"><Plus size={14} /></button>
                    </div>
                  </Field>
                </div>

                {/* Cover image */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-slate-500">Ảnh bìa</h3>
                  {form.image_url ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.image_url} alt="cover" className="w-full h-32 object-cover rounded-lg" />
                      <button type="button" onClick={() => set({ image_url: "" })}
                        className="absolute top-1 right-1 p-1 bg-white/90 rounded-full text-slate-600 hover:text-red-500"><X size={14} /></button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 h-28 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-indigo-300 text-slate-400 hover:text-indigo-500">
                      <Upload size={20} />
                      <span className="text-xs font-semibold">Tải ảnh bìa lên</span>
                      <input type="file" accept="image/*" hidden
                        onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0], "cover")} />
                    </label>
                  )}
                </div>

                {/* SEO Panel */}
                <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-black uppercase text-indigo-600">SEO</h3>
                  <Field label={`SEO Title (${seoTitleLen}/60)`}>
                    <input value={form.seo_title} onChange={(e) => set({ seo_title: e.target.value })}
                      placeholder={form.title || "Tiêu đề hiển thị trên Google"} className={inputCls} />
                    {seoTitleLen > 60 && <span className="text-[10px] text-red-500">Quá dài, nên ≤60 ký tự</span>}
                  </Field>
                  <Field label={`Meta Description (${metaDescLen}/160)`}>
                    <textarea rows={3} value={form.meta_description} onChange={(e) => set({ meta_description: e.target.value })}
                      placeholder={form.description || "Mô tả hiển thị dưới tiêu đề trên Google"} className={`${inputCls} resize-none`} />
                  </Field>
                  <Field label="Từ khóa chính (Focus keyword)">
                    <input value={form.focus_keyword} onChange={(e) => set({ focus_keyword: e.target.value })}
                      placeholder="vd: cách tính tiền điện phòng trọ" className={inputCls} />
                  </Field>
                  <Field label="Loại Schema">
                    <select value={form.schema_type} onChange={(e) => set({ schema_type: e.target.value })} className={inputCls}>
                      <option value="Article">Article (bài thường)</option>
                      <option value="NewsArticle">NewsArticle (tin tức)</option>
                      <option value="HowTo">HowTo (hướng dẫn từng bước)</option>
                      <option value="FAQPage">FAQPage (hỏi đáp)</option>
                    </select>
                  </Field>
                  <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                    <input type="checkbox" checked={form.no_index} onChange={(e) => set({ no_index: e.target.checked })} className="rounded text-indigo-600" />
                    Ẩn khỏi Google (no-index)
                  </label>

                  {/* Google SERP preview */}
                  <div className="bg-white rounded-lg border border-slate-200 p-3 mt-2">
                    <p className="text-[10px] text-slate-400 mb-1">Xem trước trên Google:</p>
                    <p className="text-[#1a0dab] text-sm font-medium leading-tight line-clamp-1">{form.seo_title || form.title || "Tiêu đề bài viết"}</p>
                    <p className="text-[#006621] text-[11px]">{SITE_URL}/tin-tuc/{form.slug || "duong-dan"}</p>
                    <p className="text-[#545454] text-xs leading-snug line-clamp-2 mt-0.5">{form.meta_description || form.description || form.excerpt || "Mô tả bài viết sẽ hiển thị ở đây..."}</p>
                  </div>

                  {/* SEO checklist */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-600">Điểm SEO</span>
                      <span className={`text-[11px] font-black ${passedChecks >= 7 ? "text-emerald-600" : passedChecks >= 4 ? "text-amber-600" : "text-red-500"}`}>
                        {passedChecks}/{seoChecks.length}
                      </span>
                    </div>
                    <ul className="space-y-1">
                      {seoChecks.map((c, i) => (
                        <li key={i} className={`text-[11px] flex items-center gap-1.5 ${c.ok ? "text-emerald-600" : "text-slate-400"}`}>
                          {c.ok ? <Check size={11} /> : <span className="w-[11px] h-[11px] rounded-full border border-slate-300 inline-block" />}
                          {c.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTIONS */}
            <div className="border-t border-slate-100 pt-5 flex justify-end gap-3 bg-slate-50 p-4 -mx-6 -mb-6 rounded-b-2xl">
              <button type="button" onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl">Hủy bỏ</button>
              <button type="submit" disabled={actionLoading}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-sm">
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Lưu bài viết
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
              <input type="text" placeholder="Tìm kiếm tiêu đề..." value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-indigo-500 focus:outline-none bg-slate-50" />
            </div>
            <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
              <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[120px]">
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white min-w-[120px]">
                <option value="">Tất cả trạng thái</option>
                <option value="draft">Nháp</option>
                <option value="published">Xuất bản</option>
                <option value="scheduled">Lên lịch</option>
                <option value="archived">Lưu trữ</option>
              </select>
              <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm px-4 py-2 rounded-xl">Lọc</button>
            </div>
          </form>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="text-sm font-semibold text-slate-500">Đang tải...</span>
              </div>
            ) : articles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                <FileCheck className="h-12 w-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">Chưa có bài viết nào</h3>
                <p className="text-sm text-slate-400 mt-1">Bấm &quot;Viết bài mới&quot; để bắt đầu.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-bold uppercase text-slate-400 tracking-wider">
                      <th className="px-6 py-4">Bài viết</th>
                      <th className="px-6 py-4">Danh mục</th>
                      <th className="px-6 py-4">Lượt xem</th>
                      <th className="px-6 py-4">Trạng thái</th>
                      <th className="px-6 py-4">Ngày tạo</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {articles.map((article) => (
                      <tr key={article.id} className="hover:bg-slate-50/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative h-12 w-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200/50">
                              {article.image_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={article.image_url} alt={article.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-slate-400"><FileText size={18} /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 truncate max-w-[280px] flex items-center gap-1">
                                {article.is_featured && <Star size={12} className="text-amber-500 shrink-0" />}
                                {article.title}
                              </h4>
                              <p className="text-xs text-slate-400 font-mono truncate max-w-[280px]">/{article.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-block text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">{article.category}</span>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          <div className="flex items-center gap-1.5"><Eye size={14} className="text-slate-400" />{article.views}</div>
                        </td>
                        <td className="px-6 py-4"><StatusBadge status={article.status} /></td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(article.created_at).toLocaleDateString("vi-VN", { year: "numeric", month: "short", day: "numeric" })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {article.status === "published" && (
                              <a href={`${SITE_URL}/tin-tuc/${article.slug}`} target="_blank" rel="noreferrer"
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Xem bài"><Eye size={16} /></a>
                            )}
                            <button onClick={() => openEditForm(article)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Sửa"><Edit2 size={16} /></button>
                            <button onClick={() => deleteArticle(article.id, article.title)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Xóa"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!loading && totalCount > 0 && (
              <div className="p-4 bg-slate-50/75 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Hiển thị <b>{articles.length}</b> / <b>{totalCount}</b> bài viết
                </span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:bg-slate-100 disabled:text-slate-400">Trước</button>
                  <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-white disabled:bg-slate-100 disabled:text-slate-400">Sau</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small UI helpers ──
const inputCls = "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:outline-none bg-white";
const labelCls = "block text-xs font-bold uppercase text-slate-500 mb-1.5";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelCls}>{label} {required && <span className="text-red-500">*</span>}</label>
      {children}
    </div>
  );
}

function ToolBtn({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} title={title}
      className="p-1.5 rounded hover:bg-slate-200 text-slate-600">{children}</button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string; dot: string }> = {
    published: { cls: "bg-emerald-50 text-emerald-700 border-emerald-100", label: "Xuất bản", dot: "bg-emerald-500" },
    draft: { cls: "bg-amber-50 text-amber-700 border-amber-100", label: "Nháp", dot: "bg-amber-500" },
    scheduled: { cls: "bg-blue-50 text-blue-700 border-blue-100", label: "Lên lịch", dot: "bg-blue-500" },
    archived: { cls: "bg-slate-100 text-slate-500 border-slate-200", label: "Lưu trữ", dot: "bg-slate-400" },
  };
  const s = map[status] || map.draft;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${s.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />{s.label}
    </span>
  );
}
