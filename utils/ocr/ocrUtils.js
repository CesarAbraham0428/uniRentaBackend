import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import crypto from "crypto";
import { ErrorOCR, ErrorValidacionDocumento } from "../errores/erroresDocumento.js";

/**
 * Utilidades para OCR, validación y hash de documentos
 */
export class UtilidadesOCR {
  // Extrae texto usando OCR.Space con reintentos automáticos
  static async extraerTextoDeDocumento(rutaArchivo, config = {}) {
    // Configuración por defecto: 3 intentos, 1 seg inicial, max 30 seg
    const configuracion = {
      intentosMaximos: 3,
      retrasoInicialMilisegundos: 1000,
      factorMultiplicadorReintento: 2,
      tiempoEsperaMilisegundos: 30000,
      ...config
    };
    
    // Verifica que el archivo exista antes de procesar
    await UtilidadesOCR.#validarExistenciaArchivo(rutaArchivo);
    
    let ultimoError;
    
    // Intenta extraer texto hasta 3 veces si falla
    for (let intento = 1; intento <= configuracion.intentosMaximos; intento++) {
      let datosFormulario, flujoArchivo;
      
      try {
        // Prepara el formulario para enviar a OCR.Space
        const resultado = UtilidadesOCR.#crearFormularioParaOCR(rutaArchivo);
        datosFormulario = resultado.datosFormulario;
        flujoArchivo = resultado.flujoArchivo;
        
        // Envía la solicitud a la API de OCR
        const respuesta = await UtilidadesOCR.#enviarSolicitudOCR(datosFormulario, configuracion);
        // Verifica que la respuesta sea válida
        UtilidadesOCR.#validarRespuestaOCR(respuesta.data);
        
        // Extrae el texto del resultado
        const textoExtraido = respuesta.data.ParsedResults[0].ParsedText;
        // Verifica que el texto no esté vacío
        UtilidadesOCR.#validarTextoExtraido(textoExtraido);
        
        return textoExtraido;
      } catch (error) {
        ultimoError = error;
        
        // Si el error no es recuperable, lanza la excepción
        if (error instanceof ErrorOCR && !UtilidadesOCR.#esErrorRecuperable(error)) {
          throw error;
        }
        
        // Si es el último intento, sale del bucle
        if (intento === configuracion.intentosMaximos) break;
        
        // Espera antes de reintentar (exponencial: 1s, 2s, 4s)
        const retraso = configuracion.retrasoInicialMilisegundos * 
          Math.pow(configuracion.factorMultiplicadorReintento, intento - 1);
        
        await UtilidadesOCR.#esperar(retraso);
      } finally {
        // Limpia el flujo del archivo para evitar fugas de memoria
        if (flujoArchivo?.destroy) flujoArchivo.destroy();
      }
    }
    
    // Si todos los intentos fallaron, lanza el último error
    throw UtilidadesOCR.#procesarErrorFinal(ultimoError, configuracion);
  }

  // Calcula hash SHA256 de archivo para identificarlo únicamente
  static async calcularHashDeArchivo(rutaArchivo, opciones = {}) {
    // Lee el archivo en fragmentos de 64KB para no usar mucha memoria
    const { tamanoFragmento = 64 * 1024 } = opciones;
    await UtilidadesOCR.#validarArchivo(rutaArchivo);
    return await UtilidadesOCR.#calcularHashAsincrono(rutaArchivo, tamanoFragmento);
  }

  // Extrae texto y calcula hash simultáneamente
  static async extraerTextoYHashDeArchivo(rutaArchivo, config = {}) {
    // Ejecuta ambas operaciones en paralelo para ahorrar tiempo
    const [texto, hash] = await Promise.all([
      UtilidadesOCR.extraerTextoDeDocumento(rutaArchivo, config),
      UtilidadesOCR.calcularHashDeArchivo(rutaArchivo, config)
    ]);
    
    return { texto, hash };
  }

