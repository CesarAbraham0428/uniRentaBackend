import express from 'express';

import cargarArchivo from "../middlewares/cargarArchivo.js";

import {
  obtenerPropiedades,
  obtenerPropiedadPorId,
  obtenerPropiedadesConFiltros,
  registrarPropiedad
} from '../controllers/propiedadController.js';

const router = express.Router();

router.get('/', obtenerPropiedades);
router.get('/filtrar', obtenerPropiedadesConFiltros);
router.get('/:id', obtenerPropiedadPorId);

router.post('/registrar', cargarArchivo.single("documento"), registrarPropiedad);

export default router;