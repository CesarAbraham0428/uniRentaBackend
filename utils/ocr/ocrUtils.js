import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import crypto from "crypto";
import { ErrorOCR, ErrorValidacionDocumento } from "../errores/erroresDocumento.js";

/**
 * Utilidades para OCR, validación y hash
 */
export class OCRUtils {
  // Extrae texto usando OCR.Space
  static async extraerTexto(rutaArchivo, config = {}) {
    const configuracion = {
      intentosMaximos: config.intentosMaximos || 3,
      delayInicial: config.delayInicial || 1000,
      factorMultiplicador: config.factorMultiplicador || 2,
      timeout: config.timeout || 30000,
      ...config
    };
    
    await OCRUtils.#validarExistenciaArchivo(rutaArchivo);
    
    let ultimoError;
    
    for (let intento = 1; intento <= configuracion.intentosMaximos; intento++) {
      let datosFormulario, archivoStream;
      
      try {
        const resultado = OCRUtils.#crearFormulario(rutaArchivo);
        datosFormulario = resultado.datosFormulario;
        archivoStream = resultado.archivoStream;
        
        const respuesta = await OCRUtils.#enviarSolicitudOCR(datosFormulario, configuracion);
        OCRUtils.#validarRespuestaOCR(respuesta.data);
        
        const textoExtraido = respuesta.data.ParsedResults[0].ParsedText;
        OCRUtils.#validarTextoExtraido(textoExtraido);
        
        return textoExtraido;
      } catch (error) {
        ultimoError = error;
        
        if (error instanceof ErrorOCR && !OCRUtils.#esErrorRecuperable(error)) {
          throw error;
        }
        
        if (intento === configuracion.intentosMaximos) break;
        
        const delay = configuracion.delayInicial * 
          Math.pow(configuracion.factorMultiplicador, intento - 1);
        
        await OCRUtils.#esperar(delay);
      } finally {
        if (archivoStream?.destroy) archivoStream.destroy();
      }
    }
    
    throw OCRUtils.#procesarErrorFinal(ultimoError, configuracion);
  }

  // Calcula hash SHA256
  static async calcularHash(rutaArchivo, opciones = {}) {
    const { chunkSize = 64 * 1024 } = opciones;
    await OCRUtils.#validarArchivo(rutaArchivo);
    return await OCRUtils.#calcularHashAsync(rutaArchivo, chunkSize);
  }

  // Extrae texto y calcula el hash
  static async extraerTextoYHash(rutaArchivo, config = {}) {
    const [texto, hash] = await Promise.all([
      OCRUtils.extraerTexto(rutaArchivo, config),
      OCRUtils.calcularHash(rutaArchivo, config)
    ]);
    
    return { texto, hash };
  }

  // Valida campos según tipo de documento
  static async validarCampos(textoExtraido, tipoId, opcionesValidacion = {}) {
    const configuracion = {
      umbralSimilitudNombre: 0.9,
      umbralInvalido: 40,
      umbralParcial: 70,
      ...opcionesValidacion.config
    };
    
    const textoMayus = textoExtraido.toUpperCase();
    const tipoDocumento = await OCRUtils.#obtenerTipoDocumentoPorID(tipoId);

    if (!tipoDocumento) {
      throw new ErrorValidacionDocumento(`Tipo de documento no válido: ${tipoId}`);
    }

    const camposFaltantes = tipoDocumento.campos_requeridos.filter(
      campo => !textoMayus.includes(campo.toUpperCase())
    );

    const total = tipoDocumento.campos_requeridos.length;
    const faltan = camposFaltantes.length;
    const porcentaje = total > 0 ? ((total - faltan) / total) * 100 : 100;

    // Documento inválido
    if (porcentaje < configuracion.umbralInvalido) {
      return OCRUtils.crearResultadoInvalido(porcentaje, camposFaltantes, total);
    }

    // Verificar nombre para tipo 1
    if (Number(tipoId) === 1 && opcionesValidacion.nombreFormulario) {
      const similitud = OCRUtils.calcularSimilitudNombre(
        textoExtraido, 
        opcionesValidacion.nombreFormulario
      );

      if (similitud < configuracion.umbralSimilitudNombre) {
        return OCRUtils.crearResultadoNombreNoCoincide(
          porcentaje, 
          similitud, 
          opcionesValidacion.nombreFormulario, 
          total, 
          camposFaltantes
        );
      }
    }

    // Documento parcial
    if (porcentaje >= configuracion.umbralInvalido && porcentaje < configuracion.umbralParcial) {
      return OCRUtils.crearResultadoParcial(porcentaje, camposFaltantes, total);
    }

    // Documento válido
    return OCRUtils.crearResultadoValido(porcentaje, total);
  }

  // Creadores de resultados
  static crearResultadoInvalido(porcentaje, camposFaltantes, camposTotales) {
    return new ResultadoValidacion(false, porcentaje, 'DOCUMENTO_INVALIDO', {
      camposFaltantes,
      camposTotales,
      camposPresentes: camposTotales - camposFaltantes.length
    });
  }

