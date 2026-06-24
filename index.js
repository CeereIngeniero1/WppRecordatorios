const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { connectDB } = require('./database');
const { obtenerCitas } = require('./services/citasService');
const { procesarYEnviarCitas } = require('./services/whatsappService');
const { generarMensajeAsignada, generarMensajeRecordatorio } = require('./mensajesPersonalizados');

// Instancia global para evitar que los ciclos se pisen si la BD tarda en responder
let procesando = false;

// Configuración inicial del cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
});

client.on('loading_screen', (percent, message) => {
    console.log('Cargando...', percent, message);
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el código QR con la aplicación de WhatsApp');
});

client.on('authenticated', () => {
    console.log('¡Autenticación exitosa!');
});

client.on('auth_failure', msg => {
    console.error('Fallo en la autenticación:', msg);
});

client.on('ready', async () => {
    console.log('¡El cliente de WhatsApp está listo!');
    
    try {
        await connectDB();
        console.log('Conexión a Base de Datos iniciada correctamente.');
        
        // Iniciamos el ciclo dinámico autoprogramado
        await iniciarCicloDinamico();
        
    } catch (err) {
        console.error('Error al conectar a la base de datos', err);
    }
});

// Evento para recibir mensajes (Útil para confirmar citas con un "Sí" o "No")
client.on('message', async (msg) => {
    const texto = msg.body.toLowerCase().trim();

    if (texto === 'si' || texto === 'sí') {
        msg.reply('Gracias por confirmar tu asistencia. Te esperamos en la clínica.');
        // Aquí puedes agregar lógica para actualizar la BD y marcar confirmación
    } else if (texto === 'no') {
        msg.reply('Entendido. Tu cita ha sido cancelada. Para re-agendar, por favor comunícate a nuestras líneas de atención.');
        // Aquí puedes agregar lógica para actualizar la BD y marcar cancelación
    }
});

/**
 * Función principal que orquesta el envío de notificaciones.
 * Utiliza `async/await` secuencial para evitar condiciones de carrera.
 */
/**
 * Función recursiva que orquesta la revisión y envío de citas, programándose
 * a sí misma de manera dinámica en base al resultado de la búsqueda de citas.
 */
async function iniciarCicloDinamico() {
    // 1. Verificar si estamos dentro del horario de envío (8 AM - 8 PM)
    const horaActual = new Date().getHours();
    if (horaActual < 8 || horaActual >= 20) {
        console.log('Fuera del horario de envío (8 AM - 8 PM). Esperando 15 minutos para reevaluar.');
        setTimeout(iniciarCicloDinamico, 15 * 60 * 1000);
        return;
    }

    // Si por alguna razón hay otro ciclo ejecutándose, salimos para no duplicar
    if (procesando) return;
    
    procesando = true;
    let huboCitas = false;

    console.log('\n--- Iniciando ciclo de revisión de citas ---');
    try {
        // 1. Obtener y procesar citas de HOY (Asignadas)
        console.log('Buscando citas asignadas recientes...');
        const citasHoy = await obtenerCitas('[Cnsta Wpp CitasProgramadas]');
        if (citasHoy.length > 0) {
            console.log(`Encontradas ${citasHoy.length} citas asignadas.`);
            await procesarYEnviarCitas(client, citasHoy, 1, generarMensajeAsignada);
            huboCitas = true;
        } else {
            console.log('No hay citas asignadas pendientes de notificación.');
        }

        // 2. Obtener y procesar citas de MAÑANA (Recordatorios)
        console.log('Buscando recordatorios para mañana...');
        const citasManana = await obtenerCitas('[Cnsta Wpp CitasProgramadasMañana]');
        if (citasManana.length > 0) {
            console.log(`Encontrados ${citasManana.length} recordatorios para mañana.`);
            await procesarYEnviarCitas(client, citasManana, 2, generarMensajeRecordatorio);
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

    // Determinar el tiempo de espera dinámico
    let proximaEspera = 60 * 1000; // 1 minuto por defecto si hubo citas
    if (!huboCitas) {
        const minutosVacio = parseInt(process.env.POLLING_INTERVAL_EMPTY_MINUTES || '15');
        proximaEspera = minutosVacio * 60 * 1000;
        console.log(`No se encontraron citas. Esperando ${minutosVacio} minutos antes del siguiente ciclo...\n`);
    } else {
        console.log('Citas procesadas en este ciclo. Programando reevaluación en 1 minuto...\n');
    }

    setTimeout(iniciarCicloDinamico, proximaEspera);
}

// Iniciar el cliente
client.initialize();
