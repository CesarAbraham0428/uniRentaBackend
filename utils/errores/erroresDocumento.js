export class ErrorDocumento extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorDocumento';
    this.codigoEstado = 400;
    this.errorControlado = true;
    this.tipo = 'DOCUMENTO';
  }
}

export class ErrorOCR extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorOCR';
    this.codigoEstado = 500;
    this.errorControlado = true;
    this.tipo = 'OCR';
  }
}

export class ErrorValidacionDocumento extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorValidacionDocumento';
    this.codigoEstado = 400;
    this.errorControlado = true;
    this.tipo = 'VALIDACION_DOCUMENTO';
  }
}

export class ErrorBaseDatos extends Error {
  constructor(mensaje) {
    super(mensaje);
    this.name = 'ErrorBaseDatos';
    this.codigoEstado = 400;
    this.errorControlado = true;
    this.tipo = 'BASE_DATOS';
  }
}