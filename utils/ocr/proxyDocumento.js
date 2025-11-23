import { Documento } from "./documento.js";
import { DocumentoReal } from "./documentoReal.js";
import { OCRUtils, ResultadoValidacion } from "./ocrUtils.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";
import NodeCache from 'node-cache';

/**
 * Proxy optimizado para validación de documentos con caché integrada
 * Implementa el patrón Proxy clásico con caché incorporada
 */
export class ProxyDocumento extends Documento {
  /**
   * @param {Object} config - Configuración del proxy
   * @param {DocumentoReal} config.documentoReal - Instancia del documento real (opcional)
   * @param {Object} config.configReal - Configuración para el objeto real
   * @param {Object} config.configCache - Configuración para caché
   */
  constructor(config = {}) {
    super();
    
    // Composición: referencia al objeto real
    this.documentoReal = config.documentoReal || 
      new DocumentoReal(config.configReal || {});
    
    // Configuración de caché integrada
    const cacheConfig = {
      stdTTL: config.configCache?.ttlInvalido || 180,
      checkperiod: config.configCache?.checkPeriod || 60,
      useClones: false,
      deleteOnExpire: true,
      enableLegacyCallbacks: false,
      maxKeys: config.configCache?.maxKeys || 1000
    };

    this.cache = new NodeCache(cacheConfig);
    this.ttlInvalido = config.configCache?.ttlInvalido || 180;
    this.ttlParcial = config.configCache?.ttlParcial || 180;
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
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      
      // 2. Verificar caché - RETORNO RÁPIDO SI ESTÁ EN CACHE
      const resultadoCache = this._obtenerDeCache(hash);
      if (resultadoCache) {
        return resultadoCache;
      }
      
      // 3. Delegar al objeto real (solo si no está en cache)
      const resultado = await this.documentoReal.validarDocumento(rutaArchivo, tipoId, opcionesValidacion);
      
      // 4. Guardar en caché si aplica
      if (resultado.debeSerCacheado()) {
        this._guardarEnCache(hash, resultado);
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
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      return this.cache.has(hash);
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
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      return this._obtenerDeCache(hash);
    } catch (error) {
      return null;
    }
  }

  /**
   * Limpia la caché completamente
   */
  limpiarCache() {
    this.cache.flushAll();
  }

  /**
   * Elimina un resultado específico de la caché
   * @param {string} rutaArchivo - Ruta del archivo a eliminar
   * @returns {Promise<boolean>}
   */
  async eliminarDeCache(rutaArchivo) {
    try {
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      const eliminado = this.cache.del(hash);
      return eliminado > 0;
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
      this._configurarTTL(config.cache);
    }
  }

  /**
   * Exporta configuración actual
   * @returns {Object}
   */
  exportarConfiguracion() {
    return {
      real: this.documentoReal.exportarConfiguracion(),
      cache: this._obtenerConfiguracionCache()
    };
  }

  /**
   * Cierra y libera recursos
   */
  cerrar() {
    this.cache.close();
  }

  // Métodos privados de caché
  _obtenerDeCache(hash) {
    if (!hash || typeof hash !== 'string') {
      return null;
    }

    const resultado = this.cache.get(hash);
    
    if (resultado) {
      return this._deserializarResultado(resultado);
    }
    
    return null;
  }

  _guardarEnCache(hash, resultado) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }

    if (!(resultado instanceof ResultadoValidacion)) {
      return false;
    }

    if (!resultado.debeSerCacheado()) {
      return false;
    }

    resultado.asignarHash(hash);
    const ttl = resultado.obtenerTTL();
    
    if (ttl <= 0) {
      return false;
    }

    const resultadoSerializado = resultado.toPlainObject();
    return this.cache.set(hash, resultadoSerializado, ttl);
  }

  _deserializarResultado(data) {
    const resultado = new ResultadoValidacion(
      data.esValido,
      data.porcentaje,
      data.tipoValidacion,
      data.detalles
    );
    
    resultado.timestamp = new Date(data.timestamp);
    resultado.hash = data.hash;
    
    return resultado;
  }

  _configurarTTL(ttls) {
    if (ttls.invalido && typeof ttls.invalido === 'number') {
      this.ttlInvalido = ttls.invalido;
    }
    
    if (ttls.parcial && typeof ttls.parcial === 'number') {
      this.ttlParcial = ttls.parcial;
    }
  }

  _obtenerConfiguracionCache() {
    return {
      ttlInvalido: this.ttlInvalido,
      ttlParcial: this.ttlParcial,
      maxKeys: this.cache.options.maxKeys
    };
  }
}
