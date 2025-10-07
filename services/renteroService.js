import fs from "fs";
import path from "path";
import validarDocumento from "../utils/ocr/validarDocumento.js";
import rentero from "../models/rentero.js";

export const registrarRentero = async (datosRentero, rutaDocumento) => {
  // Paso 1: Validar documento con OCR.Space
  await validarDocumento(rutaDocumento, "rentero");

  // Paso 2: Mover el archivo si fue válido
  const carpetaFinal = path.join(process.cwd(), "uploads/renteros/validos");
  if (!fs.existsSync(carpetaFinal)) fs.mkdirSync(carpetaFinal, { recursive: true });

  const nuevaRuta = path.join(carpetaFinal, path.basename(rutaDocumento));
  fs.renameSync(rutaDocumento, nuevaRuta);

  // Paso 3: Crear rentero en la BD
  const nuevoRentero = await rentero.create({datosRentero});

  return nuevoRentero;
};
