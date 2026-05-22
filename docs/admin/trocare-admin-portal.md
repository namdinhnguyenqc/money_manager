# TroCare Admin Portal â€” TÃ i liá»‡u nghiá»‡p vá»¥ há»‡ thá»‘ng

**PhiÃªn báº£n:** 1.0
**Vai trÃ² tÃ i liá»‡u:** Senior BA / PM Functional Specification
**Pháº¡m vi:** Admin Portal cho há»‡ thá»‘ng quáº£n lÃ½ phÃ²ng trá» TroCare
**NgÃ´n ngá»¯ UI:** Tiáº¿ng Viá»‡t
**Nguá»“n:** Ná»™i dung nghiá»‡p vá»¥ do ngÆ°á»i dÃ¹ng cung cáº¥p ngÃ y 2026-05-21.

## 0. Executive Summary

TroCare lÃ  há»‡ thá»‘ng quáº£n lÃ½ phÃ²ng trá»/nhÃ  cho thuÃª. PhÃ­a Owner cÃ³ cÃ¡c nghiá»‡p vá»¥ chÃ­nh nhÆ° quáº£n lÃ½ cÆ¡ sá»Ÿ, phÃ²ng, khÃ¡ch thuÃª, há»£p Ä‘á»“ng, hÃ³a Ä‘Æ¡n, Ä‘iá»‡n nÆ°á»›c, dá»‹ch vá»¥, thu chi vÃ  bÃ¡o cÃ¡o.

Admin Portal lÃ  cá»•ng quáº£n trá»‹ ná»™i bá»™ dÃ nh cho Ä‘á»™i váº­n hÃ nh TroCare. Admin khÃ´ng thay Owner váº­n hÃ nh nhÃ  trá» má»—i ngÃ y, nhÆ°ng cÃ³ quyá»n quan sÃ¡t, kiá»ƒm soÃ¡t vÃ  can thiá»‡p á»Ÿ cáº¥p há»‡ thá»‘ng khi cáº§n.

Admin Portal cáº§n giÃºp Ä‘á»™i váº­n hÃ nh:

- Quáº£n lÃ½ toÃ n bá»™ Owner.
- Quáº£n lÃ½ toÃ n bá»™ khÃ¡ch thuÃª.
- Theo dÃµi dá»¯ liá»‡u cÆ¡ sá»Ÿ, phÃ²ng, há»£p Ä‘á»“ng, hÃ³a Ä‘Æ¡n.
- KhÃ³a/má»Ÿ tÃ i khoáº£n khi cÃ³ váº¥n Ä‘á».
- PhÃ¢n quyá»n Admin ná»™i bá»™ cháº·t cháº½.
- Truy váº¿t má»i hÃ nh Ä‘á»™ng quan trá»ng báº±ng Audit Log.
- Cáº¥u hÃ¬nh quy táº¯c váº­n hÃ nh chung.
- Xem bÃ¡o cÃ¡o váº­n hÃ nh há»‡ thá»‘ng.

Pháº¡m vi phiÃªn báº£n nÃ y táº­p trung vÃ o quáº£n trá»‹ dá»¯ liá»‡u vÃ  váº­n hÃ nh há»‡ thá»‘ng, khÃ´ng bao gá»“m subscription, marketplace, KYC, ticket support chuyÃªn sÃ¢u, coupon/refund.

## 1. Sitemap Admin Portal

```mermaid
flowchart TD
    A[Admin Portal] --> B[Tá»•ng quan]

    A --> C[NgÆ°á»i dÃ¹ng]
    C --> C1[Chá»§ trá» / Owner]
    C --> C2[KhÃ¡ch thuÃª]
    C --> C3[Admin ná»™i bá»™]
    C --> C4[Vai trÃ² & PhÃ¢n quyá»n]

    A --> D[TÃ i sáº£n]
    D --> D1[CÆ¡ sá»Ÿ / NhÃ  trá»]
    D --> D2[PhÃ²ng]

    A --> E[Váº­n hÃ nh]
    E --> E1[Há»£p Ä‘á»“ng]
    E --> E2[HÃ³a Ä‘Æ¡n / Thanh toÃ¡n]
    E --> E3[ThÃ´ng bÃ¡o há»‡ thá»‘ng]

    A --> F[BÃ¡o cÃ¡o]
    F --> F1[BÃ¡o cÃ¡o Owner]
    F --> F2[BÃ¡o cÃ¡o khÃ¡ch thuÃª]
    F --> F3[BÃ¡o cÃ¡o phÃ²ng]
    F --> F4[BÃ¡o cÃ¡o há»£p Ä‘á»“ng]
    F --> F5[BÃ¡o cÃ¡o hÃ³a Ä‘Æ¡n]
    F --> F6[BÃ¡o cÃ¡o hoáº¡t Ä‘á»™ng há»‡ thá»‘ng]

    A --> G[Há»‡ thá»‘ng]
    G --> G1[Nháº­t kÃ½ hoáº¡t Ä‘á»™ng / Audit Log]
    G --> G2[Cáº¥u hÃ¬nh há»‡ thá»‘ng]
```

## 2. Menu Sidebar Äá» Xuáº¥t

```text
Tá»•ng quan

NgÆ°á»i dÃ¹ng
- Chá»§ trá»
- KhÃ¡ch thuÃª
- Admin ná»™i bá»™
- Vai trÃ² & phÃ¢n quyá»n

TÃ i sáº£n
- CÆ¡ sá»Ÿ / NhÃ  trá»
- PhÃ²ng

Váº­n hÃ nh
- Há»£p Ä‘á»“ng
- HÃ³a Ä‘Æ¡n / Thanh toÃ¡n
- ThÃ´ng bÃ¡o há»‡ thá»‘ng

BÃ¡o cÃ¡o
- BÃ¡o cÃ¡o Owner
- BÃ¡o cÃ¡o khÃ¡ch thuÃª
- BÃ¡o cÃ¡o phÃ²ng
- BÃ¡o cÃ¡o há»£p Ä‘á»“ng
- BÃ¡o cÃ¡o hÃ³a Ä‘Æ¡n
- BÃ¡o cÃ¡o hoáº¡t Ä‘á»™ng há»‡ thá»‘ng

Há»‡ thá»‘ng
- Nháº­t kÃ½ hoáº¡t Ä‘á»™ng
- Cáº¥u hÃ¬nh há»‡ thá»‘ng
```

## 3. Vai TrÃ² VÃ  NguyÃªn Táº¯c PhÃ¢n Quyá»n

> Bao ve Admin Portal khong duoc dua vao viec giau URL hoac an route tren frontend. Truoc khi mo rong UI, dung `admin-access-security-research.md` de map route, action permission, audit log va lop truy cap production.

### 3.1 Vai TrÃ² Admin

| Role | MÃ´ táº£ | Pháº¡m vi |
|---|---|---|
| Super Admin | Quyá»n cao nháº¥t | Quáº£n lÃ½ toÃ n bá»™ há»‡ thá»‘ng, role, permission, config, audit |
| Operation Admin | Váº­n hÃ nh dá»¯ liá»‡u | Xem/sá»­a má»™t sá»‘ dá»¯ liá»‡u Owner, tenant, property, room, contract |
| Finance Admin | Kiá»ƒm soÃ¡t hÃ³a Ä‘Æ¡n | Xem hÃ³a Ä‘Æ¡n, cÃ´ng ná»£, cáº­p nháº­t tráº¡ng thÃ¡i thanh toÃ¡n náº¿u cÃ³ quyá»n |
| Support Admin | Tra cá»©u há»— trá»£ | Xem dá»¯ liá»‡u cÆ¡ báº£n, ghi chÃº ná»™i bá»™, khÃ´ng sá»­a tiá»n/quyá»n |
| Read-only Admin | Chá»‰ xem | Xem dá»¯ liá»‡u/bÃ¡o cÃ¡o, khÃ´ng chá»‰nh sá»­a |

### 3.2 NguyÃªn Táº¯c

