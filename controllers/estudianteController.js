import * as estudianteService from "../services/estudianteService.js";
import { ErrorDocumento, ErrorBaseDatos } from "../utils/errores/erroresDocumento.js";

export const registrarEstudiante = async (req, res, next) => {
  try {

    const datosEstudiante = req.body;
    
    const resultado = await estudianteService.registrarEstudiante(
      datosEstudiante
    );
    
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};