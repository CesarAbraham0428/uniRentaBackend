import PropiedadService from "../services/propiedadService.js";

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