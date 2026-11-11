-- Cho phép khoản phí phát sinh âm (giảm trừ) trên hóa đơn, ví dụ "Giảm 50.000 do
-- mất nước 2 ngày". Bỏ ràng buộc CHECK (amount >= 0) của invoice_items.amount.
-- Tổng hóa đơn (invoices.total_amount) vẫn giữ ràng buộc >= 0; backend chặn
-- trường hợp giảm trừ làm tổng âm hoặc thấp hơn số đã thu.
--
-- Tên ràng buộc có thể khác nhau giữa các môi trường, nên tìm theo nội dung.
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'invoice_items'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%amount%>=%0%'
  LOOP
    EXECUTE format('ALTER TABLE public.invoice_items DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
