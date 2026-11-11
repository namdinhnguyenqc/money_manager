-- Chuyển nợ sang kỳ sau phải chốt hóa đơn kỳ cũ.
--
-- Ví dụ: hóa đơn T10 = 2.000.000, khách trả 1.800.000. Khi lập hóa đơn T11 có
-- "cấn công nợ kỳ trước", 200.000 được cộng vào T11. Trước đây T10 vẫn ghi
-- "còn thiếu 200.000", nên dashboard, app mobile, nhắc nợ Zalo và tất toán trả
-- phòng tính khoản này hai lần (một lần ở T10, một lần ở T11).
--
-- Từ nay khoản chuyển đi được ghi ở carried_forward_amount và trừ khỏi
-- total_amount của hóa đơn cũ, nên hóa đơn cũ có còn lại = 0 và trạng thái
-- "paid". Tổng gốc của hóa đơn cũ = total_amount + carried_forward_amount.
-- Xóa hóa đơn kỳ sau thì backend trả khoản này về hóa đơn cũ.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS carried_forward_amount numeric(18,2) NOT NULL DEFAULT 0;

-- Sửa dữ liệu cũ: mọi hóa đơn còn thiếu mà khoản thiếu đã được một hóa đơn
-- kỳ sau cộng vào (previous_debt_source_invoice_id trỏ tới nó).
UPDATE public.invoices AS src
SET carried_forward_amount = src.total_amount - src.paid_amount,
    total_amount = src.paid_amount,
    status = 'paid',
    updated_at = now()
WHERE src.total_amount > src.paid_amount
  AND src.carried_forward_amount = 0
  AND EXISTS (
    SELECT 1
    FROM public.invoices AS nxt
    WHERE nxt.previous_debt_source_invoice_id = src.id
      AND nxt.user_id = src.user_id
  );
