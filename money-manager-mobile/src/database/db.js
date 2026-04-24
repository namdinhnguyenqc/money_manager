import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { seedRooms, seedPrices, seedResidents, seedDeps, seedDataByMonth } from './seedData';

const DB_NAME = 'money_manager.db';
const SCHEMA_VERSION = 39;
const DB_INSTANCE_KEY = '__mmDbMaster';
const DB_OPEN_PROMISE_KEY = '__mmDbOpenPromise';
const DB_INIT_PROMISE_KEY = '__mmDbInitPromise';
const DB_READY_KEY = '__mmDbReady';
const WEB_LOCK_KEY = '__mmDbWebLock';
const WEB_LOCK_TIMER_KEY = '__mmDbWebLockTimer';
const WEB_LOCK_LISTENERS_KEY = '__mmDbWebLockListeners';
const WEB_TAB_ID_SESSION_KEY = '__mmDbWebTabId';
const WEB_LOCK_TTL_MS = 15000;
const WEB_LOCK_HEARTBEAT_MS = 5000;
const DB_OPEN_RETRY_DELAYS_MS = [0, 400, 1200, 2500];
const WEB_SNAPSHOT_KEY = '__mmDbWebSnapshotV1';
const WEB_SNAPSHOT_TIMEOUT_KEY = '__mmDbWebSnapshotTimeout';
const WEB_SNAPSHOT_IN_FLIGHT_KEY = '__mmDbWebSnapshotInFlight';
const WEB_SNAPSHOT_PENDING_KEY = '__mmDbWebSnapshotPending';
const WEB_SNAPSHOT_SUB_KEY = '__mmDbWebSnapshotSubscription';
const WEB_SNAPSHOT_LISTENERS_KEY = '__mmDbWebSnapshotListeners';
const WEB_SNAPSHOT_DEBOUNCE_MS = 800;

const getDbStore = () => globalThis;
const isWebRuntime = () => Platform.OS === 'web';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const bytesToBase64 = (bytes) => {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
};

