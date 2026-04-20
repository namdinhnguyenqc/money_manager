# Run Sheet (10 phut)

Phan loai: quy trinh test van hanh (khong phai business process).

## Truoc khi chay

- [ ] App da update ban moi nhat
- [ ] Da dang nhap cloud
- [ ] Co vi du lieu de test (`transactions`, `trading`)

## Test sequence

1. Trading edge-case (3 phut)
- [ ] Tao item `quantity = 0`
- [ ] Tao item `quantity` rong
- [ ] Tao item `quantity = 2`
- [ ] Mo lai list trading va scroll

Expected:
- Khong crash
- `quantity 0/rong` fallback ve `1`
- List van render/sort binh thuong

2. Transactions sort-safe (2 phut)
- [ ] Mo list transactions cua vi vua test
- [ ] Scroll nhanh, doi tab, quay lai

Expected:
- Khong crash khi co item thieu `date/created_at`

3. Cloud Sync (2 phut)
- [ ] Bam `Cloud Sync`
- [ ] Theo doi progress den khi ket thuc

Expected:
- Sync hoan tat, khong bi treo UI

4. Migrate SQLite -> Firestore (3 phut)
- [ ] Chay migrate voi DB co du lieu
- [ ] (Neu co) chay them case DB rong

Expected:
- DB co du lieu: migrate thanh cong
- DB rong: bao loi dung, app khong crash

## Ket qua (dien nhanh)

| Muc | Ket qua | Ghi chu |
|---|---|---|
| Trading edge-case | PASS / FAIL |  |
| Transactions sort-safe | PASS / FAIL |  |
| Cloud Sync | PASS / FAIL |  |
| Migrate co du lieu | PASS / FAIL |  |
| Migrate DB rong | PASS / FAIL / NA |  |

## Neu FAIL, bat buoc ghi

- Build/app version:
- Buoc fail:
- Mo ta loi ngan:
- Log/stacktrace:
- Screenshot/video:
