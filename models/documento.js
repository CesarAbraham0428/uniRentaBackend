import { DataTypes } from 'sequelize';
import sequelize from '../config/baseDeDatos.js';

const Documento = sequelize.define('documento',{
    id:{
        type: DataTypes.INTEGER,
        primaryKey:true,
        autoincrement:true
    },
    rentero_id:{
        type: DataTypes.INTEGER,
        allowNull:true,
        references:{
            model:'rentero',
            key:'id'
        }
    },
    propiedad_id:{
        type: DataTypes.INTEGER,
        allowNull:false,
        references:{
            model:'propiedad',
            key:'id'
        }
    },
    tipo:{
        type: DataTypes.STRING
    },
    ruta_archivo:{
        type: DataTypes.STRING
    }
});

export default Documento;