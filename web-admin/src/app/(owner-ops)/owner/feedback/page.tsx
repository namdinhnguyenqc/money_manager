"use client";

import React, { useEffect, useState } from "react";
import { 
  AlertCircle,
  HelpCircle, 
  Plus, 
  RefreshCw, 
  Send, 
  MessageSquare, 
  ChevronRight, 
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiGet, apiPost } from "@/utils/apiClient";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input, { Label, Select as UISelect } from "@/components/ui/Input";

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
};

type Comment = {
  id: string;
  userId: string;
  role: "owner" | "admin";
  message: string;
  createdAt: string;
  senderName: string;
  senderAvatar: string | null;
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
  low: { label: "Thấp", color: "bg-slate-100 text-slate-600" },
  medium: { label: "Trung bình", color: "bg-blue-50 text-blue-600" },
  high: { label: "Cao", color: "bg-amber-50 text-amber-600" },
  urgent: { label: "Khẩn cấp", color: "bg-red-50 text-red-600" },
};

export default function OwnerFeedbackPage() {
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal create ticket
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"bug" | "suggestion" | "support">("bug");
  const [category, setCategory] = useState<"ui" | "function" | "data" | "payment" | "invoice" | "other">("ui");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [relatedScreen, setRelatedScreen] = useState("");
  const [attachments, setAttachments] = useState<Array<{ fileUrl: string; fileName: string; fileType: string }>>([]);

  // Modal ticket detail & comment chain
  const [selectedReport, setSelectedReport] = useState<FeedbackReport | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [reopenReasonInput, setReopenReasonInput] = useState("");
  const [showReopenForm, setShowReopenForm] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingComment, setSendingComment] = useState(false);

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await apiGet<{ data: FeedbackReport[] }>("/owner/feedback");
      setReports(res?.data || []);
    } catch (err: any) {
      setError(err?.message || "Không thể tải danh sách báo cáo lỗi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (attachments.length + files.length > 5) {
      alert("Chỉ cho phép đính kèm tối đa 5 hình ảnh.");
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        alert("Chỉ chấp nhận file hình ảnh.");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        alert("Mỗi hình ảnh có dung lượng tối đa 2MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          { fileUrl: base64, fileName: file.name, fileType: file.type },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert("Vui lòng nhập đủ tiêu đề và nội dung mô tả.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await apiPost("/owner/feedback", {
        title,
        description,
        type,
        category,
        priority,
        relatedScreen,
        attachments,
      });
      setSuccess("Gửi báo cáo lỗi/góp ý thành công!");
      setShowCreateModal(false);
      
      // Reset form
      setTitle("");
      setDescription("");
      setType("bug");
      setCategory("ui");
      setPriority("medium");
      setRelatedScreen("");
      setAttachments([]);

      fetchReports();
      setTimeout(() => setSuccess(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Không thể gửi báo cáo lỗi.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenDetail = async (report: FeedbackReport) => {
    setSelectedReport(report);
    setLoadingDetails(true);
    setComments([]);
    setCommentInput("");
    setReopenReasonInput("");
    setShowReopenForm(false);
    try {
      const res = await apiGet<{ report: FeedbackReport; comments: Comment[] }>(
        `/owner/feedback/${report.id}`
      );
      if (res?.report) {
        setSelectedReport(res.report);
      }
      setComments(res?.comments || []);
    } catch (err: any) {
      alert(err?.message || "Không thể tải chi tiết phản hồi.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedReport) return;

    setSendingComment(true);
    try {
      await apiPost(`/owner/feedback/${selectedReport.id}/comments`, {
        message: commentInput,
      });
      setCommentInput("");
      // Reload comments
      handleOpenDetail(selectedReport);
    } catch (err: any) {
      alert(err?.message || "Không thể gửi phản hồi.");
    } finally {
      setSendingComment(false);
    }
  };

  const handleCloseReport = async () => {
    if (!selectedReport) return;
    if (!window.confirm("Bạn xác nhận lỗi này đã được xử lý xong ổn thỏa và muốn đóng báo cáo?")) return;

    try {
      await apiPost(`/owner/feedback/${selectedReport.id}/close`, {});
      setSuccess("Đã đóng báo cáo lỗi.");
      setSelectedReport(null);
      fetchReports();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      alert(err?.message || "Không thể đóng báo cáo.");
    }
  };

  const handleReopenReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport || !reopenReasonInput.trim()) return;

    try {
      await apiPost(`/owner/feedback/${selectedReport.id}/reopen`, {
        message: reopenReasonInput,
      });
      setSuccess("Yêu cầu xử lý lại đã được gửi.");
      setSelectedReport(null);
      fetchReports();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      alert(err?.message || "Không thể mở lại báo cáo lỗi.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl w-full animate-in fade-in duration-500 pb-16">
      <PageHeader
        title="Báo cáo lỗi / Góp ý"
        subtitle="Ý kiến của bạn giúp TrọCare hoạt động mượt mà và thông minh hơn."
        actions={
          <div className="flex gap-2.5">
            <Button variant="outline" icon={<RefreshCw size={14} />} onClick={fetchReports} className="border-slate-200 hover:bg-slate-50 transition-all font-semibold rounded-xl text-slate-700">
              Làm mới
            </Button>
            <Button 
              variant="primary" 
              icon={<Plus size={15} />} 
              onClick={() => setShowCreateModal(true)} 
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/10 px-5 transition-all"
            >
              Tạo báo cáo mới
            </Button>
          </div>
        }
      />

      {(error || success) && (
        <div className={`mb-6 rounded-2xl p-4 text-sm font-semibold flex items-center gap-3 border shadow-sm transition-all animate-in slide-in-from-top-2 ${
          error 
            ? "border-red-100 bg-red-50/70 text-red-700" 
            : "border-emerald-100 bg-emerald-50/70 text-emerald-700"
        }`}>
          <div className={`w-2 h-2 rounded-full ${error ? "bg-red-500" : "bg-emerald-500"}`} />
          <span className="flex-1">{error || success}</span>
        </div>
      )}

      {loading ? (
        <div className="py-24 text-center">
          <RefreshCw className="animate-spin mx-auto text-slate-400 mb-3" size={32} />
          <span className="text-sm font-medium text-slate-500">Đang tải danh sách báo cáo...</span>
        </div>
      ) : reports.length === 0 ? (
        <Card className="p-16 text-center border border-slate-200/60 rounded-[2rem] bg-white flex flex-col items-center">
          <HelpCircle size={48} className="text-slate-300 mb-4" />
          <h3 className="text-lg font-black text-slate-800 tracking-tight">Chưa có báo cáo lỗi hoặc góp ý nào</h3>
          <p className="text-slate-400 text-sm mt-1.5 max-w-sm">Bất cứ lúc nào hệ thống gặp lỗi hoặc bạn có ý tưởng cải tiến, hãy gửi ngay cho đội ngũ kỹ thuật.</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)} className="mt-5 rounded-xl bg-slate-900 text-white font-bold px-6">
            Gửi báo cáo đầu tiên
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {reports.map((report) => {
            const statusInfo = statusConfig[report.status] || { label: report.status, color: "bg-slate-100" };
            const priorityInfo = priorityConfig[report.priority] || { label: report.priority, color: "bg-slate-100" };
            
            return (
              <Card 
                key={report.id} 
                className="p-6 border border-slate-200/60 rounded-3xl bg-white hover:border-slate-400 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col justify-between"
                onClick={() => handleOpenDetail(report)}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs uppercase tracking-wider font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      {typeLabelMap[report.type] || report.type}
                    </span>
                    <span className={`text-[11px] font-black border px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight mb-2 truncate">
                    {report.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 mb-4 leading-relaxed">
                    {report.description}
                  </p>
                </div>

                <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                  <div className="flex items-center gap-2.5">
                    <span>Ưu tiên: <strong className="text-slate-700">{priorityInfo.label}</strong></span>
                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                    <span>Lĩnh vực: <strong className="text-slate-700">{categoryLabelMap[report.category] || report.category}</strong></span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-800">
                    <MessageSquare size={12} className="text-slate-400" />
                    <span>{report.comments_count} phản hồi</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE REPORT MODAL */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Tạo báo cáo lỗi / Góp ý</h3>
                  <p className="text-xs text-slate-500">Mô tả cụ thể vấn đề của bạn để kỹ thuật viên xử lý nhanh nhất.</p>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">&times;</button>
              </div>

              <form onSubmit={handleCreateReport} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <Label className="font-bold text-slate-800 text-xs">Tiêu đề ngắn gọn</Label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Không lưu được số điện nước..."
                    className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold text-slate-800 text-xs">Loại báo cáo</Label>
                    <select
                      className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm appearance-none"
                      value={type}
                      onChange={(e) => setType(e.target.value as any)}
                    >
                      <option value="bug">Báo lỗi hệ thống</option>
                      <option value="suggestion">Góp ý cải thiện</option>
                      <option value="support">Yêu cầu hỗ trợ</option>
                    </select>
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800 text-xs">Mức độ ưu tiên</Label>
                    <select
                      className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm appearance-none"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                    >
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                      <option value="urgent">Khẩn cấp</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold text-slate-800 text-xs">Lĩnh vực phát sinh</Label>
                    <select
                      className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm appearance-none"
                      value={category}
                      onChange={(e) => setCategory(e.target.value as any)}
                    >
                      <option value="ui">Giao diện (UI)</option>
                      <option value="function">Chức năng (Function)</option>
                      <option value="data">Dữ liệu (Data)</option>
                      <option value="payment">Thanh toán (Payment)</option>
                      <option value="invoice">Hóa đơn (Invoice)</option>
                      <option value="other">Khác (Other)</option>
                    </select>
                  </div>

                  <div>
                    <Label className="font-bold text-slate-800 text-xs">Màn hình liên quan (nếu có)</Label>
                    <input
                      type="text"
                      placeholder="Ví dụ: /invoices/new"
                      className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm"
                      value={relatedScreen}
                      onChange={(e) => setRelatedScreen(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label className="font-bold text-slate-800 text-xs">Mô tả chi tiết</Label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Mô tả cụ thể hoàn cảnh phát sinh lỗi, các bước tái hiện, thiết bị đang sử dụng..."
                    className="w-full mt-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div>
                  <Label className="font-bold text-slate-800 text-xs block mb-1.5">Ảnh chụp màn hình ({attachments.length}/5)</Label>
                  <div className="flex flex-wrap gap-2.5 items-center">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200">
                        <img src={att.fileUrl} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          type="button" 
                          onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg w-5 h-5 flex items-center justify-center text-[10px] font-bold"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {attachments.length < 5 && (
                      <label className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 hover:border-slate-400 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                        <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                        <ImageIcon size={18} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="rounded-xl border-slate-200">
                    Hủy
                  </Button>
                  <Button type="submit" variant="primary" disabled={submitting} loading={submitting} className="bg-slate-900 text-white rounded-xl font-bold px-6">
                    Gửi báo cáo
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL WORKFLOW MODAL */}
      <AnimatePresence>
        {selectedReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-end p-0 bg-slate-900/30 backdrop-blur-xs">
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white h-screen w-full max-w-xl border-l border-slate-200 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold uppercase bg-slate-200/70 text-slate-600 px-2.5 py-0.5 rounded-full">
                    Mã ticket: {selectedReport.id.slice(0, 8)}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1 truncate max-w-sm">
                    {selectedReport.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedReport(null)} 
                  className="text-slate-400 hover:text-slate-700 font-bold p-1 text-lg"
                >
                  &times;
                </button>
              </div>

              {/* Main Area */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Description card */}
                <Card className="p-5 border border-slate-200/60 rounded-3xl bg-slate-50/50">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {new Date(selectedReport.created_at).toLocaleString("vi-VN")}
                    </span>
                    <span className={`px-2.5 py-0.5 border rounded-full font-black ${statusConfig[selectedReport.status]?.color}`}>
                      {statusConfig[selectedReport.status]?.label}
                    </span>
                  </div>

                  <p className="text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                    {selectedReport.description}
                  </p>

                  {selectedReport.related_screen && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                      <ExternalLink size={12} />
                      <span>Màn hình phát sinh: {selectedReport.related_screen}</span>
                    </div>
                  )}

                  {/* Image attachments */}
                  {selectedReport.attachments && selectedReport.attachments.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-200/50">
                      <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Ảnh đính kèm</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedReport.attachments.map((att) => (
                          <a href={att.file_url} target="_blank" rel="noopener noreferrer" key={att.id} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200/60 hover:opacity-80 transition-opacity">
                            <img src={att.file_url} alt="Attachment" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>

                {/* RESOLVED ACTION CARD */}
                {selectedReport.status === "resolved" && !showReopenForm && (
                  <Card className="p-5 border-2 border-emerald-200 bg-emerald-50/40 rounded-3xl flex flex-col gap-3.5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-emerald-600 mt-0.5 shrink-0" size={18} />
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Vấn đề đã xử lý xong!</h4>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">Admin đã đánh dấu sự cố này được khắc phục. Vui lòng xác nhận kết quả kiểm tra lại của bạn.</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <Button 
                        onClick={handleCloseReport} 
                        variant="primary" 
                        icon={<CheckCircle size={14} />} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold px-4 py-2 text-xs flex-1"
                      >
                        Đã ổn, đóng báo cáo
                      </Button>
                      <Button 
                        onClick={() => setShowReopenForm(true)} 
                        variant="outline" 
                        icon={<XCircle size={14} />} 
                        className="border-red-200 bg-white hover:bg-red-50 text-red-600 rounded-xl font-bold px-4 py-2 text-xs flex-1"
                      >
                        Chưa đúng, gửi lại
                      </Button>
                    </div>
                  </Card>
                )}

                {/* REOPEN REASON FORM */}
                {showReopenForm && (
                  <Card className="p-5 border-2 border-red-200 bg-red-50/30 rounded-3xl animate-in slide-in-from-bottom-3">
                    <h4 className="text-sm font-bold text-slate-900 mb-1">Mô tả lý do xử lý chưa đạt</h4>
                    <p className="text-xs text-slate-500 font-medium mb-3">Vui lòng cung cấp chi tiết lỗi phát sinh thêm hoặc điểm chưa đúng.</p>
                    <form onSubmit={handleReopenReport} className="space-y-3">
                      <textarea
                        required
                        rows={3}
                        placeholder="Nhập lý do cụ thể..."
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm resize-none"
                        value={reopenReasonInput}
                        onChange={(e) => setReopenReasonInput(e.target.value)}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => setShowReopenForm(false)} className="rounded-xl border-slate-200 text-xs py-1.5 px-3">
                          Quay lại
                        </Button>
                        <Button type="submit" variant="primary" className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs py-1.5 px-4 shadow-md">
                          Gửi yêu cầu mở lại
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {/* Discussion Thread */}
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase text-slate-500 tracking-widest block">Thảo luận / Trao đổi</span>

                  {loadingDetails ? (
                    <div className="py-8 text-center">
                      <RefreshCw className="animate-spin mx-auto text-slate-300 mb-2" size={24} />
                      <span className="text-xs text-slate-400">Đang tải lịch sử trao đổi...</span>
                    </div>
                  ) : comments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400 font-medium bg-slate-50 rounded-2xl">
                      Chưa có phản hồi nào. Kỹ thuật viên sẽ liên hệ với bạn tại đây.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((cmt) => {
                        const isAdmin = cmt.role === "admin";
                        return (
                          <div 
                            key={cmt.id} 
                            className={`flex gap-3 items-start ${isAdmin ? "flex-row-reverse text-right" : "text-left"}`}
                          >
                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 overflow-hidden border border-slate-100 shadow-xs">
                              {cmt.senderAvatar ? (
                                <img src={cmt.senderAvatar} alt="avatar" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-xs font-bold text-slate-500 uppercase">
                                  {cmt.senderName.slice(0, 1)}
                                </span>
                              )}
                            </div>

                            <div className="max-w-[75%]">
                              <div className="flex items-center gap-2 mb-1 justify-start">
                                <span className={`text-xs font-extrabold ${isAdmin ? "text-indigo-600" : "text-slate-700"}`}>
                                  {cmt.senderName} {isAdmin && "🛡️ (Admin)"}
                                </span>
                                <span className="text-xs text-slate-500 font-semibold">
                                  {new Date(cmt.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>

                              <div className={`p-3.5 rounded-2xl text-xs font-semibold leading-relaxed ${
                                isAdmin 
                                  ? "bg-slate-100 text-slate-800 rounded-tr-none" 
                                  : "bg-blue-600 text-white rounded-tl-none shadow-sm"
                              }`}>
                                {cmt.message}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Form Input Reply */}
              {selectedReport.status !== "closed" && (
                <form onSubmit={handleSendComment} className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nhập phản hồi hoặc nội dung trao đổi..."
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs focus:border-slate-900 focus:outline-none transition-all font-semibold text-slate-800 shadow-sm"
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                  />
                  <Button 
                    type="submit" 
                    variant="primary" 
                    disabled={sendingComment || !commentInput.trim()} 
                    icon={<Send size={13} />}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold px-4 py-3 shrink-0 shadow-sm shadow-slate-900/10"
                  >
                    Gửi
                  </Button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
