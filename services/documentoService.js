import Documento from '../models/documento.js';

import verificarDatos from '../utils/ocr/validadorCamposOCR.js';
import { moverArchivo, limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';

export const guardarDocumento = async (documento, tipo, renteroId = null, propiedadId = null) => {
  // Validar el documento con OCR
  const resultado = verificarDatos(documento, tipo);
  
  if (!resultado) {
    throw new ErrorAplicacion('El documento no cumple con los requisitos', 400);
  }else{
    // Mover el archivo a ubicación final
    const rutaFinal = moverArchivo(documento, `${tipo}s/validos`);
  
    // Crear registro en la base de datos
    const documento = await Documento.create({
    ruta_archivo: rutaFinal,
    tipo,
    rentero_id: renteroId,
    propiedad_id: propiedadId
  });
}
  
  return documento;
};