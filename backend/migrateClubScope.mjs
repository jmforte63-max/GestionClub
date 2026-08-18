import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const rootConnection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
});

await rootConnection.query('CREATE DATABASE IF NOT EXISTS GestionClub');
await rootConnection.end();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'GestionClub'
});

const ensureTable = async (table, createSql) => {
  const [rows] = await connection.query(`SHOW TABLES LIKE '${table}'`);
  if (rows.length === 0) {
    await connection.query(createSql);
    console.log(`CREATED TABLE ${table}`);
  } else {
    console.log(`EXISTS TABLE ${table}`);
  }
};

const ensureColumn = async (table, column, definition) => {
  const [rows] = await connection.query(`SHOW COLUMNS FROM ${table} LIKE '${column}'`);
  if (rows.length === 0) {
    await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`ADDED ${table}.${column}`);
  } else {
    console.log(`EXISTS ${table}.${column}`);
  }
};

try {
  await ensureTable('clubes', `CREATE TABLE clubes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    ciudad VARCHAR(255) NOT NULL,
    liga VARCHAR(255) NOT NULL,
    estadio VARCHAR(255) NOT NULL,
    presupuesto DECIMAL(12,2) NOT NULL DEFAULT 0,
    escudo_url VARCHAR(500) NULL,
    estado VARCHAR(50) DEFAULT 'Activo',
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
  await ensureColumn('clubes', 'escudo_url', 'VARCHAR(500) NULL');

  await ensureTable('usuarios', `CREATE TABLE usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    rol ENUM('admin','tesorero','usuario') DEFAULT 'usuario',
    club_id INT NULL,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE
  )`);

  await ensureTable('temporadas', `CREATE TABLE temporadas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(20) NOT NULL UNIQUE,
    anio_inicio INT NOT NULL,
    anio_fin INT NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureColumn('temporadas', 'nombre', 'VARCHAR(20) NOT NULL UNIQUE');
  await ensureColumn('temporadas', 'anio_inicio', 'INT NOT NULL');
  await ensureColumn('temporadas', 'anio_fin', 'INT NOT NULL');
  await ensureColumn('temporadas', 'fecha_inicio', 'DATE NOT NULL');
  await ensureColumn('temporadas', 'fecha_fin', 'DATE NOT NULL');
  await ensureColumn('temporadas', 'activo', 'BOOLEAN DEFAULT TRUE');

  const temporadaActual = new Date();
  const anioInicioTemporada = temporadaActual.getMonth() >= 6 ? temporadaActual.getFullYear() : temporadaActual.getFullYear() - 1;
  const nombreTemporadaActual = `${anioInicioTemporada}/${String(anioInicioTemporada + 1).slice(-2)}`;
  const fechaInicioTemporada = new Date(Date.UTC(anioInicioTemporada, 6, 1));
  const fechaFinTemporada = new Date(Date.UTC(anioInicioTemporada + 1, 5, 30));

  await connection.query(
    `INSERT INTO temporadas (nombre, anio_inicio, anio_fin, fecha_inicio, fecha_fin, activo)
     VALUES (?, ?, ?, ?, ?, TRUE)
     ON DUPLICATE KEY UPDATE
       nombre = VALUES(nombre),
       anio_inicio = VALUES(anio_inicio),
       anio_fin = VALUES(anio_fin),
       fecha_inicio = VALUES(fecha_inicio),
       fecha_fin = VALUES(fecha_fin),
       activo = TRUE`,
    [nombreTemporadaActual, anioInicioTemporada, anioInicioTemporada + 1, fechaInicioTemporada.toISOString().slice(0, 10), fechaFinTemporada.toISOString().slice(0, 10)]
  );

  await ensureTable('ingresos', `CREATE TABLE ingresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    club_id INT NOT NULL,
    fecha DATE NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    iva DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    total_con_iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  const fechaActual = new Date();
  const anioActual = fechaActual.getFullYear();
  const temporadaBase = fechaActual.getMonth() >= 6 ? anioActual : anioActual - 1;
  const temporadaPredeterminada = `${temporadaBase}/${String(temporadaBase + 1).slice(-2)}`;

  await ensureColumn('ingresos', 'iva', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('ingresos', 'total_con_iva', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('ingresos', 'cuenta_id', 'INT NULL');
  await ensureColumn('ingresos', 'temporada', `VARCHAR(20) NOT NULL DEFAULT "${temporadaPredeterminada}"`);
  await connection.query(`ALTER TABLE ingresos MODIFY temporada VARCHAR(20) NOT NULL DEFAULT "${temporadaPredeterminada}"`);
  await connection.query(`UPDATE ingresos SET temporada = ? WHERE temporada IS NULL OR temporada = ""`, [temporadaPredeterminada]);

  await ensureTable('conceptos_ingresos', `CREATE TABLE conceptos_ingresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    iva DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_conceptos_ingresos_club_nombre (club_id, nombre)
  )`);

  await ensureTable('conceptos_egresos', `CREATE TABLE conceptos_egresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    iva DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_conceptos_egresos_club_nombre (club_id, nombre)
  )`);

  await ensureTable('egresos', `CREATE TABLE egresos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    usuario_id INT NOT NULL,
    club_id INT NOT NULL,
    fecha DATE NOT NULL,
    concepto VARCHAR(255) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(255) NOT NULL,
    iva DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    total_con_iva DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    descripcion TEXT,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await connection.query('ALTER TABLE egresos MODIFY categoria VARCHAR(255) NOT NULL');
  await ensureColumn('egresos', 'iva', 'DECIMAL(5,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('egresos', 'total_con_iva', 'DECIMAL(10,2) NOT NULL DEFAULT 0.00');
  await ensureColumn('egresos', 'cuenta_id', 'INT NULL');
  await ensureColumn('egresos', 'cuenta_origen_id', 'INT NULL');
  await ensureColumn('egresos', 'cuenta_destino_id', 'INT NULL');
  await ensureColumn('egresos', 'es_traspaso', 'BOOLEAN NOT NULL DEFAULT FALSE');
  await ensureColumn('egresos', 'temporada', `VARCHAR(20) NOT NULL DEFAULT "${temporadaPredeterminada}"`);
  await connection.query(`ALTER TABLE egresos MODIFY temporada VARCHAR(20) NOT NULL DEFAULT "${temporadaPredeterminada}"`);
  await connection.query(`UPDATE egresos SET temporada = ? WHERE temporada IS NULL OR temporada = ""`, [temporadaPredeterminada]);

  await ensureTable('jugadores', `CREATE TABLE jugadores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    posicion ENUM('Portero','Defensa','Centrocampista','Delantero') NOT NULL,
    numero INT NOT NULL,
    estado ENUM('Activo','Lesionado','Retirado') DEFAULT 'Activo',
    fecha_incorporacion DATE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureTable('eventos', `CREATE TABLE eventos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    tipo ENUM('Partido','Entrenamiento','Asamblea','Evento Social','Otro') NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    ubicacion VARCHAR(255),
    temporada VARCHAR(20) NOT NULL DEFAULT "${temporadaPredeterminada}",
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await ensureTable('cuentas_bancarias', `CREATE TABLE cuentas_bancarias (
    id INT PRIMARY KEY AUTO_INCREMENT,
    club_id INT NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(30) NOT NULL DEFAULT 'Banco',
    banco VARCHAR(255) NOT NULL,
    numero_cuenta VARCHAR(100) NOT NULL,
    iban VARCHAR(100) DEFAULT NULL,
    saldo DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    activo BOOLEAN DEFAULT TRUE,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_cuentas_bancarias_club_nombre (club_id, nombre)
  )`);

  await ensureColumn('cuentas_bancarias', 'tipo', 'VARCHAR(30) NOT NULL DEFAULT "Banco"');
  await ensureColumn('eventos', 'temporada', `VARCHAR(20) NOT NULL DEFAULT "${temporadaPredeterminada}"`);
  await connection.query(`ALTER TABLE eventos MODIFY temporada VARCHAR(20) NOT NULL DEFAULT "${temporadaPredeterminada}"`);
  await connection.query(`UPDATE eventos SET temporada = ? WHERE temporada IS NULL OR temporada = ""`, [temporadaPredeterminada]);
  await ensureColumn('usuarios', 'club_id', 'INT NULL');
  await ensureColumn('ingresos', 'club_id', 'INT NOT NULL DEFAULT 1');
  await ensureColumn('egresos', 'club_id', 'INT NOT NULL DEFAULT 1');
  await ensureColumn('jugadores', 'club_id', 'INT NOT NULL DEFAULT 1');
  await ensureColumn('eventos', 'club_id', 'INT NOT NULL DEFAULT 1');

  const [clubs] = await connection.query('SELECT id FROM clubes ORDER BY id LIMIT 1');
  const defaultClub = clubs[0]?.id || 1;

  await connection.query('INSERT INTO clubes (nombre, ciudad, liga, estadio, presupuesto, estado) SELECT ?, ?, ?, ?, ?, ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM clubes WHERE nombre = ? LIMIT 1)',
    ['Real Madrid CF', 'Madrid', 'LaLiga', 'Santiago Bernabéu', 240000000, 'Activo', 'Real Madrid CF']
  );

  const [freshClub] = await connection.query('SELECT id FROM clubes ORDER BY id LIMIT 1');
  const actualDefaultClub = freshClub[0]?.id || defaultClub;

  await connection.query('UPDATE usuarios SET club_id = ? WHERE club_id IS NULL OR club_id = 0', [actualDefaultClub]);
  await connection.query('UPDATE ingresos SET club_id = ? WHERE club_id IS NULL OR club_id = 0', [actualDefaultClub]);
  await connection.query('UPDATE egresos SET club_id = ? WHERE club_id IS NULL OR club_id = 0', [actualDefaultClub]);
  await connection.query('UPDATE jugadores SET club_id = ? WHERE club_id IS NULL OR club_id = 0', [actualDefaultClub]);
  await connection.query('UPDATE eventos SET club_id = ? WHERE club_id IS NULL OR club_id = 0', [actualDefaultClub]);

  await connection.query("INSERT INTO usuarios (email, nombre, password, rol, club_id) SELECT 'admin@club.com', 'admin', '$2a$10$YourHashedPasswordHere', 'admin', ? FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE email = 'admin@club.com' LIMIT 1)", [actualDefaultClub]);

  const [columns] = await connection.query(
    'SELECT TABLE_NAME, COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND COLUMN_NAME = ?',
    [process.env.DB_NAME || 'GestionClub', 'club_id']
  );

  console.log('club_id columns:', JSON.stringify(columns, null, 2));
} finally {
  await connection.end();
}
