const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Obtiene o inicializa el transportador de correo SMTP.
 */
function obtenerTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            },
            tls: {
                rejectUnauthorized: false // Evita problemas con certificados autofirmados en algunos entornos
            }
        });
    }
    return transporter;
}

/**
 * Formatea una fecha y hora para presentación.
 */
function formatearFechaHora(fechaInicio, horaInicio) {
    const fecha = new Date(fechaInicio);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();

    const hora = new Date(horaInicio);
    const horaStr = String(hora.getHours()).padStart(2, '0');
    const minStr = String(hora.getMinutes()).padStart(2, '0');
    const horaFormat = `${horaStr}:${minStr}`;

    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesNombre = meses[fecha.getMonth()];

    return { dia, mes, anio, mesNombre, horaFormat };
}

/**
 * Genera el cuerpo HTML y el texto plano para el correo electrónico.
 */
function generarContenidoCorreo(cita, tipo) {
    const { dia, mesNombre, horaFormat } = formatearFechaHora(cita.Fecha_inicio, cita.Hora_inicio);
    const esAsignada = tipo === 'asignada';
    
    const titulo = esAsignada ? 'Confirmación de Cita Médica' : 'Recordatorio de Cita Médica';
    const saludo = `Estimada/o <strong>${cita.Nom_Paciente}</strong>,`;
    const intro = esAsignada 
        ? 'Le confirmamos que su cita médica en MEDIMUJER ha sido programada con éxito.'
        : 'Le recordamos que tiene una cita médica programada para el día de mañana en MEDIMUJER.';

    // Paleta de colores de MEDIMUJER (Tonos de rosa, morado y gris elegante)
    const colorPrimario = '#8e44ad'; // Morado cálido
    const colorSecundario = '#e91e63'; // Rosa brillante
    const colorFondo = '#f9f9f9';
    const colorTexto = '#333333';

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=device-width, initial-scale=1.0">
        <title>${titulo}</title>
        <style>
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: ${colorFondo};
                color: ${colorTexto};
                margin: 0;
                padding: 0;
                -webkit-font-smoothing: antialiased;
            }
            .container {
                max-width: 600px;
                margin: 20px auto;
                background-color: #ffffff;
                border-radius: 12px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.06);
                overflow: hidden;
                border-top: 6px solid ${colorPrimario};
            }
            .header {
                background: linear-gradient(135deg, ${colorPrimario} 0%, ${colorSecundario} 100%);
                color: #ffffff;
                text-align: center;
                padding: 30px 20px;
            }
            .header h1 {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: 1px;
                text-transform: uppercase;
            }
            .header p {
                margin: 5px 0 0 0;
                font-size: 14px;
                opacity: 0.9;
            }
            .content {
                padding: 30px;
            }
            .saludo {
                font-size: 18px;
                margin-bottom: 15px;
                color: ${colorPrimario};
            }
            .intro {
                font-size: 16px;
                line-height: 1.5;
                margin-bottom: 25px;
            }
            .details-box {
                background-color: #f5f0f6;
                border-left: 4px solid ${colorPrimario};
                border-radius: 6px;
                padding: 20px;
                margin-bottom: 25px;
            }
            .details-title {
                font-weight: bold;
                font-size: 16px;
                margin-bottom: 15px;
                color: ${colorPrimario};
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .detail-row {
                display: flex;
                margin-bottom: 10px;
                font-size: 15px;
            }
            .detail-label {
                width: 120px;
                font-weight: bold;
                color: #666;
            }
            .detail-value {
                flex: 1;
                color: #333;
            }
            .action-box {
                background-color: #fff9eb;
                border: 1px solid #ffeeba;
                border-radius: 6px;
                padding: 15px 20px;
                font-size: 14px;
                line-height: 1.5;
                color: #856404;
                margin-bottom: 25px;
                text-align: center;
            }
            .action-box strong {
                font-size: 16px;
                color: #533f03;
                display: block;
                margin-top: 5px;
            }
            .footer {
                background-color: #f1f1f1;
                padding: 20px;
                text-align: center;
                font-size: 12px;
                color: #777777;
                border-top: 1px solid #e5e5e5;
            }
            .footer p {
                margin: 5px 0;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>MEDIMUJER</h1>
                <p>Cuidado Integral para la Mujer</p>
            </div>
            
            <div class="content">
                <div class="saludo">${saludo}</div>
                <div class="intro">${intro}</div>
                
                <div class="details-box">
                    <div class="details-title">Detalles de su cita</div>
                    <div class="detail-row">
                        <div class="detail-label">🩺 Profesional:</div>
                        <div class="detail-value">${cita.Nom_profesional}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">📅 Fecha:</div>
                        <div class="detail-value">${dia} de ${mesNombre}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">⏰ Hora:</div>
                        <div class="detail-value">${horaFormat}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">📍 Dirección:</div>
                        <div class="detail-value">Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201. Medellín.</div>
                    </div>
                </div>

                <div class="action-box">
                    Si requiere realizar alguna modificación, reprogramar o cancelar su cita, por favor comuníquese directamente a nuestra línea de atención:
                    <strong>📞 317 508 4624</strong>
                </div>

                <p style="font-size: 14px; line-height: 1.5; color: #555;">
                    Agradecemos su confianza en MEDIMUJER. Por favor, llegue 10 minutos antes de la hora programada y recuerde llevar su documento de identidad y orden médica si aplica.
                </p>
            </div>
            
            <div class="footer">
                <p><strong>MEDIMUJER - Clínica de Especialistas</strong></p>
                <p>Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201. Medellín, Colombia.</p>
                <p>Este es un correo automático, por favor no responda directamente a este mensaje.</p>
            </div>
        </div>
    </body>
    </html>
    `;

    const text = `
Hola ${cita.Nom_Paciente},
${esAsignada ? 'Le confirmamos su cita médica en MEDIMUJER.' : 'Le recordamos su cita médica de mañana en MEDIMUJER.'}

Detalles de la cita:
- Profesional: ${cita.Nom_profesional}
- Fecha: ${dia} de ${mesNombre}
- Hora: ${horaFormat}
- Dirección: Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201. Medellín.

Para realizar algún cambio, reprogramar o cancelar su cita, comuníquese al número: 317 508 4624.

Atentamente,
MEDIMUJER
    `.trim();

    return { html, text };
}

/**
 * Envía un correo electrónico al paciente con los detalles de su cita.
 * @param {object} cita Datos de la cita médica
 * @param {string} tipo Tipo de cita ('asignada' o 'recordatorio')
 */
async function enviarEmailCita(cita, tipo) {
    // Si no tiene correo, no se puede enviar
    if (!cita.Correo || cita.Correo.trim() === '') {
        console.log(`[Email Service] El paciente ${cita.Nom_Paciente} no tiene correo registrado.`);
        return false;
    }

    let correoDestinatario = cita.Correo.trim();
    const esPrueba = process.env.EMAIL_TEST_MODE === 'true';

    // Si está en modo prueba, redirigimos el correo
    if (esPrueba) {
        const correoPrueba = process.env.EMAIL_TEST_ADDRESS;
        if (correoPrueba) {
            console.log(`[Email Service] [MODO PRUEBA ACTIVO] Redirigiendo correo de ${correoDestinatario} hacia ${correoPrueba}`);
            correoDestinatario = correoPrueba;
        } else {
            console.log(`[Email Service] [MODO PRUEBA ACTIVO] EMAIL_TEST_MODE es true pero EMAIL_TEST_ADDRESS no está definido. Omitiendo envío.`);
            return false;
        }
    }

    const { html, text } = generarContenidoCorreo(cita, tipo);
    const asunto = tipo === 'asignada' 
        ? 'Confirmación de su Cita Médica - MEDIMUJER'
        : 'Recordatorio de su Cita Médica de mañana - MEDIMUJER';

    try {
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"MEDIMUJER" <noreply@medimujer.com>',
            to: correoDestinatario,
            subject: asunto,
            text: text,
            html: html
        };

        const transport = obtenerTransporter();
        const info = await transport.sendMail(mailOptions);
        console.log(`[Email Service] Correo enviado con éxito a ${correoDestinatario} (ID Mensaje: ${info.messageId})`);
        return true;
    } catch (error) {
        console.error(`[Email Service] Error al enviar correo a ${correoDestinatario}:`, error.message);
        return false;
    }
}

module.exports = {
    enviarEmailCita
};
