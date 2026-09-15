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
    let huboCitas = false;

    console.log('\n--- Iniciando ciclo de revisión de citas (email) ---');
    try {
        console.log('1) Buscando citas programadas pendientes de confirmación...');
        const citasProgramadas = await obtenerCitas(VISTA_CITAS_PROGRAMADAS);
        if (citasProgramadas.length > 0) {
            console.log(`Encontradas ${citasProgramadas.length} citas programadas.`);
            await procesarYEnviarEmails(citasProgramadas, 'asignada');
            huboCitas = true;
        } else {
            console.log('No hay citas programadas pendientes.');
        }

        console.log('2) Buscando recordatorios para citas de mañana...');
        const citasManana = await obtenerCitas(VISTA_CITAS_MANANA);
        if (citasManana.length > 0) {
            console.log(`Encontrados ${citasManana.length} recordatorios de mañana.`);
            await procesarYEnviarEmails(citasManana, 'recordatorio');
            huboCitas = true;
        } else {
            console.log('No hay recordatorios de mañana pendientes.');
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
