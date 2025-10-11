import Documento from '../models/documento.js';

import verificarDatos from '../utils/ocr/validadorCamposOCR.js';
import { moverArchivo, limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';

export const guardarDocumento = async (rutaTemporal, tipo, renteroId = null, propiedadId = null) => {
  // Validar el documento con OCR
  await verificarDatos(rutaTemporal, tipo);
  
  // Mover el archivo a ubicación final
  const rutaFinal = moverArchivo(rutaTemporal, `${tipo}s/validos`);
  
  // Crear registro en la base de datos
  const documento = await Documento.create({
    ruta_archivo: rutaFinal,
    tipo,
    rentero_id: renteroId,
    propiedad_id: propiedadId
  });
  
  return documento;
};

export const eliminarDocumento = async (documentoId) => {
  // Primero obtener la ruta del archivo
  const documento = await Documento.findByPk(documentoId);
  if (!documento) {
    throw new Error('Documento no encontrado');
  }
  
  // Eliminar el registro de la base de datos
  await Documento.destroy({ where: { id: documentoId } });
  
  // Opcional: Eliminar el archivo físico
  limpiarArchivoTemporal(documento.ruta_archivo);
  
  return true;
};
