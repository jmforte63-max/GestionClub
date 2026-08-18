import express from 'express';
import * as conceptosIngresosController from '../controllers/conceptosIngresosController.js';

const router = express.Router();

router.get('/', conceptosIngresosController.getConceptosIngresos);
router.post('/', conceptosIngresosController.crearConceptoIngreso);
router.get('/:id', conceptosIngresosController.obtenerConceptoIngreso);
router.put('/:id', conceptosIngresosController.actualizarConceptoIngreso);
router.delete('/:id', conceptosIngresosController.eliminarConceptoIngreso);

export default router;