- KhÃ´ng chá»‰ hard-code role. Má»—i role Ä‘Æ°á»£c cáº¥u hÃ¬nh báº±ng permission matrix.
- Má»i hÃ nh Ä‘á»™ng nguy hiá»ƒm cáº§n kiá»ƒm tra quyá»n, modal xÃ¡c nháº­n, lÃ½ do vÃ  audit log.
- Dá»¯ liá»‡u nháº¡y cáº£m bá»‹ che máº·c Ä‘á»‹nh.
- KhÃ´ng hard delete dá»¯ liá»‡u quan trá»ng tá»« UI, chá»‰ soft delete.
- KhÃ´ng Ä‘Æ°á»£c khÃ³a/xÃ³a Super Admin cuá»‘i cÃ¹ng.
- KhÃ´ng Ä‘Æ°á»£c xÃ³a role Ä‘ang cÃ³ Admin sá»­ dá»¥ng.

## 4. Flow Tá»•ng Quan Admin Portal

```mermaid
flowchart LR
    A[Admin Ä‘Äƒng nháº­p] --> B{CÃ³ quyá»n Admin?}
    B -- KhÃ´ng --> X[Tá»« chá»‘i truy cáº­p]
    B -- CÃ³ --> C[Dashboard tá»•ng quan]

    C --> D[Xem Owner]
    C --> E[Xem khÃ¡ch thuÃª]
    C --> F[Xem cÆ¡ sá»Ÿ/phÃ²ng]
    C --> G[Xem há»£p Ä‘á»“ng/hÃ³a Ä‘Æ¡n]
    C --> H[Xem bÃ¡o cÃ¡o]
    C --> I[Quáº£n lÃ½ phÃ¢n quyá»n]
    C --> J[Cáº¥u hÃ¬nh há»‡ thá»‘ng]

    D --> K{HÃ nh Ä‘á»™ng nháº¡y cáº£m?}
    E --> K
    F --> K
    G --> K
    I --> K
    J --> K

    K -- KhÃ´ng --> L[Thá»±c hiá»‡n action]
    K -- CÃ³ --> M[Kiá»ƒm tra permission]
    M --> N{Äá»§ quyá»n?}
    N -- KhÃ´ng --> Y[Hiá»ƒn thá»‹ lá»—i khÃ´ng cÃ³ quyá»n]
    N -- CÃ³ --> O[Modal xÃ¡c nháº­n + nháº­p lÃ½ do]
    O --> P[Thá»±c hiá»‡n action]
    P --> Q[Ghi Audit Log]
    L --> Q
```

## 5. Dashboard Tá»•ng Quan

### Má»¥c TiÃªu

Dashboard giÃºp Admin náº¯m nhanh tÃ¬nh tráº¡ng váº­n hÃ nh toÃ n há»‡ thá»‘ng. Dashboard khÃ´ng pháº£i mÃ n hÃ¬nh doanh thu TroCare. Náº¿u cÃ³ sá»‘ tiá»n, Ä‘Ã³ lÃ  tá»•ng hÃ³a Ä‘Æ¡n/cÃ´ng ná»£ cá»§a cÃ¡c Owner Ä‘ang ghi nháº­n trÃªn há»‡ thá»‘ng.

### Chá»‰ Sá»‘ ChÃ­nh

| NhÃ³m | Chá»‰ sá»‘ |
|---|---|
| Owner | Tá»•ng Owner, Owner active, Owner bá»‹ khÃ³a, Owner má»›i trong thÃ¡ng, Owner khÃ´ng Ä‘Äƒng nháº­p 30 ngÃ y |
| KhÃ¡ch thuÃª | Tá»•ng khÃ¡ch thuÃª, Ä‘ang thuÃª, Ä‘Ã£ rá»i Ä‘i, cÃ³ cÃ´ng ná»£, má»›i trong thÃ¡ng |
| CÆ¡ sá»Ÿ / PhÃ²ng | Tá»•ng cÆ¡ sá»Ÿ, tá»•ng phÃ²ng, phÃ²ng Ä‘ang thuÃª, phÃ²ng trá»‘ng, phÃ²ng sá»­a chá»¯a, tá»· lá»‡ láº¥p Ä‘áº§y |
| Há»£p Ä‘á»“ng | Tá»•ng há»£p Ä‘á»“ng, active, sáº¯p háº¿t háº¡n, háº¿t háº¡n chÆ°a xá»­ lÃ½, Ä‘Ã£ káº¿t thÃºc |
| HÃ³a Ä‘Æ¡n | HÃ³a Ä‘Æ¡n thÃ¡ng nÃ y, Ä‘Ã£ thanh toÃ¡n, chÆ°a thanh toÃ¡n, quÃ¡ háº¡n, tá»•ng cÃ´ng ná»£ |

### UI

- Stat cards cÃ³ drill-down.
- Chart Owner má»›i theo thÃ¡ng.
- Chart tráº¡ng thÃ¡i phÃ²ng.
- Chart tráº¡ng thÃ¡i hÃ³a Ä‘Æ¡n.
- Danh sÃ¡ch Owner má»›i.
- Danh sÃ¡ch há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n.
- Danh sÃ¡ch hÃ³a Ä‘Æ¡n quÃ¡ háº¡n.
- Danh sÃ¡ch dá»¯ liá»‡u cáº§n kiá»ƒm tra.

### Acceptance Criteria

- Admin cÃ³ quyá»n xem Ä‘Æ°á»£c dashboard.
- Stat card cÃ³ thá»ƒ drill-down.
- CÃ³ filter thá»i gian.
- CÃ³ empty/loading/error state.
- KhÃ´ng gá»i sá»‘ tiá»n hÃ³a Ä‘Æ¡n lÃ  doanh thu ná»n táº£ng.

## 6. Quáº£n LÃ½ Owner

### Má»¥c TiÃªu

Quáº£n lÃ½ toÃ n bá»™ chá»§ trá» sá»­ dá»¥ng TroCare. Admin cÃ³ thá»ƒ táº¡o, xem, sá»­a, khÃ³a, má»Ÿ khÃ³a, xÃ³a má»m, khÃ´i phá»¥c, ghi chÃº vÃ  xem lá»‹ch sá»­ hoáº¡t Ä‘á»™ng cá»§a Owner.

### Entity Owner

| Field | Kiá»ƒu | Báº¯t buá»™c | MÃ´ táº£ |
|---|---|---:|---|
| owner_id | string | CÃ³ | MÃ£ Ä‘á»‹nh danh Owner |
| full_name | string | CÃ³ | Há» tÃªn |
| email | string | CÃ³ | Email Ä‘Äƒng nháº­p/liÃªn há»‡ |
| phone | string | Theo config | Sá»‘ Ä‘iá»‡n thoáº¡i |
| avatar_url | string | KhÃ´ng | áº¢nh Ä‘áº¡i diá»‡n |
| status | enum | CÃ³ | pending_activation, active, locked, soft_deleted |
| created_at | datetime | CÃ³ | NgÃ y táº¡o |
| created_by | string | CÃ³ | Admin/system táº¡o |
| last_login_at | datetime | KhÃ´ng | Láº§n Ä‘Äƒng nháº­p gáº§n nháº¥t |
| locked_reason | text | KhÃ´ng | LÃ½ do khÃ³a |
| locked_by | string | KhÃ´ng | NgÆ°á»i khÃ³a |
| locked_at | datetime | KhÃ´ng | Thá»i Ä‘iá»ƒm khÃ³a |

### Danh SÃ¡ch Owner

Cá»™t dá»¯ liá»‡u gá»“m mÃ£ Owner, tÃªn, email, sá»‘ Ä‘iá»‡n thoáº¡i, tráº¡ng thÃ¡i, sá»‘ cÆ¡ sá»Ÿ, sá»‘ phÃ²ng, sá»‘ khÃ¡ch thuÃª, sá»‘ há»£p Ä‘á»“ng active, sá»‘ hÃ³a Ä‘Æ¡n chÆ°a thanh toÃ¡n, ngÃ y táº¡o, láº§n Ä‘Äƒng nháº­p gáº§n nháº¥t, ngÆ°á»i táº¡o vÃ  actions.

Filter gá»“m tá»« khÃ³a, tráº¡ng thÃ¡i, ngÃ y táº¡o, láº§n Ä‘Äƒng nháº­p gáº§n nháº¥t, sá»‘ lÆ°á»£ng cÆ¡ sá»Ÿ/phÃ²ng/khÃ¡ch thuÃª vÃ  ngÆ°á»i táº¡o.

Actions gá»“m xem chi tiáº¿t, táº¡o Owner, chá»‰nh sá»­a, khÃ³a, má»Ÿ khÃ³a, xÃ³a má»m, khÃ´i phá»¥c, thÃªm ghi chÃº ná»™i bá»™ vÃ  xem audit log liÃªn quan.

