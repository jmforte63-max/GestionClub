import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const normalizeRenderHost = (host = '') => {
  const value = String(host || 'localhost').trim();
  if (!value || value.includes('.')) {
    return value || 'localhost';
  }

  return `${value}.oregon-postgres.render.com`;
};

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
  : {
      host: normalizeRenderHost(process.env.DB_HOST || 'localhost'),
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || process.env.DB_DATABASE || 'gestionclub',
      ssl: process.env.NODE_ENV === 'production' || process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool({
  ...connectionConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

const nativeQuery = pool.query.bind(pool);

const convertMysqlStyleParams = (sql, params = []) => {
  if (!Array.isArray(params)) {
    params = [params];
  }

  let counter = 0;
  const normalizedSql = sql.replace(/\?/g, () => {
    counter += 1;
    return `$${counter}`;
  });

  return { text: normalizedSql, values: params };
};

const normalizeResult = (sql, result) => {
  const rows = result.rows ?? [];
  const fields = result.fields ?? [];
  const isSelectQuery = /^\s*(SELECT|WITH|SHOW|DESCRIBE|EXPLAIN)\b/i.test(sql);

  if (isSelectQuery) {
    return [rows, fields];
  }

  const insertId = rows[0]?.id ?? null;
  const normalized = {
    affectedRows: Number(result.rowCount ?? 0),
    insertId,
    changedRows: Number(result.rowCount ?? 0),
    warningStatus: 0,
    rowCount: Number(result.rowCount ?? 0),
    rows,
    fields
  };

  return [normalized, fields];
};

const query = async (sql, params = []) => {
  const { text, values } = convertMysqlStyleParams(sql, params);
  let finalSql = text;

  if (/^\s*INSERT\b/i.test(text) && !/\bRETURNING\b/i.test(text)) {
    finalSql = `${text} RETURNING *`;
  }

  const result = await nativeQuery(finalSql, values);
  return normalizeResult(text, result);
};

pool.query = query;

export default pool;
