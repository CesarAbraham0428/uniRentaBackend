import { DataTypes } from 'sequelize';
import sequelize from '../config/baseDeDatos.js';

const Propiedad = sequelize.define('propiedad', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rentero_id: {
    type: DataTypes.INTEGER
  },
  nombre: {
    type: DataTypes.STRING
  },
  calle: {
    type: DataTypes.STRING
  },
  colonia: {
    type: DataTypes.STRING
  },
  numero: {
    type: DataTypes.STRING
  },
  codigo_postal: {
    type: DataTypes.STRING
  },
  ubicacion: {
    type: DataTypes.GEOGRAPHY('POINT', 4326)
  },
  visible: {
    type: DataTypes.BOOLEAN
  },
  municipio: {
    type: DataTypes.STRING
  },
  estado: {
    type: DataTypes.STRING
  },
});



export default Propiedad;