### Táº¡o Owner

| Field | Báº¯t buá»™c | Rule |
|---|---:|---|
| Há» tÃªn | CÃ³ | 2-100 kÃ½ tá»± |
| Email | CÃ³ | ÄÃºng format, khÃ´ng trÃ¹ng |
| Sá»‘ Ä‘iá»‡n thoáº¡i | Theo config | KhÃ´ng trÃ¹ng náº¿u dÃ¹ng phone lÃ m Ä‘á»‹nh danh |
| Tráº¡ng thÃ¡i kÃ­ch hoáº¡t | CÃ³ | Máº·c Ä‘á»‹nh pending/active theo config |
| Ghi chÃº ná»™i bá»™ | KhÃ´ng | Chá»‰ Admin xem |

### Chi Tiáº¿t Owner

Tabs: Tá»•ng quan, Há»“ sÆ¡, CÆ¡ sá»Ÿ, PhÃ²ng, KhÃ¡ch thuÃª, Há»£p Ä‘á»“ng, HÃ³a Ä‘Æ¡n, Ghi chÃº ná»™i bá»™, Nháº­t kÃ½ hoáº¡t Ä‘á»™ng.

### KhÃ³a / Má»Ÿ KhÃ³a / XÃ³a Má»m Owner

- KhÃ³a cáº§n quyá»n `owner.lock`, báº¯t buá»™c nháº­p lÃ½ do, revoke session Owner, ghi audit log High.
- Má»Ÿ khÃ³a cáº§n quyá»n `owner.unlock`, báº¯t buá»™c nháº­p lÃ½ do, status chuyá»ƒn tá»« `locked` sang `active`, ghi audit log High.
- XÃ³a má»m cáº§n quyá»n `owner.delete`, chuyá»ƒn status sang `soft_deleted`, khÃ´ng hard delete dá»¯ liá»‡u con, cÃ³ thá»ƒ khÃ´i phá»¥c, ghi audit log.

### Acceptance Criteria

- Admin xem, search, filter, sort Ä‘Æ°á»£c Owner.
- Admin táº¡o Owner náº¿u cÃ³ quyá»n.
- Admin xem Owner Detail theo tabs.
- KhÃ³a/má»Ÿ/xÃ³a má»m/khÃ´i phá»¥c Owner Ä‘Ãºng quyá»n.
- Má»i action quan trá»ng ghi audit log.
- Owner locked/soft_deleted khÃ´ng Ä‘Äƒng nháº­p Ä‘Æ°á»£c.

## 7. Quáº£n LÃ½ KhÃ¡ch ThuÃª

### Entity Tenant

| Field | Kiá»ƒu | MÃ´ táº£ |
|---|---|---|
| tenant_id | string | MÃ£ khÃ¡ch thuÃª |
| full_name | string | Há» tÃªn |
| phone | string | Sá»‘ Ä‘iá»‡n thoáº¡i |
| email | string | Email |
| status | enum | not_activated, active, locked, soft_deleted |
| rental_status | enum | deposit, renting, moving_out, left, cancelled |
| owner_id | string | Owner quáº£n lÃ½ |
| property_id | string | CÆ¡ sá»Ÿ hiá»‡n táº¡i |
| room_id | string | PhÃ²ng hiá»‡n táº¡i |
| current_contract_id | string | Há»£p Ä‘á»“ng hiá»‡n táº¡i |
| debt_amount | number | CÃ´ng ná»£ hiá»‡n táº¡i |
| created_at | datetime | NgÃ y táº¡o |
| last_login_at | datetime | Láº§n Ä‘Äƒng nháº­p gáº§n nháº¥t |

### Dá»¯ Liá»‡u Nháº¡y Cáº£m

Dá»¯ liá»‡u nháº¡y cáº£m gá»“m CCCD/CMND, áº£nh giáº¥y tá», Ä‘á»‹a chá»‰ thÆ°á»ng trÃº, liÃªn há»‡ kháº©n cáº¥p, file há»£p Ä‘á»“ng cÃ³ thÃ´ng tin cÃ¡ nhÃ¢n.

Rules:

- Che máº·c Ä‘á»‹nh.
- Cáº§n quyá»n `tenant.view_sensitive`.
- Khi báº¥m hiá»‡n thÃ´ng tin, hiá»ƒn thá»‹ modal xÃ¡c nháº­n.
- CÃ³ thá»ƒ báº¯t buá»™c nháº­p lÃ½ do theo cáº¥u hÃ¬nh.
- Ghi audit log má»©c High.

### KhÃ³a / Má»Ÿ TÃ i Khoáº£n KhÃ¡ch ThuÃª

- Cáº§n quyá»n `tenant.lock` hoáº·c `tenant.unlock`.
- Báº¯t buá»™c nháº­p lÃ½ do.
- Tenant bá»‹ khÃ³a khÃ´ng Ä‘Äƒng nháº­p Ä‘Æ°á»£c.
- Dá»¯ liá»‡u thuÃª/há»£p Ä‘á»“ng/hÃ³a Ä‘Æ¡n khÃ´ng bá»‹ xÃ³a.
- Ghi audit log má»©c High.

### Acceptance Criteria

- Admin xem/search/filter tenant toÃ n há»‡ thá»‘ng.
- Admin xem chi tiáº¿t tenant.
- Dá»¯ liá»‡u nháº¡y cáº£m bá»‹ che máº·c Ä‘á»‹nh.
- Chá»‰ ngÆ°á»i cÃ³ quyá»n má»›i xem Ä‘Æ°á»£c dá»¯ liá»‡u nháº¡y cáº£m.
- Má»i láº§n xem sensitive data ghi audit log.
- KhÃ³a/má»Ÿ tenant Ä‘Ãºng quyá»n vÃ  cÃ³ lÃ½ do.

## 8. CÆ¡ Sá»Ÿ / NhÃ  Trá»

### Entity Property

| Field | Kiá»ƒu | MÃ´ táº£ |
|---|---|---|
| property_id | string | MÃ£ cÆ¡ sá»Ÿ |
| owner_id | string | Owner sá»Ÿ há»¯u |
| name | string | TÃªn cÆ¡ sá»Ÿ |
| address | string | Äá»‹a chá»‰ |
| province/district/ward | string | Äá»‹a phÆ°Æ¡ng |
| status | enum | active, paused, locked, soft_deleted |
| room_count | number | Tá»•ng phÃ²ng |
| occupied_room_count | number | PhÃ²ng Ä‘ang thuÃª |
| vacant_room_count | number | PhÃ²ng trá»‘ng |
| created_at | datetime | NgÃ y táº¡o |

### Rules

- KhÃ³a cÆ¡ sá»Ÿ cáº§n quyá»n `property.lock`.
- Owner khÃ´ng Ä‘Æ°á»£c táº¡o/sá»­a dá»¯ liá»‡u má»›i trÃªn cÆ¡ sá»Ÿ bá»‹ khÃ³a.
- Dá»¯ liá»‡u cÅ© váº«n giá»¯.
- Báº¯t buá»™c nháº­p lÃ½ do.
- Ghi audit log má»©c High.

### Acceptance Criteria

- Admin xem/search/filter cÆ¡ sá»Ÿ.
- Admin xem chi tiáº¿t cÆ¡ sá»Ÿ.
- Admin khÃ³a/má»Ÿ khÃ³a náº¿u cÃ³ quyá»n.
- KhÃ³a/má»Ÿ khÃ³a báº¯t buá»™c nháº­p lÃ½ do vÃ  ghi audit log.

## 9. PhÃ²ng

### Entity Room

| Field | Kiá»ƒu | MÃ´ táº£ |
|---|---|---|
| room_id | string | MÃ£ phÃ²ng |
| property_id | string | CÆ¡ sá»Ÿ |
| owner_id | string | Owner |
| room_name | string | TÃªn/mÃ£ phÃ²ng |
| price | number | GiÃ¡ thuÃª |
| area | number | Diá»‡n tÃ­ch |
| status | enum | vacant, deposit, occupied, maintenance, inactive, soft_deleted |
| current_tenant_id | string | Tenant hiá»‡n táº¡i |
| current_contract_id | string | Há»£p Ä‘á»“ng hiá»‡n táº¡i |
| created_at/updated_at | datetime | Thá»i gian |

### Rule Cáº­p Nháº­t Tráº¡ng ThÃ¡i

