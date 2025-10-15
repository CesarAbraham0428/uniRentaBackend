import { ErrorValidacionDocumento } from "../errores/erroresDocumento.js";
import { obtenerTipoDocumentoPorID } from "../../services/documentoService.js";

const verificarDatos = async (textoExtraido, tipo_id) => {
  const textoMayus = textoExtraido.toUpperCase();
  const tipoDocumento = await obtenerTipoDocumentoPorID(tipo_id);

  if (!tipoDocumento) {
    throw new ErrorValidacionDocumento(`Tipo de documento no válido: ${tipo_id}`);
  }

  const camposRequeridos = tipoDocumento.campos_requeridos;

  if (!camposRequeridos || !Array.isArray(camposRequeridos)) {
    throw new ErrorValidacionDocumento(`Campos requeridos no definidos para el tipo de documento: ${tipo_id}`);
  }

  const camposFaltantes = camposRequeridos.filter(campo => !textoMayus.includes(campo.toUpperCase()));

  if (camposFaltantes.length > 0) {
    throw new ErrorValidacionDocumento(
      `El documento no contiene los campos requeridos: ${camposFaltantes.join(', ')}`
    );
  }
};

export default verificarDatos;