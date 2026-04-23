import { 
  collection, doc, getDoc, getDocs, addDoc, updateDoc, 
  deleteDoc, query, where, orderBy, limit, setDoc,
  serverTimestamp, Timestamp
} from "firebase/firestore";
import { db, auth } from "./firebase";

// Helper to get current user root document.
const getUserRef = () => {
  if (!auth || !db) throw new Error("Cloud is not configured");
  if (!auth.currentUser) throw new Error("Not signed in");
  return doc(db, "users", auth.currentUser.uid);
};

const getColRef = (colName) => {
  return collection(getUserRef(), colName);
};

// ------------------------------------------------------------
export const getWallets = async () => {
  // Removing orderBy to avoid index requirement hangs
  const q = query(getColRef("wallets"), where("active", "==", 1));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addWallet = async (name, type) => {
  const icons = { personal: "\uD83D\uDC5B", rental: "\uD83C\uDFE0", trading: "\uD83D\uDCE6" };
  const colors = { personal: '#2563eb', rental: '#10b981', trading: '#f59e0b' };
  const docRef = await addDoc(getColRef("wallets"), {
    name, type, icon: icons[type], color: colors[type], active: 1, created_at: serverTimestamp()
  });
  return docRef.id;
};

// ------------------------------------------------------------
export const getRooms = async () => {
  try {
    const [roomsSnap, contractsSnap, tenantsSnap] = await Promise.all([
      getDocs(getColRef("rooms")),
      getDocs(query(getColRef("contracts"), where("status", "==", "active"))),
      getDocs(getColRef("tenants"))
    ]);

    const rooms = roomsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const contracts = contractsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const tenants = tenantsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Manual Join Logic
    return rooms.map(room => {
      const contract = contracts.find(c => String(c.room_id) === String(room.id));
      if (contract) {
        const tenant = tenants.find(t => String(t.id) === String(contract.tenant_id));
        return {
          ...room,
          contract_id: contract.id,
          deposit: contract.deposit,
          start_date: contract.start_date,
          end_date: contract.end_date,
          tenant_id: tenant?.id,
          tenant_name: tenant?.name,
          tenant_phone: tenant?.phone,
          tenant_id_card: tenant?.id_card,
          tenant_address: tenant?.address
        };
      }
      return room;
    }).sort((a, b) => a.name.localeCompare(b.name)); // Sort on client-side to avoid index hang
  } catch (error) {
    console.error("getRooms cloud error:", error);
    return [];
  }
};

export const addRoom = async (name, price, hasAc = false, numPeople = 1) => {
  const docRef = await addDoc(getColRef("rooms"), {
    name, price, has_ac: hasAc ? 1 : 0, num_people: numPeople, status: 'vacant', created_at: serverTimestamp()
  });
  return docRef.id;
};

// ------------------------------------------------------------
export const addTransaction = async ({ type, amount, description, categoryId, walletId, imageUri, date }) => {
  const docRef = await addDoc(getColRef("transactions"), {
    type, amount, description, category_id: categoryId, wallet_id: walletId, image_uri: imageUri, date, created_at: serverTimestamp()
  });
  return docRef.id;
};

export const getTransactions = async ({ walletId, limit: limVal = 50 } = {}) => {
  let q;
  if (walletId) {
    q = query(getColRef("transactions"), where("wallet_id", "==", String(walletId)), limit(limVal));
  } else {
    q = query(getColRef("transactions"), limit(limVal));
  }
  
  const snap = await getDocs(q);
  const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Client-side sort to avoid index requirement
  return txs.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || ((b.created_at?.seconds || 0) - (a.created_at?.seconds || 0)));
};

export const getTransactionCount = async (walletId) => {
  const snap = await getDocs(getColRef("transactions")); // Simplified count
  if (walletId) {
    return snap.docs.filter(d => d.data().wallet_id === String(walletId)).length;
  }
  return snap.size;
};

// ------------------------------------------------------------
export const createInvoice = async (data) => {
  const docRef = await addDoc(getColRef("invoices"), {
    ...data,
    created_at: serverTimestamp(),
    status: data.status || 'sent'
  });
  return docRef.id;
};

