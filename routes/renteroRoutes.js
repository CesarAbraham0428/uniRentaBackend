import express from 'express';

import cargarArchivo from "../middlewares/cargarArchivo.js";

import {registrarRentero} from '../controllers/renteroController.js';

const router = express.Router();

router.post('/registrar', cargarArchivo.single("documento"), registrarRentero);

export default router;