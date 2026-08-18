import express from 'express';
import * as temporadasController from '../controllers/temporadasController.js';

const router = express.Router();

router.get('/', temporadasController.getTemporadas);
router.post('/', temporadasController.crearTemporada);

export default router;