- Cáº§n quyá»n `room.update`.
- Náº¿u phÃ²ng Ä‘ang cÃ³ há»£p Ä‘á»“ng active, khÃ´ng Ä‘Æ°á»£c chuyá»ƒn trá»±c tiáº¿p sang trá»‘ng trá»« khi xá»­ lÃ½ há»£p Ä‘á»“ng.
- Má»i thay Ä‘á»•i tráº¡ng thÃ¡i pháº£i ghi audit log.

### Acceptance Criteria

- Admin xem/search/filter phÃ²ng.
- Admin xem chi tiáº¿t phÃ²ng.
- Admin tháº¥y lá»‹ch sá»­ thuÃª vÃ  hÃ³a Ä‘Æ¡n.
- KhÃ´ng cho Ä‘á»•i tráº¡ng thÃ¡i gÃ¢y mÃ¢u thuáº«n vá»›i há»£p Ä‘á»“ng active.
- Má»i thay Ä‘á»•i tráº¡ng thÃ¡i ghi audit log.

## 10. Há»£p Äá»“ng

### Entity Contract

| Field | Kiá»ƒu | MÃ´ táº£ |
|---|---|---|
| contract_id | string | MÃ£ há»£p Ä‘á»“ng |
| owner_id | string | Owner |
| property_id | string | CÆ¡ sá»Ÿ |
| room_id | string | PhÃ²ng |
| tenant_id | string | KhÃ¡ch thuÃª |
| start_date | date | NgÃ y báº¯t Ä‘áº§u |
| end_date | date | NgÃ y káº¿t thÃºc |
| rent_price | number | GiÃ¡ thuÃª |
| deposit_amount | number | Tiá»n cá»c |
| billing_cycle | enum | Chu ká»³ thanh toÃ¡n |
| status | enum | draft, active, near_expiry, expired, ended, cancelled |
| file_url | string | File há»£p Ä‘á»“ng |
| created_at/updated_at | datetime | Thá»i gian |

### Rules

- Sá»­a há»£p Ä‘á»“ng cáº§n quyá»n `contract.update`, báº¯t buá»™c nháº­p lÃ½ do, lÆ°u before/after, ghi audit log High.
- Náº¿u Ä‘á»•i phÃ²ng/tenant, pháº£i kiá»ƒm tra xung Ä‘á»™t há»£p Ä‘á»“ng active.
- Náº¿u Ä‘á»•i ngÃ y káº¿t thÃºc, cáº­p nháº­t tráº¡ng thÃ¡i near_expiry/expired náº¿u cáº§n.
- Há»§y há»£p Ä‘á»“ng cáº§n quyá»n `contract.cancel`, báº¯t buá»™c nháº­p lÃ½ do, khÃ´ng xÃ³a hÃ³a Ä‘Æ¡n liÃªn quan, status sang `cancelled`, ghi audit log High/Critical.

### Acceptance Criteria

- Admin xem/filter há»£p Ä‘á»“ng.
- Admin xem há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n.
- Admin xem chi tiáº¿t há»£p Ä‘á»“ng.
- Admin táº£i file náº¿u cÃ³ quyá»n.
- Chá»‰nh/há»§y há»£p Ä‘á»“ng báº¯t buá»™c lÃ½ do vÃ  audit log.
- KhÃ´ng cho chá»‰nh gÃ¢y mÃ¢u thuáº«n vá»›i phÃ²ng/tenant active.

## 11. HÃ³a ÄÆ¡n / Thanh ToÃ¡n

### Entity Invoice

| Field | Kiá»ƒu | MÃ´ táº£ |
|---|---|---|
| invoice_id | string | MÃ£ hÃ³a Ä‘Æ¡n |
| owner_id | string | Owner |
| property_id | string | CÆ¡ sá»Ÿ |
| room_id | string | PhÃ²ng |
| tenant_id | string | KhÃ¡ch thuÃª |
| billing_period | string/date | Ká»³ thanh toÃ¡n |
| room_amount | number | Tiá»n phÃ²ng |
| electricity_amount | number | Tiá»n Ä‘iá»‡n |
| water_amount | number | Tiá»n nÆ°á»›c |
| service_amount | number | PhÃ­ dá»‹ch vá»¥ |
| surcharge_amount | number | Phá»¥ phÃ­ |
| discount_amount | number | Giáº£m trá»« |
| total_amount | number | Tá»•ng tiá»n |
| paid_amount | number | ÄÃ£ thanh toÃ¡n |
| status | enum | draft, sent, unpaid, partial_paid, paid, overdue, cancelled |
| due_date | date | Háº¡n thanh toÃ¡n |
| paid_at | datetime | NgÃ y thanh toÃ¡n |
| created_at/updated_at | datetime | Thá»i gian |

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Nhap
    Nhap --> DaGui: Gá»­i hÃ³a Ä‘Æ¡n
    DaGui --> ChuaThanhToan: Äáº¿n ká»³ thanh toÃ¡n
    ChuaThanhToan --> ThanhToanMotPhan: Tráº£ má»™t pháº§n
    ChuaThanhToan --> DaThanhToan: Tráº£ Ä‘á»§
    ThanhToanMotPhan --> DaThanhToan: Tráº£ pháº§n cÃ²n láº¡i
    ChuaThanhToan --> QuaHan: QuÃ¡ due_date
    ThanhToanMotPhan --> QuaHan: QuÃ¡ due_date
    Nhap --> DaHuy: Há»§y
    DaGui --> DaHuy: Há»§y
    ChuaThanhToan --> DaHuy: Há»§y
