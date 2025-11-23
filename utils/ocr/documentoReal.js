import { Documento } from "./documento.js";
import { OCRUtils } from "./ocrUtils.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";

/**
 * Objeto real para validación de documentos
 * Implementa la lógica de negocio directamente usando utilidades OCR
 */
export class DocumentoReal extends Documento {
  /**
   * @param {Object} config - Configuración del validador
   */
  constructor(config = {}) {
    super();
    this.configuracion = config;
  }

  /**
   * Valida un documento completo (implementación real sin caché)
   * @param {string} rutaArchivo - Ruta del archivo a validar
   * @param {number} tipoId - ID del tipo de documento
   * @param {Object} opcionesValidacion - Opciones adicionales de validación
   * @returns {Promise<ResultadoValidacion>} - Resultado de la validación
   */
  async validarDocumento(rutaArchivo, tipoId, opcionesValidacion = {}) {
    try {
      // 1. Extraer texto y hash usando utilidades
      const { texto, hash } = await OCRUtils.extraerTextoYHash(rutaArchivo, this.configuracion);
      
      // 2. Validar campos usando utilidades
      const resultado = await OCRUtils.validarCampos(
        texto, 
        tipoId, 
        opcionesValidacion
      );
      
      // 3. Asignar hash al resultado
      resultado.asignarHash(hash);
      
      return resultado;
      
    } catch (error) {
      // Manejar errores específicos
      if (error.errorControlado) {
        throw error;
      }
      
      // Envolver errores no controlados
      throw new ErrorDocumento(`Error al validar el documento: ${error.message}`);
    }
  }

  /**
   * Actualiza la configuración del validador
   * @param {Object} config - Nueva configuración
   */
  actualizarConfiguracion(config) {
    this.configuracion = { ...this.configuracion, ...config };
  }

  /**
   * Exporta configuración actual
   * @returns {Object}
   */
  exportarConfiguracion() {
    return { ...this.configuracion };
  }
}
