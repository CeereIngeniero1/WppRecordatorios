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
    return `${cita.Nom_Paciente} saludos! se confirma su cita en la clínica MEDIMUJER con el (la) profesional ${cita.Nom_profesional} para el día ${dia} del mes ${mes} a las ${horaFormat} horas.\nEstamos ubicados en esta dirección: Carrera 48 # 19A-40 torre médica ciudad del Río, piso 12 consultorio 1201, somos única sede en Medellín y Colombia.`;
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
    return `${cita.Nom_Paciente} saludos! Recuerde su cita en la clínica MEDIMUJER con el (la) profesional ${cita.Nom_profesional} el dia de mañana a las ${horaFormat} horas\nEstamos ubicados en esta dirección: Carrera 48 # 19A-40 torre médica ciudad del Río, piso 12 consultorio 1201, somos única sede en Medellín y Colombia.`;
}

module.exports = {
    generarMensajeAsignada,
    generarMensajeRecordatorio
};