```

### Rules

- Sá»­a tiá»n cáº§n quyá»n `invoice.update`, khÃ´ng cho sá»­a invoice `paid` náº¿u config khÃ´ng cho phÃ©p, báº¯t buá»™c nháº­p lÃ½ do, lÆ°u before/after, tÃ­nh láº¡i total, ghi audit log High.
- Mark paid cáº§n quyá»n `invoice.mark_paid`, báº¯t buá»™c nháº­p ngÃ y thanh toÃ¡n, sá»‘ tiá»n vÃ  lÃ½ do náº¿u Admin thao tÃ¡c.
- Náº¿u `paid_amount < total_amount`, status = `partial_paid`; náº¿u Ä‘á»§, status = `paid`.
- Há»§y hÃ³a Ä‘Æ¡n cáº§n quyá»n `invoice.cancel`, báº¯t buá»™c nháº­p lÃ½ do, status = `cancelled`, khÃ´ng hard delete, ghi audit log High.

### Acceptance Criteria

- Admin xem/filter hÃ³a Ä‘Æ¡n.
- Admin xem chi tiáº¿t hÃ³a Ä‘Æ¡n.
- Admin sá»­a/há»§y/mark paid náº¿u cÃ³ quyá»n.
- Má»i thay Ä‘á»•i tiá»n lÆ°u before/after vÃ  audit log.
- KhÃ´ng hard delete hÃ³a Ä‘Æ¡n.

## 12. ThÃ´ng BÃ¡o Há»‡ Thá»‘ng

### Má»¥c TiÃªu

Admin gá»­i thÃ´ng bÃ¡o há»‡ thá»‘ng tá»« TroCare cho Owner hoáº·c tenant. KhÃ´ng dÃ¹ng Ä‘á»ƒ gá»­i nháº¯c tiá»n phÃ²ng thay Owner.

### Loáº¡i ThÃ´ng BÃ¡o

Cho Owner: báº£o trÃ¬ há»‡ thá»‘ng, cáº­p nháº­t tÃ­nh nÄƒng, thay Ä‘á»•i chÃ­nh sÃ¡ch, tÃ i khoáº£n bá»‹ khÃ³a/má»Ÿ khÃ³a, cáº£nh bÃ¡o dá»¯ liá»‡u báº¥t thÆ°á»ng.

Cho khÃ¡ch thuÃª: báº£o trÃ¬ há»‡ thá»‘ng, cáº­p nháº­t á»©ng dá»¥ng, tÃ i khoáº£n bá»‹ khÃ³a/má»Ÿ khÃ³a.

### Entity Notification

| Field | MÃ´ táº£ |
|---|---|
| notification_id | MÃ£ thÃ´ng bÃ¡o |
| title | TiÃªu Ä‘á» |
| content | Ná»™i dung |
| type | maintenance, feature_update, policy, account, data_warning |
| severity | info, warning, critical |
| target_type | all_owners, selected_owners, one_owner, all_tenants, one_tenant |
| channel | in_app, email |
| status | draft, scheduled, sent, cancelled, failed |
| scheduled_at | Thá»i gian gá»­i |
| created_by | NgÆ°á»i táº¡o |
| created_at | NgÃ y táº¡o |

### Acceptance Criteria

- Admin táº¡o Ä‘Æ°á»£c thÃ´ng bÃ¡o.
- Chá»n Ä‘Æ°á»£c Ä‘á»‘i tÆ°á»£ng nháº­n.
- Gá»­i ngay hoáº·c lÃªn lá»‹ch.
- Há»§y Ä‘Æ°á»£c thÃ´ng bÃ¡o chÆ°a gá»­i.
- CÃ³ tráº¡ng thÃ¡i gá»­i.
- KhÃ´ng dÃ¹ng Ä‘á»ƒ nháº¯c tiá»n phÃ²ng thay Owner.

## 13. Admin Ná»™i Bá»™

### Entity Admin User

| Field | MÃ´ táº£ |
|---|---|
| admin_id | MÃ£ Admin |
| full_name | Há» tÃªn |
| email | Email |
| role_id | Role |
| status | pending_activation, active, locked, soft_deleted |
| created_by | NgÆ°á»i táº¡o |
| created_at | NgÃ y táº¡o |
| last_login_at | Láº§n Ä‘Äƒng nháº­p gáº§n nháº¥t |

### Rules

- Táº¡o Admin cáº§n quyá»n `admin_user.create`.
- Email khÃ´ng trÃ¹ng.
- Admin báº¯t buá»™c cÃ³ role.
- Náº¿u role lÃ  Super Admin, cÃ³ thá»ƒ yÃªu cáº§u xÃ¡c nháº­n thÃªm.
- KhÃ´ng Ä‘Æ°á»£c khÃ³a/xÃ³a chÃ­nh mÃ¬nh náº¿u gÃ¢y máº¥t truy cáº­p.
- KhÃ´ng Ä‘Æ°á»£c khÃ³a/xÃ³a Super Admin cuá»‘i cÃ¹ng.
- KhÃ³a/xÃ³a báº¯t buá»™c nháº­p lÃ½ do.
- CÃ¡c hÃ nh Ä‘á»™ng quan trá»ng ghi audit log Critical.

### Acceptance Criteria

- Táº¡o Ä‘Æ°á»£c Admin ná»™i bá»™.
- Admin báº¯t buá»™c cÃ³ role.
- KhÃ³a/má»Ÿ khÃ³a Admin Ä‘Ãºng quyá»n.
- KhÃ´ng khÃ³a/xÃ³a Super Admin cuá»‘i cÃ¹ng.
- Má»i thay Ä‘á»•i ghi audit log.

## 14. Vai TrÃ² & PhÃ¢n Quyá»n

### Role Máº·c Äá»‹nh

- Super Admin.
- Operation Admin.
- Finance Admin.
- Support Admin.
- Read-only Admin.

### Permission Matrix

| Module | Permissions |
|---|---|
| Owner | `owner.view`, `owner.create`, `owner.update`, `owner.lock`, `owner.unlock`, `owner.delete`, `owner.export`, `owner.note` |
| Tenant | `tenant.view`, `tenant.create`, `tenant.update`, `tenant.lock`, `tenant.unlock`, `tenant.delete`, `tenant.export`, `tenant.view_sensitive` |
| Property | `property.view`, `property.create`, `property.update`, `property.lock`, `property.unlock`, `property.delete`, `property.export` |
| Room | `room.view`, `room.create`, `room.update`, `room.lock`, `room.unlock`, `room.delete`, `room.export` |
| Contract | `contract.view`, `contract.create`, `contract.update`, `contract.cancel`, `contract.delete`, `contract.export`, `contract.download_file` |
| Invoice | `invoice.view`, `invoice.create`, `invoice.update`, `invoice.cancel`, `invoice.mark_paid`, `invoice.export`, `invoice.view_payment_history` |
| Notification | `notification.view`, `notification.create`, `notification.send`, `notification.cancel` |
| Report | `report.view`, `report.export` |
| Admin User | `admin_user.view`, `admin_user.create`, `admin_user.update`, `admin_user.lock`, `admin_user.delete` |
| Role | `role.view`, `role.create`, `role.update`, `role.delete`, `role.assign` |
| Audit Log | `audit_log.view`, `audit_log.export` |
| System Config | `system_config.view`, `system_config.update` |

### Rules

- Super Admin role khÃ´ng Ä‘Æ°á»£c xÃ³a.
- KhÃ´ng xÃ³a role Ä‘ang cÃ³ Admin sá»­ dá»¥ng.
- KhÃ´ng lÃ m máº¥t Super Admin cuá»‘i cÃ¹ng.
- Sá»­a quyá»n role ghi audit log Critical.
- GÃ¡n role ghi audit log.
- Náº¿u Admin Ä‘ang online vÃ  role bá»‹ Ä‘á»•i, nÃªn reload quyá»n hoáº·c yÃªu cáº§u Ä‘Äƒng nháº­p láº¡i.

### Acceptance Criteria

- Táº¡o/sá»­a role tÃ¹y chá»‰nh.
- GÃ¡n role cho Admin.
- Permission matrix rÃµ rÃ ng.
- KhÃ´ng xÃ³a role Ä‘ang dÃ¹ng.
- KhÃ´ng lÃ m máº¥t Super Admin cuá»‘i cÃ¹ng.
- Má»i thay Ä‘á»•i ghi audit log Critical.

## 15. Audit Log

### Má»¥c TiÃªu

Audit log dÃ¹ng Ä‘á»ƒ truy váº¿t:

- Ai lÃ m?
- LÃ m gÃ¬?
- LÃ m trÃªn dá»¯ liá»‡u nÃ o?
- TrÆ°á»›c/sau thay Ä‘á»•i lÃ  gÃ¬?
- LÃ½ do lÃ  gÃ¬?
- Thá»i Ä‘iá»ƒm/IP/user agent nÃ o?

### Fields

| Field | MÃ´ táº£ |
|---|---|
| log_id | MÃ£ log |
| actor_id/name/role | NgÆ°á»i thá»±c hiá»‡n |
| module | Module |
| action | HÃ nh Ä‘á»™ng |
| object_type | Loáº¡i Ä‘á»‘i tÆ°á»£ng |
| object_id | ID Ä‘á»‘i tÆ°á»£ng |
| before_value | GiÃ¡ trá»‹ trÆ°á»›c |
| after_value | GiÃ¡ trá»‹ sau |
| reason | LÃ½ do |
| risk_level | Low/Medium/High/Critical |
| ip_address | IP |
| user_agent | Thiáº¿t bá»‹/trÃ¬nh duyá»‡t |
| created_at | Thá»i gian |

### Risk Level

| Má»©c | VÃ­ dá»¥ |
|---|---|
| Low | Xem dá»¯ liá»‡u thÆ°á»ng, login thÃ nh cÃ´ng |
| Medium | Chá»‰nh thÃ´ng tin cÆ¡ báº£n |
| High | KhÃ³a tÃ i khoáº£n, sá»­a hÃ³a Ä‘Æ¡n, há»§y há»£p Ä‘á»“ng, export, xem sensitive |
| Critical | Sá»­a phÃ¢n quyá»n, sá»­a cáº¥u hÃ¬nh, xÃ³a má»m dá»¯ liá»‡u quan trá»ng |

### Acceptance Criteria

- Log tá»± Ä‘á»™ng vá»›i action quan trá»ng.
- Chá»‰ Admin cÃ³ quyá»n xem audit log.
- Log khÃ´ng Ä‘Æ°á»£c chá»‰nh/xÃ³a tá»« UI.
- Update action pháº£i cÃ³ before/after.
- High/Critical manual action pháº£i cÃ³ reason.

## 16. Cáº¥u HÃ¬nh Há»‡ Thá»‘ng

### NhÃ³m Cáº¥u HÃ¬nh

- ThÃ´ng tin há»‡ thá»‘ng: tÃªn há»‡ thá»‘ng, logo, email há»— trá»£, hotline, link Ä‘iá»u khoáº£n, link chÃ­nh sÃ¡ch báº£o máº­t.
- ÄÄƒng nháº­p: Google Login, email login, session timeout, sá»‘ láº§n Ä‘Äƒng nháº­p sai, thá»i gian khÃ³a táº¡m.
- PhÃ²ng trá» máº·c Ä‘á»‹nh: VND, chu ká»³ thu tiá»n, ngÃ y chá»‘t tiá»n, sá»‘ ngÃ y nháº¯c thanh toÃ¡n, sá»‘ ngÃ y cáº£nh bÃ¡o há»£p Ä‘á»“ng.
- HÃ³a Ä‘Æ¡n: prefix, format mÃ£, cho phÃ©p sá»­a paid invoice, cho phÃ©p há»§y, báº¯t buá»™c lÃ½ do khi sá»­a tiá»n/há»§y.
- Há»£p Ä‘á»“ng: prefix, format mÃ£, sá»‘ ngÃ y cáº£nh bÃ¡o, cho phÃ©p chá»‰nh active contract, báº¯t buá»™c lÃ½ do khi há»§y.
- ThÃ´ng bÃ¡o: báº­t/táº¯t in-app/email, template báº£o trÃ¬, khÃ³a tÃ i khoáº£n, cáº­p nháº­t há»‡ thá»‘ng.
- Báº£o máº­t Admin: báº¯t buá»™c 2FA cho Super Admin, session timeout Admin, báº¯t buá»™c lÃ½ do khi export/xem sensitive.
- Upload file: dung lÆ°á»£ng tá»‘i Ä‘a, loáº¡i file PDF/JPG/PNG, sá»‘ lÆ°á»£ng file tá»‘i Ä‘a.

### Acceptance Criteria

- Chá»‰ ngÆ°á»i cÃ³ quyá»n má»›i xem/sá»­a.
- Config cÃ³ default an toÃ n.
- Sá»­a config ghi audit log Critical.
- Config rá»§i ro cao cáº§n xÃ¡c nháº­n.
- Validate format mÃ£, file limit, session timeout.

## 17. BÃ¡o CÃ¡o Váº­n HÃ nh

### NhÃ³m BÃ¡o CÃ¡o

- BÃ¡o cÃ¡o Owner: Owner má»›i, active, khÃ´ng hoáº¡t Ä‘á»™ng 30 ngÃ y, nhiá»u cÆ¡ sá»Ÿ/phÃ²ng nháº¥t, nhiá»u hÃ³a Ä‘Æ¡n quÃ¡ háº¡n nháº¥t.
- BÃ¡o cÃ¡o khÃ¡ch thuÃª: Ä‘ang thuÃª, má»›i theo thÃ¡ng, Ä‘Ã£ rá»i Ä‘i, cÃ³ cÃ´ng ná»£, theo tá»«ng Owner.
- BÃ¡o cÃ¡o phÃ²ng: tá»•ng phÃ²ng, Ä‘ang thuÃª, trá»‘ng, sá»­a chá»¯a, tá»· lá»‡ láº¥p Ä‘áº§y, phÃ²ng trá»‘ng lÃ¢u ngÃ y.
- BÃ¡o cÃ¡o há»£p Ä‘á»“ng: active, sáº¯p háº¿t háº¡n, háº¿t háº¡n chÆ°a káº¿t thÃºc, ended, cancelled.
- BÃ¡o cÃ¡o hÃ³a Ä‘Æ¡n/cÃ´ng ná»£: tá»•ng hÃ³a Ä‘Æ¡n, tá»•ng tiá»n hÃ³a Ä‘Æ¡n, Ä‘Ã£ thanh toÃ¡n, chÆ°a thanh toÃ¡n, cÃ´ng ná»£, quÃ¡ háº¡n, tá»· lá»‡ thanh toÃ¡n Ä‘Ãºng háº¡n.
- BÃ¡o cÃ¡o hoáº¡t Ä‘á»™ng há»‡ thá»‘ng: login Owner, phÃ²ng/tenant/há»£p Ä‘á»“ng/hÃ³a Ä‘Æ¡n táº¡o má»›i, sá»‘ láº§n Admin can thiá»‡p dá»¯ liá»‡u.

### UI BÃ¡o CÃ¡o

- Filter thá»i gian.
- Filter Owner.
- Filter cÆ¡ sá»Ÿ.
- Stat cards.
- Chart.
- Table chi tiáº¿t.
- Export náº¿u cÃ³ quyá»n.

### Acceptance Criteria

- Xem bÃ¡o cÃ¡o theo thá»i gian.
- Filter theo Owner/cÆ¡ sá»Ÿ náº¿u cÃ³.
- Export náº¿u cÃ³ quyá»n.
- BÃ¡o cÃ¡o tiá»n ghi rÃµ lÃ  hÃ³a Ä‘Æ¡n/cÃ´ng ná»£ cá»§a Owner, khÃ´ng pháº£i doanh thu TroCare.

## 18. Global Business Rules

### Soft Delete

KhÃ´ng hard delete tá»« UI Ä‘á»‘i vá»›i Owner, khÃ¡ch thuÃª, cÆ¡ sá»Ÿ, phÃ²ng, há»£p Ä‘á»“ng, hÃ³a Ä‘Æ¡n, Admin user.

Rules:

- Chuyá»ƒn tráº¡ng thÃ¡i `soft_deleted`.
- KhÃ´ng hiá»ƒn thá»‹ máº·c Ä‘á»‹nh.
- CÃ³ filter xem dá»¯ liá»‡u Ä‘Ã£ xÃ³a má»m náº¿u cÃ³ quyá»n.
- CÃ³ thá»ƒ khÃ´i phá»¥c náº¿u cÃ³ quyá»n.
- Ghi audit log.

### Modal XÃ¡c Nháº­n HÃ nh Äá»™ng Nguy Hiá»ƒm

Ãp dá»¥ng cho khÃ³a/má»Ÿ Owner, xÃ³a má»m Owner, khÃ³a tenant, há»§y há»£p Ä‘á»“ng, sá»­a tiá»n hÃ³a Ä‘Æ¡n, mark paid, há»§y hÃ³a Ä‘Æ¡n, export dá»¯ liá»‡u, xem sensitive data, sá»­a role/permission, sá»­a cáº¥u hÃ¬nh há»‡ thá»‘ng.

Modal cáº§n cÃ³ tiÃªu Ä‘á» rÃµ rÃ ng, mÃ´ táº£ tÃ¡c Ä‘á»™ng, field nháº­p lÃ½ do náº¿u cáº§n, button xÃ¡c nháº­n vÃ  button há»§y.

### Search / Filter / Sort / Pagination

Táº¥t cáº£ list screen cáº§n search keyword, filter tráº¡ng thÃ¡i, filter thá»i gian, sort cá»™t quan trá»ng, pagination, empty state, loading state vÃ  error state.

### Export Dá»¯ Liá»‡u

- Chá»‰ cÃ³ quyá»n export má»›i Ä‘Æ°á»£c export.
- Export pháº£i ghi audit log.
- Export sensitive data cáº§n lÃ½ do.
- Export theo filter hiá»‡n táº¡i.
- KhÃ´ng export toÃ n bá»™ dá»¯ liá»‡u lá»›n náº¿u khÃ´ng cÃ³ filter.

### Validation Chung

- Email Ä‘Ãºng format.
- Phone Ä‘Ãºng format Viá»‡t Nam náº¿u Ã¡p dá»¥ng.
- Sá»‘ tiá»n khÃ´ng Ã¢m.
- NgÃ y káº¿t thÃºc há»£p Ä‘á»“ng sau ngÃ y báº¯t Ä‘áº§u.
- HÃ³a Ä‘Æ¡n paid khÃ´ng Ä‘Æ°á»£c sá»­a tiá»n náº¿u config khÃ´ng cho phÃ©p.
- KhÃ´ng Ä‘Æ°á»£c táº¡o/chá»‰nh há»£p Ä‘á»“ng active gÃ¢y trÃ¹ng phÃ²ng.
- KhÃ´ng Ä‘Æ°á»£c xÃ³a/khÃ³a Super Admin cuá»‘i cÃ¹ng.

## 19. Danh SÃ¡ch MÃ n HÃ¬nh Cáº§n Thiáº¿t Káº¿

| STT | MÃ n hÃ¬nh | MÃ´ táº£ |
|---:|---|---|
| 1 | Admin Login | Google/email login tÃ¹y cáº¥u hÃ¬nh |
| 2 | Admin Dashboard | Tá»•ng quan váº­n hÃ nh |
| 3 | Danh sÃ¡ch Owner | Table + filter + actions |
| 4 | Táº¡o Owner | Form |
| 5 | Chi tiáº¿t Owner | Tabs |
| 6 | Chá»‰nh sá»­a Owner | Form/modal |
| 7 | Danh sÃ¡ch khÃ¡ch thuÃª | Table + filter |
| 8 | Chi tiáº¿t khÃ¡ch thuÃª | Tabs + sensitive data |
| 9 | Danh sÃ¡ch cÆ¡ sá»Ÿ | Table + filter |
| 10 | Chi tiáº¿t cÆ¡ sá»Ÿ | Tabs |
| 11 | Danh sÃ¡ch phÃ²ng | Table + filter |
| 12 | Chi tiáº¿t phÃ²ng | Lá»‹ch sá»­ thuÃª/hÃ³a Ä‘Æ¡n |
| 13 | Danh sÃ¡ch há»£p Ä‘á»“ng | Table + filter |
| 14 | Chi tiáº¿t há»£p Ä‘á»“ng | File + history |
| 15 | Danh sÃ¡ch hÃ³a Ä‘Æ¡n | Table + filter |
| 16 | Chi tiáº¿t hÃ³a Ä‘Æ¡n | Breakdown + history |
| 17 | Danh sÃ¡ch thÃ´ng bÃ¡o | Table |
| 18 | Táº¡o thÃ´ng bÃ¡o | Form + target |
| 19 | Danh sÃ¡ch Admin ná»™i bá»™ | Table |
| 20 | Táº¡o Admin ná»™i bá»™ | Form + role |
| 21 | Chi tiáº¿t Admin ná»™i bá»™ | Info + activity |
| 22 | Danh sÃ¡ch Role | Table |
| 23 | Chi tiáº¿t Role / Permission Matrix | Matrix |
| 24 | Audit Log | Table + filter |
| 25 | Chi tiáº¿t Audit Log | Before/after |
| 26 | Cáº¥u hÃ¬nh há»‡ thá»‘ng | Grouped settings |
| 27 | BÃ¡o cÃ¡o Owner | Cards + chart + table |
| 28 | BÃ¡o cÃ¡o khÃ¡ch thuÃª | Cards + chart + table |
| 29 | BÃ¡o cÃ¡o phÃ²ng | Cards + chart + table |
| 30 | BÃ¡o cÃ¡o há»£p Ä‘á»“ng | Cards + chart + table |
| 31 | BÃ¡o cÃ¡o hÃ³a Ä‘Æ¡n | Cards + chart + table |
| 32 | BÃ¡o cÃ¡o hoáº¡t Ä‘á»™ng há»‡ thá»‘ng | Usage analytics |

## 20. User Stories ChÃ­nh

### Dashboard

- LÃ  Admin, tÃ´i muá»‘n xem tá»•ng quan váº­n hÃ nh Ä‘á»ƒ biáº¿t há»‡ thá»‘ng Ä‘ang hoáº¡t Ä‘á»™ng tháº¿ nÃ o.
- LÃ  Admin, tÃ´i muá»‘n click vÃ o card hÃ³a Ä‘Æ¡n quÃ¡ háº¡n Ä‘á»ƒ Ä‘i Ä‘áº¿n danh sÃ¡ch hÃ³a Ä‘Æ¡n quÃ¡ háº¡n.

### Owner

- LÃ  Admin, tÃ´i muá»‘n táº¡o Owner Ä‘á»ƒ onboarding chá»§ trá».
- LÃ  Admin, tÃ´i muá»‘n khÃ³a Owner khi phÃ¡t hiá»‡n váº¥n Ä‘á».
- LÃ  Admin, tÃ´i muá»‘n xem toÃ n bá»™ dá»¯ liá»‡u cá»§a má»™t Owner Ä‘á»ƒ há»— trá»£.

### Tenant

- LÃ  Admin, tÃ´i muá»‘n tra cá»©u tenant theo Owner/phÃ²ng.
- LÃ  Admin cÃ³ quyá»n, tÃ´i muá»‘n xem dá»¯ liá»‡u nháº¡y cáº£m cá»§a tenant khi cáº§n vÃ  há»‡ thá»‘ng pháº£i ghi log.

### Property / Room

- LÃ  Admin, tÃ´i muá»‘n xem toÃ n bá»™ cÆ¡ sá»Ÿ/phÃ²ng.
- LÃ  Admin, tÃ´i muá»‘n khÃ³a cÆ¡ sá»Ÿ/phÃ²ng khi cáº§n ngÄƒn thao tÃ¡c má»›i.

### Contract

- LÃ  Admin, tÃ´i muá»‘n xem há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n.
- LÃ  Admin cÃ³ quyá»n, tÃ´i muá»‘n há»§y há»£p Ä‘á»“ng vÃ  nháº­p lÃ½ do.

### Invoice

- LÃ  Finance Admin, tÃ´i muá»‘n xem hÃ³a Ä‘Æ¡n quÃ¡ háº¡n.
- LÃ  Finance Admin, tÃ´i muá»‘n Ä‘Ã¡nh dáº¥u hÃ³a Ä‘Æ¡n Ä‘Ã£ thanh toÃ¡n khi xá»­ lÃ½ thá»§ cÃ´ng.

### Admin User / Role

- LÃ  Super Admin, tÃ´i muá»‘n táº¡o Admin ná»™i bá»™ vÃ  gÃ¡n role.
- LÃ  Super Admin, tÃ´i muá»‘n chá»‰nh permission theo matrix.
- LÃ  há»‡ thá»‘ng, tÃ´i khÃ´ng cho xÃ³a Super Admin cuá»‘i cÃ¹ng.

### Audit Log

- LÃ  Super Admin, tÃ´i muá»‘n xem ai Ä‘Ã£ sá»­a hÃ³a Ä‘Æ¡n.
- LÃ  Super Admin, tÃ´i muá»‘n xem before/after cá»§a thay Ä‘á»•i.

### Config

- LÃ  Super Admin, tÃ´i muá»‘n cáº¥u hÃ¬nh format mÃ£ hÃ³a Ä‘Æ¡n/há»£p Ä‘á»“ng.
- LÃ  Super Admin, tÃ´i muá»‘n báº­t/táº¯t Google Login.

### Report

- LÃ  Admin, tÃ´i muá»‘n xem bÃ¡o cÃ¡o phÃ²ng trá»‘ng/Ä‘ang thuÃª.
- LÃ  Admin, tÃ´i muá»‘n export bÃ¡o cÃ¡o hÃ³a Ä‘Æ¡n náº¿u cÃ³ quyá»n.

## 21. Prioritization

### Phase 1 â€” Must Have

1. Admin Login.
2. Dashboard tá»•ng quan.
3. Quáº£n lÃ½ Owner.
4. Chi tiáº¿t Owner.
5. Quáº£n lÃ½ khÃ¡ch thuÃª.
6. Chi tiáº¿t khÃ¡ch thuÃª.
7. Quáº£n lÃ½ cÆ¡ sá»Ÿ.
8. Quáº£n lÃ½ phÃ²ng.
9. Quáº£n lÃ½ há»£p Ä‘á»“ng.
10. Quáº£n lÃ½ hÃ³a Ä‘Æ¡n.
11. Admin ná»™i bá»™.
12. Vai trÃ² & phÃ¢n quyá»n.
13. Audit log.

### Phase 2 â€” Should Have

1. ThÃ´ng bÃ¡o há»‡ thá»‘ng.
2. Cáº¥u hÃ¬nh há»‡ thá»‘ng.
3. BÃ¡o cÃ¡o Owner.
4. BÃ¡o cÃ¡o khÃ¡ch thuÃª.
5. BÃ¡o cÃ¡o phÃ²ng.
6. BÃ¡o cÃ¡o há»£p Ä‘á»“ng.
7. BÃ¡o cÃ¡o hÃ³a Ä‘Æ¡n.

### Phase 3 â€” Nice to Have

1. BÃ¡o cÃ¡o hoáº¡t Ä‘á»™ng há»‡ thá»‘ng nÃ¢ng cao.
2. Export nÃ¢ng cao.
3. Bá»™ lá»c nÃ¢ng cao.
4. So sÃ¡nh dá»¯ liá»‡u theo ká»³.
5. Cáº£nh bÃ¡o dá»¯ liá»‡u báº¥t thÆ°á»ng.

## 22. Definition Of Done

Má»™t module Admin Ä‘Æ°á»£c xem lÃ  hoÃ n thÃ nh khi cÃ³ Ä‘á»§:

- UI danh sÃ¡ch.
- UI chi tiáº¿t.
- Search/filter/sort/pagination.
- Empty/loading/error state.
- Permission guard.
- CRUD/action theo quyá»n.
- Modal xÃ¡c nháº­n cho hÃ nh Ä‘á»™ng nguy hiá»ƒm.
- Audit log cho hÃ nh Ä‘á»™ng quan trá»ng.
- Validation dá»¯ liá»‡u.
- Acceptance criteria pass.
- Test cases cho flow chÃ­nh vÃ  edge cases.
- KhÃ´ng hard delete dá»¯ liá»‡u quan trá»ng tá»« UI.

## 23. API Endpoint Cáº¥p Cao

### Auth/Admin

```text
POST /admin/auth/login
POST /admin/auth/logout
GET  /admin/me
GET  /admin/me/permissions
```

### Dashboard

```text
GET /admin/dashboard/summary
GET /admin/dashboard/charts
GET /admin/dashboard/alerts
```

### Owner

```text
GET    /admin/owners
POST   /admin/owners
GET    /admin/owners/{ownerId}
PATCH  /admin/owners/{ownerId}
POST   /admin/owners/{ownerId}/lock
POST   /admin/owners/{ownerId}/unlock
DELETE /admin/owners/{ownerId}
POST   /admin/owners/{ownerId}/restore
GET    /admin/owners/{ownerId}/activities
POST   /admin/owners/{ownerId}/notes
```

### Tenant

```text
GET   /admin/tenants
GET   /admin/tenants/{tenantId}
PATCH /admin/tenants/{tenantId}
POST  /admin/tenants/{tenantId}/lock
POST  /admin/tenants/{tenantId}/unlock
GET   /admin/tenants/{tenantId}/sensitive
GET   /admin/tenants/{tenantId}/contracts
GET   /admin/tenants/{tenantId}/invoices
```

### Property / Room

```text
GET   /admin/properties
GET   /admin/properties/{propertyId}
PATCH /admin/properties/{propertyId}
POST  /admin/properties/{propertyId}/lock
POST  /admin/properties/{propertyId}/unlock

