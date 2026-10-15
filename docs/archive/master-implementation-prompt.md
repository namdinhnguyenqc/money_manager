<USER_REQUEST>
# MASTER IMPLEMENTATION PROMPT — RENTAL FINANCE / THU CHI / VÍ TỔNG

> **Mục đích file này:** Dùng làm prompt cho AI coding agent (Cursor / Claude Code / Copilot Agent / ChatGPT coding agent) triển khai tính năng tài chính vào **ứng dụng quản lý nhà trọ hiện tại**.  
> **Ngôn ngữ implementation:** Tuân theo tech stack và coding convention của source hiện tại.  
> **Ngôn ngữ UI:** Tiếng Việt.  
> **Ưu tiên sản phẩm:** Dễ sử dụng → Tiện ích → Giao diện hiện đại.  
> **Persona MVP:** Chủ nhà trọ nhỏ, tự quản lý, dưới 20 phòng.

---

# 0. HIỆN TRẠNG HỆ THỐNG VÀ PHẠM VI BẮT BUỘC HIỂU ĐÚNG

## 0.1. Hiện trạng đã xác nhận

Ứng dụng hiện tại là **app quản lý nhà trọ**.

Hệ thống hiện tại:

- Đã có nghiệp vụ quản lý nhà trọ như khu trọ/phòng/khách thuê/hợp đồng/dịch vụ hoặc các entity tương đương trong source.
- **Đã có luồng thu tiền** từ khách thuê hoặc luồng ghi nhận thanh toán hiện có.
- **Đã có luồng tiền cọc**. AI phải inspect chính xác source để xác nhận hệ thống hiện hỗ trợ:
  - Nhận cọc;
  - Hoàn cọc;
  - Khấu trừ cọc;
  - Hay chỉ có một phần trong các flow trên.
- **Chưa có module quản lý thu/chi tài chính hoàn chỉnh.**
- **Chưa có app Ví tổng / màn Ví quản lý số dư thực tế.**
- **Chưa có báo cáo lợi nhuận tài chính chuẩn**, tách doanh thu đã thu, chi phí, công nợ và tiền cọc giữ hộ.

## 0.2. Nguyên tắc quan trọng nhất

Không xây lại nghiệp vụ đã có.

Cụ thể:

- Không tạo lại flow “thu tiền phòng” nếu app hiện tại đã có chức năng thu tiền/payment.
- Không tạo lại flow “nhận cọc/hoàn cọc” nếu source hiện tại đã có.
- Module tài chính mới phải **nhận dữ liệu từ các nghiệp vụ nguồn hiện có** để tạo 
<truncated 45215 bytes>
`

### Empty state — Thu chi

```text
Chưa có giao dịch trong tháng này

Khi khách thanh toán hoặc bạn thêm chi phí,
báo cáo thu chi sẽ xuất hiện tại đây.

[Thêm khoản chi]
```

### Empty state — Account/Ví

```text
Bạn chưa tạo tài khoản nhận/chi tiền

Thêm Tiền mặt hoặc Tài khoản ngân hàng
để bắt đầu theo dõi số dư thực tế.

[Thêm tài khoản]
```

### Error state

```text
Không thể tải dữ liệu thu chi

Dữ liệu của bạn vẫn an toàn.
Vui lòng thử lại.

[Thử lại]
```

### Sync warning nếu có lỗi đồng bộ

```text
Một số giao dịch từ nhà trọ chưa được đồng bộ.
Báo cáo hiện tại có thể chưa đầy đủ.

[Thử đồng bộ lại]
```

## 13.8. Accessibility/usability

- Currency format thống nhất: `1.200.000 ₫`.
- Touch target đủ lớn trên mobile.
- Contrast đủ đọc.
- Không phân biệt trạng thái chỉ bằng màu; có text/icon.
- Long amount không vỡ layout.
- Loading không chặn vô hạn.
- Error có CTA.

## Tests Phase 7

- Mobile viewport phổ biến.
- Amount lớn không overflow.
- Empty/loading/error render đúng.
- Form usable với keyboard.
- Filter usable trên màn nhỏ.
- Transaction action đúng theo source type.
- Dashboard không hiển thị misleading total.

## Exit criteria Phase 7

- UI mobile sử dụng trơn tru.
- Người dùng có thể thêm khoản chi nhanh.
- User đọc hiểu lợi nhuận/tiền cọc/tài khoản.
- Build/test pass.

Tự tiếp tục Phase 8.

---

# 14. PHASE 8 — HARDENING, SECURITY, EDGE CASE, FULL TEST VÀ RELEASE READINESS

## Mục tiêu

Bảo đảm dữ liệu tài chính đáng tin, không duplicate, không lộ quyền, không lỗi khi vận hành thực tế.

---

## 14.1. Audit trail

Bắt buộc:

- Không hard d
<truncated 18569 bytes>

NOTE: The output was truncated because it was too long. Use a more targeted query or a smaller range to get the information you need.