const { actualizarEstadoWhatsApp } = require('./citasService');

/**
 * Limpia el número de teléfono y verifica que sea válido para Colombia (10 dígitos).
 * @param {string} numero Teléfono original de la BD
 * @returns {string|null} Número formateado para whatsapp-web.js (ej. 573001234567@c.us) o null si es inválido
 */
function formatearNumero(numero) {
    if (!numero || numero.trim() === '') return null;
    
    // Remueve todo lo que no sea un dígito
    const numeroLimpio = numero.replace(/\D/g, '');
    
    // Asumimos formato Colombia (10 dígitos)
    if (numeroLimpio.length === 10) {
        return `57${numeroLimpio}@c.us`;
    }
    return null;
}


/**
 * Procesa una lista de citas y envía los mensajes uno por uno.
 * @param {object} client Instancia de whatsapp-web.js
 * @param {Array} citas Arreglo de citas de la BD
 * @param {number} estadoAActualizar 1 para Hoy, 2 para Mañana
 * @param {function} generadorMensaje Función que retorna el texto del mensaje
 */
async function procesarYEnviarCitas(client, citas, estadoAActualizar, generadorMensaje) {
    for (const cita of citas) {
        let chatId = formatearNumero(cita.Tel);
        
        // Si el número no es válido, se actualiza el estado para no reprocesar
        if (!chatId) {
            console.log(`Número inválido para paciente ${cita.Nom_Paciente} (ID: ${cita.Id_Compromiso})`);
            await actualizarEstadoWhatsApp(cita.Id_Compromiso, estadoAActualizar);
            continue;
        }

        // Modo de prueba para redirigir todos los mensajes a un solo número
        if (process.env.TEST_MODE === 'true') {
            const numeroPrueba = process.env.TEST_PHONE_NUMBER;
            if (numeroPrueba) {
                const chatIdPrueba = formatearNumero(numeroPrueba);
                if (chatIdPrueba) {
                    console.log(`[MODO PRUEBA ACTIVO] Redirigiendo mensaje de ${chatId} hacia el número de prueba ${chatIdPrueba}`);
                    chatId = chatIdPrueba;
                }
            }
        }

        const mensaje = generadorMensaje(cita);

        try {
            console.log(`Enviando mensaje a ${chatId} (${cita.Nom_Paciente})...`);
            // Enviar el mensaje
            const response = await client.sendMessage(chatId, mensaje);
            
            if (response.id.fromMe) {
                console.log(`Mensaje enviado correctamente a ${cita.Nom_Paciente}`);
                // Actualizar DB
                await actualizarEstadoWhatsApp(cita.Id_Compromiso, estadoAActualizar);
            }
            
            // Espera aleatoria de seguridad (entre 15 y 25 segundos) para no saturar WhatsApp y evitar bloqueos
            const tiempoEspera = Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000;
            console.log(`Esperando ${tiempoEspera / 1000} segundos antes del siguiente mensaje...`);
            await new Promise(resolve => setTimeout(resolve, tiempoEspera));
            
        } catch (error) {
            console.error(`Error al enviar mensaje a ${chatId}:`, error.message);
        }
    }
}

module.exports = {
    procesarYEnviarCitas
};
