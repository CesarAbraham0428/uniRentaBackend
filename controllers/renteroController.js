import * as renteroService from "../services/renteroService.js";
import { ErrorDocumento } from "../utils/errores/erroresDocumento.js";

export const registrarRentero = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ErrorDocumento('Debe proporcionar un documento válido');
    }

    const { tipo_id, ...datosRentero } = req.body;
    
    const resultado = await renteroService.registrarRentero(
      req.file.path,
      tipo_id,
      datosRentero
    );
    
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};