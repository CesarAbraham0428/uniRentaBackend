import * as renteroService from "../services/renteroService.js";

export const registrarRentero = async (req, res, next) => {
  try {
    const rentero = await renteroService.registrarRentero(req.body);
    res.status(201).json({
      estado: "exito",
      mensaje: "Rentero registrado correctamente",
      datos: rentero
    });
  } catch (error) {
    next(error);
  }
};
