import ocrApi from "./ocrApi.js";
import verificarDatos from "./validadorCamposOCR.js";
import { INE, RECIBO_LUZ } from "./camposRequeridos.js";
import { ErrorAplicacion } from "../errores/appError.js";

/**
 * Valida un documento según su tipo utilizando OCR
 * @param {string} rutaArchivo - Ruta al archivo a validar
 * @param {string} tipoDocumento - Tipo de documento ('rentero' u otro)
 * @returns {Promise<boolean>} - True si la validación es exitosa
 */
const validarDocumento = async (rutaArchivo, tipoDocumento) => {
  try {
    // 1. Extraer texto del documento usando OCR
    const textoExtraido = await ocrApi(rutaArchivo);
    
    // 2. Determinar qué campos validar según el tipo de documento
    let camposAValidar = [];
    
    switch (tipoDocumento.toLowerCase()) {
      case 'rentero':
        // Para rentas, validamos INE y Recibo de Luz
        await verificarDatos(textoExtraido, INE);
        await verificarDatos(textoExtraido, RECIBO_LUZ);
        break;
      case 'estudiante':
        // Para estudiantes, validamos solo INE
        await verificarDatos(textoExtraido, INE);
        break;
      default:
        throw new ErrorAplicacion('Tipo de documento no soportado', 400);
    }

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