  static crearResultadoParcial(porcentaje, camposFaltantes, camposTotales) {
    return new ResultadoValidacion(false, porcentaje, 'FALTAN_CAMPOS_AL_DOCUMENTO', {
      camposFaltantes,
      camposTotales,
      camposPresentes: camposTotales - camposFaltantes.length
    });
  }

  static crearResultadoValido(porcentaje, camposTotales) {
    return new ResultadoValidacion(true, porcentaje, 'VALIDO', {
      camposFaltantes: [],
      camposTotales,
      camposPresentes: camposTotales
    });
  }

  static crearResultadoNombreNoCoincide(porcentaje, similitud, nombreFormulario, camposTotales, camposFaltantes = []) {
    return new ResultadoValidacion(false, porcentaje, 'NOMBRE_NO_COINCIDE', {
      camposFaltantes,
      camposTotales,
      camposPresentes: camposTotales - camposFaltantes.length,
      similitudNombre: { similitud, nombreFormulario, umbral: 0.9 }
    });
  }

  // Calcula similitud entre nombres
  static calcularSimilitudNombre(textoDocumento, nombreFormulario) {
    const textoNormalizado = OCRUtils.normalizarTexto(textoDocumento);
    const nombreNormalizado = OCRUtils.normalizarTexto(nombreFormulario);

    if (!textoNormalizado || !nombreNormalizado) return 0;

    const tokensFormulario = nombreNormalizado.split(" ").filter(Boolean);
    const tokensDocumento = textoNormalizado.split(" ").filter(Boolean);

    if (tokensFormulario.length === 0 || tokensDocumento.length === 0) return 0;

    const caracteresTotales = tokensFormulario.reduce((acum, token) => acum + token.length, 0);
    let coincidenciaAcumulada = 0;

    for (const tokenFormulario of tokensFormulario) {
      let similitudMaxima = 0;

      for (const tokenDocumento of tokensDocumento) {
        const similitudActual = OCRUtils.#similitudToken(tokenFormulario, tokenDocumento);
        if (similitudActual > similitudMaxima) similitudMaxima = similitudActual;
        if (similitudMaxima === 1) break;
      }

      coincidenciaAcumulada += similitudMaxima * tokenFormulario.length;
    }

    return coincidenciaAcumulada / caracteresTotales;
  }

  static normalizarTexto(texto) {
    if (!texto) return "";
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Métodos privados
  static async #validarExistenciaArchivo(rutaArchivo) {
    try {
      await fs.promises.access(rutaArchivo, fs.constants.R_OK);
    } catch {
      throw new ErrorOCR(
        `El archivo no existe o no es accesible: ${rutaArchivo}`,
        'ARCHIVO_NO_ENCONTRADO',
        { rutaArchivo }
      );
    }
  }

