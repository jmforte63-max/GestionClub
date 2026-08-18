import express from 'express';
import * as eventosController from '../controllers/eventosController.js';

const router = express.Router();

router.get('/', eventosController.getEventos);
router.post('/', eventosController.crearEvento);
router.get('/:id', eventosController.obtenerEvento);
router.put('/:id', eventosController.actualizarEvento);
router.delete('/:id', eventosController.eliminarEvento);

export default router;
