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
        
        // Ejecutamos la revisión de citas inmediatamente
        await cicloDeNotificaciones();

        // Y luego cada 1 minuto (60000 ms)
        setInterval(cicloDeNotificaciones, 60000);
        
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
async function cicloDeNotificaciones() {
    // Verificar si estamos dentro del horario de envío (8 AM - 8 PM)
    const horaActual = new Date().getHours();
    if (horaActual < 8 || horaActual >= 20) {
        console.log('Fuera del horario de envío (8 AM - 8 PM). Saltando ciclo.');
        return;
    }

    // Si el ciclo anterior aún no ha terminado, no hacemos nada para no saturar
    if (procesando) return;
    
    procesando = true;
    console.log('\n--- Iniciando ciclo de revisión de citas ---');
    try {
        // 1. Obtener y procesar citas de HOY (Asignadas)
        // Usamos la vista de citas programadas estándar y actualizamos a estado 1
        console.log('Buscando citas asignadas recientes...');
        const citasHoy = await obtenerCitas('[Cnsta Wpp CitasProgramadas]');
        if (citasHoy.length > 0) {
            console.log(`Encontradas ${citasHoy.length} citas asignadas.`);
            await procesarYEnviarCitas(client, citasHoy, 1, generarMensajeAsignada);
        } else {
            console.log('No hay citas asignadas pendientes de notificación.');
        }

        // 2. Obtener y procesar citas de MAÑANA (Recordatorios)
        // Usamos la vista de citas de mañana y actualizamos a estado 2
        console.log('Buscando recordatorios para mañana...');
        const citasManana = await obtenerCitas('[Cnsta Wpp CitasProgramadasMañana]');
        if (citasManana.length > 0) {
            console.log(`Encontrados ${citasManana.length} recordatorios para mañana.`);
            await procesarYEnviarCitas(client, citasManana, 2, generarMensajeRecordatorio);
        } else {
            console.log('No hay recordatorios de mañana pendientes.');
        }

    } catch (error) {
        console.error('Error durante el ciclo de notificaciones:', error);
    } finally {
        procesando = false;
        console.log('--- Ciclo de revisión finalizado ---\n');
    }
}

// Iniciar el cliente
client.initialize();
