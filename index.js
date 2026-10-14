require('dotenv').config();

const { connectDB } = require('./database');
const { obtenerCitas } = require('./services/citasService');
const { procesarYEnviarEmails } = require('./services/emailNotificacionService');

/**
 * Vista: citas pendientes de correo de programación (Correo = 0).
 * Script: sql/Cnsta_Correo_CitasProgramadas.sql
 */
const VISTA_CITAS_PROGRAMADAS = '[Cnsta Correo CitasProgramadas]';

/**
 * Vista: citas de mañana con confirmación ya enviada (Correo = 1).
 * Script: sql/Cnsta_Correo_CitasManana.sql
 */
const VISTA_CITAS_MANANA = '[Cnsta Correo CitasManana]';

let procesando = false;

/**
 * Ciclo: 1) confirmación al programar  2) recordatorio de mañana.
 */
async function iniciarCicloDinamico() {
    const horaActual = new Date().getHours();
    if (horaActual < 8 || horaActual >= 20) {
        console.log('Fuera del horario de envío (8 AM - 8 PM). Esperando 15 minutos para reevaluar.');
        setTimeout(iniciarCicloDinamico, 15 * 60 * 1000);
        return;
    }

    if (procesando) return;

    procesando = true;
    let enviados = 0;
    let fallidos = 0;
    let limiteSmtp = false;

    const acumular = (resultado) => {
        enviados += resultado.enviados;
        fallidos += resultado.fallidos;
        limiteSmtp = limiteSmtp || resultado.limiteSmtp;
    };

    console.log('\n--- Iniciando ciclo de revisión de citas (email) ---');
    try {
        console.log('1) Buscando citas programadas pendientes de confirmación...');
        const citasProgramadas = await obtenerCitas(VISTA_CITAS_PROGRAMADAS);
        if (citasProgramadas.length > 0) {
            console.log(`Encontradas ${citasProgramadas.length} citas programadas.`);
            acumular(await procesarYEnviarEmails(citasProgramadas, 'asignada'));
        } else {
            console.log('No hay citas programadas pendientes.');
        }

        if (!limiteSmtp) {
            console.log('2) Buscando recordatorios para citas de mañana...');
            const citasManana = await obtenerCitas(VISTA_CITAS_MANANA);
            if (citasManana.length > 0) {
                console.log(`Encontrados ${citasManana.length} recordatorios de mañana.`);
                acumular(await procesarYEnviarEmails(citasManana, 'recordatorio'));
            } else {
                console.log('No hay recordatorios de mañana pendientes.');
            }
        }
    } catch (error) {
        console.error('Error durante el ciclo de notificaciones:', error);
    } finally {
        procesando = false;
        console.log('--- Ciclo de revisión finalizado ---');
    }

    const minutosVacio = parseInt(process.env.POLLING_INTERVAL_EMPTY_MINUTES || '15', 10);
    const minutosBloqueo = parseInt(process.env.SMTP_LIMIT_WAIT_MINUTES || '60', 10);
    let proximaEspera;

    if (limiteSmtp) {
        proximaEspera = minutosBloqueo * 60 * 1000;
        console.log(`Cuenta SMTP bloqueada por exceso de envíos. Esperando ${minutosBloqueo} minutos antes de reintentar...\n`);
    } else if (enviados > 0) {
        proximaEspera = 60 * 1000;
        console.log(`Se enviaron ${enviados} correos. Programando reevaluación en 1 minuto...\n`);
    } else if (fallidos > 0) {
        proximaEspera = minutosVacio * 60 * 1000;
        console.log(`Hubo ${fallidos} envíos fallidos. Esperando ${minutosVacio} minutos antes de reintentar...\n`);
    } else {
        proximaEspera = minutosVacio * 60 * 1000;
        console.log(`No se encontraron citas. Esperando ${minutosVacio} minutos antes del siguiente ciclo...\n`);
    }

    setTimeout(iniciarCicloDinamico, proximaEspera);
}

async function main() {
    console.log('Iniciando bot de recordatorios por correo electrónico...');
    try {
        await connectDB();
        console.log('Conexión a Base de Datos iniciada correctamente.');
        await iniciarCicloDinamico();
    } catch (err) {
        console.error('Error al iniciar la aplicación:', err);
        process.exit(1);
    }
}

main();
