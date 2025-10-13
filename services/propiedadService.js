import Propiedad from "../models/propiedad.js";
import Unidad from "../models/unidad.js";
import Rentero from "../models/rentero.js";
import Universidad from "../models/universidad.js";
import { Op, fn, col, where } from "sequelize";
import {ErrorAplicacion} from '../utils/errores/appError.js';

class PropiedadService {
  /**
   * Obtiene todas las propiedades disponibles
   * @returns {Promise<Object>} Resultado con propiedades formateadas
   */
  async obtenerTodasLasPropiedades() {
    try {
      const unidades = await Unidad.findAll({
        where: { estado: "libre" },
        include: [
          {
            model: Propiedad,
            as: "propiedad",
            where: { visible: true },
            include: [
              {
                model: Rentero,
                as: "rentero",
                attributes: ["id", "nombre", "apellido", "telefono", "email"],
              },
            ],
          },
        ],
        order: [["id", "DESC"]],
      });

      const propiedadesFormateadas = unidades.map((unidad) => {
        const uniJSON = unidad.toJSON();
        return {
          id: uniJSON.id,
          nombre: uniJSON.nombre,
          precio: parseFloat(uniJSON.precio),
          estado: uniJSON.estado,
          descripcion: uniJSON.descripcion,
          imagenes: uniJSON.imagenes,
          ubicacion: {
            nombre: uniJSON.propiedad.nombre,
            direccion: `${uniJSON.propiedad.calle} ${uniJSON.propiedad.numero}, ${uniJSON.propiedad.colonia}`,
            calle: uniJSON.propiedad.calle,
            colonia: uniJSON.propiedad.colonia,
            numero: uniJSON.propiedad.numero,
            codigo_postal: uniJSON.propiedad.codigo_postal,
            municipio: uniJSON.propiedad.municipio,
            estado: uniJSON.propiedad.estado,
            coordenadas: uniJSON.propiedad.ubicacion,
          },
          rentero: {
            id: uniJSON.propiedad.rentero.id,
            nombre: `${uniJSON.propiedad.rentero.nombre} ${uniJSON.propiedad.rentero.apellido}`,
            telefono: uniJSON.propiedad.rentero.telefono,
            email: uniJSON.propiedad.rentero.email,
          },
        };
      });

      return {
        success: true,
        cantidad: propiedadesFormateadas.length,
        data: propiedadesFormateadas,
      };
    } catch (error) {
      throw new ErrorAplicacion(
        `Error al obtener propiedades: ${error.message}`,
        500
      );
    }
  }

  /**
   * Obtiene una propiedad específica por ID
   * @param {number} id - ID de la unidad
   * @returns {Promise<Object>} Resultado con propiedad formateada
   */
  async obtenerPropiedadPorId(id) {
    if (isNaN(id)) {
      throw new ErrorAplicacion("ID inválido", 400);
    }

    try {
      const unidad = await Unidad.findOne({
        where: {
          id: id,
          estado: "libre",
        },
        include: [
          {
            model: Propiedad,
            as: "propiedad",
            where: { visible: true },
            include: [
              {
                model: Rentero,
                as: "rentero",
                attributes: ["id", "nombre", "apellido", "telefono", "email"],
              },
            ],
          },
        ],
      });

      if (!unidad) {
        throw new ErrorAplicacion("Propiedad no encontrada", 404);
      }

      const uniJSON = unidad.toJSON();
      const propiedadFormateada = {
        id: uniJSON.id,
        nombre: uniJSON.nombre,
        precio: parseFloat(uniJSON.precio),
        estado: uniJSON.estado,
        descripcion: uniJSON.descripcion,
        imagenes: uniJSON.imagenes,
        ubicacion: {
          nombre: uniJSON.propiedad.nombre,
          direccion: `${uniJSON.propiedad.calle} ${uniJSON.propiedad.numero}, ${uniJSON.propiedad.colonia}`,
          calle: uniJSON.propiedad.calle,
          colonia: uniJSON.propiedad.colonia,
          numero: uniJSON.propiedad.numero,
          municipio: uniJSON.propiedad.municipio,
          estado: uniJSON.propiedad.estado,
          codigo_postal: uniJSON.propiedad.codigo_postal,
          coordenadas: uniJSON.propiedad.ubicacion,
        },
        rentero: {
          id: uniJSON.propiedad.rentero.id,
          nombre: `${uniJSON.propiedad.rentero.nombre} ${uniJSON.propiedad.rentero.apellido}`,
          telefono: uniJSON.propiedad.rentero.telefono,
          email: uniJSON.propiedad.rentero.email,
        },
      };

      return {
        success: true,
        data: propiedadFormateada,
      };
    } catch (error) {
      if (error instanceof ErrorAplicacion) {
        throw error;
      }
      throw new ErrorAplicacion(
        `Error al obtener propiedad: ${error.message}`,
        500
      );
    }
  }

