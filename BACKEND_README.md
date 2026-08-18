# Sistema de Gestión de Club de Fútbol - Backend

## Instalación

### 1. Requisitos previos
- **Node.js** 16+ instalado
- **MySQL** 8.0+ instalado y en ejecución

### 2. Crear la base de datos
Ejecuta el archivo SQL en MySQL:

```bash
mysql -u root -p < database.sql
```

O cópyalo en MySQL Workbench y ejecutalo.

### 3. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 4. Configurar variables de entorno

Edita `backend/.env` con tus credenciales de MySQL:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=GestionClub
JWT_SECRET=tu_clave_secreta
PORT=5000
NODE_ENV=development
```

### 5. Ejecutar el servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

El servidor estará disponible en: **http://localhost:5000**

## API Endpoints

### Ingresos
- `GET /api/ingresos` - Obtener todos los ingresos
- `GET /api/ingresos/total` - Obtener total de ingresos
- `GET /api/ingresos/:id` - Obtener ingreso específico
- `POST /api/ingresos` - Crear nuevo ingreso
- `PUT /api/ingresos/:id` - Actualizar ingreso
- `DELETE /api/ingresos/:id` - Eliminar ingreso

### Egresos
- `GET /api/egresos` - Obtener todos los egresos
- `GET /api/egresos/total` - Obtener total de egresos
- `GET /api/egresos/categoria/resumen` - Egresos por categoría
- `GET /api/egresos/:id` - Obtener egreso específico
- `POST /api/egresos` - Crear nuevo egreso
- `PUT /api/egresos/:id` - Actualizar egreso
- `DELETE /api/egresos/:id` - Eliminar egreso

### Jugadores
- `GET /api/jugadores` - Obtener todos los jugadores
- `GET /api/jugadores/:id` - Obtener jugador específico
- `POST /api/jugadores` - Crear nuevo jugador
- `PUT /api/jugadores/:id` - Actualizar jugador
- `DELETE /api/jugadores/:id` - Eliminar jugador

### Eventos
- `GET /api/eventos` - Obtener todos los eventos
- `GET /api/eventos/:id` - Obtener evento específico
- `POST /api/eventos` - Crear nuevo evento
- `PUT /api/eventos/:id` - Actualizar evento
- `DELETE /api/eventos/:id` - Eliminar evento

### Health Check
- `GET /api/health` - Verificar estado del servidor

## Estructura del Backend

```
backend/
├── config/
│   └── database.js        # Configuración de conexión MySQL
├── controllers/
│   ├── ingresosController.js
│   ├── egresosController.js
│   ├── jugadoresController.js
│   └── eventosController.js
├── routes/
│   ├── ingresos.js
│   ├── egresos.js
│   ├── jugadores.js
│   └── eventos.js
├── .env                   # Variables de entorno
├── server.js              # Punto de entrada
└── package.json
```

## Ejemplo de uso

### Crear un ingreso
```bash
curl -X POST http://localhost:5000/api/ingresos \
  -H "Content-Type: application/json" \
  -d '{
    "usuario_id": 1,
    "fecha": "2024-08-15",
    "concepto": "Cuota de socios",
    "monto": 5000,
    "descripcion": "Pago de cuota mensual"
  }'
```

### Obtener todos los ingresos
```bash
curl http://localhost:5000/api/ingresos
```

### Crear un egreso
```bash
curl -X POST http://localhost:5000/api/egresos \
  -H "Content-Type: application/json" \
  -d '{
    "usuario_id": 1,
    "fecha": "2024-08-15",
    "concepto": "Pago de árbitro",
    "monto": 500,
    "categoria": "Arbitraje",
    "descripcion": "Árbitro partido amistoso"
  }'
```

## Solución de problemas

### Error: "Access denied for user 'root'@'localhost'"
- Verifica que MySQL está corriendo: `mysql -u root -p`
- Actualiza la contraseña en `.env`

### Error: "Cannot find module"
- Ejecuta: `npm install` nuevamente
- Verifica que Node.js está actualizado

### Error: "Pool is closed"
- Asegúrate que MySQL está ejecutándose
- Verifica la conexión en `config/database.js`

## Próximos pasos

1. ✅ Conectar React con la API
2. ✅ Implementar autenticación JWT
3. ✅ Agregar validaciones más robustas
4. ✅ Crear tests unitarios
