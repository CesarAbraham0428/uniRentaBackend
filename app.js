import express from 'express'; 
import cors from 'cors'; 

const app = express(); 

app.use(cors()); 
app.use(express.json()); 

// Aquí en el futuro se van a agregar las rutas
// import propiedadRoutes from './routes/propiedad.routes.js';
// app.use('/api/propiedades', propiedadRoutes);

export default app;