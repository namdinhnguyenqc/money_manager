"use client";

export type RoomStatus = "vacant" | "reserved" | "occupied" | "maintenance" | "expiring_soon" | "disabled";
export type ContractStatus = "active" | "expiring_soon" | "ended";
export type InvoiceStatus = "draft" | "sent" | "overdue" | "paid" | "partial";
export type PaymentMethod = "cash" | "bank_transfer" | "e_wallet";

export const STATUS_COLOR: Record<string, string> = {
  vacant: "bg-green-50 text-green-700 border-green-200",
  paid: "bg-green-50 text-green-700 border-green-200",
  active: "bg-blue-50 text-blue-700 border-blue-200",
  occupied: "bg-blue-50 text-blue-700 border-blue-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  partial: "bg-blue-50 text-blue-700 border-blue-200",
  reserved: "bg-orange-50 text-orange-700 border-orange-200",
  expiring_soon: "bg-amber-50 text-amber-700 border-amber-200",
  draft: "bg-amber-50 text-amber-700 border-amber-200",
  overdue: "bg-red-50 text-red-700 border-red-200",
  maintenance: "bg-red-50 text-red-700 border-red-200",
  ended: "bg-gray-100 text-gray-500 border-gray-200",
  disabled: "bg-gray-100 text-gray-500 border-gray-200",
  // Deposit statuses
  holding: "bg-orange-50 text-orange-700 border-orange-200",
  transferred: "bg-blue-50 text-blue-700 border-blue-200",
  refunded: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABEL: Record<string, string> = {
  vacant: "Trống",
  reserved: "Đã cọc",
  occupied: "Đang thuê",
  maintenance: "Bảo trì",
  expiring_soon: "Sắp hết HĐ",
  disabled: "Ngưng SD",
  active: "Hiệu lực",
  ended: "Đã kết thúc",
  draft: "Chưa gửi",
  sent: "Đã gửi",
  overdue: "Quá hạn",
  paid: "Đã thanh toán",
  partial: "Thanh toán một phần",
  // Deposit statuses
  holding: "Đã cọc giữ phòng",
  transferred: "Đã chuyển vào HĐ",
  refunded: "Đã hoàn cọc",
  cancelled: "Đã hủy cọc",
};

export default function StatusBadge({ status }: { status: RoomStatus | ContractStatus | InvoiceStatus | string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLOR[status] || STATUS_COLOR.ended}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}
