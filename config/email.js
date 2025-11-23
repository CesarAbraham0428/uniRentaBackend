import nodemailer from 'nodemailer';

/**
 * Configuración del transporter de nodemailer
 * Usa variables de entorno para credenciales
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true para 465, false para otros puertos
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

/**
 * Verifica la conexión con el servidor de email
 */
export const verificarConexionEmail = async () => {
  try {
    await transporter.verify();
    console.log('✅ Servidor de email configurado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error en configuración de email:', error.message);
    return false;
  }
};

/**
 * Envía un email
 * @param {object} opciones - Opciones del email
 * @param {string} opciones.to - Destinatario
 * @param {string} opciones.subject - Asunto
 * @param {string} opciones.html - Contenido HTML
 * @param {array} opciones.attachments - Archivos adjuntos
 */
export const enviarEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const info = await transporter.sendMail({
      from: `"UniRenta" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      attachments
    });

    console.log('✅ Email enviado:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    throw error;
  }
};

export default transporter;
