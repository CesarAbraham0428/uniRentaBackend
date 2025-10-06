import express from 'express';
import {
  obtenerPropiedades,
  obtenerPropiedadPorId,
  obtenerPropiedadesConFiltros
} from '../controllers/propiedadController.js';

const router = express.Router();

router.get('/', obtenerPropiedades);
router.get('/filtrar', obtenerPropiedadesConFiltros);
router.get('/:id', obtenerPropiedadPorId);

export default router;