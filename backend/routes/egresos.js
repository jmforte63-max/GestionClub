import express from 'express';
import * as egresosController from '../controllers/egresosController.js';

const router = express.Router();

router.get('/', egresosController.getEgresos);
router.post('/', egresosController.crearEgreso);
router.get('/total', egresosController.getTotalEgresos);
router.get('/categoria/resumen', egresosController.getEgresosPorCategoria);
router.get('/:id', egresosController.obtenerEgreso);
router.put('/:id', egresosController.actualizarEgreso);
router.delete('/:id', egresosController.eliminarEgreso);

export default router;
