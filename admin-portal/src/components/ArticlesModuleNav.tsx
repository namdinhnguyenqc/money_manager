"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText, Tag, Users } from "lucide-react";

const modules = [
  { href: "/admin/articles", label: "Bài viết", icon: FileText },
  { href: "/admin/articles/categories", label: "Danh mục", icon: Tag },
  { href: "/admin/articles/authors", label: "Tác giả", icon: Users },
];

// Sub-navigation shown on every page inside the "Quản lý bài đăng" module.
export default function ArticlesModuleNav() {
  const pathname = usePathname();

  return (
    <div className="mb-6">
      <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Quản lý bài đăng</h1>
      <p className="text-sm text-slate-500 mb-4">Tin tức, cẩm nang, danh mục và tác giả cho trang TrọCare.</p>
      <div className="flex gap-2 border-b border-slate-200">
        {modules.map((m) => {
          const active = pathname === m.href;
          const Icon = m.icon;
          return (
            <Link
              key={m.href}
              href={m.href}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition-colors ${
                active
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Icon size={15} /> {m.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
