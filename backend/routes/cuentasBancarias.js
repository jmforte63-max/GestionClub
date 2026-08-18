import express from 'express';
import * as cuentasBancariasController from '../controllers/cuentasBancariasController.js';

const router = express.Router();

router.get('/', cuentasBancariasController.getCuentasBancarias);
router.post('/', cuentasBancariasController.crearCuentaBancaria);
router.put('/:id', cuentasBancariasController.actualizarCuentaBancaria);
router.delete('/:id', cuentasBancariasController.eliminarCuentaBancaria);

export default router;
