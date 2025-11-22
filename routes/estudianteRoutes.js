import express from 'express';

import {
  registrarEstudiante,
  iniciarSesion,
  validarToken,
  cerrarSesion,
  obtenerPerfil
} from '../controllers/estudianteController.js';

import { autenticarToken } from '../middlewares/auth.js';

const router = express.Router();

router.post('/registrar', registrarEstudiante);
router.post('/login', iniciarSesion);

router.get('/validar', autenticarToken, validarToken);
router.post('/logout', cerrarSesion);
router.get('/perfil', autenticarToken, obtenerPerfil);

export default router;