const base64ToBytes = (value) => {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const getWebTabId = () => {
  if (!isWebRuntime()) {
    return 'non-web';
  }

  try {
    const existingId = window.sessionStorage.getItem(WEB_TAB_ID_SESSION_KEY);
    if (existingId) {
      return existingId;
    }
    const nextId = `tab-${Math.random().toString(36).slice(2)}`;
    window.sessionStorage.setItem(WEB_TAB_ID_SESSION_KEY, nextId);
    return nextId;
  } catch {
    return 'tab-fallback';
  }
};

const readWebDbLock = () => {
  if (!isWebRuntime()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WEB_LOCK_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (typeof parsed?.tabId !== 'string' || typeof parsed?.expiresAt !== 'number') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const readWebDbSnapshot = () => {
  if (!isWebRuntime()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(WEB_SNAPSHOT_KEY);
    if (!raw) {
      return null;
    }
    return base64ToBytes(raw);
  } catch {
    return null;
  }
};

const writeWebDbSnapshot = (bytes) => {
  if (!isWebRuntime()) {
    return;
  }

  window.localStorage.setItem(WEB_SNAPSHOT_KEY, bytesToBase64(bytes));
};

const writeWebDbLock = () => {
  if (!isWebRuntime()) {
    return;
  }

  window.localStorage.setItem(
      WEB_LOCK_KEY,
      JSON.stringify({
        tabId: getWebTabId(),
        expiresAt: Date.now() + WEB_LOCK_TTL_MS,
      })
    );
};

const stopWebDbLockHeartbeat = () => {
  const store = getDbStore();
  if (store[WEB_LOCK_TIMER_KEY]) {
    clearInterval(store[WEB_LOCK_TIMER_KEY]);
    store[WEB_LOCK_TIMER_KEY] = null;
  }
};

const releaseWebDbTabLock = () => {
  if (!isWebRuntime()) {
    return;
  }

  stopWebDbLockHeartbeat();
  const currentLock = readWebDbLock();
  if (currentLock?.tabId === getWebTabId()) {
    window.localStorage.removeItem(WEB_LOCK_KEY);
  }
};

const ensureWebDbLockListeners = () => {
  if (!isWebRuntime()) {
    return;
  }

  const store = getDbStore();
  if (store[WEB_LOCK_LISTENERS_KEY]) {
    return;
  }

  const release = () => {
    releaseWebDbTabLock();
  };

  window.addEventListener('beforeunload', release);
  window.addEventListener('pagehide', release);
  store[WEB_LOCK_LISTENERS_KEY] = true;
};

const startWebDbLockHeartbeat = () => {
  if (!isWebRuntime()) {
    return;
  }

  const store = getDbStore();
  ensureWebDbLockListeners();
  writeWebDbLock();

  if (store[WEB_LOCK_TIMER_KEY]) {
    return;
  }

  store[WEB_LOCK_TIMER_KEY] = window.setInterval(() => {
    const currentLock = readWebDbLock();
    if (currentLock && currentLock.tabId !== getWebTabId() && currentLock.expiresAt > Date.now()) {
      stopWebDbLockHeartbeat();
      return;
    }
    writeWebDbLock();
  }, WEB_LOCK_HEARTBEAT_MS);
};

const ensureWebDbTabLock = () => {
  if (!isWebRuntime()) {
    return;
  }

  const currentLock = readWebDbLock();
  if (currentLock && currentLock.tabId !== getWebTabId() && currentLock.expiresAt > Date.now()) {
    throw new Error('The web app is already open in another tab. Close that tab before continuing.');
  }

  writeWebDbLock();
  const claimedLock = readWebDbLock();
  if (!claimedLock || claimedLock.tabId !== getWebTabId()) {
    throw new Error('The web app is already open in another tab. Close that tab before continuing.');
  }

  startWebDbLockHeartbeat();
};

const flushWebDbSnapshotSync = (db) => {
  if (!isWebRuntime() || !db) {
    return;
  }

  try {
    const bytes = db.serializeSync();
    if (bytes) {
      writeWebDbSnapshot(bytes);
    }
  } catch (error) {
    console.warn('Web DB snapshot sync flush failed:', error);
  }
};

const persistWebDbSnapshotAsync = async (db) => {
  if (!isWebRuntime() || !db) {
    return;
  }

  const store = getDbStore();
  if (store[WEB_SNAPSHOT_IN_FLIGHT_KEY]) {
    store[WEB_SNAPSHOT_PENDING_KEY] = true;
    return;
  }

  store[WEB_SNAPSHOT_IN_FLIGHT_KEY] = true;
  try {
    const bytes = await db.serializeAsync();
    if (bytes) {
      writeWebDbSnapshot(bytes);
    }
  } finally {
    store[WEB_SNAPSHOT_IN_FLIGHT_KEY] = false;
    if (store[WEB_SNAPSHOT_PENDING_KEY]) {
      store[WEB_SNAPSHOT_PENDING_KEY] = false;
      void persistWebDbSnapshotAsync(db);
    }
  }
};

const scheduleWebDbSnapshotPersist = (db) => {
  if (!isWebRuntime() || !db) {
    return;
  }

  const store = getDbStore();
  if (store[WEB_SNAPSHOT_TIMEOUT_KEY]) {
    clearTimeout(store[WEB_SNAPSHOT_TIMEOUT_KEY]);
  }

  store[WEB_SNAPSHOT_TIMEOUT_KEY] = window.setTimeout(() => {
    store[WEB_SNAPSHOT_TIMEOUT_KEY] = null;
    void persistWebDbSnapshotAsync(db);
  }, WEB_SNAPSHOT_DEBOUNCE_MS);
};

const ensureWebDbSnapshotListeners = (db) => {
  if (!isWebRuntime()) {
    return;
  }

  const store = getDbStore();
  if (store[WEB_SNAPSHOT_LISTENERS_KEY]) {
    return;
  }

  const flush = () => {
    if (store[DB_INSTANCE_KEY]) {
      flushWebDbSnapshotSync(store[DB_INSTANCE_KEY]);
    } else if (db) {
      flushWebDbSnapshotSync(db);
    }
  };

  window.addEventListener('pagehide', flush);
  window.addEventListener('beforeunload', flush);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flush();
    }
  });
  store[WEB_SNAPSHOT_LISTENERS_KEY] = true;
};

