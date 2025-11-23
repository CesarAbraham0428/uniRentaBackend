import crypto from 'crypto';
import fs from 'fs';

/**
 * Utilidad para calcular hash SHA256 del contenido de archivos
 * Solo lo necesario en el sistema OCR
 */
export class UtilidadHash {
  /**
   * Calcula el hash SHA256 del contenido de un archivo (método async)
   * @param {string} rutaArchivo - Ruta absoluta del archivo
   * @param {Object} opciones - Opciones de configuración
   * @param {number} opciones.chunkSize - Tamaño del chunk para lectura (default: 64KB)
   * @returns {Promise<string>} - Hash SHA256 en formato hexadecimal
   */
  static async calcularHashArchivo(rutaArchivo, opciones = {}) {
    const { chunkSize = 64 * 1024 } = opciones;

    // Validar que el archivo existe
    await UtilidadHash._validarArchivo(rutaArchivo);

    return await UtilidadHash._calcularHashAsync(rutaArchivo, chunkSize);
  }

  /**
   * Calcula hash usando streams asíncronos
   * @param {string} rutaArchivo - Ruta del archivo
   * @param {number} chunkSize - Tamaño del chunk
   * @returns {Promise<string>}
   * @private
   */
  static async _calcularHashAsync(rutaArchivo, chunkSize) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(rutaArchivo, { 
        highWaterMark: chunkSize 
      });

      stream.on('data', (chunk) => {
        hash.update(chunk);
      });

      stream.on('end', () => {
        resolve(hash.digest('hex'));
      });

      stream.on('error', (error) => {
        reject(new Error(`Error leyendo archivo ${rutaArchivo}: ${error.message}`));
      });
    });
  }

  /**
   * Valida que el archivo exista y sea accesible
   * @param {string} rutaArchivo - Ruta del archivo
   * @private
   */
  static async _validarArchivo(rutaArchivo) {
    try {
      await fs.promises.access(rutaArchivo, fs.constants.R_OK);
    } catch (error) {
      if (error.code === 'ENOENT') {
        throw new Error(`Archivo no encontrado: ${rutaArchivo}`);
      } else if (error.code === 'EACCES') {
        throw new Error(`Sin permisos para leer el archivo: ${rutaArchivo}`);
      } else {
        throw new Error(`Error accediendo al archivo ${rutaArchivo}: ${error.message}`);
      }
    }
  }
}
