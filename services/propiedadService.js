import Propiedad from '../models/propiedad.js';
import Unidad from '../models/unidad.js';
import Rentero from '../models/rentero.js';
import { Op } from 'sequelize';

class PropiedadService {
  
  async obtenerTodasLasPropiedades() {
    try {
      const unidades = await Unidad.findAll({
        where: { estado: 'libre' },
        include: [
          {
            model: Propiedad,
            as: 'propiedad',
            where: { visible: true },
            include: [
              {
                model: Rentero,
                as: 'rentero',
                attributes: ['id', 'nombre', 'apellido', 'telefono', 'email']
              }
            ]
          }
        ],
        order: [['id', 'DESC']]
      });

      return unidades;
    } catch (error) {
      throw new Error(`Error en servicio al obtener propiedades: ${error.message}`);
    }
  }

  async obtenerPropiedadPorId(id) {
    try {
      const unidad = await Unidad.findOne({
        where: { 
          id: id,
          estado: 'libre'
        },
        include: [
          {
            model: Propiedad,
            as: 'propiedad',
            where: { visible: true },
            include: [
              {
                model: Rentero,
                as: 'rentero',
                attributes: ['id', 'nombre', 'apellido', 'telefono', 'email']
              }
            ]
          }
        ]
      });

      return unidad;
    } catch (error) {
      throw new Error(`Error en servicio al obtener propiedad: ${error.message}`);
    }
  }

  async buscarPropiedadesConFiltros(filtros) {
    try {
      const { precioMin, precioMax, colonia } = filtros;
      
      const whereUnidad = { estado: 'libre' };
      const wherePropiedad = { visible: true };

      if (precioMin || precioMax) {
        whereUnidad.precio = {};
        if (precioMin) whereUnidad.precio[Op.gte] = precioMin;
        if (precioMax) whereUnidad.precio[Op.lte] = precioMax;
      }

      if (colonia) {
        wherePropiedad.colonia = {
          [Op.iLike]: `%${colonia}%`
        };
      }

      const unidades = await Unidad.findAll({
        where: whereUnidad,
        include: [
          {
            model: Propiedad,
            as: 'propiedad',
            where: wherePropiedad,
            include: [
              {
                model: Rentero,
                as: 'rentero',
                attributes: ['id', 'nombre', 'apellido', 'telefono', 'email']
              }
            ]
          }
        ],
        order: [['id', 'DESC']]
      });

      return unidades;
    } catch (error) {
      throw new Error(`Error en servicio al filtrar propiedades: ${error.message}`);
    }
  }
}

export default new PropiedadService();