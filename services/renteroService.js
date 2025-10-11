import validarDocumento from '../utils/ocr/validarDocumento.js';
import {ErrorAplicacion} from '../utils/errores/appError.js';

/**
 * Registra un nuevo rentero con su documento de identificación
 * @param {Object} datosRentero - Datos del rentero a registrar
 * @param {string} rutaDocumento - Ruta temporal del documento subido
 * @returns {Promise<Object>} - Resultado de la operación
 */

export const registrarRentero = async (documento, tipo, rentero_id, propiedad_id, datosRentero) => {
  if (!documento) {
    throw new ErrorAplicacion('Debe proporcionar un documento válido', 400);
  }

  const transaccion = await sequelize.transaction();
  
  try {
    // Paso 1: Guardar el documento
    const nuevoDocumento = await validarDocumento(
      documento,
      tipo,
      rentero_id,
      propiedad_id
    );

    // Paso 2: Crear rentero
    const nuevoRentero = await Rentero.create({
      ...datosRentero,
      documento_id: nuevoDocumento.id
    }, { transaction: transaccion });
    
    await transaccion.commit();
    return { 
      exito: true, 
      mensaje: 'Rentero registrado exitosamente',
      datos: { rentero: nuevoRentero }
    };
  } catch (error) {
    await transaccion.rollback();
    throw new ErrorAplicacion(error.message, error.statusCode);
  }
};