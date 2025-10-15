import express from 'express'; 
import cors from 'cors';

import { manejadorErrores } from "./utils/errores/manejadorErrores.js";

import propiedadRoutes from './routes/propiedadRoutes.js';
import renteroRoutes from './routes/renteroRoutes.js';
import documentoRoutes from './routes/documentoRoutes.js';

import Unidad from './models/unidad.js';
import Propiedad from './models/propiedad.js';
import Rentero from './models/rentero.js';

Unidad.belongsTo(Propiedad, { foreignKey: 'propiedad_id', as: 'propiedad' });
Propiedad.belongsTo(Rentero, { foreignKey: 'rentero_id', as: 'rentero' });

const app = express(); 

// Configuración de CORS
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json()); 

app.use('/propiedades', propiedadRoutes);
app.use('/rentero', renteroRoutes);
app.use('/documentos', documentoRoutes);

app.use(manejadorErrores);

export default app;