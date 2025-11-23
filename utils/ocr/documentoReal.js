import { Documento } from "./documento.js";
import { ValidadorOCR } from "./validadorOCR.js";
import { ServicioValidadorDocumento } from "./servicioValidadorDocumento.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";

/**
 * Objeto real para validación de documentos
 * Contiene la lógica de negocio pura sin mecanismos de caché
 */
export class DocumentoReal extends Documento{
  /**
   * @param {Object} config - Configuración del validador
   * @param {Object} config.configOCR - Configuración para OCR
   * @param {Object} config.configServicio - Configuración para servicio
   */
  constructor(config = {}) {
    super();
    this.validadorOCR = new ValidadorOCR(config.configOCR || {});
    this.servicioValidador = new ServicioValidadorDocumento(config.configServicio || {});
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
      // 1. Extraer texto mediante OCR
      const { texto } = await this.validadorOCR.extraerTextoYHash(rutaArchivo);
      
      // 2. Validar campos y lógica de negocio
      const resultado = await this.servicioValidador.validarCampos(
        texto, 
        tipoId, 
        opcionesValidacion
      );
      
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
   * Actualiza la configuración de los componentes
   * @param {Object} config - Nueva configuración
   */
  actualizarConfiguracion(config) {
    if (config.ocr) {
      this.validadorOCR.actualizarConfiguracion(config.ocr);
    }
    
    if (config.servicio) {
      this.servicioValidador.actualizarConfiguracion(config.servicio);
    }
  }

  /**
   * Exporta configuración actual
   * @returns {Object}
   */
  exportarConfiguracion() {
    return {
      ocr: this.validadorOCR.obtenerConfiguracion(),
      servicio: this.servicioValidador.obtenerConfiguracion()
    };
  }
}