export const getInvoices = async (month, year) => {
  const q = query(getColRef("invoices"), where("month", "==", month), where("year", "==", year));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ------------------------------------------------------------
export const getTenants = async () => {
  const snap = await getDocs(query(getColRef("tenants"), orderBy("name", "asc")));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addTenant = async (name, phone, idCard, address) => {
  const docRef = await addDoc(getColRef("tenants"), {
    name, phone, id_card: idCard, address, created_at: serverTimestamp()
  });
  return docRef.id;
};

// ------------------------------------------------------------
export const addContract = async (roomId, tenantId, startDate, deposit, serviceIds = []) => {
  const docRef = await addDoc(getColRef("contracts"), {
    room_id: roomId, tenant_id: tenantId, start_date: startDate, deposit, status: 'active', serviceIds, created_at: serverTimestamp()
  });
  // Update room status
  await updateDoc(doc(getColRef("rooms"), roomId), { status: 'occupied' });
  return docRef.id;
};

// ------------------------------------------------------------
export const getWalletStats = async (walletId) => {
  const qThu = query(getColRef("transactions"), where("wallet_id", "==", String(walletId)), where("type", "==", "income"));
  const qChi = query(getColRef("transactions"), where("wallet_id", "==", String(walletId)), where("type", "==", "expense"));
  
  const [snapInc, snapExp] = await Promise.all([getDocs(qThu), getDocs(qChi)]);
  
  const income = snapInc.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
  const expense = snapExp.docs.reduce((sum, d) => sum + (d.data().amount || 0), 0);
  
  return { income, expense, balance: income - expense };
};

export const getMonthlyStats = async (month, year) => {
  // Firestore doesn't support 'LIKE year-month%' as well as SQL, 
  // so we filter by month and year fields if we stored them, or by date range.
  // Assuming we use 'date' string YYYY-MM-DD
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const q = query(getColRef("transactions"), where("date", ">=", `${prefix}-01`), where("date", "<=", `${prefix}-31`));
  const snap = await getDocs(q);
  
  let income = 0;
  let expense = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.type === 'income') income += data.amount;
    else expense += data.amount;
  });
  
  return { income, expense, balance: income - expense };
};