GET   /admin/rooms
GET   /admin/rooms/{roomId}
PATCH /admin/rooms/{roomId}
```

### Contract

```text
GET   /admin/contracts
GET   /admin/contracts/{contractId}
PATCH /admin/contracts/{contractId}
POST  /admin/contracts/{contractId}/cancel
GET   /admin/contracts/{contractId}/file
```

### Invoice

```text
GET   /admin/invoices
GET   /admin/invoices/{invoiceId}
PATCH /admin/invoices/{invoiceId}
POST  /admin/invoices/{invoiceId}/mark-paid
POST  /admin/invoices/{invoiceId}/cancel
GET   /admin/invoices/{invoiceId}/history
```

### Notification

```text
GET  /admin/notifications
POST /admin/notifications
GET  /admin/notifications/{notificationId}
POST /admin/notifications/{notificationId}/send
POST /admin/notifications/{notificationId}/cancel
```

### Admin User / Role

```text
GET    /admin/users
POST   /admin/users
GET    /admin/users/{adminId}
PATCH  /admin/users/{adminId}
POST   /admin/users/{adminId}/lock
POST   /admin/users/{adminId}/unlock

GET    /admin/roles
POST   /admin/roles
GET    /admin/roles/{roleId}
PATCH  /admin/roles/{roleId}
DELETE /admin/roles/{roleId}
POST   /admin/roles/{roleId}/assign
```

### Audit / Config / Reports

```text
GET /admin/audit-logs
GET /admin/audit-logs/{logId}

