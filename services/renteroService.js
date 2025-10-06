import { ErrorAplicacion } from "../utils/errores/AppError.js";
import rentero from "../models/rentero.js";

export const registrarRentero = async (data) => {

  const existe = await rentero.findOne({ where: { email: data.email } });
  if (existe) throw new ErrorAplicacion("El email ya está registrado",400);

  const nuevoRentero = await rentero.create(data);
  return nuevoRentero;
};
