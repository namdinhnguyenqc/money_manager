# PO/PM Flow Review (Web)

## Muc tieu

- Xac nhan luong nghiep vu tren web khop intent san pham.
- Chot `GO/BLOCKED` dua tren risk thuc te.

## Must-have journeys

1. Personal finance
- Wallet management
- Transaction tracking
- Dashboard/analytics consistency

2. Rental management
- Room lifecycle
- Contract lifecycle
- Invoice billing + payment status

3. Trading management
- Item inventory lifecycle
- Capital/profit stats correctness

4. System/settings
- Data mode behavior (local/API)
- Sync/migrate reliability

## PM decision checklist

- [ ] P0 journeys pass end-to-end
- [ ] Khong con crash/blocker
- [ ] Defect Sev-1/Sev-2 = 0
- [ ] Co rollback plan neu release fail
- [ ] Co owner on-call cho hotfix

## PO acceptance checklist

- [ ] Output dung business meaning (tong thu/chi, cong no, loi nhuan)
- [ ] Validation/alert message ro rang
- [ ] UX khong gay sai thao tac nghiep vu
- [ ] Rule fallback (quantity/date missing) dung mong doi

## Release decision

- `GO`: tat ca must-have pass + khong co Sev-1/Sev-2.
- `BLOCKED`: con bat ky blocker tren flow chinh.