  static #esErrorRecuperable(error) {
    if (!(error instanceof ErrorOCR)) return true;
    const tiposRecuperables = ['TIMEOUT', 'CONEXION', 'RESPUESTA_API'];
    return tiposRecuperables.includes(error.tipo);
  }

  static #esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static #crearFormulario(rutaArchivo) {
    const datosFormulario = new FormData();
    const archivoStream = fs.createReadStream(rutaArchivo, { highWaterMark: 64 * 1024 });
    
    datosFormulario.append("file", archivoStream);
    datosFormulario.append("language", "spa");
    datosFormulario.append("isOverlayRequired", "false");
    
    return { datosFormulario, archivoStream };
  }

  static async #enviarSolicitudOCR(datosFormulario, config) {
    const apiKey = process.env.OCR;
    if (!apiKey) {
      throw new ErrorOCR(
        "Clave API de OCR no configurada en las variables de entorno",
        'CONFIGURACION'
      );
    }
    
    return await axios.post(
      "https://api.ocr.space/parse/image",
      datosFormulario,
      {
        headers: {
          ...datosFormulario.getHeaders(),
          apikey: apiKey,
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: config.timeout,
        validateStatus: (status) => status < 500,
      }
    );
  }

  static #validarRespuestaOCR(data) {
    if (data.IsErroredOnProcessing) {
      throw new ErrorOCR(
        "Error al procesar el documento con OCR.Space",
        'PROCESAMIENTO_API',
        { resultado: data }
      );
    }
    
    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      throw new ErrorOCR("No se pudo extraer texto del documento", 'SIN_RESULTADOS');
    }
  }

  static #validarTextoExtraido(texto) {
    if (!texto || texto.trim() === "") {
      throw new ErrorOCR("El documento no contiene texto legible", 'SIN_TEXTO');
    }
  }

  static #procesarErrorFinal(error, config) {
    if (error instanceof ErrorOCR) return error;
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return new ErrorOCR(
        `Tiempo de espera agotado después de ${config.intentosMaximos} intentos`,
        'TIMEOUT',
        { code: error.code, intentos: config.intentosMaximos }
      );
    }
    
    if (error.response) {
      return new ErrorOCR(
        `Error en OCR.Space: ${error.response.data?.ErrorMessage || error.message}`,
        'RESPUESTA_API',
        { status: error.response.status, data: error.response.data }
      );
    }
    
    return new ErrorOCR(
      error.message || "Error al conectar con OCR.Space",
      'CONEXION',
      { code: error.code }
    );
  }

  static async #validarArchivo(rutaArchivo) {
    try {
      await fs.promises.access(rutaArchivo, fs.constants.R_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Archivo no encontrado: ${rutaArchivo}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Sin permisos para leer el archivo: ${rutaArchivo}`);
      }
      throw new Error(`Error accediendo al archivo: ${error.message}`);
    }
  }

  static async #calcularHashAsync(rutaArchivo, chunkSize) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(rutaArchivo, { highWaterMark: chunkSize });

      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', (error) => {
        reject(new Error(`Error leyendo archivo: ${error.message}`));
      });
    });
  }

  static async #obtenerTipoDocumentoPorID(id) {
    const { obtenerTipoDocumentoPorID } = await import("../../services/documentoService.js");
    return await obtenerTipoDocumentoPorID(id);
  }

  // Algoritmo de Levenshtein para similitud entre tokens
  static #similitudToken(tokenA, tokenB) {
    const longitudA = tokenA.length;
    const longitudB = tokenB.length;

    if (longitudA === 0 && longitudB === 0) return 1;
    if (longitudA === 0 || longitudB === 0) return 0;

    const matriz = Array.from({ length: longitudA + 1 }, () => 
      new Array(longitudB + 1).fill(0)
    );

    for (let i = 0; i <= longitudA; i++) matriz[i][0] = i;
    for (let j = 0; j <= longitudB; j++) matriz[0][j] = j;

    for (let i = 1; i <= longitudA; i++) {
      for (let j = 1; j <= longitudB; j++) {
        const costo = tokenA[i - 1] === tokenB[j - 1] ? 0 : 1;
        matriz[i][j] = Math.min(
          matriz[i - 1][j] + 1,
          matriz[i][j - 1] + 1,
          matriz[i - 1][j - 1] + costo
        );
      }
    }

    const distancia = matriz[longitudA][longitudB];
    const longitudMaxima = Math.max(longitudA, longitudB);

    return 1 - distancia / longitudMaxima;
  }
}

/**
 * Resultado de validación de documento
 */
export class ResultadoValidacion {
  constructor(esValido, porcentaje, tipoValidacion, detalles = {}) {
    this.esValido = esValido;
    this.porcentaje = Math.round(porcentaje * 100) / 100;
    this.tipoValidacion = tipoValidacion;
    this.detalles = detalles;
    this.timestamp = new Date();
    this.hash = null;
  }

  asignarHash(hash) {
    this.hash = hash;
    return this;
  }

  toPlainObject() {
    return {
      esValido: this.esValido,
      porcentaje: this.porcentaje,
      tipoValidacion: this.tipoValidacion,
      detalles: this.detalles,
      timestamp: this.timestamp,
      hash: this.hash
    };
  }

  debeSerCacheado() {
    return this.tipoValidacion === 'DOCUMENTO_INVALIDO' || 
           this.tipoValidacion === 'FALTAN_CAMPOS_AL_DOCUMENTO' || 
           this.tipoValidacion === 'NOMBRE_NO_COINCIDE';
  }

  obtenerTTL() {
    switch (this.tipoValidacion) {
      case 'DOCUMENTO_INVALIDO':
      case 'FALTAN_CAMPOS_AL_DOCUMENTO':
      case 'NOMBRE_NO_COINCIDE':
        return 180;
      default:
        return 0;
    }
  }

  generarMensaje() {
    const { camposFaltantes, camposTotales } = this.detalles;
    
    switch (this.tipoValidacion) {
      case 'DOCUMENTO_INVALIDO':
        return `DOCUMENTO_INVALIDO: Faltan ${camposFaltantes.length} campo(s): ${camposFaltantes.join(', ')}`;
      
      case 'FALTAN_CAMPOS_AL_DOCUMENTO':
        return `FALTAN_CAMPOS_AL_DOCUMENTO: Faltan ${camposFaltantes.length} campo(s): ${camposFaltantes.join(', ')}`;
      
      case 'NOMBRE_NO_COINCIDE':
        const { similitud } = this.detalles.similitudNombre;
        return `NOMBRE_NO_COINCIDE: El nombre del documento no coincide (similitud ${Math.round(similitud * 100)}%)`;
      
      case 'VALIDO':
        return `Documento válido (${this.porcentaje}% de campos reconocidos)`;
      
      default:
        return `Resultado de validación: ${this.tipoValidacion}`;
    }
  }
}