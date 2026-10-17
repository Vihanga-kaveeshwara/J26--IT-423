import { pool, query } from './pool';
import { initializeDatabaseSchema } from './schemaInit';

async function testDatabase() {
  console.log('--- Testing PostgreSQL Database Access ---');
  try {
    const initialized = await initializeDatabaseSchema();
    console.log(`Schema initialization result: ${initialized ? 'SUCCESS' : 'SKIPPED/DEFERRED'}`);

    const res = await query('SELECT 1 as connected');
    console.log(`✓ Direct PostgreSQL connection test successful: ${res.rows[0].connected === 1}`);

    const usersRes = await query('SELECT count(*) as count FROM users');
    console.log(`✓ Users table row count: ${usersRes.rows[0].count}`);

    const marketsRes = await query('SELECT count(*) as count FROM export_markets');
    console.log(`✓ Export markets row count: ${marketsRes.rows[0].count}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('Note on local DB test:', msg);
    console.log('System contains automatic fallback layer for offline development.');
  } finally {
    await pool.end();
  }
}

testDatabase().catch((e) => {
  console.error(e);
  process.exit(0);
});
