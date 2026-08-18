import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const dbName = process.env.DB_NAME || 'GestionClub';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'postgres';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = Number(process.env.DB_PORT || 5432);
const adminConnectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres`;
const targetConnectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

const ensureDatabase = async () => {
  const client = new Client({ connectionString: adminConnectionString });
  await client.connect();

  const { rows } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (rows.length === 0) {
    await client.query(`CREATE DATABASE "${dbName}"`);
    console.log(`DATABASE ${dbName} created`);
  } else {
    console.log(`DATABASE ${dbName} exists`);
  }

  await client.end();
};

const connection = new Client({ connectionString: targetConnectionString });

const ensureTable = async (table, createSql) => {
  const { rows } = await connection.query('SELECT to_regclass($1) AS exists', [table]);
  if (!rows[0]?.exists) {
    await connection.query(createSql);
    console.log(`CREATED TABLE ${table}`);
  } else {
    console.log(`EXISTS TABLE ${table}`);
  }
};

const ensureColumn = async (table, column, definition) => {
  const { rows } = await connection.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    [table, column]
  );

  if (rows.length === 0) {
    await connection.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${definition}`);
    console.log(`ADDED ${table}.${column}`);
  } else {
    console.log(`EXISTS ${table}.${column}`);
  }
};

try {
  await ensureDatabase();
  await connection.connect();

  await ensureTable('clubes', `CREATE TABLE "clubes" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(255) NOT NULL,
    "ciudad" VARCHAR(255) NOT NULL,
    "liga" VARCHAR(255) NOT NULL,
    "estadio" VARCHAR(255) NOT NULL,
    "presupuesto" NUMERIC(12,2) NOT NULL DEFAULT 0,
    "escudo_url" TEXT NULL,
    "estado" VARCHAR(50) DEFAULT 'Activo',
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);
  await ensureColumn('clubes', 'escudo_url', 'TEXT NULL');

  await ensureTable('usuarios', `CREATE TABLE "usuarios" (
    "id" SERIAL PRIMARY KEY,
    "email" VARCHAR(255) UNIQUE NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "rol" VARCHAR(20) NOT NULL DEFAULT 'usuario' CHECK ("rol" IN ('admin','tesorero','usuario')),
    "club_id" INTEGER NULL,
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN DEFAULT TRUE
  )`);

  await ensureTable('temporadas', `CREATE TABLE "temporadas" (
    "id" SERIAL PRIMARY KEY,
    "nombre" VARCHAR(20) NOT NULL UNIQUE,
    "anio_inicio" INTEGER NOT NULL,
    "anio_fin" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "activo" BOOLEAN DEFAULT TRUE,
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  const temporadaActual = new Date();
  const anioInicioTemporada = temporadaActual.getMonth() >= 6 ? temporadaActual.getFullYear() : temporadaActual.getFullYear() - 1;
  const nombreTemporadaActual = `${anioInicioTemporada}/${String(anioInicioTemporada + 1).slice(-2)}`;
  const fechaInicioTemporada = new Date(Date.UTC(anioInicioTemporada, 6, 1));
  const fechaFinTemporada = new Date(Date.UTC(anioInicioTemporada + 1, 5, 30));

  await connection.query(
    `INSERT INTO "temporadas" ("nombre", "anio_inicio", "anio_fin", "fecha_inicio", "fecha_fin", "activo")
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT ("nombre") DO UPDATE SET
       "anio_inicio" = EXCLUDED."anio_inicio",
       "anio_fin" = EXCLUDED."anio_fin",
       "fecha_inicio" = EXCLUDED."fecha_inicio",
       "fecha_fin" = EXCLUDED."fecha_fin",
       "activo" = TRUE`,
    [nombreTemporadaActual, anioInicioTemporada, anioInicioTemporada + 1, fechaInicioTemporada.toISOString().slice(0, 10), fechaFinTemporada.toISOString().slice(0, 10)]
  );

  await ensureTable('ingresos', `CREATE TABLE "ingresos" (
    "id" SERIAL PRIMARY KEY,
    "usuario_id" INTEGER NOT NULL,
    "club_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "concepto" VARCHAR(255) NOT NULL,
    "monto" NUMERIC(10,2) NOT NULL,
    "iva" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    "total_con_iva" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    "descripcion" TEXT,
    "cuenta_id" INTEGER NULL,
    "temporada" VARCHAR(20) NOT NULL DEFAULT '2024/25',
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  const fechaActual = new Date();
  const anioActual = fechaActual.getFullYear();
  const temporadaBase = fechaActual.getMonth() >= 6 ? anioActual : anioActual - 1;
  const temporadaPredeterminada = `${temporadaBase}/${String(temporadaBase + 1).slice(-2)}`;

  await ensureColumn('ingresos', 'iva', 'NUMERIC(5,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('ingresos', 'total_con_iva', 'NUMERIC(10,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('ingresos', 'cuenta_id', 'INTEGER NULL');
  await ensureColumn('ingresos', 'temporada', `VARCHAR(20) NOT NULL DEFAULT '${temporadaPredeterminada}'`);
  await connection.query(`UPDATE "ingresos" SET "temporada" = $1 WHERE "temporada" IS NULL OR "temporada" = ''`, [temporadaPredeterminada]);

  await ensureTable('conceptos_ingresos', `CREATE TABLE "conceptos_ingresos" (
    "id" SERIAL PRIMARY KEY,
    "club_id" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "iva" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    "activo" BOOLEAN DEFAULT TRUE,
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("club_id", "nombre")
  )`);

  await ensureTable('conceptos_egresos', `CREATE TABLE "conceptos_egresos" (
    "id" SERIAL PRIMARY KEY,
    "club_id" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "descripcion" TEXT,
    "iva" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    "activo" BOOLEAN DEFAULT TRUE,
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("club_id", "nombre")
  )`);

  await ensureTable('egresos', `CREATE TABLE "egresos" (
    "id" SERIAL PRIMARY KEY,
    "usuario_id" INTEGER NOT NULL,
    "club_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "concepto" VARCHAR(255) NOT NULL,
    "monto" NUMERIC(10,2) NOT NULL,
    "categoria" VARCHAR(255) NOT NULL,
    "iva" NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    "total_con_iva" NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    "descripcion" TEXT,
    "cuenta_id" INTEGER NULL,
    "cuenta_origen_id" INTEGER NULL,
    "cuenta_destino_id" INTEGER NULL,
    "es_traspaso" BOOLEAN NOT NULL DEFAULT FALSE,
    "temporada" VARCHAR(20) NOT NULL DEFAULT '${temporadaPredeterminada}',
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureColumn('egresos', 'iva', 'NUMERIC(5,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('egresos', 'total_con_iva', 'NUMERIC(10,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('egresos', 'cuenta_id', 'INTEGER NULL');
  await ensureColumn('egresos', 'cuenta_origen_id', 'INTEGER NULL');
  await ensureColumn('egresos', 'cuenta_destino_id', 'INTEGER NULL');
  await ensureColumn('egresos', 'es_traspaso', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('egresos', 'temporada', `VARCHAR(20) NOT NULL DEFAULT '${temporadaPredeterminada}'`);
  await connection.query(`UPDATE "egresos" SET "temporada" = $1 WHERE "temporada" IS NULL OR "temporada" = ''`, [temporadaPredeterminada]);

  await ensureTable('jugadores', `CREATE TABLE "jugadores" (
    "id" SERIAL PRIMARY KEY,
    "club_id" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "posicion" VARCHAR(30) NOT NULL CHECK ("posicion" IN ('Portero','Defensa','Centrocampista','Delantero')),
    "numero" INTEGER NOT NULL,
    "estado" VARCHAR(20) DEFAULT 'Activo' CHECK ("estado" IN ('Activo','Lesionado','Retirado')),
    "fecha_incorporacion" DATE,
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureTable('eventos', `CREATE TABLE "eventos" (
    "id" SERIAL PRIMARY KEY,
    "club_id" INTEGER NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TIME NOT NULL,
    "tipo" VARCHAR(30) NOT NULL CHECK ("tipo" IN ('Partido','Entrenamiento','Asamblea','Evento Social','Otro')),
    "descripcion" VARCHAR(255) NOT NULL,
    "ubicacion" VARCHAR(255),
    "temporada" VARCHAR(20) NOT NULL DEFAULT '${temporadaPredeterminada}',
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureTable('cuentas_bancarias', `CREATE TABLE "cuentas_bancarias" (
    "id" SERIAL PRIMARY KEY,
    "club_id" INTEGER NOT NULL,
    "nombre" VARCHAR(255) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL DEFAULT 'Banco',
    "banco" VARCHAR(255) NOT NULL,
    "numero_cuenta" VARCHAR(100) NOT NULL,
    "iban" VARCHAR(100) DEFAULT NULL,
    "saldo" NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    "activo" BOOLEAN DEFAULT TRUE,
    "fecha_creacion" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE ("club_id", "nombre")
  )`);

  await ensureColumn('cuentas_bancarias', 'tipo', 'VARCHAR(30) NOT NULL DEFAULT "Banco"');
  await ensureColumn('eventos', 'temporada', `VARCHAR(20) NOT NULL DEFAULT '${temporadaPredeterminada}'`);
  await connection.query(`UPDATE "eventos" SET "temporada" = $1 WHERE "temporada" IS NULL OR "temporada" = ''`, [temporadaPredeterminada]);
  await ensureColumn('usuarios', 'club_id', 'INTEGER NULL');
  await ensureColumn('ingresos', 'club_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureColumn('egresos', 'club_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureColumn('jugadores', 'club_id', 'INTEGER NOT NULL DEFAULT 1');
  await ensureColumn('eventos', 'club_id', 'INTEGER NOT NULL DEFAULT 1');

  const { rows: clubs } = await connection.query('SELECT id FROM "clubes" ORDER BY id LIMIT 1');
  const defaultClub = clubs[0]?.id || 1;

  await connection.query(
    `INSERT INTO "clubes" ("nombre", "ciudad", "liga", "estadio", "presupuesto", "estado")
     SELECT $1, $2, $3, $4, $5, $6
     WHERE NOT EXISTS (
       SELECT 1 FROM "clubes" WHERE "nombre" = $1
     )`,
    ['Real Madrid CF', 'Madrid', 'LaLiga', 'Santiago Bernabéu', 240000000, 'Activo']
  );

  const { rows: freshClub } = await connection.query('SELECT id FROM "clubes" ORDER BY id LIMIT 1');
  const actualDefaultClub = freshClub[0]?.id || defaultClub;

  await connection.query('UPDATE "usuarios" SET "club_id" = $1 WHERE "club_id" IS NULL OR "club_id" = 0', [actualDefaultClub]);
  await connection.query('UPDATE "ingresos" SET "club_id" = $1 WHERE "club_id" IS NULL OR "club_id" = 0', [actualDefaultClub]);
  await connection.query('UPDATE "egresos" SET "club_id" = $1 WHERE "club_id" IS NULL OR "club_id" = 0', [actualDefaultClub]);
  await connection.query('UPDATE "jugadores" SET "club_id" = $1 WHERE "club_id" IS NULL OR "club_id" = 0', [actualDefaultClub]);
  await connection.query('UPDATE "eventos" SET "club_id" = $1 WHERE "club_id" IS NULL OR "club_id" = 0', [actualDefaultClub]);

  await connection.query(
    `INSERT INTO "usuarios" ("email", "nombre", "password", "rol", "club_id", "activo")
     VALUES ($1, $2, $3, $4, $5, TRUE)
     ON CONFLICT ("email") DO NOTHING`,
    ['admin@club.com', 'admin', '$2a$10$YourHashedPasswordHere', 'admin', actualDefaultClub]
  );

  const { rows: columns } = await connection.query(
    'SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = $1',
    ['club_id']
  );

  console.log('club_id columns:', JSON.stringify(columns, null, 2));
} finally {
  if (connection._connected) {
    await connection.end();
  }
}
