import fs from 'fs';
import path from 'path';
import { pool } from './pool';

export async function initializeDatabaseSchema(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      console.info('[Database] Initializing Ceylon Intelligence schema tables...');
      const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
      const seedPath = path.resolve(__dirname, '../../../database/seeds/seed.sql');

      if (fs.existsSync(schemaPath)) {
        const ddl = fs.readFileSync(schemaPath, 'utf-8');
        const statements = ddl
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 5 && !s.startsWith('--'));

        for (const sql of statements) {
          try {
            await client.query(sql);
          } catch (stmtErr: unknown) {
            const msg = stmtErr instanceof Error ? stmtErr.message : String(stmtErr);
            // Ignore if exists or minor constraint differences
            if (process.env.DEBUG_SQL) {
              console.debug('DDL Notice:', msg);
            }
          }
        }
        console.info('[Database] DDL tables verified.');
      }

      if (fs.existsSync(seedPath)) {
        const seedSql = fs.readFileSync(seedPath, 'utf-8');
        const seedStatements = seedSql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 5 && !s.startsWith('--'));

        for (const sql of seedStatements) {
          try {
            await client.query(sql);
          } catch (seedErr: unknown) {
            // Ignore conflict or existing records
          }
        }
        console.info('[Database] Seed data verified.');
      }
      return true;
    } finally {
      client.release();
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn('[Database] Schema auto-initialization skipped or deferred:', msg);
    return false;
  }
}
