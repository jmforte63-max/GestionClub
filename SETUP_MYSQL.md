# 🚀 GUÍA COMPLETA: Configuración de Base de Datos MySQL

## ✅ Paso 1: Verificar que MySQL está instalado

### Windows
```bash
# Abre una terminal y verifica:
mysql --version
```

Si no está instalado, descárgalo aquí: https://dev.mysql.com/downloads/mysql/

## ✅ Paso 2: Iniciar el servicio MySQL

### Windows (PowerShell como administrador)
```bash
# Verifica el estado
Get-Service MySQL80

# Si no está corriendo, inicialo
Start-Service MySQL80

# O usa MySQL Command Line Client
```

Alternativamente, abre **MySQL Workbench** que viene con MySQL.

## ✅ Paso 3: Crear la base de datos

### Opción A: Desde Terminal

```bash
# Conectarse a MySQL
mysql -u root -p

# Ingresa tu contraseña (por defecto es vacía o "root")

# Luego ejecuta:
source database.sql
```

### Opción B: Desde MySQL Workbench

1. Abre **MySQL Workbench**
2. Conecta con tu servidor local
3. Abre un nuevo SQL Script
4. Copia el contenido de `database.sql`
5. Ejecuta (Ctrl+Shift+Enter)

## ✅ Paso 4: Configurar el archivo `.env` del backend

1. Abre `backend/.env`
2. Actualiza con tus credenciales:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_aqui
DB_NAME=GestionClub
JWT_SECRET=tu_clave_secreta_super_segura
PORT=5000
NODE_ENV=development
```

**IMPORTANTE:**
- Si instalaste MySQL sin contraseña, deja `DB_PASSWORD=` vacío
- Por defecto: usuario es `root`

## ✅ Paso 5: Verificar la conexión

```bash
# Desde la carpeta backend:
cd backend

# Intenta conectar
npm run dev
```

Deberías ver:
```
🚀 Servidor backend ejecutándose en http://localhost:5000
📊 API Health: http://localhost:5000/api/health
```

## ✅ Paso 6: Probar la API

Abre tu navegador:
```
http://localhost:5000/api/health
```

Deberías ver:
```json
{"status":"Backend operativo","timestamp":"2024-08-15T..."}
```

## 📊 Verificar datos en MySQL

```bash
# Conectarse a MySQL
mysql -u root -p

# Usar la base de datos
USE gestion_club;

# Ver tabla
SELECT * FROM ingresos;
SELECT * FROM egresos;
SELECT * FROM jugadores;
SELECT * FROM eventos;
```

## 🎯 Ejecutar Frontend + Backend juntos

### Terminal 1: Frontend
```bash
cd "c:\Users\jmfor\Documents\proyectoHtml\Gestion club"
npm run dev
```

### Terminal 2: Backend
```bash
cd "c:\Users\jmfor\Documents\proyectoHtml\Gestion club\backend"
npm run dev
```

Luego abre:
- **Frontend:** http://localhost:5173/
- **Backend API:** http://localhost:5000/api/health

## 🚨 Solución de problemas

### ❌ Error: "Access denied for user 'root'@'localhost'"
**Solución:** Verifica la contraseña en `.env`
```bash
# Test manual
mysql -u root -p
```

### ❌ Error: "Cannot find module 'mysql2'"
**Solución:** Instala nuevamente
```bash
cd backend
npm install
```

### ❌ Error: "Database does not exist"
**Solución:** Ejecuta el archivo SQL
```bash
mysql -u root -p < database.sql
```

### ❌ Error: "Connect ECONNREFUSED 127.0.0.1:3306"
**Solución:** MySQL no está corriendo
```bash
# Windows: Inicia el servicio
Start-Service MySQL80

# O abre MySQL Workbench
```

### ❌ Puerto 5000 en uso
**Solución:** Cambia el puerto en `backend/.env`
```env
PORT=5001
```

## 📞 Contacto y soporte

Si tienes dudas:
1. Verifica los logs de la terminal
2. Asegúrate que MySQL está corriendo
3. Verifica las credenciales en `.env`

## 🎉 ¡Éxito!

Una vez configurado:
- Frontend: http://localhost:5173/ ✅
- Backend API: http://localhost:5000/api/health ✅
- Base de datos: MySQL gestion_club ✅
