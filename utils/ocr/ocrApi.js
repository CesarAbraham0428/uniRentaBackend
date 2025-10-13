import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { ErrorOCR } from "../errores/erroresDocumento.js";

const ocrApi = async (rutaArchivo) => {
  try {
    const datosFormulario = crearFormulario(rutaArchivo);
    const respuesta = await enviarSolicitudOCR(datosFormulario);
    
    validarRespuestaOCR(respuesta.data);
    
    const textoExtraido = respuesta.data.ParsedResults[0].ParsedText;
    validarTextoExtraido(textoExtraido);
    
    return textoExtraido;
  } catch (error) {
    if (error instanceof ErrorOCR) {
      throw error;
    }
    
    if (error.response) {
      throw new ErrorOCR(`Error en OCR.Space: ${error.response.data?.ErrorMessage || error.message}`);
    }
    
    throw new ErrorOCR(error.message || "Error al conectar con OCR.Space");
  }
};

const crearFormulario = (rutaArchivo) => {
  const datosFormulario = new FormData();
  const archivoStream = fs.createReadStream(rutaArchivo);
  
  datosFormulario.append("file", archivoStream);
  datosFormulario.append("language", "spa");
  datosFormulario.append("isOverlayRequired", "false");
  
  return datosFormulario;
};

const enviarSolicitudOCR = async (datosFormulario) => {
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
