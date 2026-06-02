"use client";

import React, { useEffect, useState } from "react";
import { 
  Filter,
  Search,
  FileText,
  RefreshCw,
  User,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import Card from "@/components/ui/Card";

const apiGet = <T>(url: string) => apiClient<T>(url, { method: "GET" });

type Attachment = {
  id: string;
  file_url: string;
  file_name?: string;
  file_type?: string;
};

type FeedbackReport = {
  id: string;
  title: string;
  description: string;
  type: "bug" | "suggestion" | "support";
  category: "ui" | "function" | "data" | "payment" | "invoice" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "new" | "in_progress" | "resolved" | "reopened" | "closed";
  related_screen?: string;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
  comments_count: number;
  reporterName: string;
  reporterEmail: string;
};

const typeLabelMap = {
  bug: "Báo lỗi",
  suggestion: "Góp ý cải thiện",
  support: "Yêu cầu hỗ trợ",
};

const categoryLabelMap = {
  ui: "Giao diện",
  function: "Chức năng",
  data: "Dữ liệu",
  payment: "Thanh toán",
  invoice: "Hóa đơn",
  other: "Khác",
};

const statusConfig = {
  new: { label: "Mới gửi", color: "bg-blue-50 text-blue-700 border-blue-200" },
  in_progress: { label: "Đang xử lý", color: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { label: "Đã xử lý xong", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  reopened: { label: "Cần kiểm tra lại", color: "bg-purple-50 text-purple-700 border-purple-200" },
  closed: { label: "Đã đóng", color: "bg-slate-900 text-white border-slate-950 font-bold shadow-sm" },
};

const priorityConfig = {
  low: { label: "Thấp", color: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Trung bình", color: "bg-blue-50 text-blue-600 border-blue-200" },
  high: { label: "Cao", color: "bg-amber-50 text-amber-600 border-amber-200" },
  urgent: { label: "Khẩn cấp", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function AdminFeedbackPage() {
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchText, setSearchText] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<{ data: FeedbackReport[] }>("/admin/feedback/all");
      setReports(res?.data || []);
      setFilteredReports(res?.data || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách báo cáo lỗi toàn hệ thống.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Filter application
  useEffect(() => {
    let next = [...reports];

    if (filterStatus !== "all") {
      next = next.filter((r) => r.status === filterStatus);
    }
    if (filterPriority !== "all") {
      next = next.filter((r) => r.priority === filterPriority);
    }
    if (filterCategory !== "all") {
      next = next.filter((r) => r.category === filterCategory);
    }
    if (searchText.trim() !== "") {
      const q = searchText.toLowerCase().trim();
      next = next.filter(
        (r) => 
          r.title.toLowerCase().includes(q) || 
          r.description.toLowerCase().includes(q) ||
          r.reporterName.toLowerCase().includes(q) ||
          r.reporterEmail.toLowerCase().includes(q)
      );
    }

    setFilteredReports(next);
  }, [filterStatus, filterPriority, filterCategory, searchText, reports]);

  return (
    <div className="mx-auto max-w-7xl w-full pb-16 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Hộp thư Báo lỗi & Góp ý
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-semibold">
            Xem toàn bộ danh sách, phân loại mức ưu tiên và chuyển sang các trang xử lý sự cố.
          </p>
        </div>
        <button onClick={fetchReports} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <RefreshCw size={14} />
          Làm mới danh sách
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/70 p-4 text-xs font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Advanced filter card */}
      <Card className="p-5 border border-slate-200 bg-white rounded-2xl flex flex-col gap-4 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
          <Filter size={14} />
          <span>Bộ lọc & Tìm kiếm nhanh</span>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Trạng thái</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="new">Mới gửi</option>
              <option value="in_progress">Đang xử lý</option>
              <option value="resolved">Đã xử lý xong</option>
              <option value="reopened">Cần kiểm tra lại</option>
              <option value="closed">Đã đóng</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Mức độ ưu tiên</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 cursor-pointer"
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">Tất cả mức độ</option>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="urgent">Khẩn cấp</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1.5">Lĩnh vực báo lỗi</label>
            <select
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 cursor-pointer"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="all">Tất cả lĩnh vực</option>
              <option value="ui">Giao diện</option>
              <option value="function">Chức năng</option>
              <option value="data">Dữ liệu</option>
              <option value="payment">Thanh toán</option>
              <option value="invoice">Hóa đơn</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Tìm kiếm sự cố theo tiêu đề, nội dung mô tả, người gửi hoặc email..."
            className="w-full pl-10 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 shadow-sm"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </Card>

      {/* Grid view of tickets */}
      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={32} />
          <span className="text-xs font-semibold text-slate-500">Đang tải danh sách báo cáo sự cố...</span>
        </div>
      ) : filteredReports.length === 0 ? (
        <Card className="p-16 text-center border border-slate-200 bg-white rounded-2xl">
          <FileText size={40} className="text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-black text-slate-700">Hộp thư trống</h4>
          <p className="text-xs text-slate-400 mt-1">Không tìm thấy báo lỗi nào phù hợp với bộ lọc tìm kiếm hiện tại.</p>
        </Card>
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredReports.map((report) => {
            const statusInfo = statusConfig[report.status] || { label: report.status, color: "bg-slate-50 border-slate-200 text-slate-600" };
            const priorityInfo = priorityConfig[report.priority] || { label: report.priority, color: "bg-slate-50 border-slate-200 text-slate-600" };
            const categoryLabel = categoryLabelMap[report.category] || report.category || "Khác";

            return (
              <Link 
                href={`/admin/feedback/${report.id}`} 
                key={report.id}
                className="group block"
              >
                <Card className="p-5 border border-slate-200 bg-white rounded-2xl h-full flex flex-col justify-between hover:border-slate-900 hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer">
                  <div className="space-y-3.5">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[9px] uppercase tracking-wider font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                          {typeLabelMap[report.type] || report.type}
                        </span>
                        {report.category && (
                          <span className="text-[9px] uppercase tracking-wider font-black text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-md">
                            {categoryLabel}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] font-black border px-2.5 py-0.5 rounded-full shrink-0 ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div className="space-y-1">
                      <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {report.title}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                        {report.description}
                      </p>
                    </div>
                  </div>

                  {/* Card Footer Details */}
                  <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-[10px] font-black text-slate-400">
                      <span className={`border px-2 py-0.5 rounded-md ${priorityInfo.color}`}>
                        Ưu tiên: {priorityInfo.label}
                      </span>
                      <span>{new Date(report.created_at).toLocaleDateString("vi-VN")}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 pt-1">
                      <div className="flex items-center gap-1.5 max-w-[170px] truncate text-slate-700">
                        <User size={11} className="text-slate-400 shrink-0" />
                        <span className="truncate">{report.reporterName}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 text-slate-400 shrink-0 font-bold">
                        <MessageSquare size={11} />
                        <span>{report.comments_count} phản hồi</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

    </div>
  );
}
