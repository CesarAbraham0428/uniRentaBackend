import PropiedadService from "../services/propiedadService.js";
import { ErrorDocumento } from "../utils/errores/erroresDocumento.js";


export const obtenerPropiedades = async (req, res, next) => {
  try {
    const resultado = await PropiedadService.obtenerTodasLasPropiedades();
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerPropiedadPorId = async (req, res, next) => {
  try {
    const { id } = req.params;
    const resultado = await PropiedadService.obtenerPropiedadPorId(id);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const obtenerPropiedadesConFiltros = async (req, res, next) => {
  try {
    const {
      precioMin,
      precioMax,
      colonia,
      municipio,
      universidadId,
      universidadNombre,
      rangoKm,
    } = req.query;

    const filtros = {};
    if (precioMin) filtros.precioMin = parseFloat(precioMin);
    if (precioMax) filtros.precioMax = parseFloat(precioMax);
    if (colonia) filtros.colonia = colonia;
    if (municipio) filtros.municipio = municipio;
    if (universidadId) filtros.universidadId = parseInt(universidadId, 10);
    if (universidadNombre) filtros.universidadNombre = universidadNombre;
    if (rangoKm) filtros.rangoKm = parseFloat(rangoKm);

    const resultado = await PropiedadService.buscarPropiedadesConFiltros(filtros);
    res.status(200).json(resultado);
  } catch (error) {
    next(error);
  }
};

export const registrarPropiedad = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ErrorDocumento('Debe proporcionar un documento válido');
    }
    const { tipo_id, ...datosPropiedad } = req.body;

    if (!datosPropiedad || Object.keys(datosPropiedad).length === 0) {
      throw new Error("No se proporcionaron datos de la propiedad");
    }

    if (!datosPropiedad.nombre) {
      throw new Error('El campo nombre es requerido');
    }
    
    if (!datosPropiedad.rentero_id) {
      throw new Error('El campo rentero_id es requerido');
    }
    
    if (!datosPropiedad.ubicacion) {
      throw new Error('El campo ubicacion es requerido');
    }
    const resultado = await PropiedadService.registrarPropiedad(
      req.file.path,
      tipo_id,
      datosPropiedad
    );
    
    res.status(201).json(resultado);
  } catch (error) {
    next(error);
  }
};