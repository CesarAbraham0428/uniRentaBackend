import express from 'express'; 
import cors from 'cors';
import propiedadRoutes from './routes/propiedadRoutes.js';

import Unidad from './models/unidad.js';
import Propiedad from './models/propiedad.js';
import Rentero from './models/rentero.js';

Unidad.belongsTo(Propiedad, { foreignKey: 'propiedad_id', as: 'propiedad' });
Propiedad.belongsTo(Rentero, { foreignKey: 'rentero_id', as: 'rentero' });

const app = express(); 

app.use(cors()); 
app.use(express.json()); 

app.use('/api/propiedades', propiedadRoutes);

export default app;