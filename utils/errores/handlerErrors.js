export const manejadorErrores = (err, req, res, next) => {
  // Si es un error controlado lanzado por nosotros
  if (err.errorControlado) {
    return res.status(err.codigoEstado).json({
      estado: "error",
      mensaje: err.message,
      tipo: err.tipoError
    });
  }

  // Si no es un error controlado (bug, fallo inesperado)
  return res.status(500).json({
    estado: "error",
    mensaje: "Error interno del servidor"
  });
};
