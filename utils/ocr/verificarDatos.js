import AppError from "../errors/appError.js";

/**
 * Verifica si el texto extraído contiene todos los campos requeridos.
 * @param {string} texto - Texto plano extraído del documento.
 * @param {Array} camposRequeridos - Lista de palabras o frases esperadas.
 */
const verificarDatos = (texto, camposRequeridos) => {
  const textoMayus = texto.toUpperCase();

  const faltantes = camposRequeridos.filter(
    campo => !textoMayus.includes(campo.toUpperCase())
  );

  if (faltantes.length > 0) {
    throw new AppError(
      `El documento no contiene la información requerida: ${faltantes.join(", ")}`,
      400
    );
  }

  return true;
};

export default verificarDatos;
