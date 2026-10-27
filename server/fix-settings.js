import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import connectDatabase, { getPool } from './config/db.js';

const currentDir = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(currentDir, '..', 'database', 'fix_settings_table.sql');

console.log(`Applying ${sqlPath} ...`);

try {
  const sqlText = await readFile(sqlPath, 'utf8');
  const batches = sqlText
    .split(/^\s*GO\s*;?\s*$/gim)
    .map(batch => batch.trim())
    .filter(Boolean);

  await connectDatabase();
  for (const [index, batch] of batches.entries()) {
    await getPool().request().query(batch);
    console.log(`  executed batch ${index + 1}/${batches.length} OK`);
  }
  console.log('Settings table migration complete.');
  process.exit(0);
} catch (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}