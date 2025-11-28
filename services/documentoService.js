import Documento from '../models/documento.js';
import TipoDocumento from '../models/tipo_documento.js';
import { ProxyDocumento } from '../utils/ocr/proxyDocumento.js';
import { moverArchivo, limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';

// Instancia global del proxy
const proxyValidador = new ProxyDocumento();

export const procesarDocumento = async (rutaArchivoDocumento, idTipoDocumento, opcionesValidacion = {}) => {
  try {
    const resultadoValidacion = await proxyValidador.validarDocumento(
      rutaArchivoDocumento, 
      idTipoDocumento, 
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

    const carpetaDestino = obtenerCarpetaDestinoPorTipo(idTipoDocumento);
    const rutaFinalArchivo = moverArchivo(rutaArchivoDocumento, carpetaDestino);
    
    return { 
      rutaArchivoFinal: rutaFinalArchivo,
      validacion: resultadoValidacion.aObjetoPlano()
    };
  } catch (error) {
    limpiarArchivoTemporal(rutaArchivoDocumento);
    throw error;
  }
};

export const guardarDocumentoEnBaseDatos = async (
  rutaArchivoFinal, 
  idTipoDocumento, 
  idRentero = null, 
  idPropiedad = null, 
  transaccion = null
) => {
  const opciones = transaccion ? { transaction: transaccion } : {};
  
  return await Documento.create({
    ruta_archivo: rutaArchivoFinal,
    tipo_id: idTipoDocumento,
    rentero_id: idRentero,
    propiedad_id: idPropiedad
  }, opciones);
};

const obtenerCarpetaDestinoPorTipo = (idTipoDocumento) => {
  return Number(idTipoDocumento) === 1 ? 'rentero/identidad' : 'rentero/propiedad';
};

export const obtenerTipoDocumentoPorIdentificador = async (id) => {
  return await TipoDocumento.findByPk(id);
};

export const obtenerTodosTiposDocumento = async () => {
  return await TipoDocumento.findAll();
};

export const verificarDocumentoEnCache = async (rutaArchivo) => {
  return await proxyValidador.verificarArchivoEnCache(rutaArchivo);
};

export const limpiarCacheValidacionDocumentos = () => {
  proxyValidador.limpiarTodaLaCache();
};