  // Valida campos requeridos según tipo de documento
  static async validarCamposDeDocumento(textoExtraido, idTipoDocumento, opcionesValidacion = {}) {
    // Configuración de umbrales de validación
    const configuracion = {
      umbralSimilitudNombre: 0.9,  // 90% de similitud para nombres
      porcentajeMinimoInvalido: 40,  // Menos de 40% = inválido
      porcentajeMinimoParcial: 70    // 40-70% = parcial, más de 70% = válido
    };
    
    // Convierte todo a mayúsculas para comparación uniforme
    const textoEnMayusculas = textoExtraido.toUpperCase();
    // Obtiene la configuración del tipo de documento desde la BD
    const tipoDocumento = await UtilidadesOCR.#obtenerTipoDocumentoPorID(idTipoDocumento);

    if (!tipoDocumento) {
      throw new ErrorValidacionDocumento(`Tipo de documento no válido: ${idTipoDocumento}`);
    }

    // Busca campos requeridos que faltan en el texto
    const camposFaltantes = tipoDocumento.campos_requeridos.filter(
      campo => !textoEnMayusculas.includes(campo.toUpperCase())
    );

    // Calcula porcentaje de campos presentes
    const totalCampos = tipoDocumento.campos_requeridos.length;
    const camposQueFaltan = camposFaltantes.length;
    const porcentajeCompletado = totalCampos > 0 ? ((totalCampos - camposQueFaltan) / totalCampos) * 100 : 100;

    // Documento inválido si menos de 40% de campos presentes
    if (porcentajeCompletado < configuracion.porcentajeMinimoInvalido) {
      return UtilidadesOCR.crearResultadoInvalido(porcentajeCompletado, camposFaltantes, totalCampos);
    }

    // Para cédulas, verifica que el nombre coincida con el del formulario
    if (Number(idTipoDocumento) === 1 && opcionesValidacion.nombreFormulario) {
      const similitud = UtilidadesOCR.calcularSimilitudDeNombres(
        textoExtraido, 
        opcionesValidacion.nombreFormulario
      );

      // Si la similitud es menor a 90%, rechaza el documento
      if (similitud < configuracion.umbralSimilitudNombre) {
        return UtilidadesOCR.crearResultadoNombreNoCoincide(
          porcentajeCompletado, 
          similitud, 
          opcionesValidacion.nombreFormulario, 
          totalCampos, 
          camposFaltantes
        );
      }
    }

    // Documento parcial si tiene entre 40-70% de campos
    if (porcentajeCompletado >= configuracion.porcentajeMinimoInvalido && porcentajeCompletado < configuracion.porcentajeMinimoParcial) {
      return UtilidadesOCR.crearResultadoParcial(porcentajeCompletado, camposFaltantes, totalCampos);
    }

    // Documento válido si tiene más de 70% de campos
    return UtilidadesOCR.crearResultadoValido(porcentajeCompletado, totalCampos);
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

  // Calcula similitud entre nombres usando algoritmo de Levenshtein
  static calcularSimilitudDeNombres(textoDocumento, nombreFormulario) {
    // Normaliza ambos textos para comparación justa
    const textoNormalizado = UtilidadesOCR.normalizarTexto(textoDocumento);
    const nombreNormalizado = UtilidadesOCR.normalizarTexto(nombreFormulario);

    if (!textoNormalizado || !nombreNormalizado) return 0;

    // Divide en palabras para comparar token por token
    const tokensFormulario = nombreNormalizado.split(" ").filter(Boolean);
    const tokensDocumento = textoNormalizado.split(" ").filter(Boolean);

    if (tokensFormulario.length === 0 || tokensDocumento.length === 0) return 0;

    // Calcula peso por longitud de caracteres para dar más importancia a nombres largos
    const caracteresTotales = tokensFormulario.reduce((acum, token) => acum + token.length, 0);
    let coincidenciaAcumulada = 0;

    // Compara cada palabra del formulario con las del documento
    for (const tokenFormulario of tokensFormulario) {
      let similitudMaxima = 0;

      for (const tokenDocumento of tokensDocumento) {
        const similitudActual = UtilidadesOCR.#similitudEntreTokens(tokenFormulario, tokenDocumento);
        if (similitudActual > similitudMaxima) similitudMaxima = similitudActual;
        if (similitudMaxima === 1) break; // Coincidencia perfecta, no buscar más
      }

      // Acumula ponderando por la longitud del token
      coincidenciaAcumulada += similitudMaxima * tokenFormulario.length;
    }

    // Calcula la similitud final como la relación entre la coincidencia acumulada y el total de caracteres
    return coincidenciaAcumulada / caracteresTotales;
  }

  // Normaliza texto eliminando acentos y caracteres especiales
  static normalizarTexto(texto) {
    if (!texto) return "";
    // Separa acentos de letras
    return texto
      .normalize("NFD")
      // Elimina acentos
      .replace(/[\u0300-\u036f]/g, "")
      // Convierte a mayúsculas
      .toUpperCase()
      // Solo letras y espacios
      .replace(/[^A-Z\s]/g, " ")
      // Unifica espacios
      .replace(/\s+/g, " ")
      // Elimina espacios al inicio/final
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

  static #crearFormularioParaOCR(rutaArchivo) {
    const datosFormulario = new FormData();
    const flujoArchivo = fs.createReadStream(rutaArchivo, { highWaterMark: 64 * 1024 });
    
    datosFormulario.append("file", flujoArchivo);
    datosFormulario.append("language", "spa");
    datosFormulario.append("isOverlayRequired", "false");
    
    return { datosFormulario, flujoArchivo };
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
        timeout: config.tiempoEsperaMilisegundos,
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

  static async #calcularHashAsincrono(rutaArchivo, tamanoFragmento) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const flujoArchivo = fs.createReadStream(rutaArchivo, { highWaterMark: tamanoFragmento });

      flujoArchivo.on('data', (fragmento) => hash.update(fragmento));
      flujoArchivo.on('end', () => resolve(hash.digest('hex')));
      flujoArchivo.on('error', (error) => {
        reject(new Error(`Error leyendo archivo: ${error.message}`));
      });
    });
  }

  static async #obtenerTipoDocumentoPorID(id) {
    const { obtenerTipoDocumentoPorIdentificador } = await import("../../services/documentoService.js");
    return await obtenerTipoDocumentoPorIdentificador(id);
  }

  // Algoritmo de Levenshtein para similitud entre tokens
  static #similitudEntreTokens(tokenA, tokenB) {
    // Obtiene longitudes de ambos tokens
    const longitudA = tokenA.length;
    const longitudB = tokenB.length;

    // Casos especiales: ambos vacíos (100% igual) o uno vacío (0% igual)
    if (longitudA === 0 && longitudB === 0) return 1;
    if (longitudA === 0 || longitudB === 0) return 0;

    // Crea matriz de distancias (longitud+1 x longitud+1)
    const matriz = Array.from({ length: longitudA + 1 }, () => 
      new Array(longitudB + 1).fill(0)
    );

    // Inicializa primera fila y columna con valores incrementales
    for (let i = 0; i <= longitudA; i++) matriz[i][0] = i;
    for (let j = 0; j <= longitudB; j++) matriz[0][j] = j;

    // Llena la matriz calculando distancia mínima entre caracteres
    for (let i = 1; i <= longitudA; i++) {
      for (let j = 1; j <= longitudB; j++) {
        // Costo 0 si caracteres iguales, 1 si diferentes
        const costo = tokenA[i - 1] === tokenB[j - 1] ? 0 : 1;
        // Encuentra el mínimo: eliminar, insertar o sustituir
        matriz[i][j] = Math.min(
          matriz[i - 1][j] + 1,      // Eliminar carácter
          matriz[i][j - 1] + 1,      // Insertar carácter
          matriz[i - 1][j - 1] + costo  // Sustituir carácter
        );
      }
    }

    // Obtiene distancia final de la esquina inferior derecha
    const distancia = matriz[longitudA][longitudB];
    const longitudMaxima = Math.max(longitudA, longitudB);

    // Convierte distancia a similitud (1 - distancia/longitud_max)
    return 1 - distancia / longitudMaxima;
  }

}

