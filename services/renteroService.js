import { guardarDocumento } from './documentoService.js';

/**
 * Registra un nuevo rentero con su documento de identificación
 * @param {Object} datosRentero - Datos del rentero a registrar
 * @param {string} rutaDocumento - Ruta temporal del documento subido
 * @returns {Promise<Object>} - Resultado de la operación
 */
export const registrarRentero = async (datosRentero, rutaDocumento, tipo) => {
  if (!rutaDocumento) {
    throw new ErrorAplicacion('Debe proporcionar un documento válido', 400);
  }

  const transaccion = await sequelize.transaction();
  
  try {
    // 1. Crear rentero
    const nuevoRentero = await Rentero.create(datosRentero, { transaction: transaccion });
    
    // 2. Guardar documento usando el servicio
    await guardarDocumento(
      rutaDocumento,
      tipo,
      nuevoRentero.id,
      null
    );

    await transaccion.commit();
    return { 
      exito: true, 
      mensaje: 'Rentero registrado exitosamente',
      datos: { rentero: nuevoRentero }
    };
  } catch (error) {
    await transaccion.rollback();
    throw error;
  }
};