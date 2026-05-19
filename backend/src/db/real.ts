// Real Postgres adapter with lazy dynamic import to avoid hard dependency during tests
let _pool: any = null

async function getPool(): Promise<any> {
  if (!_pool) {
    const conn = process.env.DATABASE_URL
    if (!conn) {
      throw new Error('DATABASE_URL is not configured for real DB usage')
    }
    const pg = await import('pg')
    const PoolCtor = pg.Pool
    _pool = new PoolCtor({ connectionString: conn })
  }
  return _pool
}

export function initRealDb() {
  // Initialize pool lazily when first used
  // Do not eagerly connect to DB to keep tests fast
  // The actual connection will be created on first query
}

export async function query<T = any>(text: string, params?: any[]) {
  const pool = await getPool()
  const res = await pool.query(text, params)
  return { rows: res.rows as T[], rowCount: res.rowCount }
}

export async function endRealDb() {
  if (_pool) {
    await _pool.end()
    _pool = null
  }
}
