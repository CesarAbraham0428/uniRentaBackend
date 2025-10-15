import Rentero from '../models/rentero.js';
import sequelize from '../config/baseDeDatos.js';
import * as documentoService from './documentoService.js';

import { limpiarArchivoTemporal } from '../utils/files/manejadorArchivos.js';
import { ErrorBaseDatos, ErrorDocumento } from '../utils/errores/erroresDocumento.js';

export const registrarRentero = async (rutaDocumento, tipo_id, datosRentero) => {
  if (!rutaDocumento) {
    throw new ErrorDocumento('Debe proporcionar un documento válido');
  }

  const transaccion = await sequelize.transaction();

  try {
    const nuevoRentero = await crearRentero(datosRentero, transaccion);
    const { rutaFinal } = await documentoService.procesarDocumento(rutaDocumento, tipo_id);
    const nuevoDocumento = await documentoService.guardarDocumento(
      rutaFinal, 
      tipo_id, 
      nuevoRentero.id, 
      null, 
      transaccion
    );

    await transaccion.commit();
    
    return {
      exito: true,
      mensaje: 'Rentero registrado exitosamente',
      datos: { rentero: nuevoRentero, documento: nuevoDocumento }
    };
  } catch (error) {
    await transaccion.rollback();
    limpiarArchivoTemporal(rutaDocumento);
    throw manejarErrorRegistro(error);
  }
};

const crearRentero = async (datosRentero, transaccion) => {
  return await Rentero.create(datosRentero, { transaction: transaccion });
};

const manejarErrorRegistro = (error) => {
  if (error.name === 'SequelizeUniqueConstraintError') {
    const camposDuplicados = error.errors.map(e => e.path).join(', ');
    return new ErrorBaseDatos(`Ya existe un registro con el mismo ${camposDuplicados}`);
  }
  
  if (error.name === 'SequelizeValidationError') {
    const mensajesError = error.errors.map(e => e.message).join(', ');
    return new ErrorBaseDatos(`Error de validación: ${mensajesError}`);
  }
  
  return error;
};