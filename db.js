const sql = require('mssql');

const dbConfig = {
    user: 'sa',
    password: '12345678',
    server: 'localhost\\SEDA',  // recuerda que si tienes una instancia tienes que poner localhost\\nombreinstancia
    database: 'Transmisiones2',
    port: 1433,
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const poolPromise = new sql.ConnectionPool(dbConfig)
    .connect()
    .then(pool => {
        console.log("✅ Conectado a la base de datos");
        return pool;
    })
    .catch(err => {
        console.error("❌ Error al conectar a la base de datos:", err);
    });

module.exports = { sql, poolPromise };
