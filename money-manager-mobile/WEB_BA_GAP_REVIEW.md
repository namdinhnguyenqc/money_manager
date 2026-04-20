# BA Gap Review (Web)

## Scope

- So khop requirement voi luong implement hien tai.
- Tim khoang trong business rules, validation, data integrity.

## Mapping check

1. Wallet
- Rule active/inactive wallet co anh huong thong ke dung?
- Thu tu hien thi wallet co co dinh theo type?

2. Transactions
- Cho phep category null?
- Missing date/created_at co duoc xu ly an toan?
- Count/pagination behavior co consistent?

3. Rental
- Cong no ky truoc tinh dung?
- Invoice status transition (`unpaid` -> `paid`) dung?
- Delete invoice co rollback transaction lien quan?

4. Trading
- `quantity <= 0` fallback ve 1 (da fix) co dung requirement?
- target_price chia theo quantity co dung business meaning?
- Item sold/available co anh huong stats dung?

5. Data mode
- Khi API mode tat, local DB co day du rule?
- Khi API mode bat, auth gate va fallback loi co ro rang?

## Validation gap checklist

- [ ] Empty/null input
- [ ] Zero/negative number
- [ ] Date boundary (thang 1/12, leap, format)
- [ ] Partial data migration
- [ ] Duplicate submit (double click)

## Deliverable

- Cap nhat gap vao `WEB_DEFECT_BACKLOG.md` voi owner/deadline.
