const { getPool, sql } = require('../database');

/**
 * Obtiene citas pendientes de notificación por correo desde la vista SQL.
 *
 * Vista documentada en: sql/Cnsta_Correo_CitasProgramadas.sql
 * Nombre: [Cnsta Correo CitasProgramadas]
 *
 * @param {string} vista Nombre de la vista (ej. [Cnsta Correo CitasProgramadas])
 * @returns {Promise<Array>} Lista de citas (Correo = email del paciente)
 */
async function obtenerCitas(vista) {
    try {
        const pool = await getPool();
        const request = pool.request();

        const result = await request.query(`
            SELECT
                Estado_Correo,
                Id_Compromiso,
                Hora_inicio,
                Hora_Fin,
                Fecha_inicio,
                Documento_Paciente,
                Nom_Paciente,
                Correo,
                Tel,
                Documento_Profecional,
                Nom_profesional
            FROM ${vista}
        `);

        return result.recordset;
    } catch (error) {
        console.error(`Error al consultar citas de la vista ${vista}:`, error);
        return [];
    }
}

/**
 * Marca el aviso de correo de la cita (CompromisoVI.Correo).
 * 0 = pendiente
 * 1 = confirmación de programación enviada
 * 2 = recordatorio de mañana enviado
 *
 * @param {number} idCompromiso Id CompromisoVI
 * @param {number} estado Valor a guardar en CompromisoVI.Correo
 */
async function actualizarEstadoCorreo(idCompromiso, estado) {
    try {
        const pool = await getPool();
        const request = pool.request();

        request.input('Estado', sql.Int, estado);
        request.input('id', sql.Int, idCompromiso);

        await request.query(`
            UPDATE CompromisoVI
            SET Correo = @Estado
            WHERE [Id CompromisoVI] = @id
        `);
        console.log(`Cita ${idCompromiso}: CompromisoVI.Correo = ${estado}`);
    } catch (error) {
        console.error(`Error al actualizar Correo de cita ${idCompromiso}:`, error);
    }
}

module.exports = {
    obtenerCitas,
    actualizarEstadoCorreo
};
