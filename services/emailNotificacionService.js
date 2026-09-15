const { actualizarEstadoCorreo } = require('./citasService');
const { enviarEmailCita } = require('./emailService');

const DELAY_ENTRE_CORREOS_MS = 1500;

/** Confirmación de programación enviada */
const ESTADO_CORREO_PROGRAMADA = 1;
/** Recordatorio de mañana enviado */
const ESTADO_CORREO_RECORDATORIO = 2;

/**
 * Procesa citas y envía correos.
 * - asignada → Correo = 1
 * - recordatorio → Correo = 2
 *
 * Si la cita se programó hoy para mañana, la vista SQL de mañana la excluye
 * (Fecha Digitación = hoy), así solo llega el correo de programación.
 *
 * @param {Array} citas
 * @param {'asignada'|'recordatorio'} tipoEmail
 */
async function procesarYEnviarEmails(citas, tipoEmail) {
    const estadoDestino =
        tipoEmail === 'recordatorio' ? ESTADO_CORREO_RECORDATORIO : ESTADO_CORREO_PROGRAMADA;

    for (let i = 0; i < citas.length; i++) {
        const cita = citas[i];
        const tieneCorreo = !!(cita.Correo && String(cita.Correo).trim() !== '');

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
    ESTADO_CORREO_PROGRAMADA,
    ESTADO_CORREO_RECORDATORIO
};
