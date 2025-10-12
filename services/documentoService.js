import Documento from '../models/documento.js';
import validarDocumento from '../utils/ocr/validarDocumento.js';
import { moverArchivo, limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';

export const procesarDocumento = async (rutaDocumento, tipo) => {
  try {
    await validarDocumento(rutaDocumento, tipo);
    const carpetaDestino = obtenerCarpetaDestino(tipo);
    const rutaFinal = moverArchivo(rutaDocumento, carpetaDestino);
    
    return { rutaFinal };
  } catch (error) {
    limpiarArchivoTemporal(rutaDocumento);
    throw error;
  }
};

export const guardarDocumento = async (rutaFinal, tipo, renteroId = null, propiedadId = null, transaccion = null) => {
  const opciones = transaccion ? { transaction: transaccion } : {};
  
  return await Documento.create({
    ruta_archivo: rutaFinal,
    tipo,
    rentero_id: renteroId,
    propiedad_id: propiedadId
  }, opciones);
};

const obtenerCarpetaDestino = (tipo) => {
  const tipoNormalizado = tipo.toLowerCase();
  
  if (tipoNormalizado === 'ine') {
    return 'rentero/identidad';
  }
  
  return 'rentero/propiedad';
};