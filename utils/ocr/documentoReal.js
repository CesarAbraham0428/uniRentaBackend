import { Documento } from "./documento.js";
import { OCRUtils } from "./ocrUtils.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";

/**
 * Implementación real de validación sin caché
 */
export class DocumentoReal extends Documento {
  constructor(configuracion = {}) {
    super();
    this.configuracion = configuracion;
  }

  async validarDocumento(rutaArchivo, tipoId, opcionesValidacion = {}) {
    try {
      const { texto, hash } = await OCRUtils.extraerTextoYHash(rutaArchivo, this.configuracion);
      const resultado = await OCRUtils.validarCampos(texto, tipoId, opcionesValidacion);
      resultado.asignarHash(hash);
      return resultado;
    } catch (error) {
      if (error.errorControlado) throw error;
      throw new ErrorDocumento(`Error al validar el documento: ${error.message}`);
    }
  }

  actualizarConfiguracion(config) {
    this.configuracion = { ...this.configuracion, ...config };
  }

  exportarConfiguracion() {
    return { ...this.configuracion };
  }
}