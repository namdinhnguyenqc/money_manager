import { getDb } from '../database/db';
import {
  collection,
  doc,
  writeBatch,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db as firestoreDb } from "../services/firebase";

/**
 * Clean data to prevent Firestore "undefined" errors
 */
const sanitizeData = (data) => {
  const cleaned = {};
  const idFields = [
    'wallet_id', 'category_id', 'room_id', 'tenant_id', 'contract_id',
    'service_id', 'invoice_id', 'transaction_id', 'parent_id', 'bank_id',
  ];

  Object.keys(data).forEach((key) => {
    if (data[key] !== undefined && data[key] !== null) {
      cleaned[key] = idFields.includes(key) ? String(data[key]) : data[key];
    }
  });

  return cleaned;
};

export const migrateSQLiteToFirestore = async (onProgress) => {
  console.log('[SYNC] Bat dau qua trinh dong bo...');
  if (onProgress) onProgress('\uD83D\uDE80 Dang khoi dong bo may...');

  let sqliteDb;
  try {
    console.log('[SYNC] Dang mo SQLite database...');
    sqliteDb = await getDb();
    console.log('[SYNC] SQLite da mo thanh cong!');
  } catch (dbErr) {
    console.error('[SYNC] Loi mo Database:', dbErr);
    throw new Error('Khong the mo du lieu may. Thu tat han app va mo lai.');
  }

  if (onProgress) onProgress('\uD83D\uDC64 Kiem tra tai khoan...');
  const uid = auth.currentUser?.uid;
  console.log('[SYNC] UID nguoi dung:', uid);
  if (!uid) throw new Error('Chua dang nhap tai khoan cloud.');

  const userDocRef = doc(firestoreDb, 'users', uid);
  const tables = [
    'wallets', 'categories', 'transactions', 'rooms', 'tenants',
    'contracts', 'services', 'invoices', 'invoice_items',
    'bank_config', 'trading_items', 'trading_categories', 'meter_readings',
  ];

  if (onProgress) onProgress('\uD83D\uDD0D Dang goi Google Cloud (15s timeout)...');
  console.log('[SYNC] Dang thu ket noi Google Firestore...');

  // Add a 15-second timeout for cloud connectivity test.
  const cloudTest = new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Mang qua cham, Google Cloud khong phan hoi (timeout 15s)'));
    }, 15000);

    try {
      await setDoc(
        userDocRef,
        {
          last_sync: serverTimestamp(),
          sync_v: '3.1_robust',
        },
        { merge: true },
      );
      clearTimeout(timer);
      resolve(true);
    } catch (err) {
      clearTimeout(timer);
      reject(err);
    }
  });

  try {
    await cloudTest;
    if (onProgress) onProgress('\u2705 May xanh da ket noi!');
    console.log('[SYNC] Ket noi Firestore thanh cong!');
  } catch (err) {
    console.error('[SYNC] Loi ket noi Cloud:', err);
    throw new Error(`Ket noi Google loi: ${err.message || 'Kiem tra Rules hoac mang'}`);
  }

  // Step 1: count rows.
  let totalRowsFound = 0;
  if (onProgress) onProgress('\uD83D\uDCCA Dang kiem dem du lieu...');
  for (const t of tables) {
    try {
      const res = await sqliteDb.getFirstAsync(`SELECT COUNT(*) as c FROM ${t}`);
      totalRowsFound += res?.c || 0;
    } catch (e) {
      // Skip tables not used in this wallet mode.
    }
  }

  if (totalRowsFound === 0) {
    throw new Error('Khong tim thay du lieu de chuyen len cloud.');
  }

  if (onProgress) {
    onProgress(`\uD83D\uDCC8 Tim thay ${totalRowsFound} ban ghi. Bat dau day len...`);
  }

  // Step 2: upload table by table.
  for (const table of tables) {
    try {
      if (onProgress) onProgress(`\uD83D\uDCE4 Dang tai: ${table}...`);

      const rows = await sqliteDb.getAllAsync(`SELECT * FROM ${table}`);
      if (!rows || rows.length === 0) continue;

      const colRef = collection(userDocRef, table);
      let batch = writeBatch(firestoreDb);
      let count = 0;

      for (const row of rows) {
        const { id, ...data } = row;
        const docRef = doc(colRef, String(id));

        batch.set(
          docRef,
          {
            ...sanitizeData(data),
            sync_date: serverTimestamp(),
          },
          { merge: true },
        );

        count += 1;
        if (count >= 400) {
          await batch.commit();
          batch = writeBatch(firestoreDb);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }
    } catch (tableError) {
      console.error(`[SYNC] Loi tai bang ${table}:`, tableError);
    }
  }

  if (onProgress) onProgress('Cloud sync hoan tat! \uD83D\uDE80\u2728');
  return true;
};
