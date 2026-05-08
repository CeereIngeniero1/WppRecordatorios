/**
 * ARCHIVO DE CONFIGURACIÓN DE MENSAJES
 * ====================================
 * 
 * En este archivo puedes personalizar los textos de los mensajes que se envían por WhatsApp.
 * 
 * GUÍA DE USO:
 * 1. Modifica el texto que está entre los acentos graves (` `).
 * 2. Puedes usar variables de la base de datos colocando `${cita.NombreCampo}`.
 * 3. Las variables disponibles principales son:
 *    - cita.Nom_Paciente (Nombre del paciente)
 *    - dia, mes, anio (Fecha de la cita extraída de cita.Fecha_inicio)
 *    - horaFormat (Hora de la cita extraída de cita.Hora_inicio)
 * 4. Para usar negritas en WhatsApp, envuelve el texto con asteriscos (*texto*).
 * 5. Para usar cursivas, usa guiones bajos (_texto_).
 * 6. Reinicia el bot (o el servidor) después de guardar los cambios para que apliquen.
 */

/**
 * Genera el mensaje para cuando se asigna una cita (Citas de "Hoy")
 */
function generarMensajeAsignada(cita) {
    // Cálculo de fechas y horas
    const fecha = new Date(cita.Fecha_inicio);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    
    const hora = new Date(cita.Hora_inicio);
    const horaStr = String(hora.getHours()).padStart(2, '0');
    const minStr = String(hora.getMinutes()).padStart(2, '0');
    const horaFormat = `${horaStr}:${minStr}`;

    // EDITA EL TEXTO A CONTINUACIÓN:
    return `*${cita.Nom_Paciente}*, su cita de imágenes diagnósticas en SERIMAGENES IPS fue asignada para el día *${dia}/${mes}/${anio}* a las *${horaFormat}*.

Si no puede acudir recuerde cancelar con anterioridad a las líneas: 444 6324 - 3013105837.
📍 *Dirección:* Calle 26 N°28-12 Consultorio 401. Torre Médica, Centro Comercial los Sauces de Oriente. Marinilla.

Síguenos en nuestras redes:
📸 Instagram: https://instagram.com/serimagenes?igshid=OGRjNzg3M2Y=
📘 Facebook: https://www.facebook.com/Serimagenes?mibextid=ZbWKwL`;
}

/**
 * Genera el mensaje de recordatorio (Citas de "Mañana")
 */
function generarMensajeRecordatorio(cita) {
    // Cálculo de fechas y horas
    const fecha = new Date(cita.Fecha_inicio);
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    
    const hora = new Date(cita.Hora_inicio);
    const horaStr = String(hora.getHours()).padStart(2, '0');
    const minStr = String(hora.getMinutes()).padStart(2, '0');
    const horaFormat = `${horaStr}:${minStr}`;

    // EDITA EL TEXTO A CONTINUACIÓN:
    return `*${cita.Nom_Paciente}*, recuerde asistir a su cita asignada de imágenes diagnósticas en SERIMAGENES IPS el día *${dia}/${mes}/${anio}* a las *${horaFormat}*.

Si no puede acudir recuerde cancelar con anterioridad a las líneas: 444 6324 - 3013105837.
📍 *Dirección:* Calle 26 N°28-12 Consultorio 401. Torre Médica, Centro Comercial los Sauces de Oriente. Marinilla.`;
}

module.exports = {
    generarMensajeAsignada,
    generarMensajeRecordatorio
};
