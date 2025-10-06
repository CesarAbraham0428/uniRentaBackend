import PropiedadService from '../services/propiedadService.js';

export const obtenerPropiedades = async (req, res) => {
  try {
    const unidades = await PropiedadService.obtenerTodasLasPropiedades();

    const propiedadesFormateadas = unidades.map(unidad => {
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
          coordenadas: uniJSON.propiedad.ubicacion
        },
        rentero: {
          id: uniJSON.propiedad.rentero.id,
          nombre: `${uniJSON.propiedad.rentero.nombre} ${uniJSON.propiedad.rentero.apellido}`,
          telefono: uniJSON.propiedad.rentero.telefono,
          email: uniJSON.propiedad.rentero.email
        }
      };
    });

    res.status(200).json({
      success: true,
      cantidad: propiedadesFormateadas.length,
      data: propiedadesFormateadas
    });
  } catch (error) {
    console.error('Error en controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener propiedades'
    });
  }
};

export const obtenerPropiedadPorId = async (req, res) => {
  try {
    const { id } = req.params;

    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID inválido'
      });
    }

    const unidad = await PropiedadService.obtenerPropiedadPorId(id);

    if (!unidad) {
      return res.status(404).json({
        success: false,
        message: 'Propiedad no encontrada'
      });
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
        codigo_postal: uniJSON.propiedad.codigo_postal,
        coordenadas: uniJSON.propiedad.ubicacion
      },
      rentero: {
        id: uniJSON.propiedad.rentero.id,
        nombre: `${uniJSON.propiedad.rentero.nombre} ${uniJSON.propiedad.rentero.apellido}`,
        telefono: uniJSON.propiedad.rentero.telefono,
        email: uniJSON.propiedad.rentero.email
      }
    };

    res.status(200).json({
      success: true,
      data: propiedadFormateada
    });
  } catch (error) {
    console.error('Error en controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener propiedad'
    });
  }
};

export const obtenerPropiedadesConFiltros = async (req, res) => {
  try {
    const { precioMin, precioMax, colonia } = req.query;
    
    const filtros = {};
    if (precioMin) filtros.precioMin = parseFloat(precioMin);
    if (precioMax) filtros.precioMax = parseFloat(precioMax);
    if (colonia) filtros.colonia = colonia;

    const unidades = await PropiedadService.buscarPropiedadesConFiltros(filtros);

    const propiedadesFormateadas = unidades.map(unidad => {
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
          coordenadas: uniJSON.propiedad.ubicacion
        },
        rentero: {
          id: uniJSON.propiedad.rentero.id,
          nombre: `${uniJSON.propiedad.rentero.nombre} ${uniJSON.propiedad.rentero.apellido}`,
          telefono: uniJSON.propiedad.rentero.telefono,
          email: uniJSON.propiedad.rentero.email
        }
      };
    });

    res.status(200).json({
      success: true,
      cantidad: propiedadesFormateadas.length,
      filtros: filtros,
      data: propiedadesFormateadas
    });
  } catch (error) {
    console.error('Error en controller:', error);
    res.status(500).json({
      success: false,
      message: 'Error al filtrar propiedades'
    });
  }
};