import { Documento } from "./documento.js";
import { DocumentoReal } from "./documentoReal.js";
import { UtilidadesOCR, ResultadoValidacion } from "./ocrUtils.js";
import { ErrorDocumento } from "../errores/erroresDocumento.js";
import NodeCache from 'node-cache';

/**
 * Proxy con caché para validación de documentos
 */
export class ProxyDocumento extends Documento {
  #cache;

  constructor() {
    super();
    
    // Referencia al objeto real
    this.documentoReal = new DocumentoReal();
    
    // Configuración de la caché: 3 min TTL, max 1000 archivos
    const configCache = {
      stdTTL: 180,
      maxKeys: 1000,
      checkperiod: 60,
      useClones: false,
      deleteOnExpire: true,
      enableLegacyCallbacks: false
    };

    this.#cache = new NodeCache(configCache);
  }

  // Valida con caché para evitar reprocesar archivos
  async validarDocumento(rutaArchivo, idTipoDocumento, opcionesValidacion = {}) {
    try {
      // Calcula hash único del archivo para usar como clave de caché
      const hashArchivo = await UtilidadesOCR.calcularHashDeArchivo(rutaArchivo);
      
      // Revisa si ya tenemos el resultado en caché
      const resultadoCacheado = this.#obtenerResultadoDeCache(hashArchivo);
      if (resultadoCacheado) return resultadoCacheado;
      
      // Si no está en caché, pide al objeto real que valide
      const resultadoValidacion = await this.documentoReal.validarDocumento(rutaArchivo, idTipoDocumento, opcionesValidacion);
      
      // Guarda en caché solo los resultados que deben cachearse
      if (resultadoValidacion.debeSerCacheado()) {
        this.#guardarResultadoEnCache(hashArchivo, resultadoValidacion);
      }
      
      return resultadoValidacion;
    } catch (error) {
      if (error.errorControlado) throw error;
      throw new ErrorDocumento(`Error al validar el documento: ${error.message}`);
    }
  }

  // Métodos para manejar la caché
  async verificarArchivoEnCache(rutaArchivo) {
    try {
      const hashArchivo = await UtilidadesOCR.calcularHashDeArchivo(rutaArchivo);
      return this.#cache.has(hashArchivo);
    } catch {
      return false;
    }
  }

  async obtenerResultadoCacheadoPorArchivo(rutaArchivo) {
    try {
      const hashArchivo = await UtilidadesOCR.calcularHashDeArchivo(rutaArchivo);
      return this.#obtenerResultadoDeCache(hashArchivo);
    } catch {
      return null;
    }
  }

  // Limpia toda la caché
  limpiarTodaLaCache() {
    this.#cache.flushAll();
  }

  // Elimina un archivo específico de la caché
  async eliminarArchivoDeCache(rutaArchivo) {
    try {
      const hashArchivo = await UtilidadesOCR.calcularHashDeArchivo(rutaArchivo);
      return this.#cache.del(hashArchivo) > 0;
    } catch {
      return false;
    }
  }

  // Cierra la caché liberando recursos
  cerrar() {
    this.#cache.close();
  }

  // Métodos privados para manejo interno de caché
  #obtenerResultadoDeCache(hashArchivo) {
    if (!hashArchivo || typeof hashArchivo !== 'string') return null;

    const resultado = this.#cache.get(hashArchivo);
    if (resultado) return this.#deserializarResultadoValidacion(resultado);
    
    return null;
  }

  // Guarda resultado en caché con su tiempo de vida específico
  #guardarResultadoEnCache(hashArchivo, resultadoValidacion) {
    if (!hashArchivo || typeof hashArchivo !== 'string') return false;
    if (!(resultadoValidacion instanceof ResultadoValidacion)) return false;
    if (!resultadoValidacion.debeSerCacheado()) return false;

    resultadoValidacion.asignarHash(hashArchivo);
    const tiempoVida = resultadoValidacion.obtenerTTL();
    
    if (tiempoVida <= 0) return false;

    const resultadoSerializado = resultadoValidacion.aObjetoPlano();
    return this.#cache.set(hashArchivo, resultadoSerializado, tiempoVida);
  }

  // Reconvierte el objeto plano guardado en caché a ResultadoValidacion
  #deserializarResultadoValidacion(datos) {
    const resultado = new ResultadoValidacion(
      datos.esValido,
      datos.porcentaje,
      datos.tipoValidacion,
      datos.detalles
    );
    
    resultado.timestamp = new Date(datos.timestamp);
    resultado.hash = datos.hash;
    
    return resultado;
  }
}