GET   /admin/system-config
PATCH /admin/system-config

GET /admin/reports/owners
GET /admin/reports/tenants
GET /admin/reports/rooms
GET /admin/reports/contracts
GET /admin/reports/invoices
GET /admin/reports/system-activities
```

## 24. Test Cases Quan Trá»ng

### Permission

- Admin khÃ´ng cÃ³ `owner.lock` khÃ´ng dÃ¹ng Ä‘Æ°á»£c nÃºt khÃ³a Owner.
- Admin khÃ´ng cÃ³ `tenant.view_sensitive` khÃ´ng xem Ä‘Æ°á»£c CCCD.
- Read-only Admin khÃ´ng sá»­a Ä‘Æ°á»£c dá»¯ liá»‡u.
- Finance Admin khÃ´ng vÃ o Ä‘Æ°á»£c role matrix náº¿u khÃ´ng cÃ³ quyá»n.

### Audit

- Sá»­a tiá»n hÃ³a Ä‘Æ¡n ghi before/after.
- Xem dá»¯ liá»‡u nháº¡y cáº£m ghi log.
- Sá»­a role ghi log Critical.
- Sá»­a cáº¥u hÃ¬nh ghi log Critical.
- Export dá»¯ liá»‡u ghi log.

### Owner

- Táº¡o Owner email trÃ¹ng bá»‹ lá»—i.
- KhÃ³a Owner báº¯t buá»™c nháº­p lÃ½ do.
- Owner bá»‹ khÃ³a khÃ´ng Ä‘Äƒng nháº­p Ä‘Æ°á»£c.
- Má»Ÿ khÃ³a Owner ghi log.

### Tenant

- KhÃ³a tenant báº¯t buá»™c nháº­p lÃ½ do.
- Xem sensitive data cáº§n quyá»n.
- Tenant cÃ³ cÃ´ng ná»£ hiá»ƒn thá»‹ Ä‘Ãºng.

### Contract

- KhÃ´ng cho há»£p Ä‘á»“ng active trÃ¹ng phÃ²ng.
- Há»§y há»£p Ä‘á»“ng báº¯t buá»™c lÃ½ do.
- Há»£p Ä‘á»“ng sáº¯p háº¿t háº¡n tÃ­nh theo cáº¥u hÃ¬nh.

### Invoice

- KhÃ´ng cho sá»­a tiá»n invoice paid náº¿u config khÃ´ng cho phÃ©p.
- Mark paid thiáº¿u tiá»n chuyá»ƒn `partial_paid`.
- Há»§y hÃ³a Ä‘Æ¡n khÃ´ng hard delete.
- Overdue tÃ­nh Ä‘Ãºng theo `due_date`.

### Admin User / Role

- KhÃ´ng xÃ³a role Ä‘ang cÃ³ Admin dÃ¹ng.
- KhÃ´ng khÃ³a/xÃ³a Super Admin cuá»‘i cÃ¹ng.
- Sá»­a permission ghi log Critical.

### Config

- Format mÃ£ hÃ³a Ä‘Æ¡n/há»£p Ä‘á»“ng khÃ´ng há»£p lá»‡ bÃ¡o lá»—i.
- Session timeout pháº£i há»£p lá»‡.
- Upload file chá»‰ nháº­n loáº¡i file cho phÃ©p.

## 25. Káº¿t Luáº­n Nghiá»‡p Vá»¥

Admin Portal cá»§a TroCare lÃ  Operations Control Center cho toÃ n bá»™ há»‡ thá»‘ng quáº£n lÃ½ phÃ²ng trá».

Trá»ng tÃ¢m:

1. Quáº£n trá»‹ Owner.
2. Quáº£n trá»‹ khÃ¡ch thuÃª.
3. Kiá»ƒm soÃ¡t cÆ¡ sá»Ÿ/phÃ²ng/há»£p Ä‘á»“ng/hÃ³a Ä‘Æ¡n.
4. PhÃ¢n quyá»n ná»™i bá»™ cháº·t cháº½.
5. Audit log Ä‘áº§y Ä‘á»§.
6. Cáº¥u hÃ¬nh váº­n hÃ nh an toÃ n.
7. BÃ¡o cÃ¡o váº­n hÃ nh rÃµ rÃ ng.

TÃ i liá»‡u nÃ y Ä‘á»§ Ä‘á»ƒ BA, PM, Designer, Backend, Frontend vÃ  QA hiá»ƒu há»‡ thá»‘ng Admin hoáº¡t Ä‘á»™ng tháº¿ nÃ o, cáº§n mÃ n hÃ¬nh gÃ¬, dá»¯ liá»‡u gÃ¬, quyá»n gÃ¬, rule gÃ¬ vÃ  flow xá»­ lÃ½ ra sao.