/**
 * Resultado de validación de documento
 */
export class ResultadoValidacion {
  constructor(esValido, porcentaje, tipoValidacion, detalles = {}) {
    this.esValido = esValido;
    // Redondea a 2 decimales
    this.porcentaje = Math.round(porcentaje * 100) / 100;
    this.tipoValidacion = tipoValidacion;
    this.detalles = detalles;
    this.timestamp = new Date();
    this.hash = null;
  }

  // Asigna el hash único del archivo
  asignarHash(hash) {
    this.hash = hash;
    return this;
  }

  // Convierte a objeto plano para serialización (caché/JSON)
  aObjetoPlano() {
    return {
      esValido: this.esValido,
      porcentaje: this.porcentaje,
      tipoValidacion: this.tipoValidacion,
      detalles: this.detalles,
      timestamp: this.timestamp,
      hash: this.hash
    };
  }

  // Determina si este resultado debe guardarse en caché
  debeSerCacheado() {
    // Solo cachear resultados negativos para no repetir validaciones fallidas
    return this.tipoValidacion === 'DOCUMENTO_INVALIDO' || 
           this.tipoValidacion === 'FALTAN_CAMPOS_AL_DOCUMENTO' || 
           this.tipoValidacion === 'NOMBRE_NO_COINCIDE';
  }

  // Tiempo de vida en caché según tipo de validación
  obtenerTTL() {
    switch (this.tipoValidacion) {
      case 'DOCUMENTO_INVALIDO':
      case 'FALTAN_CAMPOS_AL_DOCUMENTO':
      case 'NOMBRE_NO_COINCIDE':
        return 180; // 3 minutos para resultados negativos
      default:
        return 0; // No cachear resultados válidos
    }
  }

  // Genera mensaje legible para el usuario
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