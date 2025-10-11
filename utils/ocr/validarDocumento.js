import ocrApi from "./ocrApi.js";
import verificarDatos from "./validadorCamposOCR.js";
import { ErrorAplicacion } from "../errores/appError.js";

/**
 * Valida un documento según su tipo utilizando OCR
 * @param {string} rutaArchivo - Ruta al archivo a validar
 * @param {string} tipoDocumento - Tipo de documento ('rentero' u otro)
 * @returns {Promise<boolean>} - True si la validación es exitosa
 */
const validarDocumento = async (rutaArchivo, tipoDocumento) => {
  try {
    // Paso 1: Extraer texto del documento usando OCR
    const textoExtraido = await ocrApi(rutaArchivo);
    
    // Paso 2: Validar campos del documento
    verificarDatos(textoExtraido, tipoDocumento);

    return true;
  } catch (error) {
    // Si hay un error, lo relanzamos para que lo maneje el servicio
    throw new ErrorAplicacion(
      `Error al validar el documento: ${error.message}`,
      error.statusCode || 500
    );
  }
};

export default validarDocumento;
