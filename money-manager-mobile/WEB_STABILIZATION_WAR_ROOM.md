# Web Stabilization War Room

Muc tieu: chay quy trinh tuong duong Senior QA + PO/PM + BA de dong bang chat luong web truoc release.

## 0) Rule gate

- Neu co bat ky crash/blocker tren luong chinh: `RELEASE = BLOCKED`.
- Moi bug phai co owner + due date + trang thai.
- Chot lai sau moi vong test: `Open Critical`, `Open High`, `Retest`.

## 1) Senior QA scope

Tai lieu chi tiet: `WEB_TEST_MATRIX_SENIOR_QA.md`

Test bat buoc:
- Auth/Login (neu bat API mode)
- Dashboard load du lieu
- Wallet/Transaction CRUD
- Rental flow: room -> contract -> invoice -> payment
- Trading flow: add/update/delete + stats
- Settings flow: sync/migrate
- Performance basic: first load, route switch, list scroll

## 2) PO/PM scope

Tai lieu chi tiet: `WEB_PO_PM_FLOW_REVIEW.md`

Review bat buoc:
- End-to-end journey theo module
- Business priority (must-have vs nice-to-have)
- Ready-to-release decision theo severity
- UX regression anh huong conversion/usage

## 3) BA scope

Tai lieu chi tiet: `WEB_BA_GAP_REVIEW.md`

Review bat buoc:
- Mapping requirement <-> implementation
- Rule nghiep vu tinh tien phong/tien dich vu/cong no
- Edge-case (du lieu rong, gia tri 0, date missing, wallet inactive)
- Message loi/validation nhat quan

## 4) Defect backlog

- Dung file: `WEB_DEFECT_BACKLOG.md`
- Cac cot toi thieu: ID, Severity, Module, Steps, Expected, Actual, Owner, Status.

## 5) Operational cadence

1. QA test theo matrix -> ghi defect.
2. Dev fix theo severity.
3. QA retest.
4. PO/PM + BA sign-off.
5. Chot gate: GO/BLOCKED.
