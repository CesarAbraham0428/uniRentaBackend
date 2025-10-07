import * as renteroService from "../services/renteroService.js";

export const registrarRentero = async (req, res, next) => {
  try {
    const rutaDocumento = req.file.path;
    const nuevoRentero = await renteroService.registrarRentero(req.body, rutaDocumento);

    res.status(201).json({
      mensaje: "Rentero registrado correctamente.",
      rentero: nuevoRentero,
    });
  } catch (error) {
    next(error);
  }
};