export const translateRoomStatus = (status?: string | null): string => {
  if (!status) return "Chưa xác định";
  const s = status.toLowerCase();
  if (s === "occupied") return "Đang ở";
  if (s === "vacant" || s === "available") return "Trống";
  if (s === "reserved") return "Đã cọc";
  if (s === "maintenance") return "Bảo trì";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export const translateInvoiceStatus = (status?: string | null): string => {
  if (!status) return "Chưa xác định";
  const s = status.toLowerCase();
  if (s === "paid") return "Đã thanh toán";
  if (s === "unpaid") return "Chưa thanh toán";
  if (s === "overdue") return "Quá hạn";
  if (s === "cancelled") return "Đã hủy";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export const translateContractStatus = (status?: string | null): string => {
  if (!status) return "Chưa xác định";
  const s = status.toLowerCase();
  if (s === "active") return "Hiệu lực";
  if (s === "cancelled") return "Đã hủy";
  if (s === "ended") return "Đã kết thúc";
  if (s === "draft") return "Nháp";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export const translateUserStatus = (status?: string | null): string => {
  if (!status) return "Chưa xác định";
  const s = status.toUpperCase();
  if (s === "ACTIVE") return "Đang hoạt động";
  if (s === "PENDING_APPROVAL") return "Chờ duyệt";
  if (s === "REJECTED") return "Từ chối";
  if (s === "BLOCKED") return "Bị khóa";
  if (s === "DELETED") return "Đã xóa";
  return status;
};

export const translateUserRole = (role?: string | null): string => {
  if (!role) return "Chưa xác định";
  const r = role.toUpperCase();
  if (r === "USER") return "Người dùng";
  if (r === "OWNER") return "Chủ trọ";
  if (r === "ADMIN") return "Quản trị";
  if (r === "SUPER_ADMIN") return "Super Admin";
  return role;
};
