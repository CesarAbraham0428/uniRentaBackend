import ocrApi from "./ocrApi.js";
import verificarDatos from "./validadorCamposOCR.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";

const validarDocumento = async (rutaArchivo, tipoDocumento) => {
  try {
    const textoExtraido = await ocrApi(rutaArchivo);
    verificarDatos(textoExtraido, tipoDocumento);
    return true;
  } catch (error) {
    if (error instanceof ErrorDocumento) {
      throw error;
    }
    throw new ErrorDocumento(`Error al validar el documento: ${error.message}`);
  }
};

export default validarDocumento;
