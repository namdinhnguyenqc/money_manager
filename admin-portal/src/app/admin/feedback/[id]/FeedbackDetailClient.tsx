"use client";

import React, { useEffect, useState } from "react";
import { 
  ArrowLeft,
  AlertCircle,
  HelpCircle, 
  RefreshCw, 
  Send, 
  MessageSquare, 
  Clock,
  User,
  Lock,
  X,
  CheckCircle
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Label } from "@/components/ui/Input";

const apiGet = <T,>(url: string) => apiClient<T>(url, { method: "GET" });
const apiPost = <T,>(url: string, data?: any) => apiClient<T>(url, { method: "POST", body: data ? JSON.stringify(data) : undefined });
const apiPatch = <T,>(url: string, data?: any) => apiClient<T>(url, { method: "PATCH", body: data ? JSON.stringify(data) : undefined });

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
  closed: { label: "Đã đóng", color: "bg-slate-900 text-white border-slate-950 font-bold shadow-sm" },
};

const priorityConfig = {
  low: { label: "Thấp", color: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: { label: "Trung bình", color: "bg-blue-50 text-blue-600 border-blue-200" },
  high: { label: "Cao", color: "bg-amber-50 text-amber-600 border-amber-200" },
  urgent: { label: "Khẩn cấp", color: "bg-red-50 text-red-600 border-red-200" },
};

export default function FeedbackDetailClient({ reportId }: { reportId: string }) {
  const router = useRouter();

  const [report, setReport] = useState<FeedbackReport | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Comments / Actions Form
  const [commentInput, setCommentInput] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);
  
  // Transition Form
  const [statusNote, setStatusNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const fetchDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<{ 
        report: FeedbackReport; 
        comments: Comment[]; 
        statusLogs: StatusLog[] 
      }>(`/admin/feedback/${reportId}`);
      
      if (res?.report) {
        setReport(res.report);
      }
      setComments(res?.comments || []);
      setStatusLogs(res?.statusLogs || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải thông tin chi tiết lỗi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [reportId]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !report) return;

    setSendingComment(true);
    try {
      await apiPost(`/admin/feedback/${report.id}/comments`, {
        message: commentInput,
        isInternal: isInternalComment,
      });
      setCommentInput("");
      setIsInternalComment(false);
      // Reload details
      fetchDetails();
    } catch (err: any) {
      alert(err?.message || "Gửi phản hồi thất bại.");
    } finally {
      setSendingComment(false);
    }
  };

  const handleUpdateStatus = async (nextStatus: "in_progress" | "resolved" | "closed") => {
    if (!report) return;

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
      await apiPatch(`/admin/feedback/${report.id}/status`, {
        status: nextStatus,
        note: statusNote.trim() || undefined,
      });
      setStatusNote("");
      
      // Reload details
      fetchDetails();
    } catch (err: any) {
      alert(err?.message || "Cập nhật trạng thái thất bại.");
    } finally {
      setSavingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={32} />
        <span className="text-xs font-semibold text-slate-500">Đang tải thông tin chi tiết báo cáo...</span>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card className="p-8 text-center border border-red-200 bg-red-50/50 rounded-2xl">
          <AlertCircle className="text-red-500 mx-auto mb-3" size={40} />
          <h3 className="text-sm font-black text-slate-900">Không tìm thấy báo cáo lỗi</h3>
          <p className="text-xs text-slate-500 mt-1.5">{error || "Sự cố không tồn tại hoặc bạn không có quyền xem."}</p>
          <Link href="/admin/feedback" className="mt-5 inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:underline">
            <ArrowLeft size={14} /> Quay lại danh sách
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl w-full pb-16 animate-in fade-in duration-300">
      {/* Breadcrumb / Back button */}
      <div className="mb-6">
        <Link 
          href="/admin/feedback" 
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={14} />
          Quay lại danh sách báo cáo
        </Link>
      </div>

      {/* Closed Status Alert Banner */}
      {report.status === "closed" && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-100 p-5 flex items-start gap-3.5 shadow-xs animate-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Lock size={14} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Báo cáo sự cố đã đóng hoàn tất</h4>
            <p className="text-xs text-slate-500 mt-1 font-semibold leading-relaxed">
              Sự cố này đã được khắc phục hoàn toàn và đóng lại vào lúc {new Date(report.updated_at).toLocaleString("vi-VN")}. Mọi lịch sử phản hồi trao đổi và nhật ký đổi trạng thái của Admin/Chủ trọ đã được lưu trữ an toàn dưới dạng chỉ đọc.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Side: Ticket Detail (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Detail card */}
          <Card className="p-6 border border-slate-200 bg-white rounded-2xl space-y-5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400">
              <span>Gửi lúc: {new Date(report.created_at).toLocaleString("vi-VN")}</span>
              <span className={`px-3 py-0.5 border rounded-full font-black ${statusConfig[report.status]?.color}`}>
                {statusConfig[report.status]?.label}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] uppercase tracking-wider font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md">
                  {typeLabelMap[report.type] || report.type}
                </span>
                {report.category && (
                  <span className="text-[10px] uppercase tracking-wider font-black text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-0.5 rounded-md">
                    {categoryLabelMap[report.category] || report.category}
                  </span>
                )}
                <span className={`text-[10px] font-black border px-2.5 py-0.5 rounded-md ${priorityConfig[report.priority]?.color}`}>
                  Độ ưu tiên: {priorityConfig[report.priority]?.label}
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-950 tracking-tight leading-snug">
                {report.title}
              </h2>
            </div>

            {/* Reporter details card */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold shrink-0">
                <User size={18} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Người báo cáo lỗi</div>
                <div className="truncate text-sm font-black text-slate-900 mt-0.5">{report.reporterName}</div>
                <div className="truncate text-xs font-semibold text-slate-500">{report.reporterEmail}</div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Chi tiết mô tả sự cố</span>
              <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {report.description}
              </p>
            </div>

            {report.related_screen && (
              <div className="text-xs font-bold text-slate-400">
                Đường dẫn màn hình: <code className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded">{report.related_screen}</code>
              </div>
            )}

            {/* Attachments */}
            {report.attachments && report.attachments.length > 0 && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-2.5">Hình ảnh đính kèm ({report.attachments.length})</span>
                <div className="flex flex-wrap gap-2.5">
                  {report.attachments.map((att) => (
                    <button 
                      type="button" 
                      key={att.id} 
                      onClick={() => setActiveImage(att.file_url)}
                      className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 hover:border-slate-400 hover:scale-[1.03] transition-all duration-200 shadow-sm shrink-0 cursor-zoom-in"
                    >
                      <img src={att.file_url} alt="Screenshot" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Comment chain */}
          <Card className="p-6 border border-slate-200 bg-white rounded-2xl space-y-5">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Lịch sử trao đổi & Phản hồi</span>

            {comments.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200/50">
                Chưa có trao đổi nào trong sự cố này.
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((cmt) => {
                  const isCmtAdmin = cmt.role === "admin";
                  return (
                    <div 
                      key={cmt.id} 
                      className={`p-4 rounded-2xl text-xs font-semibold leading-relaxed border ${
                        cmt.isInternal
                          ? "bg-amber-50/70 border-amber-200/50 text-slate-800"
                          : isCmtAdmin
                            ? "bg-slate-50 border-slate-100 text-slate-800"
                            : "bg-blue-50/50 border-blue-100 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1.5 text-[9px] font-bold text-slate-400">
                        <span className="flex items-center gap-1.5">
                          <span className={isCmtAdmin ? "text-indigo-600" : "text-blue-600"}>
                            {cmt.senderName} {isCmtAdmin && "🛡️"}
                          </span>
                          {cmt.isInternal && (
                            <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold uppercase text-[8px] tracking-wide">
                              <Lock size={8} /> Ghi chú nội bộ
                            </span>
                          )}
                        </span>
                        <span>{new Date(cmt.createdAt).toLocaleString("vi-VN")}</span>
                      </div>

                      <p className="whitespace-pre-wrap text-slate-700 text-sm font-semibold">{cmt.message}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Send reply form */}
            {report.status !== "closed" && (
              <form onSubmit={handleSendComment} className="pt-4 border-t border-slate-100 space-y-3.5">
                <textarea
                  required
                  rows={3}
                  placeholder={isInternalComment ? "Nhập ghi chú nội bộ (chỉ Admin nhìn thấy)..." : "Nhập phản hồi gửi đến chủ trọ..."}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700 resize-none shadow-sm"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                />

                <div className="flex items-center justify-between gap-2.5">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-black text-slate-500 hover:text-slate-800">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                      checked={isInternalComment}
                      onChange={(e) => setIsInternalComment(e.target.checked)}
                    />
                    <span className="flex items-center gap-0.5">
                      <Lock size={11} /> Ghi chú nội bộ (Private)
                    </span>
                  </label>

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={sendingComment || !commentInput.trim()}
                    icon={<Send size={12} />}
                    className={`rounded-xl text-xs font-bold py-2 px-5 shadow-sm ${
                      isInternalComment 
                        ? "bg-amber-600 hover:bg-amber-700 text-white" 
                        : "bg-slate-900 hover:bg-slate-800 text-white"
                    }`}
                  >
                    Gửi phản hồi
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Right Side: Workflow, Status Transitions (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Workflow Transitions / Closed summary info card */}
          {report.status === "closed" ? (
            <Card className="p-6 border border-slate-200 bg-white rounded-2xl space-y-4 text-center animate-in fade-in duration-300">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs border border-emerald-100">
                <CheckCircle size={20} />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-950 uppercase tracking-wider">Trạng thái: Đóng hoàn tất</h4>
                <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                  Sự cố đã được kiểm tra và xác nhận khắc phục thành công. Hệ thống đã lưu trữ và khóa luồng phản hồi cho báo cáo này.
                </p>
              </div>
            </Card>
          ) : (
            <Card className="p-6 border border-slate-200 bg-white rounded-2xl space-y-4">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                <AlertCircle size={14} className="text-slate-400" />
                <span>Thao tác xử lý sự cố</span>
              </div>

              <div className="grid gap-2 grid-cols-1">
                {report.status === "new" && (
                  <Button 
                    onClick={() => handleUpdateStatus("in_progress")} 
                    variant="primary" 
                    disabled={savingStatus}
                    className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold py-2.5 w-full shadow-sm"
                  >
                    Bắt đầu xử lý (In Progress)
                  </Button>
                )}

                {(report.status === "in_progress" || report.status === "reopened") && (
                  <div className="flex flex-col gap-2">
                    <Button 
                      onClick={() => handleUpdateStatus("resolved")} 
                      variant="primary" 
                      disabled={savingStatus}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold py-2.5 w-full shadow-sm"
                    >
                      Đã xử lý xong (Resolved)
                    </Button>
                    <Button 
                      onClick={() => handleUpdateStatus("closed")} 
                      variant="outline" 
                      disabled={savingStatus}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold py-2.5 w-full"
                    >
                      Đóng báo cáo (Closed)
                    </Button>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Label className="font-bold text-slate-700 text-[10px] block mb-1">Ghi chú đổi trạng thái (Tùy chọn)</Label>
                <input
                  type="text"
                  placeholder="Ví dụ: Đã khắc phục ở bản vá v1.0.3..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-700"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>
            </Card>
          )}

          {/* Status logs list */}
          {statusLogs.length > 0 && (
            <Card className="p-6 border border-slate-200 bg-white rounded-2xl space-y-4">
              <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Lịch sử đổi trạng thái</span>
              <div className="relative border-l-2 border-slate-100 pl-4 ml-2 space-y-4">
                {statusLogs.map((l) => (
                  <div key={l.id} className="relative text-xs font-semibold text-slate-500 leading-relaxed">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-slate-300 ring-4 ring-white" />
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block">{new Date(l.createdAt).toLocaleString("vi-VN")}</span>
                      <span className="text-slate-700 font-bold block mt-0.5">
                        {l.actorName} <span className="text-slate-400 font-medium">chuyển sang</span> {statusConfig[l.newStatus as keyof typeof statusConfig]?.label || l.newStatus}
                      </span>
                      {l.note && <span className="block text-slate-400 mt-1 bg-slate-50 p-2 rounded-lg border border-slate-100/50">Ghi chú: {l.note}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md cursor-zoom-out p-4 animate-in fade-in duration-200"
          onClick={() => setActiveImage(null)}
        >
          <button 
            type="button"
            className="absolute top-6 right-6 text-white hover:text-slate-300 bg-white/10 hover:bg-white/20 p-3 rounded-full transition-all duration-200 shadow-lg cursor-pointer"
            onClick={() => setActiveImage(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={activeImage} 
            alt="Large preview" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl cursor-default animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </div>
  );
}
