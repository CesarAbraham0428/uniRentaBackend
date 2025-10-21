import { ErrorValidacionDocumento } from "../errores/erroresDocumento.js";
import { obtenerTipoDocumentoPorID } from "../../services/documentoService.js";

const verificarDatos = async (textoExtraido, tipo_id) => {
  const textoMayus = textoExtraido.toUpperCase();
  const tipoDocumento = await obtenerTipoDocumentoPorID(tipo_id);

  if (!tipoDocumento) {
    throw new ErrorValidacionDocumento(`Tipo de documento no válido: ${tipo_id}`);
  }

  const camposFaltantes = tipoDocumento.campos_requeridos.filter(campo => !textoMayus.includes(campo.toUpperCase()));

  if (camposFaltantes.length > 0) {
    const total = tipoDocumento.campos_requeridos.length;
    const faltan = camposFaltantes.length;
    const detalle = camposFaltantes.join(', ');

    if (faltan >= 4) {
      throw new ErrorValidacionDocumento(
        `Faltan ${faltan} campo(s): ${detalle}`,
        'DOCUMENTO INVALIDO',
        camposFaltantes,
        faltan,
        total
      );
    }

    throw new ErrorValidacionDocumento(
      `Faltan ${faltan} campo(s): ${detalle}`,
      'FALTAN CAMPOS AL DOCUMENTO',
      camposFaltantes,
      faltan,
      total
    );
  }
};

export default verificarDatos;