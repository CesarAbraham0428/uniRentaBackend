import puppeteer from 'puppeteer';
import { enviarEmail } from '../config/email.js';
import serviciosService from './serviciosService.js';
import EstudianteUnidad from '../models/estudiante_unidad.js';
import Estudiante from '../models/estudiante.js';
import Unidad from '../models/unidad.js';
import Propiedad from '../models/propiedad.js';
import Rentero from '../models/rentero.js';

class FacturaService {
  /**
   * Genera el HTML de la factura
   */
  generarHTMLFactura(datosFactura) {
    const {
      numero_factura,
      fecha,
      estudiante,
      rentero,
      propiedad,
      unidad,
      precio_base,
      servicios,
      precio_total
    } = datosFactura;

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Factura - UniRenta</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #333;
      line-height: 1.6;
      padding: 40px;
      background: #f5f5f5;
    }

    .factura-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #2563eb;
    }

    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
    }

    .factura-info {
      text-align: right;
    }

    .factura-numero {
      font-size: 24px;
      font-weight: bold;
      color: #2563eb;
      margin-bottom: 5px;
    }

    .fecha {
      color: #666;
      font-size: 14px;
    }

    .seccion {
      margin-bottom: 30px;
    }

    .seccion-titulo {
      font-size: 14px;
      font-weight: bold;
      color: #666;
      text-transform: uppercase;
      margin-bottom: 10px;
      letter-spacing: 0.5px;
    }

    .datos-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }

    .dato {
      margin-bottom: 8px;
    }

    .dato-label {
      font-size: 12px;
      color: #666;
      font-weight: 600;
    }

    .dato-valor {
      font-size: 14px;
      color: #333;
      margin-top: 2px;
    }

    .tabla {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    .tabla thead {
      background: #f8fafc;
    }

    .tabla th {
      padding: 12px;
      text-align: left;
      font-size: 12px;
      font-weight: 600;
      color: #666;
      text-transform: uppercase;
      border-bottom: 2px solid #e5e7eb;
    }

    .tabla td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }

    .tabla tbody tr:last-child td {
      border-bottom: none;
    }

    .tabla .precio {
      text-align: right;
      font-weight: 500;
    }

    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .badge-base {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge-extra {
      background: #fef3c7;
      color: #92400e;
    }

    .totales {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }

    .total-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      font-size: 14px;
    }

    .total-final {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 2px solid #2563eb;
    }

    .total-final .total-label {
      font-size: 18px;
      font-weight: bold;
      color: #2563eb;
    }

    .total-final .total-valor {
      font-size: 28px;
      font-weight: bold;
      color: #2563eb;
    }

    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #666;
      font-size: 12px;
    }

    .nota {
      background: #f8fafc;
      padding: 15px;
      border-radius: 8px;
      margin-top: 30px;
      font-size: 13px;
      color: #666;
      line-height: 1.8;
    }
  </style>
