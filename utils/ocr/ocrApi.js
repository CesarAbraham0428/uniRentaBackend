import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { ErrorOCR } from "../errores/erroresDocumento.js";

const ocrApi = async (rutaArchivo) => {
  let datosFormulario;
  let archivoStream;

  try {
    const resultado = crearFormulario(rutaArchivo);
    datosFormulario = resultado.datosFormulario;
    archivoStream = resultado.archivoStream;

    const respuesta = await enviarSolicitudOCR(datosFormulario);
    
    validarRespuestaOCR(respuesta.data);
    
    const textoExtraido = respuesta.data.ParsedResults[0].ParsedText;
    validarTextoExtraido(textoExtraido);
    
    return textoExtraido;
  } catch (error) {
    if (error instanceof ErrorOCR) {
      throw error;
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new ErrorOCR("Tiempo de espera agotado al procesar el documento con OCR.Space");
    }

    if (error.response) {
      throw new ErrorOCR(`Error en OCR.Space: ${error.response.data?.ErrorMessage || error.message}`);
    }
    
    throw new ErrorOCR(error.message || "Error al conectar con OCR.Space");
  } finally {
    // Cerrar el stream si existe
    if (archivoStream && typeof archivoStream.destroy === 'function') {
      archivoStream.destroy();
    }
  }
};

const crearFormulario = (rutaArchivo) => {
  const datosFormulario = new FormData();
  const archivoStream = fs.createReadStream(rutaArchivo);

  datosFormulario.append("file", archivoStream);
  datosFormulario.append("language", "spa");
  datosFormulario.append("isOverlayRequired", "false");

  return { datosFormulario, archivoStream };
};

const enviarSolicitudOCR = async (datosFormulario) => {
  // Validar que existe la clave API de OCR
  if (!process.env.OCR) {
    throw new ErrorOCR("Clave API de OCR no configurada en las variables de entorno");
  }

  return await axios.post(
    "https://api.ocr.space/parse/image",
    datosFormulario,
    {
      headers: {
        ...datosFormulario.getHeaders(),
        apikey: process.env.OCR,
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000, // 30 segundos de timeout
    }
  );
};

const validarRespuestaOCR = (data) => {
  if (data.IsErroredOnProcessing) {
    throw new ErrorOCR("Error al procesar el documento con OCR.Space");
  }

  if (!data.ParsedResults || data.ParsedResults.length === 0) {
    throw new ErrorOCR("No se pudo extraer texto del documento");
  }
};

const validarTextoExtraido = (texto) => {
  if (!texto || texto.trim() === "") {
    throw new ErrorOCR("El documento no contiene texto legible");
  }
};

export default ocrApi;