// ------------------------------------------------------------
export const getCategories = async (type, walletId) => {
  const q = query(getColRef("categories"), where("type", "==", type), where("wallet_id", "==", String(walletId)));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const addCategory = async (name, icon, color, type, walletId) => {
  const docRef = await addDoc(getColRef("categories"), {
    name, icon, color, type, wallet_id: walletId, created_at: serverTimestamp()
  });
  return docRef.id;
};

// ------------------------------------------------------------
export const getServices = async () => {
  const snap = await getDocs(query(getColRef("services"), where("active", "==", 1)));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ------------------------------------------------------------
export const getBankConfig = async () => {
  const snap = await getDocs(getColRef("bank_config"));
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
};

export const updateBankConfig = async (data) => {
  const snap = await getDocs(getColRef("bank_config"));
  if (!snap.empty) {
    await updateDoc(doc(getColRef("bank_config"), snap.docs[0].id), data);
  } else {
    await addDoc(getColRef("bank_config"), { ...data, active: 1 });
  }
};

// ------------------------------------------------------------
export const getTradingItems = async (walletId) => {
  const q = query(getColRef("trading_items"), where("wallet_id", "==", String(walletId)));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return items.sort((a, b) => String(b.import_date || '').localeCompare(String(a.import_date || '')));
};

export const getTradingItemsByBatch = async (batchId) => {
  const q = query(getColRef("trading_items"), where("batch_id", "==", String(batchId)));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return items.sort((a, b) => {
    const aSec = a.created_at?.seconds || 0;
    const bSec = b.created_at?.seconds || 0;
    return aSec - bSec;
  });
};

export const addTradingItem = async ({ walletId, name, category, importPrice, importDate, targetPrice, batchId, note, quantity = 1, subItems = [] }) => {
  const safeQuantity = Math.max(1, Number(quantity) || 1);
  const safeImportPrice = Number(importPrice) || 0;
  const hasTargetPrice = targetPrice !== undefined && targetPrice !== null && targetPrice !== "";

  const txId = await addTransaction({
    type: "expense",
    amount: safeImportPrice,
    description: `Stock import: ${name}${safeQuantity > 1 ? ` (x${safeQuantity})` : ""}${batchId ? ` (Batch: ${batchId})` : ""}`,
    walletId,
    date: importDate,
  });

  const perItemPrice = safeImportPrice / safeQuantity;
  const itemsToCreate = subItems.length > 0
    ? subItems.map(si => ({ name: `${name} - ${si.name}`, category: si.category || category }))
    : Array.from({ length: safeQuantity }, (_, i) => ({
        name: safeQuantity > 1 ? `${name} - item ${i + 1}` : name,
        category,
      }));

  let lastId = null;
  for (const it of itemsToCreate) {
    const docRef = await addDoc(getColRef("trading_items"), {
      wallet_id: String(walletId),
      name: it.name,
      category: it.category || "",
      import_price: perItemPrice,
      target_price: hasTargetPrice ? (Number(targetPrice) || 0) / safeQuantity : null,
      import_date: importDate,
      sell_date: null,
      status: "available",
      note: note || "",
      batch_id: batchId || null,
      transaction_id: txId || null,
      sell_transaction_id: null,
      created_at: serverTimestamp(),
    });
    lastId = docRef.id;
  }
  return lastId;
};

export const updateTradingItem = async (id, data) => {
  const mapped = sanitizeData({
    name: data.name,
    category: data.category || '',
    import_price: data.importPrice ?? data.import_price,
    sell_price: data.sellPrice ?? data.sell_price ?? 0,
    target_price: data.targetPrice ?? data.target_price ?? null,
    import_date: data.importDate ?? data.import_date,
    sell_date: data.sellDate ?? data.sell_date ?? null,
    status: data.status,
    note: data.note || '',
  });
  await updateDoc(doc(getColRef("trading_items"), String(id)), { ...mapped, updated_at: serverTimestamp() });
};

export const deleteTradingItem = async (id) => {
  await deleteDoc(doc(getColRef("trading_items"), String(id)));
};

export const getTradingStats = async (walletId) => {
  const q = query(getColRef("trading_items"), where("wallet_id", "==", String(walletId)));
  const snap = await getDocs(q);
  const items = snap.docs.map(d => d.data());

  let unsoldCapital = 0;
  let unsoldCount = 0;
  let realizedProfit = 0;
  let soldCount = 0;

  items.forEach((x) => {
    const importPrice = Number(x.import_price ?? x.importPrice ?? 0) || 0;
    const sellPrice = Number(x.sell_price ?? x.sellPrice ?? 0) || 0;
    if (x.status === 'sold') {
      soldCount += 1;
      realizedProfit += (sellPrice - importPrice);
    } else {
      unsoldCount += 1;
      unsoldCapital += importPrice;
    }
  });

  return { unsoldCapital, unsoldCount, realizedProfit, soldCount };
};

// ------------------------------------------------------------
export const getTradingCategories = async () => {
  const snap = await getDocs(getColRef("trading_categories"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

// ------------------------------------------------------------
export const updateRoom = async (id, data) => {
  await updateDoc(doc(getColRef("rooms"), id), { ...data, updated_at: serverTimestamp() });
};

export const deleteRoom = async (id) => {
  await deleteDoc(doc(getColRef("rooms"), id));
};

export const updateTransaction = async (id, data) => {
  await updateDoc(doc(getColRef("transactions"), id), { ...data, updated_at: serverTimestamp() });
};

export const deleteTransaction = async (id) => {
  await deleteDoc(doc(getColRef("transactions"), id));
};

export const updateTenant = async (id, data) => {
  await updateDoc(doc(getColRef("tenants"), id), { ...data, updated_at: serverTimestamp() });
};

export const updateCategory = async (id, data) => {
  await updateDoc(doc(getColRef("categories"), id), { ...data, updated_at: serverTimestamp() });
};

export const deleteCategory = async (id) => {
  await deleteDoc(doc(getColRef("categories"), id));
};

export const markInvoicePaid = async (invoiceId, paidAmount, transactionId) => {
  await updateDoc(doc(getColRef("invoices"), invoiceId), {
    paid_amount: paidAmount,
    status: 'paid',
    transaction_id: transactionId,
    updated_at: serverTimestamp()
  });
};

export const deleteInvoice = async (invoiceId) => {
  await deleteDoc(doc(getColRef("invoices"), invoiceId));
};

// ------------------------------------------------------------
export const getTotalStats = async () => {
  const snap = await getDocs(getColRef("transactions"));
  let income = 0;
  let expense = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.type === 'income') income += data.amount;
    else expense += data.amount;
  });
  return { income, expense, balance: income - expense };
};

export const getTodayStats = async () => {
  const today = new Date().toISOString().split('T')[0];
  const q = query(getColRef("transactions"), where("date", "==", today));
  const snap = await getDocs(q);
  let income = 0;
  let expense = 0;
  snap.docs.forEach(d => {
    const data = d.data();
    if (data.type === 'income') income += data.amount;
    else expense += data.amount;
  });
  return { income, expense, balance: income - expense };
};

export const getPreviousDebt = async (roomId, month, year) => {
  let prevMonth = month - 1;
  let prevYear = year;
  if (prevMonth === 0) { prevMonth = 12; prevYear -= 1; }
  const q = query(getColRef("invoices"), 
    where("room_id", "==", String(roomId)), 
    where("month", "==", prevMonth), 
    where("year", "==", prevYear)
  );
  const snap = await getDocs(q);
  if (snap.empty) return 0;
  const inv = snap.docs[0].data();
  if (inv.status === 'paid') return 0;
  return (inv.total_amount || 0) - (inv.paid_amount || 0);
};

export const getLatestMeterReadings = async (roomId) => {
  const q = query(getColRef("invoices"), 
    where("room_id", "==", String(roomId)), 
    limit(20) // Use limit and sort browser-side if index missing
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  
  const sorted = snap.docs
    .map(d => d.data())
    .sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
  const inv = sorted[0];
  return { elec_old: inv.elec_new, water_old: inv.water_new };
};

export const getMeterReadings = async (contractId) => {
  const q = query(getColRef("meter_readings"), where("contract_id", "==", String(contractId)));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

const sanitizeData = (data) => {
  const cleaned = {};
  Object.keys(data).forEach(key => {
    if (data[key] !== undefined) cleaned[key] = data[key];
  });
  return cleaned;
};
