const { actualizarEstadoCorreo } = require('./citasService');
const { enviarEmailCita } = require('./emailService');

const DELAY_ENTRE_CORREOS_MS = 1500;

/** Confirmación enviada; aún puede aplicar recordatorio de mañana */
const ESTADO_CORREO_PROGRAMADA = 1;
/** Confirmación de cita-mañana, o recordatorio de mañana ya enviado */
const ESTADO_CORREO_COMPLETO = 2;

/**
 * ¿La fecha de la cita es el día calendario de mañana?
 * @param {object} cita
 * @returns {boolean}
 */
function esCitaManana(cita) {
    const fechaCita = new Date(cita.Fecha_inicio);
    if (Number.isNaN(fechaCita.getTime())) return false;

    const manana = new Date();
    manana.setHours(0, 0, 0, 0);
    manana.setDate(manana.getDate() + 1);

    const diaCita = new Date(fechaCita);
    diaCita.setHours(0, 0, 0, 0);

    return diaCita.getTime() === manana.getTime();
}

/**
 * Estado a guardar tras un correo de programación:
 * cita mañana → 2 (solo ese mail); resto → 1 (queda pendiente recordatorio).
 */
function estadoTrasProgramacion(cita) {
    return esCitaManana(cita) ? ESTADO_CORREO_COMPLETO : ESTADO_CORREO_PROGRAMADA;
}

/**
 * Procesa citas y envía correos.
 * @param {Array} citas
 * @param {'asignada'|'recordatorio'} tipoEmail
 */
async function procesarYEnviarEmails(citas, tipoEmail) {
    for (let i = 0; i < citas.length; i++) {
        const cita = citas[i];
        const tieneCorreo = !!(cita.Correo && String(cita.Correo).trim() !== '');
        const estadoDestino =
            tipoEmail === 'recordatorio'
                ? ESTADO_CORREO_COMPLETO
                : estadoTrasProgramacion(cita);

        if (!tieneCorreo) {
            console.log(
                `[Email] El paciente ${cita.Nom_Paciente} (ID: ${cita.Id_Compromiso}) no tiene correo. Se marca Correo=${estadoDestino}.`
            );
            await actualizarEstadoCorreo(cita.Id_Compromiso, estadoDestino);
        } else {
            try {
                console.log(
                    `Enviando correo (${tipoEmail}) a ${cita.Correo} (${cita.Nom_Paciente})...`
                );
                const enviado = await enviarEmailCita(cita, tipoEmail);

                if (enviado) {
                    await actualizarEstadoCorreo(cita.Id_Compromiso, estadoDestino);
                } else {
                    console.log(
                        `[Email] No se marcó la cita ${cita.Id_Compromiso}: el envío falló o fue omitido. Se reintentará.`
                    );
                }
            } catch (error) {
                console.error(
                    `Error al procesar correo para ${cita.Nom_Paciente}:`,
                    error.message
                );
            }
        }

        if (i < citas.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, DELAY_ENTRE_CORREOS_MS));
        }
    }
}

module.exports = {
    procesarYEnviarEmails,
    esCitaManana,
    ESTADO_CORREO_PROGRAMADA,
    ESTADO_CORREO_COMPLETO
};
