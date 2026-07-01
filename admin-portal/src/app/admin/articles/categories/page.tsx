"use client";

import React, { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Plus, Edit2, Trash2, Save, X, Loader2, Tag as TagIcon, Users } from "lucide-react";
import Link from "next/link";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/apiClient";

interface Category {
  id: string; name: string; slug: string; description: string | null;
  meta_title: string | null; meta_description: string | null; sort_order: number; is_active: boolean;
}
interface Author {
  id: string; name: string; slug: string; title: string | null; bio: string | null; avatar_url: string | null;
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white";

export default function TaxonomyAdminPage() {
  const [tab, setTab] = useState<"categories" | "authors">("categories");
  return (
    <div className="flex-1 p-6 lg:p-8 max-w-4xl mx-auto">
      <Link href="/admin/articles" className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm font-semibold mb-4">
        <ArrowLeft size={16} /> Quay lại Quản lý Tin tức
      </Link>
      <h1 className="text-2xl font-black text-slate-900 mb-6">Danh mục & Tác giả</h1>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("categories")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${tab === "categories" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          <TagIcon size={15} /> Danh mục
        </button>
        <button onClick={() => setTab("authors")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold ${tab === "authors" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}>
          <Users size={15} /> Tác giả
        </button>
      </div>

      {tab === "categories" ? <CategoriesPanel /> : <AuthorsPanel />}
    </div>
  );
}

function CategoriesPanel() {
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState({ name: "", description: "", meta_title: "", meta_description: "", sort_order: 0, is_active: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ data: Category[] }>("/admin/taxonomy/categories");
      setItems(res?.data || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNew = () => { setEditing({} as Category); setForm({ name: "", description: "", meta_title: "", meta_description: "", sort_order: 0, is_active: true }); };
  const openEdit = (c: Category) => { setEditing(c); setForm({ name: c.name, description: c.description || "", meta_title: c.meta_title || "", meta_description: c.meta_description || "", sort_order: c.sort_order, is_active: c.is_active }); };

  const save = async () => {
    if (!form.name.trim()) { setError("Tên danh mục không được để trống"); return; }
    setSaving(true); setError(null);
    try {
      if (editing?.id) await apiPut(`/admin/taxonomy/categories/${editing.id}`, form);
      else await apiPost("/admin/taxonomy/categories", form);
      setEditing(null);
      fetchAll();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async (c: Category) => {
    if (!confirm(`Xóa danh mục "${c.name}"?`)) return;
    try { await apiDelete(`/admin/taxonomy/categories/${c.id}`); fetchAll(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {editing ? (
        <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên danh mục" className={inputCls} />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Mô tả" rows={2} className={`${inputCls} resize-none`} />
          <input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder="Meta title (SEO)" className={inputCls} />
          <textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} placeholder="Meta description (SEO)" rows={2} className={`${inputCls} resize-none`} />
          <div className="flex gap-2">
            <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} placeholder="Thứ tự" className={`${inputCls} w-32`} />
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Hiển thị</label>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm font-semibold text-slate-500"><X size={14} className="inline mr-1" />Hủy</button>
            <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
            </button>
          </div>
        </div>
      ) : (
        <button onClick={openNew} className="mb-4 flex items-center gap-1.5 text-sm font-bold text-indigo-600"><Plus size={16} /> Thêm danh mục</button>
      )}

      {loading ? <Loader2 className="animate-spin text-indigo-500" /> : (
        <div className="divide-y divide-slate-100">
          {items.map((c) => (
            <div key={c.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-sm">{c.name} {!c.is_active && <span className="text-xs text-slate-400">(ẩn)</span>}</p>
                <p className="text-xs text-slate-400 font-mono">/tin-tuc/danh-muc/{c.slug}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={15} /></button>
                <button onClick={() => remove(c)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuthorsPanel() {
  const [items, setItems] = useState<Author[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Author | null>(null);
  const [form, setForm] = useState({ name: "", title: "", bio: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ data: Author[] }>("/admin/taxonomy/authors");
      setItems(res?.data || []);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openNew = () => { setEditing({} as Author); setForm({ name: "", title: "", bio: "", avatar_url: "" }); };
  const openEdit = (a: Author) => { setEditing(a); setForm({ name: a.name, title: a.title || "", bio: a.bio || "", avatar_url: a.avatar_url || "" }); };

  const save = async () => {
    if (!form.name.trim()) { setError("Tên tác giả không được để trống"); return; }
    setSaving(true); setError(null);
    try {
      const payload = { ...form, social_links: {} };
      if (editing?.id) await apiPut(`/admin/taxonomy/authors/${editing.id}`, payload);
      else await apiPost("/admin/taxonomy/authors", payload);
      setEditing(null);
      fetchAll();
    } catch (e: any) { setError(e.message); } finally { setSaving(false); }
  };

  const remove = async (a: Author) => {
    if (!confirm(`Xóa tác giả "${a.name}"?`)) return;
    try { await apiDelete(`/admin/taxonomy/authors/${a.id}`); fetchAll(); }
    catch (e: any) { setError(e.message); }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}
      {editing ? (
        <div className="space-y-3 mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Tên tác giả" className={inputCls} />
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chức danh (vd: Luật sư, Chuyên gia BĐS)" className={inputCls} />
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tiểu sử / chuyên môn (E-E-A-T)" rows={3} className={`${inputCls} resize-none`} />
          <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="URL ảnh đại diện" className={inputCls} />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(null)} className="px-3 py-1.5 text-sm font-semibold text-slate-500"><X size={14} className="inline mr-1" />Hủy</button>
            <button onClick={save} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg flex items-center gap-1.5">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Lưu
            </button>
          </div>
        </div>
      ) : (
        <button onClick={openNew} className="mb-4 flex items-center gap-1.5 text-sm font-bold text-indigo-600"><Plus size={16} /> Thêm tác giả</button>
      )}

      {loading ? <Loader2 className="animate-spin text-indigo-500" /> : (
        <div className="divide-y divide-slate-100">
          {items.map((a) => (
            <div key={a.id} className="py-3 flex items-center justify-between">
              <div>
                <p className="font-bold text-slate-800 text-sm">{a.name}</p>
                <p className="text-xs text-slate-400">{a.title || "—"}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-indigo-600"><Edit2 size={15} /></button>
                <button onClick={() => remove(a)} className="p-1.5 text-slate-400 hover:text-red-500"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
