import { DataTypes } from 'sequelize';
import sequelize from '../config/baseDeDatos.js';
import Documento from './documento.js';

const Rentero = sequelize.define('rentero', {
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
});

// Asociaciones
Rentero.hasMany(Documento, { foreignKey: 'rentero_id' });

export default Rentero;