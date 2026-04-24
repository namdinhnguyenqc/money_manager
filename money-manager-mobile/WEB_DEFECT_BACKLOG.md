# Web Defect Backlog

| ID | Severity | Module | Steps | Expected | Actual | Owner | Status |
|---|---|---|---|---|---|---|---|
| WEB-001 | Sev-1 | Bootstrap/Web DB | Mo web build | App render binh thuong | `Maximum call stack size exceeded` (db.web self-import) | Dev | Fixed |
| WEB-002 | Sev-1 | Build/Web SQLite | Build web local | Build pass | Resolve fail `wa-sqlite.wasm` | Dev | Fixed |
| WEB-003 | Sev-1 | Auth/Firebase web | Open app web | App vao duoc flow | White screen do auth init native persistence tren web | Dev | Fixed |
| WEB-004 | Sev-2 | Runtime flow validation | CRUD cac module chinh | Flow nghiep vu pass | Retest PASS (Invoices/Rental hoat dong tot) | QA | Fixed |
| WEB-005 | Sev-2 | Data correctness | Rental/Trading stats | Tong tien/thong ke dung | Retest PASS (Room stats hien thi dung) | QA + BA | Fixed |
| WEB-006 | Sev-3 | Server/MIME | Load app web | Khong co loi console | `Incorrect response MIME type. Expected 'application/wasm'` | DevOps | Open |
| WEB-007 | Sev-2 | Data/Ledger | Dashboard summary | Hien thi so du thuc te | So du luon bang 0 do transaction "Data balancing" trong seed data | Dev | Open |

## Notes

- `WEB-004` và `WEB-005` đã được xác nhận Fixed qua bản build local mới nhất.
- `WEB-006` là lỗi cấu hình server serve file tĩnh, hệ thống đang dùng cơ chế fallback.
- `WEB-007` cần điều chỉnh lại logic seed data nếu muốn Dashboard hiển thị số dư thực tế.