  /**
   * Busca propiedades con filtros específicos
   * @param {Object} filtros - Filtros de búsqueda
   * @returns {Promise<Object>} Resultado con propiedades filtradas
   */
  async buscarPropiedadesConFiltros(filtros) {
    try {
      const {
        precioMin,
        precioMax,
        colonia,
        municipio,
        universidadId,
        universidadNombre,
        rangoKm,
      } = filtros;

      const whereUnidad = { estado: "libre" };
      const wherePropiedad = { visible: true };

      if (precioMin || precioMax) {
        whereUnidad.precio = {};
        if (precioMin) whereUnidad.precio[Op.gte] = precioMin;
        if (precioMax) whereUnidad.precio[Op.lte] = precioMax;
      }

      if (municipio) {
        wherePropiedad.municipio = { [Op.iLike]: `%${municipio}%` };
      }
      if (colonia) {
        wherePropiedad.colonia = { [Op.iLike]: `%${colonia}%` };
      }

      if ((universidadId || universidadNombre) && rangoKm) {
        const uni = await Universidad.findOne({
          where: universidadId
            ? { id: universidadId }
            : { nombre: { [Op.iLike]: `%${universidadNombre}%` } },
          attributes: ["id", "nombre", "ubicacion"],
        });

        if (!uni) {
          throw new ErrorAplicacion("Universidad no encontrada", 404);
        }

        const [lng, lat] = uni.ubicacion.coordinates;
        const rangoMetros = Number(rangoKm) * 1000;

        const distanciaCond = where(
          fn(
            "ST_DWithin",
            col("propiedad.ubicacion"),
            fn("ST_SetSRID", fn("ST_MakePoint", lng, lat), 4326),
            rangoMetros
          ),
          true
        );

        if (!wherePropiedad[Op.and]) wherePropiedad[Op.and] = [];
        wherePropiedad[Op.and].push(distanciaCond);
      }

      const unidades = await Unidad.findAll({
        where: whereUnidad,
        include: [
          {
            model: Propiedad,
            as: "propiedad",
            where: wherePropiedad,
            include: [
              {
                model: Rentero,
                as: "rentero",
                attributes: ["id", "nombre", "apellido", "telefono", "email"],
              },
            ],
          },
        ],
        order: [["id", "DESC"]],
      });

      const propiedadesFormateadas = unidades.map((unidad) => {
        const uniJSON = unidad.toJSON();
        return {
          id: uniJSON.id,
          nombre: uniJSON.nombre,
          precio: parseFloat(uniJSON.precio),
          estado: uniJSON.estado,
          descripcion: uniJSON.descripcion,
          imagenes: uniJSON.imagenes,
          ubicacion: {
            nombre: uniJSON.propiedad.nombre,
            direccion: `${uniJSON.propiedad.calle} ${uniJSON.propiedad.numero}, ${uniJSON.propiedad.colonia}`,
            calle: uniJSON.propiedad.calle,
            colonia: uniJSON.propiedad.colonia,
            numero: uniJSON.propiedad.numero,
            codigo_postal: uniJSON.propiedad.codigo_postal,
            municipio: uniJSON.propiedad.municipio,
            estado: uniJSON.propiedad.estado,
            coordenadas: uniJSON.propiedad.ubicacion,
          },
          rentero: {
            id: uniJSON.propiedad.rentero.id,
            nombre: `${uniJSON.propiedad.rentero.nombre} ${uniJSON.propiedad.rentero.apellido}`,
            telefono: uniJSON.propiedad.rentero.telefono,
            email: uniJSON.propiedad.rentero.email,
          },
        };
      });

      return {
        success: true,
        cantidad: propiedadesFormateadas.length,
        filtros: filtros,
        data: propiedadesFormateadas,
      };
    } catch (error) {
      if (error instanceof ErrorAplicacion) {
        throw error;
      }
      throw new ErrorAplicacion(
        `Error al filtrar propiedades: ${error.message}`,
        500
      );
    }
  }
}

export default new PropiedadService();