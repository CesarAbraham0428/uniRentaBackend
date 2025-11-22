import { DataTypes } from 'sequelize';
import sequelize from '../config/baseDeDatos.js';
import bcrypt from 'bcryptjs';

const Estudiante = sequelize.define('estudiante', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  nombre: {
    type: DataTypes.STRING
  },
  apellido: {
    type: DataTypes.STRING
  },
  email: {
    type: DataTypes.STRING
  },
  password: {
    type: DataTypes.STRING
  },
  telefono: {
    type: DataTypes.STRING
  }
}
);

export default Estudiante;