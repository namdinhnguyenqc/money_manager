# Smoke Test Checklist

Muc tieu: xac nhan nhanh cac luong de loi sau cac pass sua encoding + logic edge-case.

## 1) Cloud Sync

- [ ] Mo app, dang nhap tai khoan cloud.
- [ ] Vao man hinh co nut `Cloud Sync` va bam sync.
- [ ] Theo doi progress message tu dau den cuoi.
- [ ] Xac nhan khong co crash, khong bi dung vo han.

Expected:
- Hien thong bao hoan tat sync.
- Khong co popup loi ket noi neu mang on dinh.

## 2) Migrate SQLite -> Firestore

Case A - Co du lieu:
- [ ] Chuan bi DB local co it nhat 1 wallet + 1 transaction.
- [ ] Chay migrate len cloud.
- [ ] Xac nhan du lieu len duoc Firestore.

Expected:
- Progress chay qua cac bang, ket thuc thanh cong.
- Khong co loi timeout neu mang binh thuong.

Case B - DB rong:
- [ ] Chay migrate voi DB local rong.

Expected:
- Bao loi dung ("khong tim thay du lieu..."), app khong crash.

## 3) Trading

Edge-case quantity:
- [ ] Tao trading item voi `quantity = 0`.
- [ ] Tao trading item voi `quantity` de trong.
- [ ] Tao trading item voi `quantity > 1`.

Expected:
- `quantity = 0` hoac de trong duoc fallback ve `1`.
- Khong loi chia 0, khong crash.

Sort va hien thi:
- [ ] Mo danh sach trading co item cu (thieu `date`/`created_at`).
- [ ] Kiem tra danh sach van mo duoc, khong crash.

Expected:
- Sort van chay an toan khi thieu truong ngay.

## 4) Transactions List

- [ ] Mo man danh sach giao dich cho vi co du lieu cu.
- [ ] Kiem tra scroll va sap xep.

Expected:
- Khong crash khi item thieu `date` hoac `created_at`.

## 5) Ghi nhan ket qua

Khi fail, ghi lai:
- Build/app version
- Buoc dang chay
- Log loi (neu co)
- Screenshot/video ngan

Pass tieu chi:
- Khong crash.
- Khong deadlock UI.
- Ket qua nghiep vu dung voi expected o tren.
