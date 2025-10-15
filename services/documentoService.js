import Documento from '../models/documento.js';
import TipoDocumento from '../models/tipo_documento.js';


import validarDocumento from '../utils/ocr/validarDocumento.js';
import { moverArchivo, limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';

export const procesarDocumento = async (rutaDocumento, tipo_id) => {
  try {
    await validarDocumento(rutaDocumento, tipo_id);
    const carpetaDestino = obtenerCarpetaDestino(tipo_id);
    const rutaFinal = moverArchivo(rutaDocumento, carpetaDestino);
    
    return { rutaFinal };
  } catch (error) {
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
  const tipo = tipo_id;
  
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