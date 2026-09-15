require('dotenv').config();

const { connectDB } = require('./database');
const { obtenerCitas } = require('./services/citasService');
const { procesarYEnviarEmails } = require('./services/emailNotificacionService');

/**
 * Vista SQL de citas pendientes de correo.
 * Script y documentación: sql/Cnsta_Correo_CitasProgramadas.sql
 * Debe existir en la BD (Medimujer) antes de operar el bot.
 */
const VISTA_CITAS_PROGRAMADAS = '[Cnsta Correo CitasProgramadas]';

let procesando = false;

/**
 * Ciclo de revisión de citas programadas y envío de correos.
 * Se reprograma a sí mismo según el resultado (polling adaptativo).
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
    let huboCitas = false;

    console.log('\n--- Iniciando ciclo de revisión de citas (email) ---');
    try {
        console.log('Buscando citas programadas pendientes de notificación...');
        const citas = await obtenerCitas(VISTA_CITAS_PROGRAMADAS);

        if (citas.length > 0) {
            console.log(`Encontradas ${citas.length} citas programadas.`);
            await procesarYEnviarEmails(citas);
            huboCitas = true;
        } else {
            console.log('No hay citas programadas pendientes de notificación.');
        }
    } catch (error) {
        console.error('Error durante el ciclo de notificaciones:', error);
    } finally {
        procesando = false;
        console.log('--- Ciclo de revisión finalizado ---');
    }

    let proximaEspera = 60 * 1000;
    if (!huboCitas) {
        const minutosVacio = parseInt(process.env.POLLING_INTERVAL_EMPTY_MINUTES || '15', 10);
        proximaEspera = minutosVacio * 60 * 1000;
        console.log(`No se encontraron citas. Esperando ${minutosVacio} minutos antes del siguiente ciclo...\n`);
    } else {
        console.log('Citas procesadas en este ciclo. Programando reevaluación en 1 minuto...\n');
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
