export const manejadorErrores = (err, req, res, next) => {
  if (err.errorControlado) {
    return res.status(err.codigoEstado).json({
      estado: "error",
      mensaje: err.message,
      tipo: err.tipo || 'ERROR_APLICACION'
    });
  }

  // Error de Multer (archivo muy grande, etc.)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      estado: "error",
      mensaje: obtenerMensajeMulter(err.code),
      tipo: 'ARCHIVO'
    });
  }

  return res.status(500).json({
    estado: "error",
    mensaje: "Error interno del servidor"
  });
};

const obtenerMensajeMulter = (codigo) => {
  const mensajes = {
    'LIMIT_FILE_SIZE': 'El archivo excede el tamaño máximo permitido',
    'LIMIT_FILE_COUNT': 'Se excedió el número de archivos permitidos',
    'LIMIT_UNEXPECTED_FILE': 'Campo de archivo inesperado'
  };
  
  return mensajes[codigo] || 'Error al cargar el archivo';
};
