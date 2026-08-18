import express from 'express';
import * as conceptosEgresosController from '../controllers/conceptosEgresosController.js';

const router = express.Router();

router.get('/', conceptosEgresosController.getConceptosEgresos);
router.post('/', conceptosEgresosController.crearConceptoEgreso);
router.get('/:id', conceptosEgresosController.obtenerConceptoEgreso);
router.put('/:id', conceptosEgresosController.actualizarConceptoEgreso);
router.delete('/:id', conceptosEgresosController.eliminarConceptoEgreso);

export default router;
