// controllers/renteroController.js
import * as renteroService from "../services/renteroService.js";

export const registrarRentero = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      exito: false,
      mensaje: 'Debe proporcionar un documento válido'
    });
  }

  try {
    const resultado = await renteroService.registrarRentero(
      req.body, 
      req.file.path
    );
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};