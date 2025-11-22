import Estudiante from '../models/estudiante.js';
import sequelize from '../config/baseDeDatos.js';
import * as documentoService from './documentoService.js';
import { generarToken } from '../utils/auth/jwt.js';

import { ErrorBaseDatos, ErrorDocumento } from '../utils/errores/erroresDocumento.js';

export const registrarEstudiante = async (datosEstudiante) => {

  return await Estudiante.create(datosEstudiante);
};

export const iniciarSesion = async (email, password) => {
  try {
    // Buscar el usuario por email
    const estudiante = await Estudiante.findOne({
      where: { email },
      attributes: ['id', 'nombre', 'apellido', 'email', 'password', 'telefono']
    });

    if (!estudiante) {
      throw new ErrorBaseDatos('Credenciales inválidas');
    }

    // Verificar la contraseña
    const passwordValida = await estudiante.verificarPassword(password);

    if (!passwordValida) {
      throw new ErrorBaseDatos('Credenciales inválidas');
    }

    // Generar token JWT
    const token = generarToken({
      id: estudiante.id,
      email: estudiante.email,
      nombre: estudiante.nombre,
      apellido: estudiante.apellido,
      tipo: 'estudiante'
    });

    // Retornar datos del usuario sin la contraseña
    const { password: _, ...datosEstudiante } = estudiante.toJSON();

    return {
      exito: true,
      mensaje: 'Inicio de sesión exitoso',
      datos: {
        estudiante: datosEstudiante,
        token
      }
    };

  } catch (error) {
    throw error;
  }
};

export const validarToken = async (token) => {
  try {
    const { verificarToken } = await import('../utils/auth/jwt.js');
    const decoded = verificarToken(token);

    // Verificar que el usuario aún existe en la base de datos
    const estudiante = await Estudiante.findByPk(decoded.id, {
      attributes: ['id', 'nombre', 'apellido', 'email', 'telefono']
    });

    if (!estudiante) {
      throw new ErrorBaseDatos('Usuario no encontrado');
    }

    return {
      exito: true,
      datos: {
        estudiante: estudiante.toJSON(),
        tokenValido: true
      }
    };

  } catch (error) {
    throw new ErrorBaseDatos('Token inválido o expirado');
  }
};
