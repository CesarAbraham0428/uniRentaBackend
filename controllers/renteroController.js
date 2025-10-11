import * as renteroService from "../services/renteroService.js";

export const registrarRentero = async (req, res, next) => {
  try {
    const resultado = await renteroService.registrarRentero(
      req.body, 
      req.file?.path 
    );
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};