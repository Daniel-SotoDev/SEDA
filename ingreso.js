const { sql, poolPromise } = require("./db");

async function nuevoIngreso(datos) {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('fecha', sql.Date, datos.fecha)
            .input('nombre_cliente', sql.VarChar, datos.nombre_cliente)
            .input('vehiculo', sql.VarChar, datos.vehiculo)
            .input('estatus', sql.VarChar, "Recibido")
            .query(`INSERT INTO ingresos (fecha, nombre_cliente, vehiculo, estatus) 
                    OUTPUT INSERTED.folio 
                    VALUES (@fecha, @nombre_cliente, @vehiculo, @estatus)`);
        
        return result.recordset[0].folio; // Devuelve folio generado
    } catch (err) {
        console.error('Error al insertar ingreso:', err);
    }
}

module.exports = { nuevoIngreso };
