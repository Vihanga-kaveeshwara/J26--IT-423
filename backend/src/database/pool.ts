import { Pool } from 'pg';
import { m4Config } from '../config/m4Config';

export const pool = new Pool({
  connectionString: m4Config.databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.warn('Unexpected error on idle PostgreSQL client:', err.message);
});

export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.DEBUG_SQL) {
    console.debug('Executed query', { text, duration, rows: res.rowCount });
  }
  return res;
}
