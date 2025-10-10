import fs from 'fs';
import path from 'path';

export const moverArchivo = (rutaOrigen, carpetaDestino) => {
  const nombreArchivo = path.basename(rutaOrigen);
  const rutaCompleta = path.join(process.cwd(), 'uploads', carpetaDestino);
  
  if (!fs.existsSync(rutaCompleta)) {
    fs.mkdirSync(rutaCompleta, { recursive: true });
  }
  
  const rutaDestino = path.join(rutaCompleta, nombreArchivo);
  fs.renameSync(rutaOrigen, rutaDestino);
  
  return rutaDestino;
};

export const limpiarArchivoTemporal = (rutaArchivo) => {
  if (rutaArchivo && fs.existsSync(rutaArchivo)) {
    fs.unlinkSync(rutaArchivo);
  }
};
