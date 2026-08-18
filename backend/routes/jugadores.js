import express from 'express';
import * as jugadoresController from '../controllers/jugadoresController.js';

const router = express.Router();

router.get('/', jugadoresController.getJugadores);
router.post('/', jugadoresController.crearJugador);
router.get('/:id', jugadoresController.obtenerJugador);
router.put('/:id', jugadoresController.actualizarJugador);
router.delete('/:id', jugadoresController.eliminarJugador);

export default router;
