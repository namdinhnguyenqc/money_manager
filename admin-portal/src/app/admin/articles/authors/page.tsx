"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Edit2, Trash2, Save, X, Loader2 } from "lucide-react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/utils/apiClient";
import ArticlesModuleNav from "@/components/ArticlesModuleNav";

interface Author {
  id: string; name: string; slug: string; title: string | null; bio: string | null; avatar_url: string | null;
}

const inputCls = "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none bg-white";

export default function AuthorsPage() {
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
    <div className="flex-1 p-6 lg:p-8 max-w-3xl mx-auto">
      <ArticlesModuleNav />

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase text-slate-500">Tác giả</h2>
          {!editing && (
            <button onClick={openNew} className="flex items-center gap-1.5 text-sm font-bold text-indigo-600">
              <Plus size={16} /> Thêm tác giả
            </button>
          )}
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>}

        {editing && (
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
        )}

        {loading ? (
          <Loader2 className="animate-spin text-indigo-500" />
        ) : items.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">Chưa có tác giả nào. Bấm &quot;Thêm tác giả&quot; để tạo.</p>
        ) : (
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
    </div>
  );
}
