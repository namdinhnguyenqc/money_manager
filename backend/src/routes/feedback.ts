import { Hono } from "hono";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { createNotification } from "../services/notificationService.js";
import type { AppEnv } from "../types.js";
import { supabaseAdmin } from "../lib/supabase.js";

export const ownerFeedbackRoutes = new Hono<AppEnv>();
export const adminFeedbackRoutes = new Hono<AppEnv>();

// Validation Schemas
const createReportSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được rỗng"),
  description: z.string().trim().min(1, "Nội dung mô tả không được rỗng"),
  type: z.enum(["bug", "suggestion", "support"]),
  category: z.enum(["ui", "function", "data", "payment", "invoice", "other"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  relatedScreen: z.string().optional(),
  attachments: z.array(
    z.object({
      fileUrl: z.string().min(1), // Base64 Data URI
      fileName: z.string().optional(),
      fileType: z.string().optional(),
    })
  ).max(5, "Tối đa 5 ảnh đính kèm").optional(),
});

const addCommentSchema = z.object({
  message: z.string().trim().min(1, "Nội dung phản hồi không được rỗng"),
});

const adminUpdateStatusSchema = z.object({
  status: z.enum(["new", "in_progress", "resolved", "reopened", "closed"]),
  note: z.string().optional(),
});

const adminAddCommentSchema = z.object({
  message: z.string().trim().min(1, "Nội dung phản hồi không được rỗng"),
  isInternal: z.boolean().default(false),
});

// Helper for DB Errors
const handleDbError = (c: any, error: any, customMsg: string) => {
  console.error(`${customMsg}:`, error);
  return c.json({ error: customMsg, details: error.message }, 500);
};

// ────────────────────────────────────────────────────────────
// OWNER ROUTES (Mounted at /owner/feedback)
// ────────────────────────────────────────────────────────────

// Create Feedback Report
ownerFeedbackRoutes.post("/", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const parsed = await c.req.json().catch(() => ({}));
  
  const validation = createReportSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Dữ liệu không hợp lệ", details: validation.error.format() }, 400);
  }

  const { title, description, type, category, priority, relatedScreen, attachments } = validation.data;

  // 1. Insert Feedback Report
  const { data: report, error: reportErr } = await db
    .from("feedback_reports")
    .insert({
      reporter_id: user.id,
      title,
      description,
      type,
      category: category || "other",
      priority,
      status: "new",
      related_screen: relatedScreen || null,
    })
    .select()
    .single();

  if (reportErr || !report) {
    return handleDbError(c, reportErr, "Không thể tạo báo cáo lỗi");
  }

  // 2. Upload Attachments to Supabase Storage if any
  if (attachments && attachments.length > 0) {
    const uploadPromises = attachments.map(async (att, index) => {
      try {
        const fileUrl = att.fileUrl;
        if (fileUrl.startsWith("data:")) {
          const match = fileUrl.match(/^data:([^;]+);base64,(.+)$/);
          if (match) {
            const mimeType = match[1];
            const base64Data = match[2];
            const buffer = Buffer.from(base64Data, "base64");
            
            // Determine file extension
            let ext = "png";
            if (mimeType.includes("jpeg") || mimeType.includes("jpg")) ext = "jpg";
            else if (mimeType.includes("gif")) ext = "gif";
            else if (mimeType.includes("webp")) ext = "webp";

            const fileName = `${report.id}/${Date.now()}_${index}.${ext}`;

            // Upload using supabaseAdmin (bypasses RLS to write to public bucket)
            const { error: uploadErr } = await supabaseAdmin.storage
              .from("feedback-attachments")
              .upload(fileName, buffer, {
                contentType: mimeType,
                duplex: "half"
              } as any);

            if (uploadErr) {
              console.error("Supabase Storage upload error:", uploadErr.message);
              // Fallback to storing base64 if upload fails
              return {
                report_id: report.id,
                file_url: fileUrl,
                file_name: att.fileName || `attachment_${index}`,
                file_type: mimeType,
              };
            }

            // Get public URL
            const { data: { publicUrl } } = supabaseAdmin.storage
              .from("feedback-attachments")
              .getPublicUrl(fileName);

            return {
              report_id: report.id,
              file_url: publicUrl,
              file_name: att.fileName || `attachment_${index}`,
              file_type: mimeType,
            };
          }
        }
      } catch (err: any) {
        console.error("Attachment processing error:", err.message);
      }

      // Default fallback
      return {
        report_id: report.id,
        file_url: att.fileUrl,
        file_name: att.fileName || `attachment_${index}`,
        file_type: att.fileType || "image/png",
      };
    });

    const payload = await Promise.all(uploadPromises);
    const { error: attErr } = await db.from("feedback_attachments").insert(payload);
    if (attErr) {
      console.error("Failed to insert attachments to db:", attErr.message);
    }
  }

  // 3. Log Initial Status
  await db.from("feedback_status_logs").insert({
    report_id: report.id,
    changed_by: user.id,
    old_status: null,
    new_status: "new",
    note: "Báo cáo lỗi/góp ý được tạo mới từ Owner",
  });

  // 4. Send Notification to all Admin users
  try {
    const { data: admins } = await supabaseAdmin
      .from("users")
      .select("id")
      .in("role", ["ADMIN", "SUPER_ADMIN"]);

    if (admins && admins.length > 0) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: "Báo cáo lỗi mới 🚨",
          body: `Chủ trọ ${user.name || user.email} vừa báo lỗi: "${title}"`,
          type: "system",
          data: { report_id: report.id },
          channel: "in_app",
        });
      }
    }
  } catch (notifErr: any) {
    console.error("Failed to notify admins:", notifErr.message);
  }

  return c.json({ success: true, report }, 201);
});

