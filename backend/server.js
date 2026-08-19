import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from './config/database.js';

const initializeDatabase = async () => {
  try {
    await import('./migrateClubScope.mjs');
    console.log('✅ Inicialización de base de datos completada');
  } catch (error) {
    console.warn('⚠️ No se pudo inicializar la BD automáticamente:', error.message);
  }
};
import ingresosRoutes from './routes/ingresos.js';
import egresosRoutes from './routes/egresos.js';
import jugadoresRoutes from './routes/jugadores.js';
import eventosRoutes from './routes/eventos.js';
import clubesRoutes from './routes/clubes.js';
import cuentasBancariasRoutes from './routes/cuentasBancarias.js';
import conceptosIngresosRoutes from './routes/conceptosIngresos.js';
import conceptosEgresosRoutes from './routes/conceptosEgresos.js';
import temporadasRoutes from './routes/temporadas.js';
import authRoutes, { authenticateToken } from './routes/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = Number(process.env.PORT || 5000);
const isProduction = process.env.NODE_ENV === 'production';
const frontendPath = isProduction
  ? path.join(__dirname, '..', 'dist')
  : path.join(__dirname, '..', 'frontend');

await initializeDatabase();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/ingresos', authenticateToken, ingresosRoutes);
app.use('/api/conceptos-ingresos', authenticateToken, conceptosIngresosRoutes);
app.use('/api/conceptos-egresos', authenticateToken, conceptosEgresosRoutes);
app.use('/api/egresos', authenticateToken, egresosRoutes);
app.use('/api/jugadores', authenticateToken, jugadoresRoutes);
app.use('/api/eventos', authenticateToken, eventosRoutes);
app.use('/api/clubes', authenticateToken, clubesRoutes);
app.use('/api/cuentas-bancarias', authenticateToken, cuentasBancariasRoutes);
app.use('/api/temporadas', authenticateToken, temporadasRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 as ok');
    res.json({
      status: 'Backend operativo',
      database: rows.length ? 'connected' : 'unknown',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Backend operativo',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return next();
  }

  const indexPath = path.join(frontendPath, 'index.html');
  res.sendFile(indexPath);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend ejecutándose en http://localhost:${PORT}`);
  console.log(`📊 API Health: http://localhost:${PORT}/api/health`);
});
