import { Documento } from "./documento.js";
import { DocumentoReal } from "./documentoReal.js";
import { OCRUtils, ResultadoValidacion } from "./ocrUtils.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";
import NodeCache from 'node-cache';

/**
 * Proxy con caché para validación de documentos
 */
export class ProxyDocumento extends Documento {
  #cache;
  #ttlInvalido;
  #ttlParcial;

  constructor(config = {}) {
    super();
    
    this.documentoReal = config.documentoReal || new DocumentoReal(config.configReal || {});
    
    const configCache = {
      stdTTL: config.configCache?.ttlInvalido || 180,
      checkperiod: config.configCache?.checkPeriod || 60,
      useClones: false,
      deleteOnExpire: true,
      enableLegacyCallbacks: false,
      maxKeys: config.configCache?.maxKeys || 1000
    };

    this.#cache = new NodeCache(configCache);
    this.#ttlInvalido = config.configCache?.ttlInvalido || 180;
    this.#ttlParcial = config.configCache?.ttlParcial || 180;
  }

  async validarDocumento(rutaArchivo, tipoId, opcionesValidacion = {}) {
    try {
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      
      const resultadoCache = this.#obtenerDeCache(hash);
      if (resultadoCache) return resultadoCache;
      
      const resultado = await this.documentoReal.validarDocumento(rutaArchivo, tipoId, opcionesValidacion);
      
      if (resultado.debeSerCacheado()) {
        this.#guardarEnCache(hash, resultado);
      }
      
      return resultado;
    } catch (error) {
      if (error.errorControlado) throw error;
      throw new ErrorDocumento(`Error al validar el documento: ${error.message}`);
    }
  }

  async estaEnCache(rutaArchivo) {
    try {
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      return this.#cache.has(hash);
    } catch {
      return false;
    }
  }

  async obtenerResultadoCacheado(rutaArchivo) {
    try {
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      return this.#obtenerDeCache(hash);
    } catch {
      return null;
    }
  }

  limpiarCache() {
    this.#cache.flushAll();
  }

  async eliminarDeCache(rutaArchivo) {
    try {
      const hash = await OCRUtils.calcularHash(rutaArchivo);
      return this.#cache.del(hash) > 0;
    } catch {
      return false;
    }
  }

  actualizarConfiguracion(config) {
    if (config.real) {
      this.documentoReal.actualizarConfiguracion(config.real);
    }
    
    if (config.cache) {
      this.#configurarTTL(config.cache);
    }
  }

  exportarConfiguracion() {
    return {
      real: this.documentoReal.exportarConfiguracion(),
      cache: this.#obtenerConfiguracionCache()
    };
  }

  cerrar() {
    this.#cache.close();
  }

  // Métodos privados
  #obtenerDeCache(hash) {
    if (!hash || typeof hash !== 'string') return null;

    const resultado = this.#cache.get(hash);
    if (resultado) return this.#deserializarResultado(resultado);
    
    return null;
  }

  #guardarEnCache(hash, resultado) {
    if (!hash || typeof hash !== 'string') return false;
    if (!(resultado instanceof ResultadoValidacion)) return false;
    if (!resultado.debeSerCacheado()) return false;

    resultado.asignarHash(hash);
    const ttl = resultado.obtenerTTL();
    
    if (ttl <= 0) return false;

    const resultadoSerializado = resultado.toPlainObject();
    return this.#cache.set(hash, resultadoSerializado, ttl);
  }

  #deserializarResultado(data) {
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

  #configurarTTL(ttls) {
    if (ttls.invalido && typeof ttls.invalido === 'number') {
      this.#ttlInvalido = ttls.invalido;
    }
    
    if (ttls.parcial && typeof ttls.parcial === 'number') {
      this.#ttlParcial = ttls.parcial;
    }
  }

  #obtenerConfiguracionCache() {
    return {
      ttlInvalido: this.#ttlInvalido,
      ttlParcial: this.#ttlParcial,
      maxKeys: this.#cache.options.maxKeys
    };
  }
}