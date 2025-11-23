import Documento from '../models/documento.js';
import TipoDocumento from '../models/tipo_documento.js';
import { ProxyDocumento } from '../utils/ocr/proxyDocumento.js';
import { moverArchivo, limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';

// Instancia global del proxy con caché
const proxyValidador = new ProxyDocumento({
  configReal: {
    intentosMaximos: 3,
    timeout: 30000
  },
  configCache: {
    ttlInvalido: 180,
    ttlParcial: 180,
    useClones: false,
    enableStats: false
  }
});

export const procesarDocumento = async (rutaDocumento, tipo_id, opcionesValidacion = {}) => {
  try {
    const resultadoValidacion = await proxyValidador.validarDocumento(
      rutaDocumento, 
      tipo_id, 
      opcionesValidacion
    );
    
    if (!resultadoValidacion.esValido) {
      const error = new Error(resultadoValidacion.generarMensaje());
      error.errorControlado = true;
      error.codigoEstado = 400;
      error.tipo = 'VALIDACION_DOCUMENTO';
      
      // Mapeo de tipos a subtipos
      const mapeoSubtipos = {
        'NOMBRE_NO_COINCIDE': 'nombre_no_coincide',
        'FALTAN_CAMPOS_AL_DOCUMENTO': 'faltan_campos_al_documento',
        'DOCUMENTO_INVALIDO': 'documento_invalido'
      };
      
      error.subtipo = mapeoSubtipos[resultadoValidacion.tipoValidacion] || 'documento_invalido';
      error.detalles = resultadoValidacion.detalles;
      throw error;
    }

    const carpetaDestino = obtenerCarpetaDestino(tipo_id);
    const rutaFinal = moverArchivo(rutaDocumento, carpetaDestino);
    
    return { 
      rutaFinal,
      validacion: resultadoValidacion.toPlainObject()
    };
  } catch (error) {
    limpiarArchivoTemporal(rutaDocumento);
    throw error;
  }
};

export const guardarDocumento = async (
  rutaFinal, 
  tipo_id, 
  renteroId = null, 
  propiedadId = null, 
  transaccion = null
) => {
  const opciones = transaccion ? { transaction: transaccion } : {};
  
  return await Documento.create({
    ruta_archivo: rutaFinal,
    tipo_id,
    rentero_id: renteroId,
    propiedad_id: propiedadId
  }, opciones);
};

const obtenerCarpetaDestino = (tipo_id) => {
  return Number(tipo_id) === 1 ? 'rentero/identidad' : 'rentero/propiedad';
};

export const obtenerTipoDocumentoPorID = async (id) => {
  return await TipoDocumento.findByPk(id);
};

export const obtenerDocumentos = async () => {
  return await TipoDocumento.findAll();
};

export const verificarCacheDocumento = async (rutaArchivo) => {
  return await proxyValidador.estaEnCache(rutaArchivo);
};

export const limpiarCacheValidacion = () => {
  proxyValidador.limpiarCache();
};