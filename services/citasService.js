const { getPool, sql } = require('../database');

/**
 * Obtiene las citas programadas desde la vista/tabla especificada
 * @param {string} vista Nombre de la vista (ej. [Cnsta Wpp CitasProgramadas])
 * @returns {Promise<Array>} Lista de citas
 */
async function obtenerCitas(vista) {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        // Obtenemos los primeros 200 registros que requieran recordatorio
        const result = await request.query(`
            SELECT TOP (200) 
                WhatsApp, Id_Compromiso, Hora_inicio, Hora_Fin, Fecha_inicio, 
                Documento_Paciente, Nom_Paciente, Correo, Tel, Documento_Profecional, Nom_profesional 
            FROM ${vista}
        `);
        
        return result.recordset;
    } catch (error) {
        console.error(`Error al consultar citas de la vista ${vista}:`, error);
        return [];
    }
}

/**
 * Actualiza el estado de WhatsApp en la cita (1 = Hoy, 2 = Mañana, etc.)
 * @param {number} idCompromiso ID de la cita
 * @param {number} estado Estado a actualizar
 */
async function actualizarEstadoWhatsApp(idCompromiso, estado) {
    try {
        const pool = await getPool();
        const request = pool.request();
        
        request.input('Estado', sql.Numeric, estado);
        request.input('id', sql.Numeric, idCompromiso);
        
        await request.query(`
            UPDATE CompromisoVI 
            SET WhatsApp = @Estado 
            WHERE [Id CompromisoVI] = @id
        `);
        console.log(`Cita ${idCompromiso} actualizada al estado ${estado}`);
    } catch (error) {
        console.error(`Error al actualizar estado de cita ${idCompromiso}:`, error);
    }
}

module.exports = {
    obtenerCitas,
    actualizarEstadoWhatsApp
};
