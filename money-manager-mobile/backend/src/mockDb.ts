// In-memory mock database for local testing without Supabase
export const mockDb = {
  wallets: [
    { id: 1, name: "Tiền mặt", balance: 5000000, type: "personal", color: "#2563eb", icon: "wallet" },
    { id: 2, name: "Thẻ Vietcombank", balance: 25000000, type: "personal", color: "#10b981", icon: "credit-card" },
    { id: 3, name: "Quỹ Nhà Trọ", balance: 12000000, type: "rental", color: "#10b981", icon: "home" },
    { id: 4, name: "Vốn Nhập Hàng", balance: 50000000, type: "trading", color: "#f59e0b", icon: "package" }
  ],
  transactions: [
    { id: 1, type: "income", amount: 15000000, description: "Lương tháng", date: new Date().toISOString().slice(0,10) },
    { id: 2, type: "expense", amount: 50000, description: "Ăn sáng", date: new Date().toISOString().slice(0,10) }
  ],
  rooms: [
    { id: 1, name: "Phòng 101", price: 3000000, has_ac: true, num_people: 1, status: "occupied", tenant_name: "Nguyễn Văn A", contract_id: 101 },
    { id: 2, name: "Phòng 102", price: 2500000, has_ac: false, num_people: 2, status: "vacant" },
    { id: 3, name: "Phòng 103", price: 3500000, has_ac: true, num_people: 1, status: "occupied", tenant_name: "Trần Thị B", contract_id: 102 },
  ],
  tradingItems: [
    { id: 1, name: "Sổ tay cao cấp", category: "Văn phòng phẩm", import_price: 50000, import_date: "2026-04-01", status: "available" },
    { id: 2, name: "Bút ký Pentel", category: "Bút", import_price: 150000, import_date: "2026-04-05", status: "sold", sell_price: 250000, sell_date: "2026-04-10" }
  ]
};

export const updateMockBalance = (walletId: number, amountChange: number) => {
  const w = mockDb.wallets.find(x => x.id === walletId);
  if (w) w.balance += amountChange;
};
