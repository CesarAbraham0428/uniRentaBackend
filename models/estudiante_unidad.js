import { DataTypes } from 'sequelize';
import sequelize from '../config/baseDeDatos.js';

const EstudianteUnidad = sequelize.define('estudiante_unidad', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  estudiante_id: { type: DataTypes.INTEGER, allowNull: false },
  unidad_id: { type: DataTypes.INTEGER, allowNull: false }
}, {
  timestamps: false,
  tableName: 'estudiante_unidad'
});

export default EstudianteUnidad;
