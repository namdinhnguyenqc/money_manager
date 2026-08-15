export const DEFAULT_ZALO_PAYMENT_RECEIVED_MESSAGE =
  "Chào {tenant_name}, TrọCare đã nhận {received_amount} tiền phòng {room_name} tháng {month}/{year}.\n" +
  "Trạng thái hóa đơn: {payment_status}.\n" +
  "Số tiền còn lại: {remaining_amount}.\n" +
  "Mã thanh toán: {payment_code}.\n" +
  "Cảm ơn anh/chị đã thanh toán.";

export const renderZaloPaymentReceivedMessage = (
  template: string,
  values: Record<string, unknown>,
) => template.replace(
  /\{([a-zA-Z0-9_]+)\}/g,
  (match, key) => String(values[key] ?? match),
);
