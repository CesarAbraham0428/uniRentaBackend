import NodeCache from 'node-cache';
import { ResultadoValidacion } from './resultadoValidacion.js';

/**
 * Clase que gestiona el caché en memoria para resultados de validación de documentos
 * con TTL diferenciado según el tipo de resultado
 */
export class ManejadorCache {
  /**
   * @param {Object} config - Configuración del manejador de caché
   * @param {number} config.ttlInvalido - TTL para documentos inválidos en segundos (default: 300)
   * @param {number} config.ttlParcial - TTL para documentos parciales en segundos (default: 180)
   * @param {number} config.checkPeriod - Período de limpieza de caché expirada en segundos (default: 60)
   * @param {boolean} config.useClones - Si debe usar clonación profunda (default: true)
   * @param {boolean} config.enableStats - Si debe habilitar estadísticas (default: true)
   */
  constructor(config = {}) {
    this.ttlInvalido = config.ttlInvalido || 300; // 5 minutos
    this.ttlParcial = config.ttlParcial || 180;   // 3 minutos
    this.checkPeriod = config.checkPeriod || 60;  // 1 minuto
    
    // Configuración de NodeCache
    const cacheConfig = {
      stdTTL: this.ttlInvalido, // TTL por defecto
      checkperiod: this.checkPeriod,
      useClones: config.useClones !== false, // true por defecto
      deleteOnExpire: true,
      enableLegacyCallbacks: false,
      maxKeys: config.maxKeys || 1000 // Límite de entradas
    };

    this.cache = new NodeCache(cacheConfig);
    this.enableStats = config.enableStats !== false;
    
    // Estadísticas
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    // Configurar eventos de caché
    this._configurarEventos();
  }

  /**
   * Configura los eventos del caché para estadísticas
   * @private
   */
  _configurarEventos() {
    if (!this.enableStats) return;

    this.cache.on('set', (key, value) => {
      this.stats.sets++;
    });

    this.cache.on('del', (key, value) => {
      this.stats.deletes++;
    });

    this.cache.on('expired', (key, value) => {
      this.stats.evictions++;
    });
  }

  /**
   * Obtiene un resultado del caché usando el hash del archivo
   * @param {string} hash - Hash SHA256 del archivo
   * @returns {ResultadoValidacion|null} - Resultado cacheado o null si no existe
   */
  obtener(hash) {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Hash inválido para consulta de caché');
    }

    const resultado = this.cache.get(hash);
    
    if (resultado) {
      this.stats.hits++;
      // Restaurar la instancia de ResultadoValidacion
      return this._deserializarResultado(resultado);
    }
    
    this.stats.misses++;
    return null;
  }

  /**
   * Guarda un resultado en el caché si aplica según las políticas
   * @param {string} hash - Hash SHA256 del archivo
   * @param {ResultadoValidacion} resultado - Resultado de validación
   * @returns {boolean} - true si se guardó, false si no aplicaba
   */
  guardar(hash, resultado) {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Hash inválido para guardar en caché');
    }

    if (!(resultado instanceof ResultadoValidacion)) {
      throw new Error('Se requiere una instancia de ResultadoValidacion');
    }

    // Verificar si debe ser cacheado según políticas
    if (!resultado.debeSerCacheado()) {
      return false;
    }

    // Asignar el hash al resultado
    resultado.asignarHash(hash);

    // Obtener TTL según tipo de validación
    const ttl = resultado.obtenerTTL();
    
    if (ttl <= 0) {
      return false; // No cachear si TTL es 0
    }

    // Serializar y guardar
    const resultadoSerializado = this._serializarResultado(resultado);
    const exito = this.cache.set(hash, resultadoSerializado, ttl);
    
    if (exito && this.enableStats) {
      this.stats.sets++;
    }

    return exito;
  }

  /**
   * Elimina una entrada del caché
   * @param {string} hash - Hash SHA256 del archivo
   * @returns {boolean} - true si se eliminó, false si no existía
   */
  eliminar(hash) {
    if (!hash || typeof hash !== 'string') {
      throw new Error('Hash inválido para eliminar de caché');
    }

    const eliminado = this.cache.del(hash);
    
    if (eliminado > 0 && this.enableStats) {
      this.stats.deletes++;
    }

    return eliminado > 0;
  }

  /**
   * Limpia todo el caché
   */
  limpiarTodo() {
    this.cache.flushAll();
    
    if (this.enableStats) {
      this.stats.deletes += this.cache.getStats().keys;
    }
  }

  /**
   * Verifica si un hash existe en el caché
   * @param {string} hash - Hash SHA256 del archivo
   * @returns {boolean}
   */
  existe(hash) {
    if (!hash || typeof hash !== 'string') {
      return false;
    }

    return this.cache.has(hash);
  }

  /**
   * Obtiene el TTL restante de una entrada
   * @param {string} hash - Hash SHA256 del archivo
   * @returns {number|null} - TTL restante en segundos o null si no existe
   */
  obtenerTTLRestante(hash) {
    if (!hash || typeof hash !== 'string') {
      return null;
    }

    return this.cache.getTtl(hash);
  }

  /**
   * Obtiene estadísticas del caché
   * @returns {Object}
   */
  obtenerEstadisticas() {
    const cacheStats = this.cache.getStats();
    
    return {
      ...cacheStats,
      customStats: this.enableStats ? { ...this.stats } : null,
      hitRate: this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  /**
   * Serializa un ResultadoValidacion para almacenamiento
   * @param {ResultadoValidacion} resultado
   * @returns {Object}
   * @private
   */
  _serializarResultado(resultado) {
    return resultado.toPlainObject();
  }

  /**
   * Deserializa un resultado del caché a ResultadoValidacion
   * @param {Object} data - Datos serializados
   * @returns {ResultadoValidacion}
   * @private
   */
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

  /**
   * Obtiene todas las claves del caché
   * @returns {string[]}
   */
  obtenerClaves() {
    return this.cache.keys();
  }

  /**
   * Obtiene el tamaño actual del caché
   * @returns {number}
   */
  obtenerTamano() {
    return this.cache.getStats().keys;
  }

  /**
   * Cierra el caché y libera recursos
   */
  cerrar() {
    this.cache.close();
  }

  /**
   * Configura dinámicamente los TTL
   * @param {Object} ttls - Nueva configuración de TTL
   * @param {number} ttls.invalido - TTL para inválidos
   * @param {number} ttls.parcial - TTL para parciales
   */
  configurarTTL(ttls) {
    if (ttls.invalido && typeof ttls.invalido === 'number') {
      this.ttlInvalido = ttls.invalido;
    }
    
    if (ttls.parcial && typeof ttls.parcial === 'number') {
      this.ttlParcial = ttls.parcial;
    }
  }

  /**
   * Obtiene la configuración actual
   * @returns {Object}
   */
  obtenerConfiguracion() {
    return {
      ttlInvalido: this.ttlInvalido,
      ttlParcial: this.ttlParcial,
      checkPeriod: this.checkPeriod,
      enableStats: this.enableStats,
      maxKeys: this.cache.options.maxKeys
    };
  }
}
