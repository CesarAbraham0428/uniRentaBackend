import { Documento } from "./documento.js";
import { DocumentoReal } from "./documentoReal.js";
import { ManejadorCache } from "./manejadorCache.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";

/**
 * Proxy optimizado para validación de documentos con caché integrada
 * Implementa el patrón Proxy clásico con composición
 */
export class ProxyDocumento extends Documento {
  /**
   * @param {Object} config - Configuración del proxy
   * @param {DocumentoReal} config.documentoReal - Instancia del documento real (opcional)
   * @param {ManejadorCache} config.manejadorCache - Instancia del manejador de caché (opcional)
   * @param {Object} config.configReal - Configuración para el objeto real
   * @param {Object} config.configCache - Configuración para caché
   */
  constructor(config = {}) {
    super();
    
    // Composición: referencia al objeto real
    this.documentoReal = config.documentoReal || 
      new DocumentoReal(config.configReal || {});
    
    // Componente de caché
    this.manejadorCache = config.manejadorCache || 
      new ManejadorCache(config.configCache || {});
  }

  /**
   * Valida un documento completo con caché
   * @param {string} rutaArchivo - Ruta del archivo a validar
   * @param {number} tipoId - ID del tipo de documento
   * @param {Object} opcionesValidacion - Opciones adicionales de validación
   * @returns {Promise<ResultadoValidacion>} - Resultado de la validación
   */
  async validarDocumento(rutaArchivo, tipoId, opcionesValidacion = {}) {
    try {
      // 1. Calcular hash del archivo
      const hash = await this.documentoReal.validadorOCR.calcularHashArchivo(rutaArchivo);
      
      // 2. Verificar caché - RETORNO RÁPIDO SI ESTÁ EN CACHE
      const resultadoCache = this.manejadorCache.obtener(hash);
      if (resultadoCache) {
        return resultadoCache;
      }
      
      // 3. Delegar al objeto real (solo si no está en cache)
      const resultado = await this.documentoReal.validarDocumento(rutaArchivo, tipoId, opcionesValidacion);
      
      // 4. Asignar hash al resultado
      resultado.asignarHash(hash);
      
      // 5. Guardar en caché si aplica
      if (resultado.debeSerCacheado()) {
        this.manejadorCache.guardar(hash, resultado);
      }
      
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
   * Verifica si un archivo ya está en caché
   * @param {string} rutaArchivo - Ruta del archivo
   * @returns {Promise<boolean>}
   */
  async estaEnCache(rutaArchivo) {
    try {
      const hash = await this.documentoReal.validadorOCR.calcularHashArchivo(rutaArchivo);
      return this.manejadorCache.existe(hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtiene un resultado cacheado sin procesar
   * @param {string} rutaArchivo - Ruta del archivo
   * @returns {Promise<ResultadoValidacion|null>}
   */
  async obtenerResultadoCacheado(rutaArchivo) {
    try {
      const hash = await this.documentoReal.validadorOCR.calcularHashArchivo(rutaArchivo);
      return this.manejadorCache.obtener(hash);
    } catch (error) {
      return null;
    }
  }

  /**
   * Limpia la caché completamente
   */
  limpiarCache() {
    this.manejadorCache.limpiarTodo();
  }

  /**
   * Elimina un resultado específico de la caché
   * @param {string} rutaArchivo - Ruta del archivo a eliminar
   * @returns {Promise<boolean>}
   */
  async eliminarDeCache(rutaArchivo) {
    try {
      const hash = await this.documentoReal.validadorOCR.calcularHashArchivo(rutaArchivo);
      return this.manejadorCache.eliminar(hash);
    } catch (error) {
      return false;
    }
  }

  /**
   * Actualiza la configuración de los componentes
   * @param {Object} config - Nueva configuración
   */
  actualizarConfiguracion(config) {
    if (config.real) {
      this.documentoReal.actualizarConfiguracion(config.real);
    }
    
    if (config.cache) {
      this.manejadorCache.configurarTTL(config.cache);
    }
  }

  /**
   * Exporta configuración actual
   * @returns {Object}
   */
  exportarConfiguracion() {
    return {
      real: this.documentoReal.exportarConfiguracion(),
      cache: this.manejadorCache.obtenerConfiguracion()
    };
  }

  /**
   * Cierra y libera recursos
   */
  cerrar() {
    this.manejadorCache.cerrar();
  }
}
