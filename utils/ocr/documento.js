/**
 * Clase abstracta para validación de documentos
 */
export class Documento {
  async validarDocumento(rutaArchivo, tipoId, opcionesValidacion = {}) {
    throw new Error('Método abstracto - debe implementar en subclase');
  }
}