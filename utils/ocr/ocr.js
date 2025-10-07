import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import ErrorAplicacion from "../errores/appError.js";

const ocrClient = async (rutaArchivo) => {
  try {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(rutaArchivo));
    formData.append("language", "spa");
    formData.append("isOverlayRequired", false);

    const response = await axios.post("https://api.ocr.space/parse/image", formData, {
      headers: {
        apikey: process.env.OCR,
        ...formData.getHeaders(),
      },
    });

    if (response.data.IsErroredOnProcessing) {
      throw new ErrorAplicacion("Error al procesar el documento con OCR.Space", 400);
    }

    const textoExtraido = response.data.ParsedResults[0].ParsedText;
    return textoExtraido;
  } catch (error) {
    throw new ErrorAplicacion(error.message || "Error al conectar con OCR.Space", 500);
  }
};

export default ocrClient;