// List My Feedback Reports
ownerFeedbackRoutes.get("/", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");

  const { data: reports, error } = await db
    .from("feedback_reports")
    .select(`
      *,
      attachments:feedback_attachments(id, file_url, file_name, file_type),
      comments_count:feedback_comments(id)
    `)
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return handleDbError(c, error, "Không thể tải danh sách báo cáo");
  }

  // Map comments count
  const mapped = (reports || []).map((r: any) => ({
    ...r,
    comments_count: r.comments_count ? r.comments_count.length : 0,
  }));

  return c.json({ data: mapped });
});

// Get My Feedback Detail
ownerFeedbackRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const reportId = c.req.param("id");

  const { data: report, error } = await db
    .from("feedback_reports")
    .select(`
      *,
      attachments:feedback_attachments(id, file_url, file_name, file_type)
    `)
    .eq("id", reportId)
    .eq("reporter_id", user.id)
    .single();

  if (error || !report) {
    return c.json({ error: "Không tìm thấy báo cáo lỗi này hoặc bạn không có quyền xem" }, 404);
  }

  // Load standard comments (ignore internal notes)
  const { data: comments } = await db
    .from("feedback_comments")
    .select(`
      id,
      user_id,
      role,
      message,
      created_at,
      sender:users(id, name, avatar, email)
    `)
    .eq("report_id", reportId)
    .eq("is_internal", false)
    .order("created_at", { ascending: true });

  return c.json({
    report,
    comments: (comments || []).map((cmt: any) => ({
      id: cmt.id,
      userId: cmt.user_id,
      role: cmt.role,
      message: cmt.message,
      createdAt: cmt.created_at,
      senderName: cmt.sender?.name || cmt.sender?.email || "Người dùng",
      senderAvatar: cmt.sender?.avatar || null,
    })),
  });
});

// Add Comment (Owner)
ownerFeedbackRoutes.post("/:id/comments", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const reportId = c.req.param("id");
  const parsed = await c.req.json().catch(() => ({}));

  const validation = addCommentSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Nội dung không hợp lệ", details: validation.error.format() }, 400);
  }

  // Verify ownership
  const { data: report, error: checkErr } = await db
    .from("feedback_reports")
    .select("id, title")
    .eq("id", reportId)
    .eq("reporter_id", user.id)
    .single();

  if (checkErr || !report) {
    return c.json({ error: "Không tìm thấy báo cáo lỗi" }, 404);
  }

  const { message } = validation.data;

  const { data: comment, error: cmtErr } = await db
    .from("feedback_comments")
    .insert({
      report_id: reportId,
      user_id: user.id,
      role: "owner",
      message,
      is_internal: false,
    })
    .select()
    .single();

  if (cmtErr) {
    return handleDbError(c, cmtErr, "Không thể gửi phản hồi");
  }

  // Update report timestamp
  await db
    .from("feedback_reports")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", reportId);

  // Notify admins
  try {
    const { data: admins } = await supabaseAdmin
      .from("users")
      .select("id")
      .in("role", ["ADMIN", "SUPER_ADMIN"]);

    if (admins) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: "Phản hồi báo lỗi mới 💬",
          body: `Chủ trọ ${user.name || user.email} phản hồi về lỗi: "${report.title}"`,
          type: "system",
          data: { report_id: reportId },
          channel: "in_app",
        });
      }
    }
  } catch (err) {
    console.error("Notify admins failed:", err);
  }

  return c.json({ success: true, comment });
});

