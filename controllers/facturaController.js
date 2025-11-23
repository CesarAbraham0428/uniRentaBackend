import facturaService from '../services/facturaService.js';

/**
 * Genera y envía una factura por email
 * Se puede usar para reenviar facturas o generar facturas manualmente
 */
export const enviarFactura = async (req, res, next) => {
  try {
    const { estudianteUnidadId } = req.params;

    if (!estudianteUnidadId || isNaN(estudianteUnidadId)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de asignación inválido'
      });
    }

    const resultado = await facturaService.generarYEnviarFactura(parseInt(estudianteUnidadId));

    res.status(200).json({
      success: true,
      mensaje: resultado.mensaje,
      data: resultado.data
    });
  } catch (error) {
    if (error.message === 'Asignación no encontrada') {
      return res.status(404).json({
        success: false,
        mensaje: error.message
      });
    }

    next(error);
  }
};

/**
 * Obtiene los datos de la factura sin enviarla
 * Útil para previsualización
 */
export const obtenerDatosFactura = async (req, res, next) => {
  try {
    const { estudianteUnidadId } = req.params;

    if (!estudianteUnidadId || isNaN(estudianteUnidadId)) {
      return res.status(400).json({
        success: false,
        mensaje: 'ID de asignación inválido'
      });
    }

    const datosFactura = await facturaService.obtenerDatosFactura(parseInt(estudianteUnidadId));

    res.status(200).json({
      success: true,
      data: datosFactura,
      mensaje: 'Datos de factura obtenidos exitosamente'
    });
  } catch (error) {
    if (error.message === 'Asignación no encontrada') {
      return res.status(404).json({
        success: false,
        mensaje: error.message
      });
    }

    next(error);
  }
};
