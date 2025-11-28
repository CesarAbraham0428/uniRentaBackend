// services/prefacturaEmailService.js
import nodemailer from "nodemailer";
import EstudianteUnidad from "../models/estudiante_unidad.js";
import Estudiante from "../models/estudiante.js";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function enviarPrefacturaEmail({ estudianteUnidadId, detalle }) {
  const asignacion = await EstudianteUnidad.findByPk(estudianteUnidadId);
  if (!asignacion) throw new Error("Asignación no encontrada");

  const estudiante = await Estudiante.findByPk(asignacion.estudiante_id);
  if (!estudiante || !estudiante.email) {
    throw new Error("Estudiante sin email");
  }

  const to = estudiante.email;
  const nombre = estudiante.nombre || "";
  const appName = "UniRenta";

  const fechaCorteDate = detalle.fecha_corte
    ? new Date(detalle.fecha_corte)
    : new Date();

  const fechaCorteStr = new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fechaCorteDate);

  const nombreUnidad = detalle.nombre_unidad || "Unidad asignada";
  const precioBase = Number(detalle.precio_base || 0);

  const serviciosVigentes = Array.isArray(detalle.servicios_vigentes)
    ? detalle.servicios_vigentes
    : [];

  const serviciosFuturos = Array.isArray(detalle.servicios_futuros)
    ? detalle.servicios_futuros
    : [];

  const getServicioNombre = (srv) =>
    srv.nombre || srv.descripcion || "Servicio extra";

  const getServicioPrecio = (srv) =>
    Number(srv.precio ?? srv.precio_snapshot ?? srv.monto ?? 0);

  const totalExtrasVigentes = serviciosVigentes.reduce(
    (sum, s) => sum + getServicioPrecio(s),
    0
  );

  const totalExtrasFuturos = serviciosFuturos.reduce(
    (sum, s) => sum + getServicioPrecio(s),
    0
  );

  // Lo que paga hoy (unidad + extras vigentes)
  const totalActual = precioBase + totalExtrasVigentes;
  // Lo que pagará en el siguiente corte con los nuevos servicios
  const totalConCambios = precioBase + totalExtrasVigentes + totalExtrasFuturos;
  const diferencia = totalConCambios - totalActual;

  // Si no hay servicios futuros, asumimos que ya todo es vigente → "Factura"
  const esFactura = serviciosFuturos.length === 0;

  const tituloCorreo = esFactura
    ? "Factura de tus servicios extra"
    : "Pre-factura de tus servicios extra";

  const subject = esFactura
    ? "Factura de tus servicios UniRenta"
    : "Pre-factura de tus servicios UniRenta";

  // ---------------- TEXTO PLANO ----------------
  const lineaDescripcionTexto = esFactura
    ? `Esta es tu factura de la unidad y los servicios extra que se están cobrando en tu fecha de corte: Hoy.`
    : `Esta es tu pre-factura de la unidad y los servicios extra que tendrás activos en tu siguiente fecha de corte: ${fechaCorteStr}.`;

  const textoVigentes =
    serviciosVigentes.length > 0
      ? serviciosVigentes
          .map(
            (s) =>
              `- ${getServicioNombre(s)}: $${getServicioPrecio(s).toFixed(
                2
              )} MXN / mes`
          )
          .join("\n")
      : "(Sin servicios extra vigentes actualmente)";

  const textoFuturos =
    serviciosFuturos.length > 0
      ? serviciosFuturos
          .map(
            (s) =>
              `- ${getServicioNombre(s)}: $${getServicioPrecio(s).toFixed(
                2
              )} MXN / mes`
          )
          .join("\n")
      : "(No hay nuevos servicios extra para el próximo corte)";

  const text = `Hola ${nombre},

${lineaDescripcionTexto}

Unidad base:
- ${nombreUnidad} - $${precioBase.toFixed(2)} MXN / mes

Lo que pagas actualmente (unidad + servicios vigentes):
${textoVigentes}

Total actual: $${totalActual.toFixed(2)} MXN / mes

Lo que pagarás con los nuevos servicios (unidad + vigentes + futuros):
${textoFuturos}

Total con nuevos servicios: $${totalConCambios.toFixed(2)} MXN / mes
Diferencia aproximada: $${diferencia.toFixed(2)} MXN / mes

NOTA:
- Esta es una ${esFactura ? "FACTURA" : "PRE-FACTURA"} informativa.
- Si realizaste cambios recientemente (agregaste o quitaste servicios),
  esta versión reemplaza cualquier correo anterior, así que
  por favor ignora las versiones viejas y considera solo esta última.

${appName}
`;

  // ---------------- HTML ----------------

  // Tabla de servicios vigentes
  let filasVigentesHtml = "";

  if (serviciosVigentes.length > 0) {
    for (const srv of serviciosVigentes) {
      const nombreSrv = getServicioNombre(srv);
      const precioSrv = getServicioPrecio(srv);

      filasVigentesHtml += `
        <tr>
          <td style="padding:4px 8px;">${nombreSrv}</td>
          <td style="padding:4px 8px; text-align:right;">
            $${precioSrv.toFixed(2)} MXN / mes
          </td>
        </tr>
      `;
    }
  } else {
    filasVigentesHtml = `
      <tr>
        <td colspan="2" style="padding:4px 8px; text-align:left; color:#777; font-size:13px;">
          (Sin servicios extra vigentes actualmente)
        </td>
      </tr>
    `;
  }

  // Tabla de servicios futuros
  let filasFuturosHtml = "";

  if (serviciosFuturos.length > 0) {
    for (const srv of serviciosFuturos) {
      const nombreSrv = getServicioNombre(srv);
      const precioSrv = getServicioPrecio(srv);

      filasFuturosHtml += `
        <tr>
          <td style="padding:4px 8px;">${nombreSrv}</td>
          <td style="padding:4px 8px; text-align:right;">
            $${precioSrv.toFixed(2)} MXN / mes
          </td>
        </tr>
      `;
    }
  } else {
    filasFuturosHtml = `
      <tr>
        <td colspan="2" style="padding:4px 8px; text-align:left; color:#777; font-size:13px;">
          (No hay nuevos servicios extra para el próximo corte)
        </td>
      </tr>
    `;
  }

  const lineaDescripcionHtml = esFactura
    ? `Esta es tu factura de la unidad y los servicios extra que se están cobrando en tu fecha de corte: <strong>Hoy</strong>.`
    : `Esta es tu pre-factura de la unidad y los servicios extra que tendrás activos en tu siguiente fecha de corte:
        <strong>${fechaCorteStr}</strong>.`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>${tituloCorreo} - ${appName}</title>
  <link href="https://fonts.googleapis.com/css2?family=Pacifico&family=Playwrite+DE+SAS&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; font-family: Arial, Helvetica, sans-serif; background-color:#f6f6f6;">
  <div style="max-width:600px; margin:0 auto; padding:16px;">
    <div style="background:#ffffff; padding:20px; border-radius:8px; box-shadow:0 2px 6px rgba(0,0,0,0.08);">
      <h1 style="font-family:'Pacifico', cursive; margin:0 0 4px 0; font-size:28px; color:#333;">
        ${appName}
      </h1>
      <p style="margin:0 0 16px 0; color:#777; font-size:13px;">
        Plataforma de renta de unidades
      </p>

      <h2 style="margin:8px 0 12px 0; font-size:20px; color:#333;">
        ${tituloCorreo}
      </h2>

      <p style="margin:0 0 8px 0; font-size:14px; color:#333;">
        Hola <strong>${nombre}</strong>,
      </p>

      <p style="margin:0 0 12px 0; font-size:14px; color:#333; line-height:1.5;">
        ${lineaDescripcionHtml}
      </p>

      <!-- Unidad base (solo una vez) -->
      <p style="margin:0 0 12px 0; font-size:14px; color:#333;">
        Unidad: <strong>${nombreUnidad}</strong> — 
        <strong>$${precioBase.toFixed(2)} MXN / mes</strong>
      </p>

      <!-- Sección: lo que paga actualmente -->
      <h3 style="margin:12px 0 6px 0; font-size:16px; color:#333;">
        Lo que pagas actualmente (unidad + servicios vigentes)
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:8px;">
        <thead>
          <tr>
            <th align="left" style="padding:6px 8px; border-bottom:1px solid #ddd; font-size:13px; color:#555;">
              Servicio vigente
            </th>
            <th align="right" style="padding:6px 8px; border-bottom:1px solid #ddd; font-size:13px; color:#555;">
              Importe
            </th>
          </tr>
        </thead>
        <tbody>
          ${filasVigentesHtml}
          <tr>
            <td style="padding:8px 8px; border-top:1px solid #ddd; font-weight:bold;">
              Total actual (unidad + vigentes)
            </td>
            <td style="padding:8px 8px; border-top:1px solid #ddd; text-align:right; font-weight:bold;">
              $${totalActual.toFixed(2)} MXN / mes
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Sección: lo que pagará con los nuevos servicios -->
      <h3 style="margin:16px 0 6px 0; font-size:16px; color:#333;">
        Lo que pagarás con los nuevos servicios (unidad + vigentes + futuros)
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; margin-bottom:8px;">
        <thead>
          <tr>
            <th align="left" style="padding:6px 8px; border-bottom:1px solid #ddd; font-size:13px; color:#555;">
              Servicio futuro
            </th>
            <th align="right" style="padding:6px 8px; border-bottom:1px solid #ddd; font-size:13px; color:#555;">
              Importe
            </th>
          </tr>
        </thead>
        <tbody>
          ${filasFuturosHtml}
          <tr>
            <td style="padding:8px 8px; border-top:1px solid #ddd; font-weight:bold;">
              Total con nuevos servicios
            </td>
            <td style="padding:8px 8px; border-top:1px solid #ddd; text-align:right; font-weight:bold;">
              $${totalConCambios.toFixed(2)} MXN / mes
            </td>
          </tr>
        </tbody>
      </table>

      <p style="margin:4px 0 0 0; font-size:12px; color:#555;">
        Diferencia aproximada respecto a lo que pagas hoy:
        <strong>$${diferencia.toFixed(2)} MXN / mes</strong>
      </p>

      <p style="margin:12px 0 0 0; font-size:12px; color:#999; line-height:1.5;">
        <strong>Nota:</strong> Esta es una <strong>${
          esFactura ? "factura" : "pre-factura"
        } informativa</strong>. 
        El cobro real se realizará en la fecha de corte indicada,
        de acuerdo con la unidad y los servicios extra que tengas activos en ese momento.
        <br />
        Si vuelves a generar otra ${
          esFactura ? "factura" : "pre-factura"
        } (por ejemplo, al agregar o quitar servicios), 
        por favor ignora las versiones anteriores y considera únicamente esta última.
      </p>
    </div>

    <p style="margin:12px 0 0 0; font-size:11px; color:#aaa; text-align:center;">
      Este mensaje fue enviado automáticamente por ${appName}.
    </p>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
}
