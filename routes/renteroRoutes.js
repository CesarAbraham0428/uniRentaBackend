import express from 'express';
import upload from "../middlewares/upload.js";
import {registrarRentero} from '../controllers/renteroController.js';

const router = express.Router();

router.post('/registrar', upload.single("documento"), registrarRentero);

export default router;