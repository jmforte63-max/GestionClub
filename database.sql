-- Crear base de datos
CREATE DATABASE IF NOT EXISTS GestionClub;
USE GestionClub;

-- Tabla de clubes
CREATE TABLE clubes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL,
  ciudad VARCHAR(255) NOT NULL,
  liga VARCHAR(255) NOT NULL,
  estadio VARCHAR(255) NOT NULL,
  presupuesto DECIMAL(12, 2) NOT NULL DEFAULT 0,
  escudo_url VARCHAR(500) NULL,
  estado VARCHAR(50) DEFAULT 'Activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de usuarios
CREATE TABLE usuarios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  rol ENUM('admin', 'tesorero', 'usuario') DEFAULT 'usuario',
  club_id INT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  activo BOOLEAN DEFAULT TRUE,
  INDEX idx_usuarios_club (club_id)
);

-- Tabla de ingresos
CREATE TABLE ingresos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  club_id INT NOT NULL,
  fecha DATE NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  iva DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  total_con_iva DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  descripcion TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_ingresos_club (club_id)
);

-- Tabla de conceptos de ingresos con IVA
CREATE TABLE conceptos_ingresos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  club_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  descripcion TEXT,
  iva DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  activo BOOLEAN DEFAULT TRUE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_conceptos_ingresos_club (club_id),
  UNIQUE KEY uk_conceptos_ingresos_club_nombre (club_id, nombre)
);

-- Tabla de egresos
CREATE TABLE egresos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  usuario_id INT NOT NULL,
  club_id INT NOT NULL,
  fecha DATE NOT NULL,
  concepto VARCHAR(255) NOT NULL,
  monto DECIMAL(10, 2) NOT NULL,
  categoria VARCHAR(255) NOT NULL,
  iva DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  total_con_iva DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  descripcion TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  INDEX idx_egresos_club (club_id)
);

-- Tabla de jugadores
CREATE TABLE jugadores (
  id INT PRIMARY KEY AUTO_INCREMENT,
  club_id INT NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  posicion ENUM('Portero', 'Defensa', 'Centrocampista', 'Delantero') NOT NULL,
  numero INT NOT NULL,
  estado ENUM('Activo', 'Lesionado', 'Retirado') DEFAULT 'Activo',
  fecha_incorporacion DATE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_jugadores_club (club_id),
  UNIQUE KEY uk_jugador_numero_club (club_id, numero)
);

-- Tabla de eventos/calendario
CREATE TABLE eventos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  club_id INT NOT NULL,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  tipo ENUM('Partido', 'Entrenamiento', 'Asamblea', 'Evento Social', 'Otro') NOT NULL,
  descripcion VARCHAR(255) NOT NULL,
  ubicacion VARCHAR(255),
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_eventos_club (club_id)
);

-- Tabla de socios/miembros
CREATE TABLE socios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telefono VARCHAR(20),
  cuota_pagada BOOLEAN DEFAULT FALSE,
  mes_pagado VARCHAR(7),
  fecha_adhesion DATE,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX idx_ingresos_fecha ON ingresos(fecha);
CREATE INDEX idx_ingresos_usuario ON ingresos(usuario_id);
CREATE INDEX idx_egresos_fecha ON egresos(fecha);
CREATE INDEX idx_egresos_usuario ON egresos(usuario_id);
CREATE INDEX idx_eventos_fecha ON eventos(fecha);

-- Insertar clubs base
INSERT INTO clubes (nombre, ciudad, liga, estadio, presupuesto, escudo_url, estado) VALUES
('Real Madrid CF', 'Madrid', 'LaLiga', 'Santiago Bernabéu', 240000000, 'https://upload.wikimedia.org/wikipedia/en/5/56/Real_Madrid_CF.svg', 'Activo'),
('FC Barcelona', 'Barcelona', 'LaLiga', 'Camp Nou', 210000000, 'https://upload.wikimedia.org/wikipedia/en/4/47/FC_Barcelona_%28crest%29.svg', 'Activo'),
('Bayern Munich', 'Múnich', 'Bundesliga', 'Allianz Arena', 190000000, 'https://upload.wikimedia.org/wikipedia/commons/1/12/FC_Bayern_M%C3%BCnchen_logo_%282017%29.svg', 'Activo');

-- Insertar usuario admin de prueba y asociarlo al primer club
INSERT INTO usuarios (email, nombre, password, rol, club_id) VALUES 
('admin@club.com', 'admin', '$2a$10$YourHashedPasswordHere', 'admin', 1);