// Close Ticket (Owner)
ownerFeedbackRoutes.post("/:id/close", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const reportId = c.req.param("id");

  // Verify ownership
  const { data: report, error: checkErr } = await db
    .from("feedback_reports")
    .select("id, status")
    .eq("id", reportId)
    .eq("reporter_id", user.id)
    .single();

  if (checkErr || !report) {
    return c.json({ error: "Không tìm thấy báo cáo lỗi" }, 404);
  }

  // Confirm close
  const { error: updateErr } = await db
    .from("feedback_reports")
    .update({
      status: "closed",
      closed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateErr) {
    return handleDbError(c, updateErr, "Không thể đóng báo cáo lỗi");
  }

  // Log status change
  await db.from("feedback_status_logs").insert({
    report_id: reportId,
    changed_by: user.id,
    old_status: report.status,
    new_status: "closed",
    note: "Owner xác nhận đã ổn và đóng báo cáo",
  });

  return c.json({ success: true });
});

// Reopen Ticket (Owner)
ownerFeedbackRoutes.post("/:id/reopen", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const reportId = c.req.param("id");
  const parsed = await c.req.json().catch(() => ({}));

  const validation = addCommentSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Vui lòng nhập lý do gửi lại feedback", details: validation.error.format() }, 400);
  }

  // Verify ownership
  const { data: report, error: checkErr } = await db
    .from("feedback_reports")
    .select("id, title, status")
    .eq("id", reportId)
    .eq("reporter_id", user.id)
    .single();

  if (checkErr || !report) {
    return c.json({ error: "Không tìm thấy báo cáo lỗi" }, 404);
  }

  const { message } = validation.data;

  // Insert reopen reason comment
  await db.from("feedback_comments").insert({
    report_id: reportId,
    user_id: user.id,
    role: "owner",
    message: `[Yêu cầu mở lại vì chưa đúng] ${message}`,
    is_internal: false,
  });

  // Transition to reopened
  const { error: updateErr } = await db
    .from("feedback_reports")
    .update({
      status: "reopened",
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateErr) {
    return handleDbError(c, updateErr, "Không thể mở lại báo cáo lỗi");
  }

  // Log status change
  await db.from("feedback_status_logs").insert({
    report_id: reportId,
    changed_by: user.id,
    old_status: report.status,
    new_status: "reopened",
    note: `Owner yêu cầu xử lý lại: ${message}`,
  });

  // Notify admins
  try {
    const { data: admins } = await supabaseAdmin
      .from("users")
      .select("id")
      .in("role", ["ADMIN", "SUPER_ADMIN"]);

    if (admins) {
      for (const admin of admins) {
        await createNotification({
          userId: admin.id,
          title: "Mở lại báo cáo lỗi 🚨",
          body: `Chủ trọ ${user.name || user.email} yêu cầu xử lý lại lỗi: "${report.title}"`,
          type: "system",
          data: { report_id: reportId },
          channel: "in_app",
        });
      }
    }
  } catch (err) {
    console.error("Notify admins failed:", err);
  }

  return c.json({ success: true });
});

// ────────────────────────────────────────────────────────────
// ADMIN ROUTES (Mounted at /admin/feedback)
// ────────────────────────────────────────────────────────────

// List All Reports (Admin)
adminFeedbackRoutes.get("/all", async (c) => {
  const db = c.get("supabase");
  const { status, priority, category } = c.req.query();

  let query = db.from("feedback_reports").select(`
    *,
    reporter:users(id, name, email, avatar),
    attachments:feedback_attachments(id, file_name, file_type),
    comments_count:feedback_comments(id)
  `);

  if (status) query = query.eq("status", status);
  if (priority) query = query.eq("priority", priority);
  if (category) query = query.eq("category", category);

  const { data: reports, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    return handleDbError(c, error, "Không thể tải toàn bộ danh sách báo cáo");
  }

  const mapped = (reports || []).map((r: any) => ({
    ...r,
    comments_count: r.comments_count ? r.comments_count.length : 0,
    reporterName: r.reporter?.name || r.reporter?.email || "Chủ trọ",
    reporterEmail: r.reporter?.email || "",
  }));

  return c.json({ data: mapped });
});

