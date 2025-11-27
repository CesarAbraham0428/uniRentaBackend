import { Documento } from "./documento.js";
import { UtilidadesOCR } from "./ocrUtils.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";

/**
 * Implementación real de validación sin caché
 */
export class DocumentoReal extends Documento {
  // Valida documento usando OCR y validación de campos
  async validarDocumento(rutaArchivo, tipoId, opcionesValidacion = {}) {
    try {
      // Extrae texto y calcula hash del archivo simultáneamente
      const { texto, hash } = await UtilidadesOCR.extraerTextoYHashDeArchivo(rutaArchivo);
      // Valida que los campos requeridos estén presentes en el texto
      const resultado = await UtilidadesOCR.validarCamposDeDocumento(texto, tipoId, opcionesValidacion);
      // Asigna el hash para identificar el documento únicamente
      resultado.asignarHash(hash);
      return resultado;
    } catch (error) {
      if (error.errorControlado) throw error;
      throw new ErrorDocumento(`Error al validar el documento: ${error.message}`);
    }
  }
}