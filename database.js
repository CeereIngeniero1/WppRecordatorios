const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER || 'Recordatorios',
    password: process.env.DB_PASSWORD || 'Crsoft2022*',
    server: process.env.DB_SERVER || 'MEDI_MUJER',
    database: process.env.DB_NAME || 'CeereSio',
    options: {
        encrypt: false, // Usar true si estás en Azure
        trustServerCertificate: true, // Cambiar a true para desarrollo local
        enableArithAbort: true
    }
};

let pool;

async function connectDB() {
    try {
        pool = await sql.connect(dbConfig);
        return pool;
    } catch (err) {
        console.error('Database Connection Failed! Bad Config: ', err);
        throw err;
    }
}

async function getPool() {
    if (!pool) {
        return await connectDB();
    }
    return pool;
}

module.exports = {
    connectDB,
    getPool,
    sql
};
