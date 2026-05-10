/**
 * test-rental-fields.js
 * Kiểm thử toàn diện: Frontend field → Backend nhận đúng → Response đúng
 * Chạy tuần tự, có đầy đủ log chi tiết.
 *
 * Cách chạy:
 *   node test-rental-fields.js
 */

const BASE = "http://localhost:8787";
const RESULTS = [];
let PASS = 0, FAIL = 0;

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function req(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
  } catch (e) {
    return { status: 0, body: { error: e.message } };
  }
}

function check(condition, message, detail = "") {
  if (condition) {
    console.log(`  ✅ ${message}`);
    RESULTS.push({ ok: true, message });
    PASS++;
  } else {
    console.error(`  ❌ ${message}${detail ? `\n     → ${detail}` : ""}`);
    RESULTS.push({ ok: false, message, detail });
    FAIL++;
  }
}

function hasField(obj, field) {
  return obj !== null && typeof obj === "object" && obj[field] !== undefined;
}

function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function runTests() {
  let token = "";
  let roomId, tenantId, contractId, invoiceId, serviceId, walletId, extraServiceId;

  // ── 1. AUTH ─────────────────────────────────────────────────────────────
  section("🔐 Auth: Lấy token");
  {
    const r = await req("POST", "/auth/admin-login", {
      username: "admin",
      password: "admin",
    });
    check(r.status === 200, `POST /auth/admin-login → 200`, JSON.stringify(r.body));
    check(!!r.body.accessToken, "Có accessToken trong response");
    token = r.body.accessToken || "";
    if (!token) {
      console.error("\n🛑 Không lấy được token. Dừng test.");
      return printSummary();
    }
    console.log("  ℹ️  Dùng Admin token để test (bypass Supabase auth)");
  }

  // ── 2. ROOMS ─────────────────────────────────────────────────────────────
  section("🏠 Rooms: camelCase → snake_case mapping");
  {
    // POST: Frontend gửi { name, price, hasAc, numPeople }
    const payload = { name: "Phòng Test-AC", price: 2500000, hasAc: true, numPeople: 2 };
    const r = await req("POST", "/rental/rooms", payload, token);
    check(r.status === 201, `POST /rental/rooms → 201`, JSON.stringify(r.body));
    check(hasField(r.body.data, "id"), "Response có field: id");
    check(hasField(r.body.data, "has_ac"), "Response có field: has_ac (snake_case)");
    check(hasField(r.body.data, "num_people"), "Response có field: num_people (snake_case)");
    check(r.body.data?.has_ac === true, "has_ac = true (lưu đúng từ hasAc)");
    check(r.body.data?.num_people === 2, "num_people = 2 (lưu đúng từ numPeople)");
    roomId = r.body.data?.id;

    // GET: Phải trả về cả hai format
    const g = await req("GET", "/rental/rooms", null, token);
    check(g.status === 200, `GET /rental/rooms → 200`);
    const room = g.body.data?.find((x) => x.id === roomId);
    check(!!room, "Tìm thấy phòng vừa tạo trong GET /rooms");
    check(hasField(room, "hasAc"), "GET /rooms response có: hasAc (camelCase)");
    check(hasField(room, "numPeople"), "GET /rooms response có: numPeople (camelCase)");
    check(hasField(room, "has_ac"), "GET /rooms response có: has_ac (snake_case)");
    check(room?.hasAc === true, "room.hasAc = true");

    // PATCH: Frontend gửi camelCase
    const p = await req("PATCH", `/rental/rooms/${roomId}`, { hasAc: false, price: 3000000 }, token);
    check(p.status === 200, `PATCH /rental/rooms/${roomId} → 200`, JSON.stringify(p.body));
    check(p.body.data?.has_ac === false, "has_ac = false sau PATCH hasAc=false");
    check(Number(p.body.data?.price) === 3000000, "price = 3000000 sau PATCH");
  }

  // ── 3. TENANTS ───────────────────────────────────────────────────────────
  section("👥 Tenants: idCard → id_card mapping");
  {
    // POST: Frontend gửi { name, phone, idCard, address }
    const payload = { name: "Nguyễn Văn Test", phone: "0912345678", idCard: "012345678901", address: "123 Đường Test" };
    const r = await req("POST", "/rental/tenants", payload, token);
    check(r.status === 201, `POST /rental/tenants → 201`, JSON.stringify(r.body));
    check(hasField(r.body.data, "id"), "Response có: id");
    check(hasField(r.body.data, "id_card"), "Response có: id_card (snake_case)");
    check(r.body.data?.id_card === "012345678901", "id_card = '012345678901' (lưu đúng từ idCard)");
    tenantId = r.body.data?.id;

    // GET: Phải trả về idCard alias
    const g = await req("GET", "/rental/tenants", null, token);
    check(g.status === 200, `GET /rental/tenants → 200`);
    const tenant = g.body.data?.find((x) => x.id === tenantId);
    check(!!tenant, "Tìm thấy khách thuê vừa tạo");
    check(hasField(tenant, "idCard"), "GET /tenants response có: idCard (camelCase)");
    check(hasField(tenant, "id_card"), "GET /tenants response có: id_card (snake_case)");
  }

  // ── 4. SERVICES ──────────────────────────────────────────────────────────
  section("⚙️ Services: unitPrice, unitPriceAc, per_room type");
  {
    // POST: Frontend gửi { name, type, unitPrice, unitPriceAc }
    const payload = { name: "Tiền Điện Test", type: "metered", unitPrice: 3500, unitPriceAc: 4200, icon: "⚡" };
    const r = await req("POST", "/rental/services", payload, token);
    check(r.status === 201, `POST /rental/services → 201`, JSON.stringify(r.body));
    check(hasField(r.body.data, "unitPrice"), "Response có: unitPrice (camelCase)");
    check(hasField(r.body.data, "unitPriceAc"), "Response có: unitPriceAc (camelCase)");
    check(hasField(r.body.data, "unit_price"), "Response có: unit_price (snake_case)");
    check(hasField(r.body.data, "unit_price_ac"), "Response có: unit_price_ac (snake_case)");
    check(Number(r.body.data?.unitPrice) === 3500, "unitPrice = 3500");
    check(Number(r.body.data?.unitPriceAc) === 4200, "unitPriceAc = 4200");
    serviceId = r.body.data?.id;

    // Test type=per_room (không bị lỗi "Invalid option")
    const rr = await req("POST", "/rental/services", { name: "Phí QL Test", type: "per_room", unitPrice: 50000 }, token);
    check(rr.status === 201, `POST type=per_room → 201 (không bị 'Invalid option')`, JSON.stringify(rr.body));
    extraServiceId = rr.body.data?.id;

    // PATCH: Gửi cả snake_case và camelCase
    const p = await req("PATCH", `/rental/services/${serviceId}`, { unit_price: 3800, unitPriceAc: 4500 }, token);
    check(p.status === 200, `PATCH /rental/services/${serviceId} → 200`, JSON.stringify(p.body));
    check(Number(p.body.data?.unit_price) === 3800, "unit_price = 3800 sau PATCH");
    check(Number(p.body.data?.unitPriceAc) === 4500, "unitPriceAc = 4500 sau PATCH");

    // GET: Trả về đủ 4 field giá
    const g = await req("GET", "/rental/services", null, token);
    check(g.status === 200, `GET /rental/services → 200`);
    const svc = g.body.data?.find((x) => x.id === serviceId);
    check(!!svc, "Tìm thấy dịch vụ vừa tạo");
    check(hasField(svc, "unitPrice"), "GET /services có: unitPrice");
    check(hasField(svc, "unitPriceAc"), "GET /services có: unitPriceAc");
  }

  // ── 5. CONTRACTS ─────────────────────────────────────────────────────────
  section("📋 Contracts: camelCase POST → snapshot AC price");
  {
    if (!roomId || !tenantId || !serviceId) {
      check(false, "Bỏ qua test Contracts (thiếu roomId/tenantId/serviceId)");
    } else {
      // POST: Frontend gửi nhiều camelCase fields
      const payload = {
        roomId,
        tenantId,
        startDate: "2026-05-01",
        deposit: 3000000,
        rentAmount: 3000000,
        billingDay: 5,
        electricStart: 1500,
        waterStart: 200,
        occupantCount: 2,
        serviceIds: [serviceId],
      };
      const r = await req("POST", "/rental/contracts", payload, token);
      check(r.status === 201, `POST /rental/contracts → 201`, JSON.stringify(r.body));
      check(hasField(r.body.data, "id"), "Response có: id");
      contractId = r.body.data?.id;

      // GET /contracts/active: Phải trả về đủ camelCase aliases
      const g = await req("GET", "/rental/contracts/active", null, token);
      check(g.status === 200, `GET /rental/contracts/active → 200`);
      const contract = g.body.data?.find((x) => x.id === contractId);
      check(!!contract, "Tìm thấy hợp đồng vừa tạo");
      check(hasField(contract, "startDate"), "GET /contracts có: startDate");
      check(hasField(contract, "roomName"), "GET /contracts có: roomName (camelCase)");
      check(hasField(contract, "room_name"), "GET /contracts có: room_name (snake_case)");
      check(hasField(contract, "tenantName"), "GET /contracts có: tenantName (camelCase)");
      check(hasField(contract, "hasAc"), "GET /contracts có: hasAc (phòng có máy lạnh)");
      check(hasField(contract, "roomPrice"), "GET /contracts có: roomPrice");

      // applied_services_snapshot phải có giá máy lạnh (vì phòng has_ac=false sau PATCH, nhưng ban đầu là true)
      check(
        Array.isArray(contract?.applied_services_snapshot),
        "applied_services_snapshot là array (đã được lưu khi tạo HĐ)"
      );

      // PATCH: Frontend gửi { startDate, deposit, serviceIds }
      const p = await req("PATCH", `/rental/contracts/${contractId}`, {
        startDate: "2026-05-01",
        deposit: 3500000,
        serviceIds: [serviceId],
      }, token);
      check(p.status === 200, `PATCH /rental/contracts/${contractId} → 200`, JSON.stringify(p.body));
    }
  }

  // ── 6. INVOICES ──────────────────────────────────────────────────────────
  section("🧾 Invoices: camelCase → response aliases");
  {
    if (!roomId || !contractId) {
      check(false, "Bỏ qua test Invoices (thiếu roomId/contractId)");
    } else {
      // POST: Frontend gửi camelCase fields
      const payload = {
        roomId,
        contractId,
        month: 5,
        year: 2026,
        roomFee: 3000000,
        previousDebt: 0,
        elecOld: 1500,
        elecNew: 1650,
        waterOld: 200,
        waterNew: 215,
        items: [
          { name: "Tiền điện", amount: 525000, detail: "1500→1650×3500" },
          { name: "Tiền nước", amount: 225000, detail: "200→215×15000" },
        ],
      };
      const r = await req("POST", "/invoices", payload, token);
      check(r.status === 201, `POST /invoices → 201`, JSON.stringify(r.body));
      check(hasField(r.body.data, "id"), "Response có: id");
      invoiceId = r.body.data?.id;

      // GET /invoices: Phải có camelCase aliases
      const g = await req("GET", "/invoices", null, token);
      check(g.status === 200, `GET /invoices → 200`);
      const inv = g.body.data?.find((x) => x.id === invoiceId);
      check(!!inv, "Tìm thấy hóa đơn vừa tạo");
      check(hasField(inv, "roomId"), "GET /invoices có: roomId");
      check(hasField(inv, "roomFee"), "GET /invoices có: roomFee (camelCase)");
      check(hasField(inv, "totalAmount"), "GET /invoices có: totalAmount (camelCase)");
      check(hasField(inv, "paidAmount"), "GET /invoices có: paidAmount (camelCase)");
      check(hasField(inv, "roomName"), "GET /invoices có: roomName");
      check(hasField(inv, "tenantName"), "GET /invoices có: tenantName");

      // GET /invoices/:id: Chi tiết với items
      const d = await req("GET", `/invoices/${invoiceId}`, null, token);
      check(d.status === 200, `GET /invoices/${invoiceId} → 200`, JSON.stringify(d.body));
      check(hasField(d.body.data, "roomFee"), "GET /invoices/:id có: roomFee");
      check(hasField(d.body.data, "totalAmount"), "GET /invoices/:id có: totalAmount");
      check(Array.isArray(d.body.data?.items), "GET /invoices/:id có: items là array");

      // POST mark-paid: Frontend gửi { paidAmount, transactionId }
      const mp = await req("POST", `/invoices/${invoiceId}/mark-paid`, {
        paidAmount: 3750000,
        transactionId: null,
      }, token);
      check(mp.status === 200, `POST /invoices/:id/mark-paid → 200`, JSON.stringify(mp.body));
      check(hasField(mp.body.data, "paid_amount"), "mark-paid response có: paid_amount");
      check(Number(mp.body.data?.paid_amount) === 3750000, "paid_amount = 3750000");
    }
  }

  // ── 7. TRANSACTIONS ──────────────────────────────────────────────────────
  section("💰 Transactions: walletId camelCase → mapping");
  {
    const gw = await req("GET", "/wallets", null, token);
    check(gw.status === 200, `GET /wallets → 200`);
    walletId = gw.body.data?.[0]?.id;

    if (walletId) {
      // Frontend gửi { type, amount, walletId, date, description }
      const r = await req("POST", "/transactions", {
        type: "income",
        amount: 500000,
        walletId,
        date: "2026-05-02",
        description: "Test thu tiền",
      }, token);
      check(r.status === 201, `POST /transactions → 201`, JSON.stringify(r.body));
      check(hasField(r.body.data, "walletId"), "Response có: walletId (camelCase)");
      check(hasField(r.body.data, "wallet_id"), "Response có: wallet_id (snake_case)");
      check(Number(r.body.data?.wallet_id) === walletId, `wallet_id = ${walletId}`);
    } else {
      console.log("  ⏭️  Bỏ qua: Không có ví nào trong hệ thống");
    }
  }

  // ── 8. DỌN DẸP ──────────────────────────────────────────────────────────
  section("🧹 Dọn dẹp dữ liệu test");
  {
    if (invoiceId) {
      const r = await req("DELETE", `/invoices/${invoiceId}`, null, token);
      check(r.status < 500, `DELETE /invoices/${invoiceId}`, JSON.stringify(r.body));
    }
    if (contractId) {
      await req("POST", `/rental/contracts/${contractId}/terminate`, {
        roomId, refundAmount: 0, walletId: null
      }, token);
      const r = await req("DELETE", `/rental/contracts/${contractId}`, null, token);
      check(r.status < 500, `DELETE /rental/contracts/${contractId}`, JSON.stringify(r.body));
    }
    if (roomId) {
      const r = await req("DELETE", `/rental/rooms/${roomId}`, null, token);
      check(r.status < 500, `DELETE /rental/rooms/${roomId}`, JSON.stringify(r.body));
    }
    if (serviceId) {
      await req("DELETE", `/rental/services/${serviceId}`, null, token);
    }
    if (extraServiceId) {
      await req("DELETE", `/rental/services/${extraServiceId}`, null, token);
    }
    console.log("  🗑️  Dọn dẹp xong");
  }

  printSummary();
}

function printSummary() {
  const total = PASS + FAIL;
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  KẾT QUẢ: ${PASS}/${total} tests PASSED | ${FAIL} FAILED`);
  if (FAIL > 0) {
    console.log("\n  ❌ CÁC TEST THẤT BẠI:");
    RESULTS.filter((r) => !r.ok).forEach((r) => {
      console.log(`    - ${r.message}`);
      if (r.detail) console.log(`      → ${r.detail}`);
    });
  } else {
    console.log("  🎉 Tất cả tests PASSED! Frontend ↔ Backend đồng bộ hoàn toàn.");
  }
  console.log("═".repeat(60));
  process.exit(FAIL > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error("Lỗi không mong đợi:", e);
  process.exit(1);
});
