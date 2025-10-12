import * as renteroService from "../services/renteroService.js";

export const registrarRentero = async (req, res, next) => {
  try {

    const { documento, tipo, rentero_id, propiedad_id, ...datosRentero } = req.body;

    const resultado = await renteroService.registrarRentero(
      documento,
      tipo,
      rentero_id,
      propiedad_id,
      datosRentero
    );
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};