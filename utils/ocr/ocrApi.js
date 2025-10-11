import axios from "axios";
import FormData from "form-data";
import fs from "fs";

import ErrorAplicacion from "../errores/appError.js";

const ocrAPi = async (rutaArchivo) => {
  try {
    const datosFormulario  = new FormData();
    datosFormulario .append("file", fs.createReadStream(rutaArchivo));
    datosFormulario .append("language", "spa");
    datosFormulario .append("isOverlayRequired", false);

    const respuesta = await axios.post("https://api.ocr.space/parse/image", datosFormulario , {
      headers: {
        apikey: process.env.OCR,
        ...datosFormulario .getHeaders(),
      },
    });

    if (respuesta.data.IsErroredOnProcessing) {
      throw new ErrorAplicacion("Error al procesar el documento con OCR.Space", 400);
    }

    const textoExtraido = respuesta.data.ParsedResults[0].ParsedText;
    return textoExtraido;
  } catch (error) {
    throw new ErrorAplicacion(error.message || "Error al conectar con OCR.Space", 500);
  }
};

export default ocrAPi;