const ensureWebDbSnapshotPersistence = (db) => {
  if (!isWebRuntime()) {
    return;
  }

  const store = getDbStore();
  ensureWebDbSnapshotListeners(db);

  if (!store[WEB_SNAPSHOT_SUB_KEY]) {
    store[WEB_SNAPSHOT_SUB_KEY] = SQLite.addDatabaseChangeListener(() => {
      const activeDb = getDbStore()[DB_INSTANCE_KEY];
      if (activeDb) {
        scheduleWebDbSnapshotPersist(activeDb);
      }
    });
  }
};

const isRetryableDbOpenError = (error) => {
  const message = String(error?.message || error || '');
  return (
    message.includes('createSyncAccessHandle') ||
    message.includes('NoModificationAllowedError') ||
    message.includes('Invalid VFS state') ||
    message.includes('Failed to initialize MemoryVFS')
  );
};

const openWebDatabaseAsync = async () => {
  ensureWebDbTabLock();
  const snapshot = readWebDbSnapshot();
  const options = { enableChangeListener: true, useNewConnection: true };
  const db = snapshot
    ? await SQLite.deserializeDatabaseAsync(snapshot, options)
    : await SQLite.openDatabaseAsync(':memory:', options);
  ensureWebDbSnapshotPersistence(db);
  return db;
};

const openDbWithRetry = async () => {
  let lastError;

  for (const delayMs of DB_OPEN_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    try {
      return isWebRuntime()
        ? await openWebDatabaseAsync()
        : await SQLite.openDatabaseAsync(DB_NAME);
    } catch (error) {
      lastError = error;
      releaseWebDbTabLock();
      if (!isWebRuntime() || !isRetryableDbOpenError(error)) {
        break;
      }
    }
  }

  throw lastError;
};

const normalizeDbError = (error) => {
  const message = String(error?.message || error || '');
  if (message.includes('Web app already open in another tab')) {
    return error;
  }
  if (isWebRuntime() && message.includes('Invalid VFS state')) {
    const wrapped = new Error('Web SQLite initialization failed. Reload and try again.');
    wrapped.cause = error;
    return wrapped;
  }
  if (
    isWebRuntime() &&
    (message.includes('createSyncAccessHandle') || message.includes('NoModificationAllowedError'))
  ) {
    const wrapped = new Error(
      'Web SQLite is locked by another app tab. Close other tabs before continuing.'
    );
    wrapped.cause = error;
    return wrapped;
  }
  return error;
};

export const getDb = async () => {
  const store = getDbStore();
  if (store[DB_INSTANCE_KEY]) {
    return store[DB_INSTANCE_KEY];
  }

  if (!store[DB_OPEN_PROMISE_KEY]) {
    store[DB_OPEN_PROMISE_KEY] = openDbWithRetry()
      .then((db) => {
        store[DB_INSTANCE_KEY] = db;
        return db;
      })
      .catch((error) => {
        store[DB_OPEN_PROMISE_KEY] = null;
        store[DB_INSTANCE_KEY] = null;
        releaseWebDbTabLock();
        throw normalizeDbError(error);
      });
  }

  return store[DB_OPEN_PROMISE_KEY];
};

