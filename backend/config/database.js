import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'GestionClub'}`,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

const normalizeQuery = (sql, params = []) => {
  if (!Array.isArray(params) || params.length === 0) {
    return { text: sql, values: params };
  }

  let index = 1;
  const text = String(sql).replace(/\?/g, () => `$${index++}`);
  return { text, values: params };
};

const originalQuery = pool.query.bind(pool);

pool.query = async (sql, params = []) => {
  const { text, values } = normalizeQuery(sql, params);
  const result = await originalQuery(text, values);
  const command = (result.command || String(sql).trim().split(/\s+/)[0] || '').toUpperCase();

  if (command === 'SELECT') {
    return [result.rows ?? [], result.fields ?? []];
  }

  if (command === 'INSERT' && result.rows?.length > 0 && result.rows[0] && 'id' in result.rows[0]) {
    result.insertId = result.rows[0].id;
  } else if (command === 'INSERT') {
    const tableMatch = String(sql).match(/INSERT\s+INTO\s+["`]?([A-Za-z0-9_]+)["`]?/i);
    if (tableMatch) {
      const table = tableMatch[1];
      try {
        const fallback = await originalQuery(`SELECT id FROM "${table}" ORDER BY id DESC LIMIT 1`);
        result.insertId = fallback.rows?.[0]?.id ?? null;
      } catch (error) {
        result.insertId = null;
      }
    }
  }

  result.affectedRows = result.rowCount ?? 0;
  return [result, result.fields ?? []];
};

export default pool;
