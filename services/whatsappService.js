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
    const totalPacientes = citas.length;
    let minDelay, maxDelay;

    // Configuración de intervalos según cantidad de pacientes
    if (totalPacientes >= 5 && totalPacientes <= 15) {
        minDelay = 45000;   // 45 segundos
        maxDelay = 90000;   // 90 segundos
        console.log(`[Configuración de Ritmo] Lote de ${totalPacientes} pacientes. Espera entre mensajes: 45 a 90 segundos.`);
    } else if (totalPacientes > 15 && totalPacientes <= 40) {
        minDelay = 60000;   // 1 minuto
        maxDelay = 120000;  // 2 minutos
        console.log(`[Configuración de Ritmo] Lote de ${totalPacientes} pacientes. Espera entre mensajes: 1 a 2 minutos.`);
    } else if (totalPacientes > 40) {
        minDelay = 120000;  // 2 minutos
        maxDelay = 180000;  // 3 minutos
        console.log(`[Configuración de Ritmo] Lote de ${totalPacientes} pacientes. Espera entre mensajes: 2 a 3 minutos.`);
    } else {
        // Menos de 5 pacientes
        minDelay = 15000;   // 15 segundos
        maxDelay = 25000;   // 25 segundos
        console.log(`[Configuración de Ritmo] Lote pequeño de ${totalPacientes} pacientes. Espera entre mensajes: 15 a 25 segundos.`);
    }

    let mensajesEnviadosParaDescanso = 0;
    // Determinar el primer umbral de descanso aleatorio entre 10 y 15 mensajes
    let proximoDescanso = Math.floor(Math.random() * (15 - 10 + 1)) + 10;

    for (let i = 0; i < totalPacientes; i++) {
        const cita = citas[i];
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
            
            let envioExitoso = false;
            if (response && response.id && response.id.fromMe) {
                console.log(`Mensaje enviado correctamente a ${cita.Nom_Paciente}`);
                // Actualizar DB
                await actualizarEstadoWhatsApp(cita.Id_Compromiso, estadoAActualizar);
                mensajesEnviadosParaDescanso++;
                envioExitoso = true;
            }
            
            // Si no es el último mensaje del lote
            if (i < totalPacientes - 1) {
                // Verificar si corresponde descanso (solo si hay más de 40 pacientes y se envió con éxito)
                if (totalPacientes > 40 && mensajesEnviadosParaDescanso >= proximoDescanso && envioExitoso) {
                    // Descanso de 5 a 10 minutos (300,000 ms a 600,000 ms)
                    const tiempoDescanso = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000;
                    console.log(`\n[DESCANSO PROGRAMADO] Se han enviado ${mensajesEnviadosParaDescanso} mensajes de forma continua.`);
                    console.log(`Tomando un descanso de ${Math.round(tiempoDescanso / 60000)} minutos para evitar bloqueos...`);
                    
                    await new Promise(resolve => setTimeout(resolve, tiempoDescanso));
                    
                    // Reiniciar contador y volver a calcular el próximo descanso (entre 10 y 15)
                    mensajesEnviadosParaDescanso = 0;
                    proximoDescanso = Math.floor(Math.random() * (15 - 10 + 1)) + 10;
                    console.log(`Descanso finalizado. Siguiente descanso programado en ${proximoDescanso} mensajes.\n`);
                } else {
                    // Espera regular aleatoria calculada según los parámetros de lote
                    const tiempoEspera = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                    console.log(`Esperando ${Math.round(tiempoEspera / 1000)} segundos antes del siguiente mensaje...`);
                    await new Promise(resolve => setTimeout(resolve, tiempoEspera));
                }
            }
            
        } catch (error) {
            console.error(`Error al enviar mensaje a ${chatId}:`, error.message);
        }
    }
}

module.exports = {
    procesarYEnviarCitas
};