// Get Ticket Detail (Admin)
adminFeedbackRoutes.get("/:id", async (c) => {
  const db = c.get("supabase");
  const reportId = c.req.param("id");

  const { data: report, error } = await db
    .from("feedback_reports")
    .select(`
      *,
      reporter:users(id, name, email, avatar),
      attachments:feedback_attachments(id, file_url, file_name, file_type)
    `)
    .eq("id", reportId)
    .single();

  if (error || !report) {
    return c.json({ error: "Không tìm thấy báo cáo lỗi" }, 404);
  }

  // Load all comments including internal notes
  const { data: comments } = await db
    .from("feedback_comments")
    .select(`
      id,
      user_id,
      role,
      message,
      is_internal,
      created_at,
      sender:users(id, name, avatar, email)
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  // Load status transition logs
  const { data: logs } = await db
    .from("feedback_status_logs")
    .select(`
      id,
      old_status,
      new_status,
      note,
      created_at,
      actor:users(id, name, email)
    `)
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });

  return c.json({
    report: {
      ...report,
      reporterName: report.reporter?.name || report.reporter?.email || "Chủ trọ",
      reporterEmail: report.reporter?.email || "",
    },
    comments: (comments || []).map((cmt: any) => ({
      id: cmt.id,
      userId: cmt.user_id,
      role: cmt.role,
      message: cmt.message,
      isInternal: cmt.is_internal,
      createdAt: cmt.created_at,
      senderName: cmt.sender?.name || cmt.sender?.email || "Admin",
      senderAvatar: cmt.sender?.avatar || null,
    })),
    statusLogs: (logs || []).map((l: any) => ({
      id: l.id,
      oldStatus: l.old_status,
      newStatus: l.new_status,
      note: l.note,
      createdAt: l.created_at,
      actorName: l.actor?.name || l.actor?.email || "Hệ thống",
    })),
  });
});

// Update Status (Admin)
adminFeedbackRoutes.patch("/:id/status", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const reportId = c.req.param("id");
  const parsed = await c.req.json().catch(() => ({}));

  const validation = adminUpdateStatusSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Trạng thái không hợp lệ", details: validation.error.format() }, 400);
  }

  const { status, note } = validation.data;

  // Get current ticket
  const { data: report, error: getErr } = await db
    .from("feedback_reports")
    .select("id, status, reporter_id, title")
    .eq("id", reportId)
    .single();

  if (getErr || !report) {
    return c.json({ error: "Không tìm thấy báo cáo lỗi" }, 404);
  }

  const updateFields: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "resolved") {
    updateFields.resolved_at = new Date().toISOString();
  }

  const { error: updateErr } = await db
    .from("feedback_reports")
    .update(updateFields)
    .eq("id", reportId);

  if (updateErr) {
    return handleDbError(c, updateErr, "Không thể cập nhật trạng thái");
  }

  // Log status change
  await db.from("feedback_status_logs").insert({
    report_id: reportId,
    changed_by: user.id,
    old_status: report.status,
    new_status: status,
    note: note || `Admin thay đổi trạng thái từ ${report.status} sang ${status}`,
  });

  // Map user-friendly wording for notifications
  const friendlyStatusMap: Record<string, string> = {
    in_progress: "Đang xử lý ⚙️",
    resolved: "Đã xử lý xong ✅",
    closed: "Đã đóng 🔒",
  };

  // Notify Owner
  try {
    const statusText = friendlyStatusMap[status] || status;
    await createNotification({
      userId: report.reporter_id,
      title: `Cập nhật trạng thái báo lỗi 📋`,
      body: `Báo cáo "${report.title}" của bạn đã chuyển sang trạng thái: ${statusText}`,
      type: "system",
      data: { report_id: reportId },
      channel: "in_app",
    });
  } catch (err) {
    console.error("Notify owner failed:", err);
  }

  return c.json({ success: true });
});

// Add Reply or Internal Note (Admin)
adminFeedbackRoutes.post("/:id/comments", async (c) => {
  const user = c.get("user");
  const db = c.get("supabase");
  const reportId = c.req.param("id");
  const parsed = await c.req.json().catch(() => ({}));

  const validation = adminAddCommentSchema.safeParse(parsed);
  if (!validation.success) {
    return c.json({ error: "Nội dung không hợp lệ", details: validation.error.format() }, 400);
  }

  const { message, isInternal } = validation.data;

  // Get current ticket
  const { data: report, error: getErr } = await db
    .from("feedback_reports")
    .select("id, title, reporter_id")
    .eq("id", reportId)
    .single();

  if (getErr || !report) {
    return c.json({ error: "Không tìm thấy báo cáo lỗi" }, 404);
  }

  const { data: comment, error: cmtErr } = await db
    .from("feedback_comments")
    .insert({
      report_id: reportId,
      user_id: user.id,
      role: "admin",
      message,
      is_internal: isInternal,
    })
    .select()
    .single();

  if (cmtErr) {
    return handleDbError(c, cmtErr, "Không thể gửi phản hồi");
  }

  // Update report timestamp
  await db
    .from("feedback_reports")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", reportId);

  // Notify Owner (only if standard comment, ignore internal notes)
  if (!isInternal) {
    try {
      await createNotification({
        userId: report.reporter_id,
        title: "Có phản hồi từ Admin 💬",
        body: `Admin vừa phản hồi báo cáo lỗi "${report.title}" của bạn.`,
        type: "system",
        data: { report_id: reportId },
        channel: "in_app",
      });
    } catch (err) {
      console.error("Notify owner failed:", err);
    }
  }

  return c.json({ success: true, comment });
});
