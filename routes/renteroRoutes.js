import express from 'express';
import {registrarRentero} from '../controllers/renteroController.js';

const router = express.Router();

router.post('/registrar', registrarRentero);

export default router;