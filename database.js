const sql = require('mssql');
require('dotenv').config();

function requerirEnv(nombre) {
    const valor = process.env[nombre];
    if (!valor || String(valor).trim() === '') {
        throw new Error(`Variable de entorno requerida faltante: ${nombre}`);
    }
    return valor;
}

const dbConfig = {
    user: requerirEnv('DB_USER'),
    password: requerirEnv('DB_PASSWORD'),
    server: requerirEnv('DB_SERVER'),
    database: requerirEnv('DB_NAME'),
    options: {
        encrypt: false,
        trustServerCertificate: true,
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
