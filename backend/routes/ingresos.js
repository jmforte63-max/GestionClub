import express from 'express';
import * as ingresosController from '../controllers/ingresosController.js';

const router = express.Router();

router.get('/', ingresosController.getIngresos);
router.post('/', ingresosController.crearIngreso);
router.get('/total', ingresosController.getTotalIngresos);
router.get('/:id', ingresosController.obtenerIngreso);
router.put('/:id', ingresosController.actualizarIngreso);
router.delete('/:id', ingresosController.eliminarIngreso);

export default router;
