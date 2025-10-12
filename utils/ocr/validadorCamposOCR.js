import { ErrorValidacionDocumento } from "../errores/erroresDocumento.js";
import tipoDocumento from "./camposRequeridos.js";

const verificarDatos = (textoExtraido, tipoDoc) => {
  const textoMayus = textoExtraido.toUpperCase();
  const camposRequeridos = tipoDocumento[tipoDoc.toUpperCase()];

  if (!camposRequeridos) {
    throw new ErrorValidacionDocumento(`Tipo de documento no válido: ${tipoDoc}`);
  }

  const camposFaltantes = camposRequeridos.filter(campo => !textoMayus.includes(campo));

  if (camposFaltantes.length > 0) {
    throw new ErrorValidacionDocumento(
      `El documento no contiene los campos requeridos: ${camposFaltantes.join(', ')}`
    );
  }
};

export default verificarDatos;