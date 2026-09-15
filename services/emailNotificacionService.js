const { actualizarEstadoCorreo } = require('./citasService');
const { enviarEmailCita } = require('./emailService');

const DELAY_ENTRE_CORREOS_MS = 1500;
/** Valor en CompromisoVI.Correo tras envío exitoso del aviso de cita programada */
const ESTADO_CORREO_ENVIADO = 1;

/**
 * Procesa citas programadas y envía correo de confirmación.
 * Marca CompromisoVI.Correo = 1 solo si el envío fue exitoso.
 * Si no hay dirección de correo (defensa), también marca para no ciclar.
 * @param {Array} citas Filas de [Cnsta Correo CitasProgramadas]
 */
async function procesarYEnviarEmails(citas) {
    for (let i = 0; i < citas.length; i++) {
        const cita = citas[i];
        const tieneCorreo = !!(cita.Correo && String(cita.Correo).trim() !== '');

        if (!tieneCorreo) {
            console.log(
                `[Email] El paciente ${cita.Nom_Paciente} (ID: ${cita.Id_Compromiso}) no tiene correo. Se marca Correo=1.`
            );
            await actualizarEstadoCorreo(cita.Id_Compromiso, ESTADO_CORREO_ENVIADO);
        } else {
            try {
                console.log(`Enviando correo a ${cita.Correo} (${cita.Nom_Paciente})...`);
                const enviado = await enviarEmailCita(cita, 'asignada');

                if (enviado) {
                    await actualizarEstadoCorreo(cita.Id_Compromiso, ESTADO_CORREO_ENVIADO);
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
    procesarYEnviarEmails
};
