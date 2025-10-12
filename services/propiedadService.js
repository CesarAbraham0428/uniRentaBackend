import Propiedad from "../models/propiedad.js";
import Unidad from "../models/unidad.js";
import Rentero from "../models/rentero.js";
import Universidad from "../models/universidad.js";
import { Op, fn, col, where } from "sequelize";

class PropiedadService {
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

      return unidades;
    } catch (error) {
      throw new Error(
        `Error en servicio al obtener propiedades: ${error.message}`
      );
    }
  }

  async obtenerPropiedadPorId(id) {
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

      return unidad;
    } catch (error) {
      throw new Error(
        `Error en servicio al obtener propiedad: ${error.message}`
      );
    }
  }

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

      let distanciaCond = null;
      if ((universidadId || universidadNombre) && rangoKm) {
        const uni = await Universidad.findOne({
          where: universidadId
            ? { id: universidadId }
            : { nombre: { [Op.iLike]: `%${universidadNombre}%` } },
          attributes: ["id", "nombre", "ubicacion"],
        });

        if (!uni) return [];

        const [lng, lat] = uni.ubicacion.coordinates;
        const rangoMetros = Number(rangoKm) * 1000;

        distanciaCond = where(
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

      return unidades;
    } catch (error) {
      throw new Error(
        `Error en servicio al filtrar propiedades: ${error.message}`
      );
    }
  }
}

export default new PropiedadService();
