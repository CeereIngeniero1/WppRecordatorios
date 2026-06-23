/**
 * ARCHIVO DE CONFIGURACIÓN DE MENSAJES
 * ====================================
 * 
 * En este archivo puedes personalizar los textos de los mensajes que se envían por WhatsApp.
 * Ahora contamos con 3 variantes de mensaje para cada tipo de recordatorio para evitar
 * bloqueos de WhatsApp al enviar textos idénticos de manera repetitiva.
 * 
 * GUÍA DE USO:
 * 1. Modifica el texto de las opciones que están dentro de las funciones.
 * 2. Puedes usar variables de la base de datos colocando `${cita.NombreCampo}`.
 * 3. Las variables disponibles principales son:
 *    - cita.Nom_Paciente (Nombre del paciente)
 *    - dia, mes, anio (Fecha de la cita extraída de cita.Fecha_inicio)
 *    - horaFormat (Hora de la cita extraída de cita.Hora_inicio)
 * 4. Para usar negritas en WhatsApp, envuelve el texto con asteriscos (*texto*).
 * 5. Para usar cursivas, usa guiones bajos (_texto_).
 * 6. Reinicia el bot (o el servidor) después de guardar los cambios para que apliquen.
 */

// Variables para recordar la última variante utilizada y evitar repeticiones consecutivas
let ultimoIndiceAsignada = -1;
let ultimoIndiceRecordatorio = -1;

/**
 * Genera el mensaje para cuando se asigna una cita (Citas de "Hoy" / Creación de cita)
 * Selecciona una de 3 variantes de forma aleatoria, evitando repetir la última opción utilizada.
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

    // Nombres de meses en español para mayor variedad y personalización
    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesNombre = meses[fecha.getMonth()];

    // OPCIÓN 1: Formal y directa
    const opcion1 = `Hola ${cita.Nom_Paciente}, le confirmamos su cita en la clínica MEDIMUJER con el/la profesional ${cita.Nom_profesional}, programada para el día ${dia} de ${mesNombre} a las ${horaFormat}.

Dirección: Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201. Medellín, Colombia.

Si tiene alguna inquietud o necesita reprogramar, puede responder a este mensaje.`;

    // OPCIÓN 2: Ordenada y segura
    const opcion2 = `Hola ${cita.Nom_Paciente}, le recordamos su cita médica en MEDIMUJER.

🩺 Profesional: ${cita.Nom_profesional}
📅 Fecha: ${dia} de ${mesNombre}
⏰ Hora: ${horaFormat}
📍 Dirección: Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201. Medellín.`;

    // OPCIÓN 3: Compacta e informativa
    const opcion3 = `Hola ${cita.Nom_Paciente}. Su cita en MEDIMUJER está programada para el ${dia}/${mes} a las ${horaFormat}, con el/la profesional ${cita.Nom_profesional}.

📍 Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201. Medellín.`;

    const opciones = [opcion1, opcion2, opcion3];

    // Determinación del índice aleatorio evitando repetición consecutiva
    let indiceAleatorio;
    if (ultimoIndiceAsignada === -1) {
        indiceAleatorio = Math.floor(Math.random() * opciones.length);
    } else {
        const opcionesDisponibles = [0, 1, 2].filter(idx => idx !== ultimoIndiceAsignada);
        const idxAux = Math.floor(Math.random() * opcionesDisponibles.length);
        indiceAleatorio = opcionesDisponibles[idxAux];
    }

    ultimoIndiceAsignada = indiceAleatorio;
    console.log(`[Mensaje Asignada] Utilizando opción de mensaje variante ${indiceAleatorio + 1} para ${cita.Nom_Paciente}`);
    return opciones[indiceAleatorio];
}

/**
 * Genera el mensaje de recordatorio (Citas de "Mañana" / Recordatorio cita)
 * Selecciona una de 3 variantes de forma aleatoria, evitando repetir la última opción utilizada.
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

    const meses = [
        'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
        'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    const mesNombre = meses[fecha.getMonth()];
    // OPCIÓN 1: Formal y directa
    const opcion1 = `Hola, ${cita.Nom_Paciente}. Le recordamos su cita médica en MEDIMUJER para el día de mañana a las ${horaFormat}.

Profesional: ${cita.Nom_profesional}
Dirección: Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201.`;

    // OPCIÓN 2: Cálida y clara
    const opcion2 = `Hola, ${cita.Nom_Paciente}. Le recordamos su cita para mañana con el/la profesional ${cita.Nom_profesional} a las ${horaFormat}.

📍 Dirección: Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201.`;

    // OPCIÓN 3: Estructurada con viñetas
    const opcion3 = `Recordatorio de cita - MEDIMUJER

Estimada/o ${cita.Nom_Paciente}, le recordamos su cita médica programada para mañana:

🩺 Profesional: ${cita.Nom_profesional}
⏰ Hora: ${horaFormat}
📍 Ubicación: Carrera 48 # 19A-40, Torre Médica Ciudad del Río, piso 12, consultorio 1201.`;

    const opciones = [opcion1, opcion2, opcion3];

    // Determinación del índice aleatorio evitando repetición consecutiva
    let indiceAleatorio;
    if (ultimoIndiceRecordatorio === -1) {
        indiceAleatorio = Math.floor(Math.random() * opciones.length);
    } else {
        const opcionesDisponibles = [0, 1, 2].filter(idx => idx !== ultimoIndiceRecordatorio);
        const idxAux = Math.floor(Math.random() * opcionesDisponibles.length);
        indiceAleatorio = opcionesDisponibles[idxAux];
    }

    ultimoIndiceRecordatorio = indiceAleatorio;
    console.log(`[Mensaje Recordatorio] Utilizando opción de mensaje variante ${indiceAleatorio + 1} para ${cita.Nom_Paciente}`);
    return opciones[indiceAleatorio];
}

module.exports = {
    generarMensajeAsignada,
    generarMensajeRecordatorio
};
