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

router.post('/registrar', 
  cargarArchivo.single("documento"),
  (req, res, next) => {
    try {
      const { body } = req;

      // Parsear ubicacion si viene como string
      if (body.ubicacion && typeof body.ubicacion === 'string') {
        body.ubicacion = JSON.parse(body.ubicacion);
      }
      
      // Parsear coordinates si viene como string
      if (body.ubicacion?.coordinates && typeof body.ubicacion.coordinates === 'string') {
        body.ubicacion.coordinates = JSON.parse(body.ubicacion.coordinates);
      }

      // Convertir a números
      if (body.tipo_id) body.tipo_id = parseInt(body.tipo_id);
      if (body.rentero_id) body.rentero_id = parseInt(body.rentero_id);

      // Convertir a booleano
      if (body.visible !== undefined) {
        body.visible = body.visible === 'true' || body.visible === true;
      }

      next();
    } catch (error) {
      res.status(400).json({ 
        error: 'Datos inválidos', 
        detalle: error.message 
      });
    }
  },
  registrarPropiedad
);


export default router;