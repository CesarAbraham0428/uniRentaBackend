import Documento from '../models/documento.js';
import TipoDocumento from '../models/tipo_documento.js';

import { ProxyValidadorDocumento } from '../utils/ocr/proxyValidadorDocumento.js';
import { moverArchivo, limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';

// Instancia global del proxy para reutilización
const proxyValidador = new ProxyValidadorDocumento({
  configCache: {
    ttlInvalido: 300,  // 5 minutos
    ttlParcial: 180    // 3 minutos
  },
  configOCR: {
    intentosMaximos: 3,
    timeout: 30000
  },
  configServicio: {
    umbralSimilitudNombre: 0.9,
    umbralInvalido: 40,
    umbralParcial: 70
  }
});

export const procesarDocumento = async (rutaDocumento, tipo_id, opcionesValidacion = {}) => {
  try {
    console.log(`Procesando documento: ${rutaDocumento} con tipo: ${tipo_id}`);
    
    // Usar el nuevo proxy para validación con caché
    const resultadoValidacion = await proxyValidador.validarDocumento(rutaDocumento, tipo_id, opcionesValidacion);
    
    // El resultado ya incluye el manejo de errores específicos
    if (!resultadoValidacion.esValido) {
      // Lanzar error con el mensaje específico del resultado
      const error = new Error(resultadoValidacion.generarMensaje());
      error.errorControlado = true;
      error.tipo = resultadoValidacion.tipoValidacion;
      error.detalles = resultadoValidacion.detalles;
      throw error;
    }

    console.log(`Documento validado exitosamente (${resultadoValidacion.porcentaje}% de reconocimiento)`);
    const carpetaDestino = obtenerCarpetaDestino(tipo_id);
    const rutaFinal = moverArchivo(rutaDocumento, carpetaDestino);
    console.log(`Documento movido a: ${rutaFinal}`);
    
    return { 
      rutaFinal,
      validacion: resultadoValidacion.toPlainObject()
    };
  } catch (error) {
    console.error(`Error procesando documento ${rutaDocumento}:`, error.message);
    limpiarArchivoTemporal(rutaDocumento);
    throw error;
  }
};

export const guardarDocumento = async (rutaFinal, tipo_id, renteroId = null, propiedadId = null, transaccion = null) => {
  const opciones = transaccion ? { transaction: transaccion } : {};
  
  return await Documento.create({
    ruta_archivo: rutaFinal,
    tipo_id,
    rentero_id: renteroId,
    propiedad_id: propiedadId
  }, opciones);
};

const obtenerCarpetaDestino = (tipo_id) => {
  const tipo = Number(tipo_id)
  
  if (tipo === 1) {
    return 'rentero/identidad';
  }
  
  return 'rentero/propiedad';
};

export const obtenerDocumentos = async () => {
  return await TipoDocumento.findAll();
};

export const obtenerTipoDocumentoPorID = async (id) => {
  return await TipoDocumento.findByPk(id);
};

/**
 * Procesa múltiples documentos en lote usando la nueva arquitectura
 * @param {Array} documentos - Array de {rutaArchivo, tipoId, opciones}
 * @param {Object} opciones - Opciones de procesamiento
 * @returns {Promise<Array>} - Resultados del procesamiento
 */
export const procesarLoteDocumentos = async (documentos, opciones = {}) => {
  try {
    console.log(`Procesando lote de ${documentos.length} documentos`);
    
    const resultados = await proxyValidador.validarLote(documentos, opciones);
    
    // Procesar solo los documentos válidos
    const documentosValidos = resultados.filter(r => r.esValido && !r.error);
    
    for (const resultado of documentosValidos) {
      const documentoOriginal = documentos.find(d => 
        d.rutaArchivo === resultado.detalles?.rutaArchivo
      );
      
      if (documentoOriginal) {
        const carpetaDestino = obtenerCarpetaDestino(documentoOriginal.tipoId);
        const rutaFinal = moverArchivo(documentoOriginal.rutaArchivo, carpetaDestino);
        resultado.rutaFinal = rutaFinal;
      }
    }
    
    console.log(`Lote procesado: ${documentosValidos.length} válidos, ${resultados.length - documentosValidos.length} inválidos`);
    
    return resultados;
  } catch (error) {
    console.error(`Error procesando lote de documentos:`, error.message);
    throw error;
  }
};

/**
 * Obtiene estadísticas del sistema de validación
 * @returns {Object} - Estadísticas completas
 */
export const obtenerEstadisticasValidacion = () => {
  return proxyValidador.obtenerEstadisticas();
};

/**
 * Verifica si un documento está en caché
 * @param {string} rutaArchivo - Ruta del archivo
 * @returns {Promise<boolean>} - true si está en caché
 */
export const verificarCacheDocumento = async (rutaArchivo) => {
  return await proxyValidador.estaEnCache(rutaArchivo);
};

/**
 * Limpia la caché de validación
 */
export const limpiarCacheValidacion = () => {
  proxyValidador.limpiarCache();
};

/**
 * Obtiene información de salud del sistema
 * @returns {Object} - Información de salud
 */
export const obtenerSaludValidacion = () => {
  return proxyValidador.obtenerSalud();
};