export const initDb = async () => {
  const store = getDbStore();
  if (store[DB_READY_KEY]) {
    return getDb();
  }

  if (!store[DB_INIT_PROMISE_KEY]) {
    store[DB_INIT_PROMISE_KEY] = (async () => {
      const db = await getDb();
  
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS wallets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'personal', 'trading', 'rental'
      icon TEXT,
      color TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      type TEXT NOT NULL, -- 'income', 'expense'
      wallet_id INTEGER NOT NULL,
      parent_id INTEGER REFERENCES categories(id),
      created_at TEXT DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL, -- 'income', 'expense'
      amount REAL NOT NULL,
      description TEXT,
      category_id INTEGER,
      wallet_id INTEGER NOT NULL,
      image_uri TEXT,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT DEFAULT 'vacant',
      has_ac INTEGER DEFAULT 0,
      num_people INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS tenants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      id_card TEXT,
      address TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT,
      deposit REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS contract_services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      FOREIGN KEY (contract_id) REFERENCES contracts (id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'fixed',
      unit_price REAL NOT NULL,
      unit_price_ac REAL DEFAULT 0,
      unit TEXT DEFAULT 'month',
      icon TEXT DEFAULT '⚡',
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER,
      contract_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      room_fee REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      paid_amount REAL DEFAULT 0,
      previous_debt REAL DEFAULT 0,
      status TEXT DEFAULT 'unpaid', -- 'unpaid', 'paid', 'partially_paid'
      elec_old REAL,
      elec_new REAL,
      water_old REAL,
      water_new REAL,
      invoice_note TEXT,
      transaction_id INTEGER,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER NOT NULL,
      service_id INTEGER,
      name TEXT NOT NULL,
      detail TEXT,
      amount REAL NOT NULL,
      FOREIGN KEY (invoice_id) REFERENCES invoices (id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bank_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_id TEXT NOT NULL, -- e.g., 'vcb'
      account_no TEXT NOT NULL,
      account_name TEXT NOT NULL,
      qr_uri TEXT,
      user_avatar TEXT,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS trading_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wallet_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      import_price REAL NOT NULL,
      sell_price REAL,
      target_price REAL, -- Estimated selling price
      import_date TEXT NOT NULL,
      sell_date TEXT,
      status TEXT DEFAULT 'available', -- 'available', 'sold'
      note TEXT,
      batch_id TEXT, -- Batch code
      transaction_id INTEGER, -- Linked import transaction
      sell_transaction_id INTEGER, -- Linked sell transaction
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS meter_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      reading_date TEXT NOT NULL,
      reading_value REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS trading_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);

  try {
    await runMigrations(db);
  } catch (e) {
    console.error("Migration failed:", e);
    throw e;
  }
  try { await initWallets(db); } catch (e) { console.error("Wallet init failed:", e); }
  try { await initServices(db); } catch (e) { console.error("Service init failed:", e); }
  try { await initCategories(db); } catch (e) { console.error("Category init failed:", e); }

      store[DB_READY_KEY] = true;
      return db;
    })()
      .catch((error) => {
        store[DB_READY_KEY] = false;
        throw normalizeDbError(error);
      })
      .finally(() => {
        store[DB_INIT_PROMISE_KEY] = null;
      });
  }

  return store[DB_INIT_PROMISE_KEY];
};

const initWallets = async (db) => {
  const { c } = await db.getFirstAsync('SELECT COUNT(*) as c FROM wallets');
  if (c === 0) {
    console.log("Initializing default wallets...");
    await db.runAsync(`INSERT INTO wallets (name, type, icon, color) VALUES (?, ?, ?, ?)`, 
      ['Personal Wallet', 'personal', '👛', '#2563eb']);
    await db.runAsync(`INSERT INTO wallets (name, type, icon, color) VALUES (?, ?, ?, ?)`, 
      ['Rental Management', 'rental', '🏠', '#10b981']);
    await db.runAsync(`INSERT INTO wallets (name, type, icon, color) VALUES (?, ?, ?, ?)`, 
      ['Business / Inventory', 'trading', '📦', '#f59e0b']);
  }
};

const initCategories = async (db) => {
  try {
    const { c } = await db.getFirstAsync('SELECT COUNT(*) as c FROM categories');
    if (c === 0) {
      console.log("Initializing default categories...");
      const wallet = await db.getFirstAsync('SELECT id FROM wallets ORDER BY id ASC LIMIT 1');
      const wId = wallet ? wallet.id : 1;

      const cats = [
        ['Food & Drinks', '🍔', '#ef4444', 'expense'],
        ['Transport', '🚗', '#3b82f6', 'expense'],
        ['Shopping', '🛒', '#f59e0b', 'expense'],
        ['Beauty', '💄', '#ec4899', 'expense'],
        ['Health', '💊', '#10b981', 'expense'],
        ['Bills', '📄', '#6366f1', 'expense'],
        ['Thu', '💰', '#10b981', 'income'],
        ['Other', '💬', '#94a3b8', 'expense']
      ];
      for (const [name, icon, color, type] of cats) {
        await db.runAsync(`INSERT INTO categories (name, icon, color, type, wallet_id) VALUES (?, ?, ?, ?, ?)`, [name, icon, color, type, wId]);
      }
    }
  } catch (e) {
    console.warn("Category seeding failed but continuing:", e);
  }
};

const initServices = async (db) => {
  const essentialServices = [
    { name: 'Electricity', type: 'meter', price: 3500, unit: 'kWh', icon: '⚡' },
    { name: 'Water', type: 'meter', price: 15000, unit: 'm3', icon: '💧' },
    { name: 'Trash', type: 'fixed', price: 30000, unit: 'month', icon: '🗑️' },
    { name: 'Wifi', type: 'fixed', price: 70000, unit: 'month', icon: '📶' }
  ];

  for (const s of essentialServices) {
    const existing = await db.getFirstAsync('SELECT id FROM services WHERE name = ?', [s.name]);
    if (!existing) {
      console.log(`Restoring missing service: ${s.name}`);
      await db.runAsync(
        `INSERT INTO services (name, type, unit_price, unit, icon, active) VALUES (?,?,?,?,?,1)`, 
        [s.name, s.type, s.price, s.unit, s.icon]
      );
    }
  }
};

const runMigrations = async (db) => {
  const result = await db.getFirstAsync('PRAGMA user_version');
  let currentVersion = result.user_version;
  console.log(`Current Database version: ${currentVersion}`);

  // v35 Block
  if (currentVersion < 35) {
     await db.execAsync(`PRAGMA user_version = 35`);
  }
  
  // v36 Block
  if (currentVersion < 36) {
     await db.execAsync(`PRAGMA user_version = 36`);
  }

  // v37 FINAL CORRECTIVE Block
  if (currentVersion < 37) {
    console.log("Upgrading to v37: Marking migration complete.");
    await db.execAsync(`PRAGMA user_version = 37`);
  }

  // v38: Add invoice_note to invoices
  if (currentVersion < 38) {
    console.log("Upgrading to v38: Add invoice_note...");
    try { await db.execAsync(`ALTER TABLE invoices ADD COLUMN invoice_note TEXT`); } catch(e){}
    await db.execAsync(`PRAGMA user_version = 38`);
  }

  // v39: Add wallet_id to rooms
  if (currentVersion < 39) {
    console.log("Upgrading to v39: Add wallet_id to rooms...");
    try { 
      await db.execAsync(`ALTER TABLE rooms ADD COLUMN wallet_id INTEGER`); 
      // Set existing rooms to default rental wallet (id 2)
      await db.execAsync(`UPDATE rooms SET wallet_id = 2 WHERE wallet_id IS NULL`);
    } catch(e){}
    await db.execAsync(`PRAGMA user_version = 39`);
  }

  // legacy migrations
  try {
    await db.execAsync(`ALTER TABLE categories ADD COLUMN parent_id INTEGER REFERENCES categories(id)`);
  } catch(e) {}
  
  await db.execAsync(`PRAGMA user_version = ${SCHEMA_VERSION}`);
  console.log(`Database upgraded to v${SCHEMA_VERSION}`);
};

export const resetDatabase = async () => {
  const db = await getDb();
  await db.execAsync('PRAGMA foreign_keys = OFF');
  try {
    const tables = [
      'invoice_items', 'invoices', 'contract_services', 'contracts', 
      'tenants', 'rooms', 'transactions', 'trading_items', 
      'meter_readings', 'trading_categories', 'categories', 'wallets'
    ];
    for (const table of tables) {
      try { await db.runAsync(`DELETE FROM ${table}`); } catch (e) {}
      try { await db.runAsync(`DELETE FROM sqlite_sequence WHERE name = '${table}'`); } catch (e) {}
    }
  } finally {
    await db.execAsync('PRAGMA foreign_keys = ON');
  }
  
  // Re-init defaults
  await initWallets(db);
  await initServices(db);
  await initCategories(db);
  
  // Force reload if web
  if (isWebRuntime()) {
    window.location.reload();
  }
};

