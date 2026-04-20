# Run Sheet STRICT (Release Gate)

Muc tieu: gate ban phat hanh. Neu khong dat, KHONG release.

## Gate Rules (bat buoc)

1. Khong duoc co crash (0 crash).
2. Khong duoc co deadlock/freeze UI > 3 giay.
3. Cloud Sync va Migrate (co du lieu) phai PASS 100%.
4. Trading edge-case (`quantity = 0`, rong, >1) phai PASS 100%.
5. Transactions list sort-safe phai PASS 100%.
6. Moi FAIL phai co bang chung (log + screenshot/video).

Neu vi pham bat ky rule nao: `RELEASE = BLOCKED`.

## Preflight

- [ ] Build/app version da ghi ro
- [ ] Da dang nhap cloud
- [ ] Co dataset test:
- [ ] Wallet co transactions cu (co the thieu truong date)
- [ ] Co du lieu trading de tao/sua item

## Test Cases (thu tu bat buoc)

1. Trading edge-case
- [ ] Tao trading item `quantity = 0`
- [ ] Tao trading item `quantity` rong
- [ ] Tao trading item `quantity = 2`
- [ ] Mo lai list trading, doi tab, quay lai

Pass criteria:
- Fallback dung (`0/rong -> 1`)
- Khong crash
- List khong vo render/sort

2. Transactions sort-safe
- [ ] Mo list transactions wallet co du lieu cu
- [ ] Scroll nhanh 10-15s
- [ ] Doi tab va quay lai 2 lan

Pass criteria:
- Khong crash
- Khong loi runtime do thieu `date/created_at`

3. Cloud Sync
- [ ] Bam Cloud Sync
- [ ] Theo doi progress tu dau den cuoi

Pass criteria:
- Ket thuc thanh cong
- Khong treo UI

4. Migrate SQLite -> Firestore (co du lieu)
- [ ] Chay migrate voi DB co du lieu

Pass criteria:
- Migrate thanh cong
- Khong crash

5. Migrate SQLite -> Firestore (DB rong, neu co)
- [ ] Chay migrate voi DB rong

Pass criteria:
- Bao loi dung mong doi
- App khong crash

## Severity va Quyet dinh

- Sev-1: Crash, mat du lieu, treo UI nghiem trong -> BLOCK release ngay.
- Sev-2: Sai ket qua nghiep vu chinh (sync/migrate/trading) -> BLOCK release.
- Sev-3: Loi UI nhe, text, canh le (khong anh huong nghiep vu) -> co the release neu PM chap thuan bang van ban.

## Ket qua Gate

| Hang muc | PASS/FAIL | Severity | Bang chung |
|---|---|---|---|
| Trading edge-case |  |  |  |
| Transactions sort-safe |  |  |  |
| Cloud Sync |  |  |  |
| Migrate co du lieu |  |  |  |
| Migrate DB rong |  |  |  |

Tong ket:
- [ ] ALL PASS -> `RELEASE = GO`
- [ ] Co bat ky FAIL Sev-1/Sev-2 -> `RELEASE = BLOCKED`

Nguoi test:
Ngay gio:
Build:
