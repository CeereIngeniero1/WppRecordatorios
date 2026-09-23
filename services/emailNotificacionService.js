const { actualizarEstadoCorreo } = require('./citasService');
const { enviarEmailCita } = require('./emailService');

/** Confirmación de programación enviada */
const ESTADO_CORREO_PROGRAMADA = 1;
/** Recordatorio de mañana enviado */
const ESTADO_CORREO_RECORDATORIO = 2;

/**
 * Espera aleatoria entre min y max (ms).
 * @param {number} minMs
 * @param {number} maxMs
 */
function esperaAleatoria(minMs, maxMs) {
    const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
    return { ms, promise: new Promise((resolve) => setTimeout(resolve, ms)) };
}

/**
 * Ritmo progresivo según tamaño del lote para no saturar el SMTP.
 * Se puede forzar con EMAIL_DELAY_MIN_MS / EMAIL_DELAY_MAX_MS en .env.
 * @param {number} total
 * @returns {{ minDelay: number, maxDelay: number, descansoCada: number|null }}
 */
function configurarRitmo(total) {
    const minEnv = parseInt(process.env.EMAIL_DELAY_MIN_MS || '', 10);
    const maxEnv = parseInt(process.env.EMAIL_DELAY_MAX_MS || '', 10);

    if (Number.isFinite(minEnv) && Number.isFinite(maxEnv) && minEnv > 0 && maxEnv >= minEnv) {
        console.log(
            `[Ritmo Email] Forzado por .env: ${Math.round(minEnv / 1000)}–${Math.round(maxEnv / 1000)} s entre correos.`
        );
        return { minDelay: minEnv, maxDelay: maxEnv, descansoCada: total > 20 ? 12 : null };
    }

    let minDelay;
    let maxDelay;
    let descansoCada = null;

    if (total <= 5) {
        minDelay = 20000;  // 20 s
        maxDelay = 40000;  // 40 s
    } else if (total <= 15) {
        minDelay = 40000;  // 40 s
        maxDelay = 70000;  // 70 s
    } else if (total <= 40) {
        minDelay = 60000;  // 1 min
        maxDelay = 120000; // 2 min
        descansoCada = 12;
    } else {
        minDelay = 90000;  // 1.5 min
        maxDelay = 180000; // 3 min
        descansoCada = 10;
    }

    console.log(
        `[Ritmo Email] Lote de ${total}. Espera entre correos: ${Math.round(minDelay / 1000)}–${Math.round(maxDelay / 1000)} s` +
            (descansoCada ? ` · descanso largo cada ~${descansoCada} envíos` : '') +
            '.'
    );

    return { minDelay, maxDelay, descansoCada };
}

/**
 * Procesa citas y envía correos de forma progresiva (uno a uno con pausas).
 * - asignada → Correo = 1
 * - recordatorio → Correo = 2
 *
 * @param {Array} citas
 * @param {'asignada'|'recordatorio'} tipoEmail
 */
async function procesarYEnviarEmails(citas, tipoEmail) {
    const estadoDestino =
        tipoEmail === 'recordatorio' ? ESTADO_CORREO_RECORDATORIO : ESTADO_CORREO_PROGRAMADA;

    const total = citas.length;
    if (total === 0) return;

    const { minDelay, maxDelay, descansoCada } = configurarRitmo(total);
    let enviadosSeguidos = 0;
    let proximoDescanso = descansoCada
        ? Math.floor(Math.random() * 3) + descansoCada
        : null;

    for (let i = 0; i < total; i++) {
        const cita = citas[i];
        const tieneCorreo = !!(cita.Correo && String(cita.Correo).trim() !== '');
        let intentoEnvio = false;

        if (!tieneCorreo) {
            console.log(
                `[Email] El paciente ${cita.Nom_Paciente} (ID: ${cita.Id_Compromiso}) no tiene correo. Se marca Correo=${estadoDestino}.`
            );
            await actualizarEstadoCorreo(cita.Id_Compromiso, estadoDestino);
        } else {
            intentoEnvio = true;
            try {
                console.log(
                    `Enviando correo (${tipoEmail}) [${i + 1}/${total}] a ${cita.Correo} (${cita.Nom_Paciente})...`
                );
                const enviado = await enviarEmailCita(cita, tipoEmail);

                if (enviado) {
                    await actualizarEstadoCorreo(cita.Id_Compromiso, estadoDestino);
                    enviadosSeguidos++;
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

        if (i >= total - 1) continue;

        // Descanso largo periódico en lotes grandes (solo si hubo envíos reales)
        if (
            intentoEnvio &&
            proximoDescanso &&
            enviadosSeguidos >= proximoDescanso
        ) {
            const { ms, promise } = esperaAleatoria(180000, 300000); // 3–5 min
            console.log(
                `\n[DESCANSO SMTP] ${enviadosSeguidos} correos seguidos. Pausando ${Math.round(ms / 60000)} min para no saturar el servidor...\n`
            );
            await promise;
            enviadosSeguidos = 0;
            proximoDescanso = descansoCada
                ? Math.floor(Math.random() * 3) + descansoCada
                : null;
            continue;
        }

        // Pausa normal solo si se intentó enviar (no demorar marcas sin correo)
        if (intentoEnvio) {
            const { ms, promise } = esperaAleatoria(minDelay, maxDelay);
            console.log(`Esperando ${Math.round(ms / 1000)} s antes del siguiente correo...`);
            await promise;
        }
    }
}

module.exports = {
    procesarYEnviarEmails,
    ESTADO_CORREO_PROGRAMADA,
    ESTADO_CORREO_RECORDATORIO
};
