# Web Defect Backlog

| ID | Severity | Module | Steps | Expected | Actual | Owner | Status |
|---|---|---|---|---|---|---|---|
| WEB-001 | Sev-1 | Bootstrap/Web DB | Mo web build | App render binh thuong | `Maximum call stack size exceeded` (db.web self-import) | Dev | Fixed |
| WEB-002 | Sev-1 | Build/Web SQLite | Build web local | Build pass | Resolve fail `wa-sqlite.wasm` | Dev | Fixed |
| WEB-003 | Sev-1 | Auth/Firebase web | Open app web | App vao duoc flow | White screen do auth init native persistence tren web | Dev | Fixed |
| WEB-004 | Sev-2 | Runtime flow validation | CRUD cac module chinh | Flow nghiep vu pass | User report "chuc nang chua work" (can retest sau fix) | QA | Open |
| WEB-005 | Sev-2 | Data correctness | Rental/Trading stats | Tong tien/thong ke dung | Chua co ket qua test full E2E web | QA + BA | Open |

## Notes

- `WEB-004` va `WEB-005` la blocker release cho web neu chua retest PASS.
- Sau moi lan fix, cap nhat cot `Status` va them bang chung (screenshot/log).