</head>
<body>
  <div class="factura-container">
    <!-- Header -->
    <div class="header">
      <div class="logo">🏠 UniRenta</div>
      <div class="factura-info">
        <div class="factura-numero">Factura #${numero_factura}</div>
        <div class="fecha">${fecha}</div>
      </div>
    </div>

    <!-- Información de partes -->
    <div class="datos-grid">
      <!-- Rentero -->
      <div class="seccion">
        <div class="seccion-titulo">Arrendador</div>
        <div class="dato">
          <div class="dato-label">Nombre</div>
          <div class="dato-valor">${rentero.nombre}</div>
        </div>
        <div class="dato">
          <div class="dato-label">Email</div>
          <div class="dato-valor">${rentero.email}</div>
        </div>
        ${rentero.telefono ? `
        <div class="dato">
          <div class="dato-label">Teléfono</div>
          <div class="dato-valor">${rentero.telefono}</div>
        </div>
        ` : ''}
      </div>

      <!-- Estudiante -->
      <div class="seccion">
        <div class="seccion-titulo">Arrendatario</div>
        <div class="dato">
          <div class="dato-label">Nombre</div>
          <div class="dato-valor">${estudiante.nombre}</div>
        </div>
        <div class="dato">
          <div class="dato-label">Email</div>
          <div class="dato-valor">${estudiante.email}</div>
        </div>
      </div>
    </div>

    <!-- Propiedad y Unidad -->
    <div class="seccion">
      <div class="seccion-titulo">Detalles del departamento</div>
      <div class="dato">
        <div class="dato-label">Propiedad</div>
        <div class="dato-valor">${propiedad.nombre}</div>
      </div>
      <div class="dato">
        <div class="dato-label">Dirección</div>
        <div class="dato-valor">${propiedad.calle} ${propiedad.numero}, ${propiedad.colonia}, ${propiedad.municipio}</div>
      </div>
      <div class="dato">
        <div class="dato-label">Departamento</div>
        <div class="dato-valor">${unidad.nombre}</div>
      </div>
    </div>

    <!-- Tabla de servicios -->
    <div class="seccion">
      <div class="seccion-titulo">Desglose de Servicios</div>
      <table class="tabla">
        <thead>
          <tr>
            <th>Concepto</th>
            <th style="text-align: center;">Tipo</th>
            <th style="text-align: right;">Precio</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>${unidad.nombre} - Renta Base</strong></td>
            <td style="text-align: center;">-</td>
            <td class="precio">$${precio_base.toFixed(2)}</td>
          </tr>
          ${servicios.map(servicio => `
          <tr>
            <td>${servicio.nombre}</td>
            <td style="text-align: center;">
              <span class="badge ${servicio.es_base ? 'badge-base' : 'badge-extra'}">
                ${servicio.es_base ? 'Base' : 'Extra'}
              </span>
            </td>
            <td class="precio">$${parseFloat(servicio.precio).toFixed(2)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Totales -->
    <div class="totales">
      <div class="total-row">
        <span>Renta Base:</span>
        <span>$${precio_base.toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Servicios (${servicios.length}):</span>
        <span>$${servicios.reduce((sum, s) => sum + parseFloat(s.precio), 0).toFixed(2)}</span>
      </div>
      <div class="total-row total-final">
        <span class="total-label">Total Mensual:</span>
        <span class="total-valor">$${precio_total.toFixed(2)}</span>
      </div>
    </div>

    <!-- Nota -->
    <div class="nota">
      <strong>Nota:</strong> Esta factura detalla el costo mensual de la renta de la unidad asignada,
      incluyendo los servicios base (obligatorios) y servicios adicionales seleccionados.
      Los servicios base incluyen agua, luz e internet básico. Los servicios extra pueden ser
      modificados según tus necesidades.
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><strong>UniRenta</strong> - Sistema de Gestión de Rentas Universitarias</p>
      <p>Este documento es generado automáticamente</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Genera un PDF de la factura
   */
  async generarPDFFactura(datosFactura) {
    let browser;
    try {
      const html = this.generarHTMLFactura(datosFactura);

      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      await browser.close();

      return pdfBuffer;
    } catch (error) {
      if (browser) {
        await browser.close();
      }
      throw error;
    }
  }

  /**
   * Obtiene los datos completos para la factura
   */
  async obtenerDatosFactura(estudianteUnidadId) {
    // Obtener precio con servicios usando el servicio existente
    const precioData = await serviciosService.calcularPrecioConServicios(estudianteUnidadId);

    // Obtener información completa de la asignación
    const asignacion = await EstudianteUnidad.findByPk(estudianteUnidadId, {
      include: [
        {
          model: Estudiante,
          as: 'estudiante',
          attributes: ['id', 'nombre', 'email']
        },
        {
          model: Unidad,
          as: 'unidad',
          include: [
            {
              model: Propiedad,
              as: 'propiedad',
              include: [
                {
                  model: Rentero,
                  as: 'rentero',
                  attributes: ['id', 'nombre', 'email', 'telefono']
                }
              ]
            }
          ]
        }
      ]
    });

    if (!asignacion) {
      throw new Error('Asignación no encontrada');
    }

    // Generar número de factura único
    const numero_factura = `${String(estudianteUnidadId).padStart(6, '0')}-${Date.now()}`;

    // Fecha actual formateada
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return {
      numero_factura,
      fecha,
      estudiante: asignacion.estudiante,
      rentero: asignacion.unidad.propiedad.rentero,
      propiedad: asignacion.unidad.propiedad,
      unidad: {
        nombre: precioData.nombre_unidad,
        id: precioData.unidad_id
      },
      precio_base: precioData.precio_base,
      servicios: precioData.servicios,
      precio_total: precioData.precio_total
    };
  }

  /**
   * Genera y envía la factura por email
   */
  async generarYEnviarFactura(estudianteUnidadId) {
    try {
      // Obtener datos de la factura
      const datosFactura = await this.obtenerDatosFactura(estudianteUnidadId);

      // Generar PDF
      const pdfBuffer = await this.generarPDFFactura(datosFactura);

      // Enviar email con PDF adjunto
      const resultado = await enviarEmail({
        to: datosFactura.estudiante.email,
        subject: `Factura de Renta - ${datosFactura.unidad.nombre}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">¡Bienvenido a tu nueva unidad! 🏠</h2>
            <p>Hola <strong>${datosFactura.estudiante.nombre}</strong>,</p>
            <p>Tu unidad ha sido asignada exitosamente. Adjunto encontrarás el detalle de tu factura mensual.</p>

            <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #333;">Resumen:</h3>
              <p style="margin: 5px 0;"><strong>Unidad:</strong> ${datosFactura.unidad.nombre}</p>
              <p style="margin: 5px 0;"><strong>Propiedad:</strong> ${datosFactura.propiedad.nombre}</p>
              <p style="margin: 5px 0; font-size: 18px; color: #2563eb;">
                <strong>Total Mensual: $${datosFactura.precio_total.toFixed(2)}</strong>
              </p>
            </div>

            <p>Si tienes alguna duda, puedes contactar a tu arrendador:</p>
            <p style="margin: 5px 0;"><strong>${datosFactura.rentero.nombre}</strong></p>
            <p style="margin: 5px 0;">${datosFactura.rentero.email}</p>

            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
            <p style="color: #666; font-size: 12px;">
              Este es un correo automático de UniRenta. Por favor no respondas a este mensaje.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: `factura-${datosFactura.numero_factura}.pdf`,
            content: pdfBuffer,
            contentType: 'application/pdf'
          }
        ]
      });

      return {
        success: true,
        mensaje: 'Factura generada y enviada exitosamente',
        data: {
          numero_factura: datosFactura.numero_factura,
          email_enviado_a: datosFactura.estudiante.email,
          messageId: resultado.messageId
        }
      };
    } catch (error) {
      console.error('Error generando/enviando factura:', error);
      throw error;
    }
  }
}

export default new FacturaService();
