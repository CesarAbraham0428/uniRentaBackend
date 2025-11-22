/**
 * Interfaz abstracta para validación de documentos
 * Define el contrato que deben implementar tanto el objeto real como el proxy
 */
export class Documento {
  /**
   * Valida un documento completo
   * @param {string} rutaArchivo - Ruta del archivo a validar
   * @param {number} tipoId - ID del tipo de documento
   * @param {Object} opcionesValidacion - Opciones adicionales de validación
   * @returns {Promise<ResultadoValidacion>} - Resultado de la validación
   */
  async validarDocumento(rutaArchivo, tipoId, opcionesValidacion = {}) {
    throw new Error('Método abstracto - debe implementar en subclase');
  }
}
