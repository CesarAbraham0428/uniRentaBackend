import {ErrorAplicacion} from "../errores/appError.js";
import tipoDocumento from "./camposRequeridos.js";

/**
 * Verifica si el texto extraído contiene todos los campos requeridos.
 * @param {string} textoExtraido - Texto plano extraído del documento.
 * @param {string} tipoDoc - Tipo de documento ('INE','RECIBO_LUZ',etc).
 */

const verificarDatos = (textoExtraido, tipoDoc) => {
  const textoMayus = textoExtraido.toUpperCase();

  const camposRequeridos = tipoDocumento[tipoDoc];

  if(camposRequeridos){
    camposRequeridos.forEach((campo) => {
      if (!textoMayus.includes(campo)) {
        throw new ErrorAplicacion(
          `El documento no contiene la información requerida`,
          400
        );
      }
    });
  }
};

export default verificarDatos;
