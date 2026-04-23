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
  console.log('[SYNC] Starting sync process...');
  if (onProgress) onProgress('🚀 Bootstrapping local engine...');

  let sqliteDb;
  try {
    console.log('[SYNC] Opening SQLite database...');
    sqliteDb = await getDb();
    console.log('[SYNC] SQLite opened successfully!');
  } catch (dbErr) {
    console.error('[SYNC] Database open error:', dbErr);
    throw new Error('Cannot open local data. Restart the app and try again.');
  }

  if (!auth || !firestoreDb) {
    throw new Error('Cloud is not configured. Please add EXPO_PUBLIC_* Firebase env vars.');
  }

  if (onProgress) onProgress('👤 Checking account...');
  const uid = auth.currentUser?.uid;
  console.log('[SYNC] User UID:', uid);
  if (!uid) throw new Error('Cloud account is not signed in.');

  const userDocRef = doc(firestoreDb, 'users', uid);
  const tables = [
    'wallets', 'categories', 'transactions', 'rooms', 'tenants',
    'contracts', 'services', 'invoices', 'invoice_items',
    'bank_config', 'trading_items', 'trading_categories', 'meter_readings',
  ];

  if (onProgress) onProgress('🔍 Contacting Google Cloud (15s timeout)...');
  console.log('[SYNC] Testing Google Firestore connection...');

  // Add a 15-second timeout for cloud connectivity test.
  const cloudTest = new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Network too slow, Google Cloud timed out (15s)'));
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
    console.log('[SYNC] Firestore connected successfully!');
  } catch (err) {
    console.error('[SYNC] Cloud connection error:', err);
    throw new Error(`Google connection failed: ${err.message || 'Check rules or network'}`);
  }

  // Step 1: count rows.
  let totalRowsFound = 0;
  if (onProgress) onProgress('📊 Counting local records...');
  for (const t of tables) {
    try {
      const res = await sqliteDb.getFirstAsync(`SELECT COUNT(*) as c FROM ${t}`);
      totalRowsFound += res?.c || 0;
    } catch (e) {
      // Skip tables not used in this wallet mode.
    }
  }

  if (totalRowsFound === 0) {
    throw new Error('No local data found to migrate to cloud.');
  }

  if (onProgress) {
    onProgress(`📈 Found ${totalRowsFound} records. Starting upload...`);
  }

  // Step 2: upload table by table.
  for (const table of tables) {
    try {
      if (onProgress) onProgress(`📤 Uploading: ${table}...`);

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
      console.error(`[SYNC] Upload error on table ${table}:`, tableError);
    }
  }

  if (onProgress) onProgress('Cloud sync completed! 🚀✨');
  return true;
};
