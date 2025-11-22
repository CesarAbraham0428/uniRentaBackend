import Estudiante from '../models/estudiante.js';
import sequelize from '../config/baseDeDatos.js';
import * as documentoService from './documentoService.js';
import { generarToken } from '../utils/auth/jwt.js';

import { ErrorBaseDatos, ErrorDocumento } from '../utils/errores/erroresDocumento.js';

export const registrarEstudiante = async (datosEstudiante) => {
  
  return await Estudiante.create(datosEstudiante);
};
