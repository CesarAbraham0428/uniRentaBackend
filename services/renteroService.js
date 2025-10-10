// services/renteroService.js
import validarDocumento from "../utils/ocr/validarDocumento.js";
import { moverArchivo, limpiarArchivoTemporal } from "./manejoArchivos.js";
import Rentero from "../models/rentero.js";
import Documento from "../models/documento.js";

export const registrarRentero = async (datosRentero, rutaDocumento) => {
  try {
    // 1. Validar documento
    await validarDocumento(rutaDocumento, "rentero");
    
    // 2. Mover archivo a ubicación final
    const rutaFinal = moverArchivo(rutaDocumento, 'renteros/validos');
    
    // 3. Crear registros en la base de datos
    const [nuevoRentero] = await Promise.all([
      Rentero.create(datosRentero),
      Documento.create({
        rutaDocumento: rutaFinal,
        tipo: 'rentero'
      })
    ]);

    return { 
      exito: true, 
      mensaje: 'Rentero registrado exitosamente',
      datos: { rentero: nuevoRentero }
    };
  } catch (error) {
    limpiarArchivoTemporal(rutaDocumento);
    throw error;
  }
};