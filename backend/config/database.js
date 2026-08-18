import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'GestionClub',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

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

const query = async (sql, params = []) => {
  const { text, values } = convertMysqlStyleParams(sql, params);
  let finalSql = text;

  if (/^\s*INSERT\b/i.test(text) && !/\bRETURNING\b/i.test(text)) {
    finalSql = `${text} RETURNING *`;
  }

  const result = await pool.query(finalSql, values);
  const rows = result.rows ?? [];
  const resultArray = [rows, result.fields ?? []];
  resultArray.insertId = rows[0]?.id ?? result.insertId ?? null;
  resultArray.rows = rows;
  resultArray.fields = result.fields ?? [];
  return resultArray;
};

pool.query = query;

export default pool;
