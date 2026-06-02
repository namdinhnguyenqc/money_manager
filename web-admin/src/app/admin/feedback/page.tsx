"use client";

import React, { useEffect, useState } from "react";
import { 
  AlertCircle,
  HelpCircle, 
  RefreshCw, 
  Send, 
  MessageSquare, 
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Filter,
  Search,
  FileText,
  Lock,
  Globe
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost, apiPatch } from "@/utils/apiClient";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";

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

type Comment = {
  id: string;
  userId: string;
  role: "owner" | "admin";
  message: string;
  isInternal: boolean;
  createdAt: string;
  senderName: string;
  senderAvatar: string | null;
};

type StatusLog = {
  id: string;
  oldStatus: string | null;
  newStatus: string;
  note: string;
  createdAt: string;
  actorName: string;
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
  closed: { label: "Đã đóng", color: "bg-slate-100 text-slate-600 border-slate-200" },
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

  // Details
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Comments / Actions Form
  const [commentInput, setCommentInput] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  
  // Transition Form
  const [statusNote, setStatusNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<{ data: FeedbackReport[] }>("/admin/feedback/admin/all");
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

  const handleOpenDetail = async (report: FeedbackReport) => {
    setSelectedReport(report);
    setLoadingDetails(true);
    setComments([]);
    setStatusLogs([]);
    setCommentInput("");
    setIsInternalComment(false);
    setStatusNote("");
    try {
      const res = await apiGet<{ 
        report: FeedbackReport; 
        comments: Comment[]; 
        statusLogs: StatusLog[] 
      }>(`/admin/feedback/admin/${report.id}`);
      
      if (res?.report) {
        setSelectedReport(res.report);
      }
      setComments(res?.comments || []);
      setStatusLogs(res?.statusLogs || []);
    } catch (err: any) {
      alert(err?.message || "Không thể tải thông tin chi tiết lỗi.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedReport) return;

    setSendingComment(true);
    try {
      await apiPost(`/admin/feedback/admin/${selectedReport.id}/comments`, {
        message: commentInput,
        isInternal: isInternalComment,
      });
      setCommentInput("");
      setIsInternalComment(false);
      // Reload details
      handleOpenDetail(selectedReport);
    } catch (err: any) {
      alert(err?.message || "Gửi phản hồi thất bại.");
    } finally {
      setSendingComment(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: "in_progress" | "resolved" | "closed") => {
    if (!selectedReport) return;

    let confirmMsg = "";
    if (nextStatus === "in_progress") {
      confirmMsg = "Xác nhận chuyển sự cố này sang trạng thái Đang xử lý?";
    } else if (nextStatus === "resolved") {
      confirmMsg = "Xác nhận đã khắc phục xong lỗi và chuyển sang Đã xử lý xong?";
    } else if (nextStatus === "closed") {
      confirmMsg = "Xác nhận đóng sự cố này lại?";
    }

    if (!window.confirm(confirmMsg)) return;

    setSavingStatus(true);
    try {
      await apiPatch(`/admin/feedback/admin/${selectedReport.id}/status`, {
        status: nextStatus,
        note: statusNote.trim() || undefined,
      });
      setStatusNote("");
      
      // Update local state in reports array
      setReports((prev) => 
        prev.map((r) => (r.id === selectedReport.id ? { ...r, status: nextStatus } : r))
      );

      // Reload detail
      handleOpenDetail(selectedReport);
    } catch (err: any) {
      alert(err?.message || "Cập nhật trạng thái thất bại.");
    } finally {
      setSavingStatus(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl w-full animate-in fade-in duration-500 pb-16">
      
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">
            Quản lý Báo lỗi & Góp ý
          </h1>
          <p className="mt-1 text-xs text-slate-500 font-semibold">
            Tiếp nhận báo lỗi, phản hồi trao đổi và cập nhật trạng thái sửa lỗi cho chủ nhà trọ.
          </p>
        </div>
        <button onClick={fetchReports} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <RefreshCw size={14} />
          Làm mới hệ thống
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50/70 p-4 text-xs font-semibold text-red-700 animate-in slide-in-from-top-2">
          {error}
        </div>
      )}

      {/* Main Panel Side-by-Side */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        
        {/* Left column: Filters & Ticket List (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Advanced filter card */}
          <Card className="p-4 border border-slate-200 bg-white rounded-2xl flex flex-col gap-3.5 shadow-xs">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
              <Filter size={14} />
              <span>Bộ lọc tìm kiếm</span>
            </div>

            <div className="grid gap-3 grid-cols-3">
              <div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">Trạng thái: Tất cả</option>
                  <option value="new">Mới gửi</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="resolved">Đã xử lý xong</option>
                  <option value="reopened">Cần kiểm tra lại</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>

              <div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                >
                  <option value="all">Mức ưu tiên: Tất cả</option>
                  <option value="low">Thấp</option>
                  <option value="medium">Trung bình</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
              </div>

              <div>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="all">Lĩnh vực: Tất cả</option>
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
                placeholder="Tìm theo tiêu đề, nội dung, tên hoặc email chủ trọ..."
                className="w-full pl-10 rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 shadow-sm"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
          </Card>

          {/* Ticket list table/card view */}
          <div className="space-y-3">
            {loading ? (
              <div className="py-24 text-center">
                <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={32} />
                <span className="text-xs font-semibold text-slate-500">Đang tải danh sách...</span>
              </div>
            ) : filteredReports.length === 0 ? (
              <Card className="p-12 text-center border border-slate-200/50 bg-white rounded-2xl">
                <FileText size={32} className="text-slate-300 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-700">Không tìm thấy báo lỗi nào phù hợp</h4>
                <p className="text-[11px] text-slate-400 mt-1">Thay đổi điều kiện bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
              </Card>
            ) : (
              filteredReports.map((report) => {
                const statusInfo = statusConfig[report.status] || { label: report.status, color: "bg-slate-50" };
                const priorityInfo = priorityConfig[report.priority] || { label: report.priority, color: "bg-slate-50" };
                const isSelected = selectedReport?.id === report.id;

                return (
                  <Card
                    key={report.id}
                    className={`p-5 border cursor-pointer hover:shadow-sm hover:border-slate-400 transition-all duration-300 rounded-2xl ${
                      isSelected 
                        ? "border-slate-900 bg-slate-900/5 shadow-xs" 
                        : "border-slate-200/60 bg-white"
                    }`}
                    onClick={() => handleOpenDetail(report)}
                  >
                    <div className="flex items-center justify-between gap-2.5 mb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {typeLabelMap[report.type] || report.type}
                        </span>
                        <span className={`text-[10px] font-black border px-2 py-0.5 rounded-full ${priorityInfo.color}`}>
                          {priorityInfo.label}
                        </span>
                      </div>

                      <span className={`text-[10px] font-black border px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="text-sm font-extrabold text-slate-900 truncate mb-1">
                      {report.title}
                    </h3>
                    
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mt-3 pt-2.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <User size={11} className="text-slate-400" />
                        <span>{report.reporterName} ({report.reporterEmail})</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <MessageSquare size={11} />
                        <span>{report.comments_count}</span>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Ticket detailed workflow (5 cols) */}
        <div className="lg:col-span-5">
          <AnimatePresence mode="wait">
            {!selectedReport ? (
              <Card className="p-16 text-center border border-dashed border-slate-200 rounded-2xl bg-white flex flex-col items-center justify-center min-h-[400px]">
                <HelpCircle size={40} className="text-slate-300 mb-3" />
                <h4 className="text-xs font-bold text-slate-700">Chọn một báo cáo để xem chi tiết</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-[200px] leading-relaxed">
                  Lịch sử comment, đổi trạng thái và nội dung trao đổi sẽ hiển thị đầy đủ ở bảng điều khiển bên phải.
                </p>
              </Card>
            ) : (
              <motion.div
                key={selectedReport.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Detail info card */}
                <Card className="p-5 border border-slate-200 bg-white rounded-2xl space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>Gửi lúc: {new Date(selectedReport.created_at).toLocaleString("vi-VN")}</span>
                    <span className={`px-2 py-0.5 border rounded-full font-black ${statusConfig[selectedReport.status]?.color}`}>
                      {statusConfig[selectedReport.status]?.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
                      {selectedReport.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Người gửi: <span className="text-slate-800">{selectedReport.reporterName}</span> ({selectedReport.reporterEmail})
                    </p>
                  </div>

                  <p className="text-xs font-medium text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                    {selectedReport.description}
                  </p>

                  {selectedReport.related_screen && (
                    <div className="text-[11px] font-bold text-slate-400">
                      Đường dẫn màn hình: <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded">{selectedReport.related_screen}</code>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5">Ảnh đính kèm</span>
                      <div className="flex flex-wrap gap-2">
                        {selectedReport.attachments.map((att) => (
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer" key={att.id} className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 hover:opacity-85 transition-opacity">
                            <img src={att.file_url} alt="Screenshot" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* Workflow Controls Card */}
                {selectedReport.status !== "closed" && (
                  <Card className="p-5 border border-slate-200 bg-white rounded-2xl space-y-4">
                    <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                      <AlertCircle size={14} className="text-slate-400" />
                      <span>Thao tác xử lý sự cố</span>
                    </div>

                    <div className="grid gap-2 grid-cols-2">
                      {selectedReport.status === "new" && (
                        <Button 
                          onClick={() => handleUpdateStatus("in_progress")} 
                          variant="primary" 
                          disabled={savingStatus}
                          className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold py-2 col-span-2 shadow-sm shadow-amber-500/10"
                        >
                          Bắt đầu xử lý (In Progress)
                        </Button>
                      )}

                      {(selectedReport.status === "in_progress" || selectedReport.status === "reopened") && (
                        <>
                          <Button 
                            onClick={() => handleUpdateStatus("resolved")} 
                            variant="primary" 
                            disabled={savingStatus}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold py-2 shadow-sm"
                          >
                            Đã xử lý xong (Resolved)
                          </Button>
                          <Button 
                            onClick={() => handleUpdateStatus("closed")} 
                            variant="outline" 
                            disabled={savingStatus}
                            className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold py-2"
                          >
                            Đóng báo cáo (Closed)
                          </Button>
                        </>
                      )}
                    </div>

                    <div>
                      <Label className="font-bold text-slate-700 text-[10px] block mb-1">Ghi chú đổi trạng thái (Tùy chọn)</Label>
                      <input
                        type="text"
                        placeholder="Ví dụ: Đã khắc phục ở bản vá v1.0.3..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700"
                        value={statusNote}
                        onChange={(e) => setStatusNote(e.target.value)}
                      />
                    </div>
                  </Card>
                )}

                {/* Comment chain */}
                <Card className="p-5 border border-slate-200 bg-white rounded-2xl space-y-4">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Lịch sử trao đổi & Phản hồi</span>

                  {loadingDetails ? (
                    <div className="py-8 text-center">
                      <RefreshCw className="animate-spin mx-auto text-slate-300 mb-2" size={24} />
                      <span className="text-xs text-slate-400 font-semibold">Đang tải lịch sử...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-xl">
                      Chưa có trao đổi nào trong sự cố này.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
                      {comments.map((cmt) => {
                        const isCmtAdmin = cmt.role === "admin";
                        return (
                          <div 
                            key={cmt.id} 
                            className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed border ${
                              cmt.isInternal
                                ? "bg-amber-50/70 border-amber-200/50 text-slate-800"
                                : isCmtAdmin
                                  ? "bg-slate-50 border-slate-100 text-slate-800"
                                  : "bg-blue-50/50 border-blue-100 text-slate-800"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1.5 mb-1 text-[9px] font-bold text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <span className={isCmtAdmin ? "text-indigo-600" : "text-blue-600"}>
                                  {cmt.senderName} {isCmtAdmin && "🛡️"}
                                </span>
                                {cmt.isInternal && (
                                  <span className="bg-amber-100 text-amber-700 px-1 rounded flex items-center gap-0.5">
                                    <Lock size={8} /> Ghi chú nội bộ
                                  </span>
                                )}
                              </span>
                              <span>{new Date(cmt.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>

                            <p className="whitespace-pre-wrap">{cmt.message}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Transition logs list */}
                  {statusLogs.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Lịch sử đổi trạng thái</span>
                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
                        {statusLogs.map((l) => (
                          <div key={l.id} className="text-[10px] font-semibold text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg flex items-start gap-1.5">
                            <Clock size={10} className="mt-0.5 text-slate-400" />
                            <div>
                              <span>
                                <strong className="text-slate-800">{l.actorName}</strong> đổi trạng thái sang <span className="text-slate-800 font-extrabold">{statusConfig[l.newStatus as keyof typeof statusConfig]?.label || l.newStatus}</span>
                              </span>
                              {l.note && <span className="block text-slate-400 mt-0.5">Ghi chú: {l.note}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Send reply form */}
                  {selectedReport.status !== "closed" && (
                    <form onSubmit={handleSendComment} className="pt-3 border-t border-slate-100 space-y-3">
                      <textarea
                        required
                        rows={2}
                        placeholder={isInternalComment ? "Nhập ghi chú nội bộ (chỉ Admin nhìn thấy)..." : "Nhập phản hồi gửi đến chủ trọ..."}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 resize-none"
                        value={commentInput}
                        onChange={(e) => setCommentInput(e.target.value)}
                      />

                      <div className="flex items-center justify-between gap-2.5">
                        <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-bold text-slate-500 hover:text-slate-800">
                          <input
                            type="checkbox"
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                            checked={isInternalComment}
                            onChange={(e) => setIsInternalComment(e.target.checked)}
                          />
                          <span className="flex items-center gap-0.5">
                            <Lock size={10} /> Ghi chú nội bộ
                          </span>
                        </label>

                        <Button
                          type="submit"
                          variant="primary"
                          disabled={sendingComment || !commentInput.trim()}
                          icon={<Send size={12} />}
                          className={`rounded-xl text-xs font-bold py-1.5 px-4 shadow-sm ${
                            isInternalComment 
                              ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/10" 
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          Gửi phản hồi
                        </Button>
                      </div>
                    </form>
                  )}
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

    </div>
  );
}
