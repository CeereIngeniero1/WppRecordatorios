const { actualizarEstadoWhatsApp } = require('./citasService');
const { enviarEmailCita } = require('./emailService');

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
        
        const tieneWhatsAppValido = !!chatId;
        const tieneCorreoValido = !!(cita.Correo && cita.Correo.trim() !== '') && process.env.EMAIL_ENABLED === 'true';

        // Si no tiene ningún canal válido para notificar, se actualiza el estado y se continúa
        if (!tieneWhatsAppValido && !tieneCorreoValido) {
            console.log(`[Notificación] El paciente ${cita.Nom_Paciente} (ID: ${cita.Id_Compromiso}) no tiene celular de WhatsApp ni correo electrónico válido.`);
            await actualizarEstadoWhatsApp(cita.Id_Compromiso, estadoAActualizar);
            continue;
        }

        let whatsappEnviado = false;
        let emailEnviado = false;

        // 1. Enviar WhatsApp si tiene número válido
        if (tieneWhatsAppValido) {
            let chatIdDestino = chatId;
            if (process.env.TEST_MODE === 'true') {
                const numeroPrueba = process.env.TEST_PHONE_NUMBER;
                if (numeroPrueba) {
                    const chatIdPrueba = formatearNumero(numeroPrueba);
                    if (chatIdPrueba) {
                        console.log(`[MODO PRUEBA ACTIVO] Redirigiendo mensaje de WhatsApp de ${chatId} hacia el número de prueba ${chatIdPrueba}`);
                        chatIdDestino = chatIdPrueba;
                    }
                }
            }

            const mensaje = generadorMensaje(cita);

            try {
                console.log(`Enviando mensaje de WhatsApp a ${chatIdDestino} (${cita.Nom_Paciente})...`);
                const response = await client.sendMessage(chatIdDestino, mensaje);
                
                if (response && response.id && response.id.fromMe) {
                    console.log(`Mensaje de WhatsApp enviado correctamente a ${cita.Nom_Paciente}`);
                    whatsappEnviado = true;
                    mensajesEnviadosParaDescanso++;
                }
            } catch (error) {
                console.error(`Error al enviar mensaje de WhatsApp a ${chatIdDestino}:`, error.message);
            }
        }

        // 2. Enviar correo electrónico si tiene correo registrado
        if (tieneCorreoValido) {
            const tipoEmail = estadoAActualizar === 1 ? 'asignada' : 'recordatorio';
            try {
                console.log(`Enviando correo electrónico a ${cita.Correo} (${cita.Nom_Paciente})...`);
                emailEnviado = await enviarEmailCita(cita, tipoEmail);
            } catch (error) {
                console.error(`Error al enviar correo a ${cita.Correo}:`, error.message);
            }
        }

        // 3. Actualizar la base de datos para no volver a procesar esta cita
        try {
            await actualizarEstadoWhatsApp(cita.Id_Compromiso, estadoAActualizar);
        } catch (dbError) {
            console.error(`Error al actualizar estado en la DB para la cita ${cita.Id_Compromiso}:`, dbError.message);
        }
        
        // Esperas/Descansos (solo si no es la última cita del lote)
        if (i < totalPacientes - 1) {
            if (totalPacientes > 40 && mensajesEnviadosParaDescanso >= proximoDescanso && whatsappEnviado) {
                // Descanso largo de 5 a 10 minutos para evitar bloqueos de WhatsApp (solo si enviamos WhatsApp de forma continua)
                const tiempoDescanso = Math.floor(Math.random() * (600000 - 300000 + 1)) + 300000;
                console.log(`\n[DESCANSO PROGRAMADO] Se han enviado ${mensajesEnviadosParaDescanso} mensajes de WhatsApp continuos.`);
                console.log(`Tomando un descanso de ${Math.round(tiempoDescanso / 60000)} minutos...`);
                
                await new Promise(resolve => setTimeout(resolve, tiempoDescanso));
                
                mensajesEnviadosParaDescanso = 0;
                proximoDescanso = Math.floor(Math.random() * (15 - 10 + 1)) + 10;
                console.log(`Descanso finalizado. Siguiente descanso programado en ${proximoDescanso} mensajes.\n`);
            } else if (tieneWhatsAppValido) {
                // Espera regular aleatoria (solo si se intentó WhatsApp para no demorar el envío de correos puros)
                const tiempoEspera = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
                console.log(`Esperando ${Math.round(tiempoEspera / 1000)} segundos antes de procesar el siguiente paciente...`);
                await new Promise(resolve => setTimeout(resolve, tiempoEspera));
            }
        }
    }
}

module.exports = {
    procesarYEnviarCitas
};
