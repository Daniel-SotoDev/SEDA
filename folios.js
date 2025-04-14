const { poolPromise } = require("./db");

async function obtenerUltimoFolio() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT MAX(TRY_CAST(RIGHT(folio, 4) AS INT)) AS ultimoNumero
            FROM Ingresos
            WHERE folio LIKE 'F-%'
        `);

        let ultimoNumero = result.recordset[0].ultimoNumero;

        // Si no hay registros, inicia en 0
        if (ultimoNumero === null) {
            ultimoNumero = 0;
        }

        const nuevoNumero = ultimoNumero + 1;

        // Obtener la fecha actual
        const fecha = new Date();
        const año = fecha.getFullYear().toString().slice(-2);
        const mes = ("0" + (fecha.getMonth() + 1)).slice(-2);
        const dia = ("0" + fecha.getDate()).slice(-2);

        // Formatear correctamente el nuevo folio
        return `F-${año}${mes}${dia}-${nuevoNumero.toString().padStart(4, '0')}`;
    } catch (error) {
        console.error("Error al obtener el último folio:", error);

        // Si hay error, generar un folio con la fecha actual y número 0001
        const fecha = new Date();
        const año = fecha.getFullYear().toString().slice(-2);
        const mes = ("0" + (fecha.getMonth() + 1)).slice(-2);
        const dia = ("0" + fecha.getDate()).slice(-2);
        return `F-${año}${mes}${dia}-0001`;
    }
}

module.exports = obtenerUltimoFolio;



