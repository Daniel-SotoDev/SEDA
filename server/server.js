const express = require("express");
const app = express();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const config = require(path.join(__dirname, "..", "config.json"));
const obtenerUltimoFolio = require("../folios");
const obtenerUltimoFolioCotizacion = require("./folioscotizacion");
const { sql, poolPromise } = require("./db");
const socketIo = require("socket.io");
const http = require("http");

const net = require("net");
const PDFDocument = require('pdfkit');
const blobStream = require('blob-stream');
const PUERTO = 4000; // Puerto fijo
const port = process.env.PORT || 4000;
const server = http.createServer(app);

// Configuración de rutas para el logo
const isPackaged = require('electron').app?.isPackaged || false;
const resourcesPath = isPackaged 
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : path.join(__dirname, '..');

const logoPath = path.join(resourcesPath, 'img', 'TF_LOGO.png');

// Verificar si el archivo de logo existe
console.log('Ruta del logo:', logoPath);
if (!fs.existsSync(logoPath)) {
    console.error('Logo no encontrado en:', logoPath);
} else {
    console.log('Logo encontrado correctamente');
}

    function getStaticPath(relativePath) {
        return app.isPackaged
            ? path.join(process.resourcesPath, 'app.asar.unpacked', relativePath)
            : path.join(__dirname, relativePath);
}

const io = socketIo(server, {
    cors: {
        origin: `http://localhost:${PUERTO}`,
        methods: ["GET", "POST"]
    }
});
io.on("connection", (socket) => {
    console.log("Cliente WebSocket conectado");
    
    // Enviar folios iniciales al conectar
    socket.emit("actualizarFolios", []);

    socket.on("disconnect", () => {
        console.log("Cliente WebSocket desconectado");
    });
});

server.listen(port, () => {
    console.log(`Servidor corriendo en puerto ${port}`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`ERROR: Puerto ${port} en uso`);
        process.exit(1);
    }
});

app.use(express.static(
    isPackaged
    ? path.join(process.resourcesPath, 'app.asar.unpacked')
    : __dirname
));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: "*", methods: ["GET", "POST"], allowedHeaders: ["Content-Type"] }));
app.get("/obtenerUltimoFolio", async (req, res) => {
    try {
        const ultimoFolio = await obtenerUltimoFolio();
        res.json({ ultimoFolio });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el folio" });
    }
});
app.get("/obtenerUltimoFolioCotizacion", async (req, res) => {
    try {
        const ultimoFolio = await obtenerUltimoFolioCotizacion();
        res.json({ ultimoFolio });
    } catch (error) {
        res.status(500).json({ error: "Error al obtener el folio" });
    }
});

const { ipcMain } = require('electron');
const Store = require('electron-store');
const store = new Store();


// Configuración de multer para almacenamiento de memoria ()
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Ruta del login
app.post("/login", async (req, res) => {
    const { usuario, contraseña } = req.body;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("usuario", sql.VarChar, usuario)
            .query("SELECT id, usuario, password, rol FROM usuarios WHERE usuario = @usuario");

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: "Usuario no encontrado" });
        }

        const user = result.recordset[0];

        // Depuración: Verifica los valores
        console.log("Usuario encontrado:", user);
        console.log("Contraseña recibida:", contraseña);
        console.log("Contraseña almacenada:", user.password);

        // Verifica que la contraseña no sea undefined
        if (!user.password) {
            return res.status(401).json({ error: "Contraseña no definida para el usuario" });
        }

        // Compara la contraseña
        const passwordMatch = await bcrypt.compare(contraseña, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Contraseña incorrecta" });
        }

        res.json({ success: true, usuario: user.usuario, rol: user.rol });
    } catch (error) {
        console.error("Error en login:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

    app.get("/generar-folio-cotizacion", async (req, res) => {
        try {
            const pool = await poolPromise;
            const result = await pool.request().query(`
            SELECT MAX(TRY_CAST(RIGHT(Folio, 6) AS INT)) AS ultimoNumero
            FROM Cotizaciones
            WHERE Folio LIKE 'C-%'
        `);
    
        let ultimoNumero = result.recordset[0].ultimoNumero;

        // Si no hay registros, inicia en 0
        if (ultimoNumero === null) {
            ultimoNumero = 0;
        }

        const nuevoNumero = ultimoNumero + 1;

        // Obtener la fecha actual
        const fecha = new Date();
        const año = fecha.getFullYear().toString().slice(-4); // Año completo (4 dígitos)
        const mes = ("0" + (fecha.getMonth() + 1)).slice(-2);
        const dia = ("0" + fecha.getDate()).slice(-2);

        // Formatear correctamente el nuevo folio
        const nuevoFolio = `C-${año}${mes}${dia}-${nuevoNumero.toString().padStart(6, '0')}`;

        res.json({ folio: nuevoFolio });
    } catch (error) {
        console.error("Error al generar folio:", error);

        // Si hay error, generar un folio con la fecha actual y número 000001
        const fecha = new Date();
        const año = fecha.getFullYear().toString().slice(-4);
        const mes = ("0" + (fecha.getMonth() + 1)).slice(-2);
        const dia = ("0" + fecha.getDate()).slice(-2);
        const nuevoFolio = `C-${año}${mes}${dia}-000001`;

        res.json({ folio: nuevoFolio });
    }
});
    
app.post("/nuevoIngreso", (req, res) => {
    console.log("Nuevo ingreso recibido:", req.body);
    
    pool.request()
        .query(`
            SELECT Folio
            FROM Ingresos
            WHERE CAST(FechaIngreso AS DATE) = CAST(GETDATE() AS DATE)
        `)
        .then(result => {
            const folios = result.recordset.map(row => row.Folio);
            io.emit('actualizarFolios', folios);  // Emitir la lista actualizada de folios
        })
        .catch(error => {
            console.error("Error al obtener los folios:", error);
        });

    res.send({ success: true, message: "Ingreso registrado" });
});

// Ruta para guardar ingreso
app.post("/guardarIngreso", upload.single("Fotos"), async (req, res) => {
    try {
        console.log(" Recibiendo solicitud en /guardarIngreso");
        console.log(" Datos recibidos:", req.body);

         // Convertir a números
        const IDCliente = parseInt(req.body.IDCliente, 10);
        const IDVehiculo = parseInt(req.body.IDVehiculo, 10);
        const IDAsesor = parseInt(req.body.IDAsesor, 10);
        if (isNaN(IDAsesor)) {
            return res.status(400).json({ error: "Seleccione un asesor válido" });
        }
         // Validar conversión
        if (isNaN(IDCliente) || isNaN(IDVehiculo)) {
            console.error("IDs no numéricos:", {IDCliente, IDVehiculo});
            return res.status(400).json({ error: "IDs inválidos" });
        }

         // Resto de las validaciones
        if (!req.body.FechaIngreso) {
            return res.status(400).json({ error: "La fecha es obligatoria" });
        }

        const { FechaIngreso, Folio, IDCotizacion } = req.body;
        const Fotos = req.file ? req.file.buffer : null;

        const pool = await poolPromise;
        await pool.request()
            .input("Folio", sql.NVarChar, Folio)
            .input("FechaIngreso", sql.DateTime, FechaIngreso)
            .input("IDCliente", sql.Int, IDCliente)
            .input("IDVehiculo", sql.Int, IDVehiculo)
            .input("IDAsesor", sql.Int, IDAsesor)
            .input("IDCotizacion", sql.Int, IDCotizacion || null)
            .input("Fotos", sql.VarBinary, Fotos)
            .query(`
                INSERT INTO Ingresos (Folio, FechaIngreso, IDCliente, IDVehiculo, IDAsesor, IDCotizacion, Fotos)
                VALUES (@Folio, @FechaIngreso, @IDCliente, @IDVehiculo, @IDAsesor, @IDCotizacion, @Fotos)
            `);
                
            io.emit("nuevo-folio", Folio);
        res.status(200).json({ message: "Ingreso registrado correctamente" });
    } catch (error) {
        console.error("Error en el servidor:", error.message);
        res.status(500).json({ error: error.message });
    }
});
//BUSCADOR DE PIEZAS
app.get('/buscar-pieza', async (req, res) => {
    const Nombre_pieza = req.query.nombre;
    try {
        const result = await pool.request()
            .query("SELECT Nombre_pieza, Cantidad, Precio_venta FROM Piezas");
        res.json(result.recordset[0] || null);
    } catch (error) {
        res.status(500).send('Error al buscar pieza');
    }
});
//OBTENER ASESORES
app.get("/obtenerAsesores", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT IDAsesor, Nombre, Apellido FROM Asesor");
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener asesores:", error);
        res.status(500).json({ error: "Error al obtener asesores" });
    }
});

//OBTENER VEHICULOS
app.get("/obtenerVehiculos", async (req, res) => {
    const { filtro } = req.query;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("filtro", sql.VarChar, `%${filtro}%`)
            .query(`
                SELECT IDVehiculo, Placas, Marca, Modelo 
                FROM Vehiculos 
                WHERE Placas LIKE @filtro
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener vehículos:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
// Obtener vehículos por IDCliente
app.get("/obtenerVehiculosPorCliente", async (req, res) => {
    const { IDCliente } = req.query;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("IDCliente", sql.Int, IDCliente)
            .query(`
                SELECT IDVehiculo, Placas, Marca, Modelo, Linea_Vehiculo 
                FROM Vehiculos 
                WHERE IDCliente = @IDCliente
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener vehículos por cliente:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
// Ruta para buscar clientes por nombre o apellido
app.get("/buscarClientes", async (req, res) => {
    const { filtro } = req.query;
    console.log("Buscando clientes con filtro:", filtro);

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("filtro", sql.VarChar, `%${filtro}%`)
            .query(`
                SELECT IDCliente, Nombre, Apellido 
                FROM Clientes 
                WHERE Nombre LIKE @filtro OR Apellido LIKE @filtro
            `);
        console.log("Resultados de la consulta:", result.recordset);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al buscar clientes:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});


//RELACIONAR COTIZACIONES
app.post("/relacionarCotizacion", async (req, res) => {
    try {
        const { folio, cotizacion_id } = req.body;

        if (!folio || !cotizacion_id) {
            return res.status(400).json({ error: "Folio de ingreso y cotización son necesarios" });
        }

        const pool = await poolPromise;
        await pool.request()
            .input("folio", sql.VarChar, folio)
            .input("cotizacion_id", sql.VarChar, cotizacion_id)
            .query(`
                UPDATE Ingresos 
                SET cotizacion_id = @cotizacion_id 
                WHERE folio = @folio
            `);

        res.status(200).json({ message: "Cotización relacionada con el ingreso correctamente" });
    } catch (error) {
        console.error("Error al relacionar cotización con ingreso:", error.message);
        res.status(500).json({ error: error.message });
    }
});


// Registrar cotización con piezas
app.post("/registrar-cotizacion", async (req, res) => {
    const { Folio, Fecha, IDCliente, IDVehiculo, Falla, Piezas, PrecioTotal, IDEstatus, ManoObra } = req.body;

    if (!Folio || !Fecha || !IDCliente || !IDVehiculo || !Falla || !Piezas || Piezas.length === 0 || !PrecioTotal || !IDEstatus) {
        return res.status(400).json({ error: "Todos los campos son obligatorios." });
    }
    if (!IDVehiculo) {
        return res.status(400).json({ error: "El vehículo es requerido" });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        // Insertar la cotización
        const cotizacionResult = await transaction.request()
            .input("Folio", sql.NVarChar, Folio)
            .input("Fecha", sql.DateTime, Fecha) //--
            .input("IDCliente", sql.Int, IDCliente)
            .input("IDVehiculo", sql.Int, IDVehiculo) 
            .input("Falla", sql.NVarChar, Falla)
            .input("ManoObra", sql.Decimal(18,2), ManoObra || 0)
            .input("PrecioTotal", sql.Decimal(18, 2), PrecioTotal)
            .input("IDEstatus", sql.Int, IDEstatus)
            .query(`
                INSERT INTO Cotizaciones (Folio, Fecha, IDCliente, IDVehiculo, Falla, Precio_cotizacion, IDEstatus, Mano_Obra) 
                OUTPUT INSERTED.IDCotizacion
                VALUES (@Folio, @Fecha, @IDCliente, @IDVehiculo, @Falla, @PrecioTotal, @IDEstatus, @ManoObra)
            `);

        const IDCotizacion = cotizacionResult.recordset[0].IDCotizacion;

        // Insertar las piezas asociadas a la cotización
        for (const pieza of Piezas) {

            if (!pieza.IDPieza && !pieza.idPieza) {
                throw new Error("Una de las piezas no tiene ID válido");
            }
            
            const idPieza = pieza.IDPieza || pieza.idPieza;

            await transaction.request()
            .input("IDCotizacion", sql.Int, IDCotizacion)
            .input("IDPieza", sql.Int, idPieza)
            .input("Cantidad_Cotizada", sql.Int, pieza.cantidadPieza)
            .input("Precio", sql.Decimal(18, 2), pieza.precioVenta)
            .query(`
                INSERT INTO DetallePiezas (IDCotizacion, IDPieza, Cantidad_Cotizada, Precio) 
                VALUES (@IDCotizacion, @IDPieza, @Cantidad_Cotizada, @Precio)
            `);
                // Actualizar la cantidad de piezas en el inventario
            await transaction.request()
                .input("IDPieza", sql.Int, idPieza)
                .input("Cantidad", sql.Int, pieza.cantidadPieza)
                .query(`
                    UPDATE Piezas 
                    SET Cantidad = ISNULL(Cantidad, 0) - @Cantidad 
                    WHERE IDPieza = @IDPieza
                `);
        }

        await transaction.commit();
        res.status(201).json({ message: "Cotización registrada correctamente", IDCotizacion });
    } catch (error) {
        await transaction.rollback();
        console.error("Error al registrar cotización:", error);
        res.status(500).json({ error: "Error en el servidor al registrar la cotización" });
    }
});

// Buscar cotizaciones por folio o nombre de cliente
app.get("/buscarCotizaciones", async (req, res) => {
    const { filtro } = req.query;
    
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("filtro", sql.NVarChar, `%${filtro}%`)
            .query(`
                SELECT 
                    c.Folio,
                    cl.Nombre + ' ' + cl.Apellido AS Cliente,
                    v.Placas,
                    v.Marca,
                    v.Modelo,
                    v.Placas + ' - ' + v.Marca + ' ' + v.Modelo AS Vehiculo,
                    c.IDCotizacion,
                    c.IDCliente,
                    c.IDVehiculo 
                FROM Cotizaciones c
                INNER JOIN Clientes cl ON c.IDCliente = cl.IDCliente
                INNER JOIN Vehiculos v ON c.IDVehiculo = v.IDVehiculo
                WHERE c.Folio LIKE @filtro 
                OR cl.Nombre LIKE @filtro 
                OR cl.Apellido LIKE @filtro
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error al buscar cotizaciones:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
// Obtener cotización completa con detalles
app.get("/obtenerCotizacionCompleta", async (req, res) => {
    const { id } = req.query;

    try {
        const pool = await poolPromise;
        
        // Obtener información básica de la cotización
        const cotizacionResult = await pool.request()
            .input("id", sql.Int, id)
            .query(`
                SELECT 
                    c.*,
                    c.Mano_Obra,
                    cl.Nombre, 
                    cl.Apellido,
                    v.Placas,
                    v.Marca,
                    v.Modelo,
                    v.Linea_Vehiculo,
                    v.Color,
                    v.Kilometraje
                FROM Cotizaciones c
                INNER JOIN Clientes cl ON c.IDCliente = cl.IDCliente
                INNER JOIN Vehiculos v ON c.IDVehiculo = v.IDVehiculo
                WHERE c.IDCotizacion = @id
            `);

        if (cotizacionResult.recordset.length === 0) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }

        const cotizacion = cotizacionResult.recordset[0];

        // Obtener piezas asociadas a la cotización
        const piezasResult = await pool.request()
            .input("id", sql.Int, id)
            .query(`
                SELECT 
                    dp.IDPieza,
                    p.Nombre_pieza,
                    dp.Cantidad_Cotizada,
                    dp.Precio
                FROM DetallePiezas dp
                JOIN Piezas p ON dp.IDPieza = p.IDPieza
                WHERE dp.IDCotizacion = @id
            `);

        res.json({
            ...cotizacion,
            piezas: piezasResult.recordset
        });
    } catch (error) {
        console.error("Error al obtener cotización completa:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
// Obtener ingreso por cotización
app.get("/obtenerIngresoPorCotizacion", async (req, res) => {
    const { id } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("id", sql.Int, id)
            .query("SELECT TOP 1 * FROM Ingresos WHERE IDCotizacion = @id");
        
        res.json(result.recordset[0] || null);
    } catch (error) {
        console.error("Error al obtener ingreso:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
// Generar folio para nuevo ingreso
app.get("/generarFolioIngreso", async (req, res) => {
    try {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT MAX(TRY_CAST(RIGHT(Folio, 6) AS INT)) AS ultimo 
                FROM Ingresos 
                WHERE Folio LIKE 'F-${año}${mes}${dia}-%'
            `);
        
        const ultimoNum = result.recordset[0].ultimo || 0;
        const nuevoFolio = `F-${año}${mes}${dia}-${String(ultimoNum + 1).padStart(6, '0')}`;
        
        res.json({ folio: nuevoFolio });
    } catch (error) {
        console.error("Error generando folio:", error);
        res.status(500).json({ error: "Error al generar folio" });
    }
});
// Crear registro inicial en Ingresos
app.post("/crearIngresoInicial", async (req, res) => {
    const { Folio, IDCotizacion, IDCliente, IDVehiculo } = req.body;
    
    try {
        const pool = await poolPromise;
        await pool.request()
            .input("Folio", sql.NVarChar, Folio)
            .input("IDCotizacion", sql.Int, IDCotizacion)
            .input("IDCliente", sql.Int, IDCliente)
            .input("IDVehiculo", sql.Int, IDVehiculo)
            .input("FechaIngreso", sql.DateTime, new Date())
            .query(`
                INSERT INTO Ingresos (Folio, FechaIngreso, IDCliente, IDVehiculo, IDCotizacion)
                VALUES (@Folio, @FechaIngreso, @IDCliente, @IDVehiculo, @IDCotizacion)
            `);
        
        res.json({ success: true });
    } catch (error) {
        console.error("Error creando ingreso inicial:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Obtener cotización por folio
app.get("/obtenerCotizacionPorFolio", async (req, res) => {
    const { folio } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("folio", sql.NVarChar, folio)
            .query(`
                SELECT TOP 1 IDCotizacion 
                FROM Cotizaciones 
                WHERE Folio = @folio
            `);
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Cotización no encontrada" });
        }
        
        const idCotizacion = result.recordset[0].IDCotizacion;
        res.json({ IDCotizacion: idCotizacion });
    } catch (error) {
        console.error("Error al obtener cotización por folio:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Actualizar cotización y piezas
app.post("/actualizarCotizacion", async (req, res) => {
    const { IDCotizacion, Piezas, PrecioTotal, ManoObra } = req.body;
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    if (!IDCotizacion || isNaN(ManoObra)) {
        return res.status(400).json({ error: "Datos inválidos" });

    }

    try {
        await transaction.begin();
        
        // Eliminar detalles existentes
        await transaction.request()
            .input("IDCotizacion", sql.Int, IDCotizacion)
            .query("DELETE FROM DetallePiezas WHERE IDCotizacion = @IDCotizacion");
        
        // Insertar nuevas piezas
        for (const pieza of Piezas) {
            await transaction.request()
                .input("IDCotizacion", sql.Int, IDCotizacion)
                .input("IDPieza", sql.Int, pieza.IDPieza)
                .input("Cantidad_Cotizada", sql.Int, pieza.cantidad)
                .input("Precio", sql.Decimal(18,2), pieza.precio)
                .query(`
                    INSERT INTO DetallePiezas (IDCotizacion, IDPieza, Cantidad_Cotizada, Precio)
                    VALUES (@IDCotizacion, @IDPieza, @Cantidad_Cotizada, @Precio)
                `);
        }

        // Actualizar precio total
        await transaction.request()
            .input("IDCotizacion", sql.Int, IDCotizacion)
            .input("ManoObra", sql.Decimal(18,2), ManoObra)
            .input("PrecioTotal", sql.Decimal(18,2), PrecioTotal)
            .query(`
                UPDATE Cotizaciones 
                SET Precio_cotizacion = @PrecioTotal,
                    Mano_Obra = @ManoObra
                WHERE IDCotizacion = @IDCotizacion
            `);

        await transaction.commit();
        res.json({ success: true, message: "Cotización actualizada correctamente" });
    } catch (error) {
        await transaction.rollback();
        console.error("Error al actualizar cotización:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
app.get("/obtenerPiezasPorVehiculo", async (req, res) => {
    const { IDVehiculo } = req.query;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("IDVehiculo", sql.Int, IDVehiculo)
            .query(`
                SELECT 
                    p.Nombre_pieza,
                    p.SKU,
                    p.Marca,
                    p.Precio_venta,
                    dp.Cantidad_Cotizada,
                    c.Folio,
                    c.Fecha
                FROM DetallePiezas dp
                JOIN Cotizaciones c ON dp.IDCotizacion = c.IDCotizacion
                JOIN Piezas p ON dp.IDPieza = p.IDPieza
                WHERE c.IDVehiculo = @IDVehiculo
            `);

        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener piezas por vehículo:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Obtener estatus de cotización
app.get("/obtenerEstatusCotizacion", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT IDEstatus, Estatus FROM EstatusCotizacion");
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener estatus de cotización:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

//iniciarServidor();

app.get("/", (req, res) => {
    res.send("servidor funcionando correctamente");
});

/*function encontrarPuertoLibre(rangoInicio, rangoFin) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(0, () => {
            const puertoLibre = server.address().port;
            server.close(() => resolve(puertoLibre));
        });
        server.on("error", () => resolve(encontrarPuertoLibre(rangoInicio, rangoFin)));
    });
} */

// APARTADO PARA EL DIAGNOSTICO
app.get("/obtenerDiagnostico", async (req, res) => {
    console.log("Ruta /obtenerDiagnostico llamada con folio:", req.query.folio);
    const { folio } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("folio", sql.VarChar, folio)
            .query(`
                SELECT 
                    i.*,
                    ISNULL(co.Mano_Obra, 0) AS Mano_Obra,
                    c.Nombre,
                    c.Apellido,
                    v.Placas,
                    v.Marca,
                    v.Linea_Vehiculo,
                    v.Modelo,
                    v.Color,
                    v.Kilometraje,
                    v.Testigos,
                    co.Falla AS Problema,
                    co.IDCotizacion
                FROM Ingresos i
                INNER JOIN Clientes c ON i.IDCliente = c.IDCliente
                INNER JOIN Vehiculos v ON i.IDVehiculo = v.IDVehiculo
                LEFT JOIN Cotizaciones co ON i.IDCotizacion = co.IDCotizacion
                WHERE i.Folio = @folio
            `);
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: "Folio no encontrado" });
        }

        res.json(result.recordset[0]);
    } catch (error) {
        console.error("Error al obtener diagnóstico:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
app.get("/buscarPiezas", async (req, res) => {
    const { filtro } = req.query;
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("filtro", sql.NVarChar, `%${filtro}%`)
            .query(`
                SELECT IDPieza, Nombre_pieza, Precio_venta 
                FROM Piezas 
                WHERE Nombre_pieza LIKE @filtro
            `);
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al buscar piezas:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
// Verificar stock de pieza
app.get("/verificarStockPieza", async (req, res) => {
    const { id, cantidad } = req.query;
    
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("IDPieza", sql.Int, id)
            .query("SELECT Cantidad FROM Piezas WHERE IDPieza = @IDPieza");
        
        if (result.recordset.length === 0) {
            return res.json({ suficiente: false, stock: 0 });
        }
        
        const stockActual = result.recordset[0].Cantidad || 0;
        const suficiente = stockActual >= cantidad;
        
        res.json({ suficiente, stock: stockActual });
    } catch (error) {
        console.error("Error al verificar stock:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
app.post("/guardarDiagnostico", async (req, res) => {
    const { folio, diagnostico, piezas, total, ManoObra, IDCotizacion } = req.body;

    if (!folio || !diagnostico) {
        return res.status(400).json({ 
            error: "Folio y diagnóstico son obligatorios",
        });
    }

    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);

    try {
        await transaction.begin();

        //Obtener el ingreso actual para verificar si ya tiene una cotización asociada
        const ingresoResult = await transaction.request()
            .input("folio", sql.VarChar, folio)
            .query("SELECT IDIngreso, IDCotizacion FROM Ingresos WHERE Folio = @folio");
        
        if (ingresoResult.recordset.length === 0) {
            throw new Error("No se encontró el ingreso con el folio proporcionado");
        }

        const { IDIngreso, IDCotizacion: existingIDCotizacion } = ingresoResult.recordset[0];
        let IDCotizacionActual = existingIDCotizacion;

        // Actualizar cotización relacionada si es necesario
        if (IDCotizacion && IDCotizacion !== IDCotizacionActual) {
            console.log("Actualizando cotización relacionada:", IDCotizacion);
            await transaction.request()
                .input("IDIngreso", sql.Int, IDIngreso)
                .input("IDCotizacion", sql.Int, IDCotizacion)
                .query("UPDATE Ingresos SET IDCotizacion = @IDCotizacion WHERE IDIngreso = @IDIngreso");
            
            IDCotizacionActual = IDCotizacion;
        }

        // Actualizar Mano de Obra en cotización si existe
        if (IDCotizacionActual) {
            await transaction.request()
                .input("IDCotizacion", sql.Int, IDCotizacionActual)
                .input("ManoObra", sql.Decimal(18,2), ManoObra || 0)
                .query(`
                    UPDATE Cotizaciones 
                    SET Mano_Obra = @ManoObra 
                    WHERE IDCotizacion = @IDCotizacion
                `);
        }

        // Actualizar Diagnostico y Total en Ingresos
        await transaction.request()
            .input("folio", sql.VarChar, folio)
            .input("diagnostico", sql.NVarChar, diagnostico)
            .input("total", sql.Decimal(18, 2), total || 0)
            .query(`
                UPDATE Ingresos 
                SET Diagnostico = @diagnostico, Total = @total 
                WHERE Folio = @folio
            `);

        //Manejo de piezas - ojo aqui aque se cae --ya lo corregi
        if (piezas && piezas.length > 0) {
            console.log("Procesando", piezas.length, "piezas");
            
            // Eliminar registros existentes
            await transaction.request()
                .input("IDIngreso", sql.Int, IDIngreso)
                .query("DELETE FROM DetallePiezas WHERE IDIngreso = @IDIngreso");

            // Insertar nuevas piezas
            for (const [index, pieza] of piezas.entries()) {
                try {
                    console.log(`Procesando pieza ${index + 1}:`, pieza);
                    
                    if (!pieza.IDPieza || !pieza.cantidad || !pieza.precio) {
                        console.error("Pieza inválida en posición", index, ":", pieza);
                        continue;
                    }

                    // Insertar en DetallePiezas
                    await transaction.request()
                        .input("IDIngreso", sql.Int, IDIngreso)
                        .input("IDCotizacion", sql.Int, IDCotizacionActual)
                        .input("IDPieza", sql.Int, pieza.IDPieza)
                        .input("Cantidad_Cotizada", sql.Int, 0)
                        .input("Cantidad_Usada", sql.Int, pieza.cantidad)
                        .input("Precio", sql.Decimal(18, 2), pieza.precio)
                        .query(`
                            INSERT INTO DetallePiezas (
                                IDIngreso,
                                IDCotizacion,
                                IDPieza,
                                Cantidad_Cotizada,
                                Cantidad_Usada,
                                Precio
                            ) VALUES (
                                @IDIngreso,
                                @IDCotizacion,
                                @IDPieza,
                                @Cantidad_Cotizada,
                                @Cantidad_Usada,
                                @Precio
                            )`);

                    // Actualizar inventario
                    await transaction.request()
                        .input("IDPieza", sql.Int, pieza.IDPieza)
                        .input("Cantidad", sql.Int, pieza.cantidad)
                        .query(`
                            UPDATE Piezas 
                            SET Cantidad = ISNULL(Cantidad, 0) - @Cantidad 
                            WHERE IDPieza = @IDPieza
                        `);

                    } catch (error) {
                        console.error(`Error en pieza ${index + 1}:`, error.message);
                        // Continuar procesando las piezas
                    }
            }
        }
        await transaction.commit();
        console.log("Transacción completada exitosamente");
        res.json({ 
            success: true, 
            message: "Diagnóstico guardado correctamente",
            detalles: {
                piezas_procesadas: piezas?.length || 0
            }
        });
    } catch (error) {
        await transaction.rollback();
        console.error("Error general en transacción:", error.message);
        res.status(500).json({ 
            error: "Error al guardar diagnóstico",
            detalle: error.message
        });
    }
});

app.get("/obtenerFoliosDelDia", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`
                SELECT Folio
                FROM Ingresos
                WHERE CAST(FechaIngreso AS DATE) = CAST(GETDATE() AS DATE)
                ORDER BY FechaIngreso DESC
            `);

        const folios = result.recordset.map(row => row.Folio);
        res.json(folios);
    } catch (error) {
        console.error("Error al obtener los folios del día:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
app.post("/registrar-cliente", async (req, res) => {
    try {
        const { Nombre, Apellido, Domicilio, Correo, Telefonos, Tipo } = req.body;

        if (!Nombre || !Apellido || !Domicilio || !Telefonos || Telefonos.length === 0 || !Tipo) {
            return res.status(400).json({ error: "Todos los campos son obligatorios, incluyendo al menos un teléfono." });
        }

        const pool = await poolPromise;
        const transaction = pool.transaction();

        await transaction.begin(); 

        //  Insertar el cliente
        const result = await transaction.request()
            .input("Nombre", sql.NVarChar, Nombre)
            .input("Apellido", sql.NVarChar, Apellido)
            .input("Domicilio", sql.NVarChar, Domicilio)
            .input("Correo", sql.NVarChar, Correo || null)
            .query(`
                INSERT INTO Clientes (Nombre, Apellido, Domicilio, Correo) 
                OUTPUT INSERTED.IDCliente
                VALUES (@Nombre, @Apellido, @Domicilio, @Correo)
            `);

        const IDCliente = result.recordset[0].IDCliente;

        for (let Telefono of Telefonos) {
            await transaction.request()
                .input("IDCliente", sql.Int, IDCliente)
                .input("Telefono", sql.NVarChar, Telefono.trim())
                .input("Tipo", sql.VarChar, Tipo.trim())
                .query(`
                    INSERT INTO Telefono (IDCliente, Telefono, Tipo) 
                    VALUES (@IDCliente, @Telefono, @Tipo)
                `);
        }

        await transaction.commit();

        res.status(201).json({ message: "Cliente registrado correctamente", IDCliente });

    } catch (error) {
        console.error("Error al registrar cliente:", error);
        res.status(500).json({ error: "Error al registrar cliente" });
    }
});

app.post("/registrar-vehiculo", async (req, res) => {
    try {
        const { IDCliente, Placas, Marca, Linea_Vehiculo, Modelo, Color, Kilometraje, Testigos } = req.body;

        if (!IDCliente || !Placas || !Marca || !Linea_Vehiculo || !Modelo || !Color || Kilometraje === undefined || !Testigos) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }

        const pool = await poolPromise;

        await pool.request()
            .input("IDCliente", sql.Int, IDCliente)
            .input("Placas", sql.NVarChar, Placas)
            .input("Marca", sql.NVarChar, Marca)
            .input("Linea_Vehiculo", sql.NVarChar, Linea_Vehiculo)
            .input("Modelo", sql.NVarChar, Modelo)
            .input("Color", sql.NVarChar, Color)
            .input("Kilometraje", sql.Int, Kilometraje)
            .input("Testigos", sql.NVarChar, Testigos)
            .query(`
                INSERT INTO Vehiculos (IDCliente, Placas, Marca, Linea_Vehiculo, Modelo, Color, Kilometraje, Testigos) 
                VALUES (@IDCliente, @Placas, @Marca, @Linea_Vehiculo, @Modelo, @Color, @Kilometraje, @Testigos)
            `);

        res.status(201).json({ message: "Vehículo registrado correctamente" });

    } catch (error) {
        console.error("Error al registrar vehículo:", error);
        res.status(500).json({ error: "Error en el servidor al registrar el vehículo" });
    }
});


app.get("/obtenerPiezas", async (req, res) => {
    try {
        const { filtro } = req.query; // Puede ser nombre o SKU
        const pool = await poolPromise;

        let query = `
            SELECT IDPieza, Nombre_pieza, SKU, Marca, Precio_venta, Cantidad, 
                CAST(Foto AS VARBINARY(MAX)) AS Foto
            FROM Piezas
        `;

        if (filtro && filtro.trim() !== "") {
            query += ` WHERE Nombre_pieza LIKE @filtro OR SKU LIKE @filtro`;
        }

        const result = await pool.request()
            .input("filtro", sql.NVarChar, `%${filtro}%`)
            .query(query);

        // Convertir imagen a base64 para enviar al frontend
        const piezas = result.recordset.map(pieza => ({
            ...pieza,
            Foto: pieza.Foto ? pieza.Foto.toString("base64") : null
        }));

        res.json(piezas);
    } catch (error) {
        console.error("Error al obtener piezas:", error);
        res.status(500).json({ error: "Error en el servidor al obtener piezas" });
    }
});

app.get("/obtenerEstatusPiezas", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT IDEstatus, Estatus FROM EstatusPieza");

        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener estatus de piezas:", error);
        res.status(500).json({ error: "Error en el servidor al obtener estatus" });
    }
});

// REGISTRAR UNA NUEVA PIEZA
app.post("/registrarPieza", upload.single("Foto"), async (req, res) => {
    let transaction;
    try {
        const { Nombre_pieza, SKU, Costo_compra, Precio_venta, Cantidad, Marca} = req.body;
        const Foto = req.file ? req.file.buffer : null;

        if (!Nombre_pieza || !SKU || !Costo_compra || !Precio_venta || !Cantidad || !Marca) {
            return res.status(400).json({ error: "Todos los campos son obligatorios." });
        }

        const pool = await poolPromise;
        transaction = new sql.Transaction(pool);
        await transaction.begin(); 
        
        const request = new sql.Request(transaction);

        // Insertar el estatus en la tabla EstatusPieza
    /*   const estatusResult = await request
            .input('Estatus', sql.VarChar, Estatus) // Define el parámetro @Estatus
            .query(`
                INSERT INTO EstatusPieza (Estatus) 
                OUTPUT INSERTED.IDEstatus
                VALUES (@Estatus)
            `);

        const IDEstatus = estatusResult.recordset[0].IDEstatus; // Obtener el IDEstatus generado */

        // Insertar la pieza en la tabla Piezas
        await request
            .input('Nombre_pieza', sql.VarChar, Nombre_pieza)
            .input('SKU', sql.VarChar, SKU)
            .input('Marca', sql.NVarChar, Marca)
            .input('Costo_compra', sql.Decimal(18, 2), Costo_compra)
            .input('Precio_venta', sql.Decimal(18, 2), Precio_venta)
            .input('Cantidad', sql.Int, Cantidad)
            .input('Foto', sql.VarBinary, Foto)
            .query(`
                INSERT INTO Piezas (Nombre_pieza, SKU, Marca, Costo_compra, Precio_venta, Cantidad, Foto) 
                VALUES (@Nombre_pieza, @SKU, @Marca, @Costo_compra, @Precio_venta, @Cantidad, @Foto)
            `);

        await transaction.commit();
        res.status(201).json({ message: 'Pieza registrada correctamente' });
    } catch (error) {
        // Revertir la transacción en caso de error
        if (transaction) await transaction.rollback();
        console.error('Error al registrar pieza:', error);
        res.status(500).json({ error: 'Error en el servidor al registrar la pieza' });
    }
});
// Buscar pieza por SKU
app.get("/buscarPiezaPorSKU", async (req, res) => {
    const { sku } = req.query;

    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("sku", sql.VarChar, sku)
            .query("SELECT Nombre_pieza, Costo_compra, Precio_venta FROM Piezas WHERE SKU = @sku");

        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.status(404).json({ error: "Pieza no encontrada" });
        }
    } catch (error) {
        console.error("Error al buscar pieza por SKU:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Actualizar existencias, costo_compra y precio_venta
app.post("/actualizarExistencias", async (req, res) => {
    const { SKU, cantidad, costo_compra, precio_venta } = req.body;
    console.log("Datos recibidos:", { SKU, cantidad, costo_compra, precio_venta });

    try {
        const pool = await poolPromise;
        const request = pool.request()
            .input("SKU", sql.NVarChar, SKU);

        let query = "UPDATE Piezas SET ";

        if (cantidad !== null) {
            query += "Cantidad = ISNULL(Cantidad, 0) + @cantidad, ";
            request.input("cantidad", sql.Int, cantidad);
        }

        if (costo_compra !== null) {
            query += "Costo_compra = @costo_compra, ";
            request.input("costo_compra", sql.Decimal(18, 2), costo_compra);
        }

        if (precio_venta !== null) {
            query += "Precio_venta = @precio_venta, ";
            request.input("precio_venta", sql.Decimal(18, 2), precio_venta);
        }

        // Eliminar la ultima coma y espacio
        query = query.slice(0, -2);

        query += " WHERE SKU = @SKU";
        console.log("Consulta SQL:", query);

        await request.query(query);

        res.status(200).json({ message: "Datos actualizados correctamente" });
    } catch (error) {
        console.error("Error al actualizar datos:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});
// Obtener sucursales para el select
app.get("/obtener-sucursales", async (req, res) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT IDSucursal, Nombre FROM Sucursales");
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener sucursales:", error);
        res.status(500).json({ error: "Error al obtener sucursales" });
    }
});

// Registrar nuevo asesor
app.post("/registrar-asesor", async (req, res) => {
    const { nombre, apellido, sucursalId } = req.body;
    
    if (!nombre || !apellido || !sucursalId) {
        return res.status(400).json({ error: "Todos los campos son obligatorios" });
    }
    
    try {
        const pool = await poolPromise;
        await pool.request()
            .input("nombre", sql.VarChar, nombre)
            .input("apellido", sql.VarChar, apellido)
            .input("sucursalId", sql.Int, sucursalId)
            .query("INSERT INTO Asesor (Nombre, Apellido, IDSucursal) VALUES (@nombre, @apellido, @sucursalId)");
        
        res.json({ message: "Asesor registrado correctamente" });
    } catch (error) {
        console.error("Error al registrar asesor:", error);
        res.status(500).json({ error: "Error al registrar asesor" });
    }
});
// Buscar ingresos para entrega
app.get("/buscarIngresosParaEntrega", async (req, res) => {
    const { filtro } = req.query;
    
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("filtro", sql.NVarChar, `%${filtro}%`)
            .query(`
                SELECT 
                    i.IDIngreso, i.Folio, i.FechaIngreso, i.Diagnostico, i.Total, i.IDEntrega,
                    c.Nombre, c.Apellido,
                    v.Placas, v.Marca, v.Linea_Vehiculo, v.Modelo,
                    (SELECT COUNT(*) FROM DetallePiezas dp 
                    WHERE dp.IDIngreso = i.IDIngreso OR dp.IDCotizacion = i.IDCotizacion) AS TotalPiezas
                FROM Ingresos i
                INNER JOIN Clientes c ON i.IDCliente = c.IDCliente
                INNER JOIN Vehiculos v ON i.IDVehiculo = v.IDVehiculo
                WHERE i.Folio LIKE @filtro 
                OR c.Nombre LIKE @filtro 
                OR c.Apellido LIKE @filtro
                OR v.Placas LIKE @filtro
                OR v.Marca LIKE @filtro
                ORDER BY i.FechaIngreso DESC
            `);
            
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al buscar ingresos para entrega:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Obtener piezas por ingreso
app.get("/obtenerPiezasPorIngreso", async (req, res) => {
    const { IDIngreso } = req.query;
    
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("IDIngreso", sql.Int, IDIngreso)
            .query(`
                SELECT 
                    p.Nombre_pieza,
                    p.SKU,
                    p.Marca,
                    dp.Cantidad_Cotizada,
                    dp.Cantidad_Usada,
                    dp.Precio
                FROM DetallePiezas dp
                JOIN Piezas p ON dp.IDPieza = p.IDPieza
                WHERE dp.IDIngreso = @IDIngreso
                OR dp.IDCotizacion IN (
                    SELECT IDCotizacion 
                    FROM Ingresos 
                    WHERE IDIngreso = @IDIngreso
                )
            `);
            
        res.json(result.recordset);
    } catch (error) {
        console.error("Error al obtener piezas por ingreso:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Registrar entrega
app.post("/registrarEntrega", async (req, res) => {
    const { IDIngreso } = req.body;
    
    if (!IDIngreso) {
        return res.status(400).json({ error: "ID de ingreso es requerido" });
    }
    
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    
    try {
        await transaction.begin();
        
        // Crear registro en la tabla Entrega
        const entregaResult = await transaction.request()
            .query(`
                INSERT INTO Entrega (Fecha)
                OUTPUT INSERTED.IDEntrega
                VALUES (GETDATE())
            `);
            
        const IDEntrega = entregaResult.recordset[0].IDEntrega;
        
        // Actualizar el ingreso con el ID de entrega
        await transaction.request()
            .input("IDIngreso", sql.Int, IDIngreso)
            .input("IDEntrega", sql.Int, IDEntrega)
            .query(`
                UPDATE Ingresos
                SET IDEntrega = @IDEntrega
                WHERE IDIngreso = @IDIngreso
            `);
            
        await transaction.commit();
        res.json({ success: true, message: "Entrega registrada correctamente" });
    } catch (error) {
        await transaction.rollback();
        console.error("Error al registrar entrega:", error);
        res.status(500).json({ error: "Error en el servidor" });
    }
});

app.get("/generar-pdf-diagnostico", async (req, res) => {
    try {
        const { folio } = req.query;
        if (!folio) return res.status(400).json({ error: "Folio es requerido" });

        const pool = await poolPromise;
        const diagnosticoResult = await pool.request()
            .input("folio", sql.VarChar, folio)
            .query(`
                SELECT 
                    i.*, c.Nombre, c.Apellido, c.Domicilio, c.Correo,
                    v.Placas, v.Marca, v.Modelo, v.Linea_Vehiculo, v.Color, v.Kilometraje, v.Testigos,
                    a.Nombre AS AsesorNombre, a.Apellido AS AsesorApellido,
                    s.Nombre AS Sucursal, s.Direccion AS SucursalDireccion, s.Telefono AS SucursalTelefono,
                    co.Falla AS ProblemaReportado, co.Mano_Obra AS ManoObraCotizada
                FROM Ingresos i
                INNER JOIN Clientes c ON i.IDCliente = c.IDCliente
                INNER JOIN Vehiculos v ON i.IDVehiculo = v.IDVehiculo
                INNER JOIN Asesor a ON i.IDAsesor = a.IDAsesor
                INNER JOIN Sucursales s ON a.IDSucursal = s.IDSucursal
                LEFT JOIN Cotizaciones co ON i.IDCotizacion = co.IDCotizacion
                WHERE i.Folio = @folio
            `);

        if (diagnosticoResult.recordset.length === 0)
            return res.status(404).json({ error: "Diagnóstico no encontrado" });

        const diagnostico = diagnosticoResult.recordset[0];

        const piezasResult = await pool.request()
            .input("IDIngreso", sql.Int, diagnostico.IDIngreso)
            .query(`
                SELECT 
                    p.Nombre_pieza, dp.Cantidad_Usada, dp.Precio,
                    (dp.Cantidad_Usada * dp.Precio) AS Total
                FROM DetallePiezas dp
                JOIN Piezas p ON dp.IDPieza = p.IDPieza
                WHERE dp.IDIngreso = @IDIngreso
            `);
        const piezas = piezasResult.recordset;

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=diagnostico_${folio}.pdf`);
        doc.pipe(res);

        const primaryColor = '#2c3e50';
        const secondaryColor = '#3498db';
        const lightGrey = '#ecf0f1';

        // Encabezado
        doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
            .text('Reporte de Diagnóstico Automotriz', 50, 40)
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 450, 10, { width: 80 });
            }

        // Info sucursal y folio
        doc.fontSize(9).fillColor('#7f8c8d')
            .text(`${diagnostico.Sucursal} | ${diagnostico.SucursalDireccion} | Tel: ${diagnostico.SucursalTelefono}`, 50, 70)
            .fillColor(secondaryColor).fontSize(11)
            .text(`Folio: ${folio}`, 50, 90)
            .text(`Fecha: ${new Date(diagnostico.FechaIngreso).toLocaleDateString()}`, { align: 'right' });

        // Datos Cliente y Asesor
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Cliente:', 50, 120)
            .text('Asesor:', 300, 120);

        doc.font('Helvetica').fillColor('#2c3e50').fontSize(10)
            .text(`${diagnostico.Nombre} ${diagnostico.Apellido}`, 50, 135)
            .text(diagnostico.Domicilio, 50, 150)
            .text(diagnostico.Correo || 'N/A', 50, 165)
            .text(`${diagnostico.AsesorNombre} ${diagnostico.AsesorApellido}`, 300, 135)
            .text(`Sucursal: ${diagnostico.Sucursal}`, 300, 150);

        // Vehículo
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Vehículo:', 50, 190);
        doc.font('Helvetica').fillColor('#2c3e50').fontSize(10)
            .text(`Placas: ${diagnostico.Placas}`, 50, 205)
            .text(`Marca: ${diagnostico.Marca}`, 50, 220)
            .text(`Modelo: ${diagnostico.Modelo || diagnostico.Linea_Vehiculo}`, 50, 235)
            .text(`Color: ${diagnostico.Color}`, 300, 205)
            .text(`Kilometraje: ${diagnostico.Kilometraje} km`, 300, 220)
            .text(`Testigos: ${diagnostico.Testigos || 'Ninguno'}`, 300, 235);

        // Diagnostico
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Problema reportado:', 50, 265)
            .font('Helvetica').fillColor('#2c3e50')
            .text(diagnostico.ProblemaReportado || 'No especificado', 50, 280, { width: 500 });

        doc.font('Helvetica-Bold').fillColor(primaryColor)
            .text('Diagnóstico realizado:', 50, 310)
            .font('Helvetica').fillColor('#2c3e50')
            .text(diagnostico.Diagnostico || 'No especificado', 50, 325, { width: 500 });

        // 
        if (piezas.length > 0) {
            doc.addPage();

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(14)
                .text('Detalle de Refacciones', 50, 40);

            const startY = 65;
            doc.rect(50, startY, 500, 20).fill(secondaryColor);
            doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
                .text('Descripción', 55, startY + 5)
                .text('Cantidad', 300, startY + 5)
                .text('P. Unitario', 380, startY + 5)
                .text('Total', 460, startY + 5);

            let currentY = startY + 25;
            piezas.forEach((pieza, i) => {
                doc.fillColor(i % 2 === 0 ? lightGrey : '#ffffff')
                    .rect(50, currentY, 500, 18).fill();
                doc.fillColor('#2c3e50').font('Helvetica').fontSize(9)
                    .text(pieza.Nombre_pieza, 55, currentY + 4)
                    .text(pieza.Cantidad_Usada, 300, currentY + 4)
                    .text(`$${pieza.Precio.toFixed(2)}`, 380, currentY + 4)
                    .text(`$${pieza.Total.toFixed(2)}`, 460, currentY + 4);
                currentY += 18;
            });

            const totalPiezas = piezas.reduce((sum, p) => sum + p.Total, 0);
            const manoObra = diagnostico.ManoObraCotizada || 0;
            const total = totalPiezas + manoObra;

            doc.fillColor('#2c3e50').font('Helvetica-Bold').fontSize(10)
                .text('Subtotal Refacciones:', 350, currentY + 10)
                .text(`$${totalPiezas.toFixed(2)}`, 460, currentY + 10)
                .text('Mano de Obra:', 350, currentY + 25)
                .text(`$${manoObra.toFixed(2)}`, 460, currentY + 25)
                .moveTo(350, currentY + 38).lineTo(550, currentY + 38).stroke()
                .fontSize(11)
                .text('TOTAL GENERAL:', 350, currentY + 45)
                .text(`$${total.toFixed(2)}`, 460, currentY + 45);
        }

        // Firma
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Confirmación del Servicio', 50, doc.y + 30);
        doc.font('Helvetica').fontSize(10)
            .text('Firma del Cliente: _______________________', 50, doc.y + 20)
            .text('Nombre y Fecha: ________________________', 50, doc.y + 15)
            .text(`Atendido por: ${diagnostico.AsesorNombre} ${diagnostico.AsesorApellido}`, 300, doc.y - 10)
            .text(`Sucursal: ${diagnostico.Sucursal}`, 300, doc.y + 5)
            .text(`Fecha de Entrega: ${new Date().toLocaleDateString()}`, 300, doc.y + 20);

        doc.end();
    } catch (error) {
        console.error("Error al generar PDF:", error);
        if (!res.headersSent) res.status(500).json({ error: "Error al generar el PDF: " + error.message });
        else res.end();
    }
});

app.get("/generar-pdf-cotizacion", async (req, res) => {
    try {
        const { folio } = req.query;
        if (!folio) return res.status(400).json({ error: "Folio es requerido" });

        const pool = await poolPromise;
        const result = await pool.request()
            .input("folio", sql.VarChar, folio)
            .query(`
                SELECT 
                    c.Nombre, 
                    c.Apellido, 
                    c.Domicilio, 
                    c.Correo,
                    v.Placas, 
                    v.Marca, 
                    v.Modelo, 
                    v.Linea_Vehiculo, 
                    v.Color, 
                    v.Kilometraje, 
                    v.Testigos,
                    cot.Fecha, 
                    cot.Mano_Obra AS ManoObraCotizada,
                    cot.IDCotizacion
                FROM Cotizaciones cot
                INNER JOIN Clientes c ON cot.IDCliente = c.IDCliente
                INNER JOIN Vehiculos v ON cot.IDVehiculo = v.IDVehiculo
                LEFT JOIN Ingresos i ON cot.IDCotizacion = i.IDCotizacion
                LEFT JOIN Asesor a ON i.IDAsesor = a.IDAsesor
                WHERE cot.Folio = @folio
            `);

        if (result.recordset.length === 0)
            return res.status(404).json({ error: "Cotización no encontrada" });

        const cotizacion = result.recordset[0];

        const piezasResult = await pool.request()
            .input("IDCotizacion", sql.Int, cotizacion.IDCotizacion)
            .query(`
                SELECT 
                    p.Nombre_pieza, dp.Cantidad_Cotizada, dp.Precio,
                    (dp.Cantidad_Cotizada * dp.Precio) AS Total
                FROM DetallePiezas dp
                JOIN Piezas p ON dp.IDPieza = p.IDPieza
                WHERE dp.IDCotizacion = @IDCotizacion
            `);
        const piezas = piezasResult.recordset;

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=cotizacion_${folio}.pdf`);
        doc.pipe(res);

        const primaryColor = '#2c3e50';
        const secondaryColor = '#3498db';
        const lightGrey = '#ecf0f1';

        // Encabezado
        doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
            .text('Reporte de Cotización', 50, 40)
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 450, 10, { width: 80 });
            }

        // Info sucursal y folio
        doc.fontSize(9).fillColor('#7f8c8d')
            //.text(`${cotizacion.Sucursal} | ${cotizacion.SucursalDireccion} | Tel: ${cotizacion.SucursalTelefono}`, 50, 70)
            .fillColor(secondaryColor).fontSize(11)
            .text(`Folio: ${folio}`, 50, 90)
            .text(`Fecha: ${new Date(cotizacion.Fecha).toLocaleDateString()}`, { align: 'right' });

        // Datos Cliente
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Cliente:', 50, 120);

        doc.font('Helvetica').fillColor('#2c3e50').fontSize(10)
            .text(`${cotizacion.Nombre} ${cotizacion.Apellido}`, 50, 135)
            .text(cotizacion.Domicilio, 50, 150)
            .text(cotizacion.Correo || 'N/A', 50, 165);

        // Vehiculo
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Vehículo:', 50, 200);
        doc.font('Helvetica').fillColor('#2c3e50').fontSize(10)
            .text(`Placas: ${cotizacion.Placas}`, 50, 215)
            .text(`Marca: ${cotizacion.Marca}`, 50, 230)
            .text(`Modelo: ${cotizacion.Modelo || cotizacion.Linea_Vehiculo}`, 50, 245)
            .text(`Color: ${cotizacion.Color}`, 300, 215)
            .text(`Kilometraje: ${cotizacion.Kilometraje} km`, 300, 230)
            .text(`Testigos: ${cotizacion.Testigos || 'Ninguno'}`, 300, 245);

        // Segunda hoja con piezas
        if (piezas.length > 0) {
            doc.addPage();

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(14)
                .text('Detalle de Refacciones', 50, 40);

            const startY = 65;
            doc.rect(50, startY, 500, 20).fill(secondaryColor);
            doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
                .text('Descripción', 55, startY + 5)
                //.text('SKU', 55, startY + 5)
                .text('Cantidad', 300, startY + 5)
                .text('P. Unitario', 380, startY + 5)
                .text('Total', 460, startY + 5);

            let currentY = startY + 25;
            piezas.forEach((pieza, i) => {
                doc.fillColor(i % 2 === 0 ? lightGrey : '#ffffff')
                    .rect(50, currentY, 500, 18).fill();
                doc.fillColor('#2c3e50').font('Helvetica').fontSize(9)
                    .text(pieza.Nombre_pieza, 55, currentY + 4)
                    //.text(pieza.SKU, 55, currentY +4)
                    .text(pieza.Cantidad_Cotizada, 300, currentY + 4)
                    .text(`$${pieza.Precio.toFixed(2)}`, 380, currentY + 4)
                    .text(`$${pieza.Total.toFixed(2)}`, 460, currentY + 4);
                currentY += 18;
            });

            const totalPiezas = piezas.reduce((sum, p) => sum + p.Total, 0);
            const manoObra = cotizacion.ManoObraCotizada || 0;
            const total = totalPiezas + manoObra;

            doc.fillColor('#2c3e50').font('Helvetica-Bold').fontSize(10)
                .text('Subtotal Refacciones:', 350, currentY + 10)
                .text(`$${totalPiezas.toFixed(2)}`, 460, currentY + 10)
                .text('Mano de Obra:', 350, currentY + 25)
                .text(`$${manoObra.toFixed(2)}`, 460, currentY + 25)
                .moveTo(350, currentY + 38).lineTo(550, currentY + 38).stroke()
                .fontSize(11)
                .text('TOTAL GENERAL:', 350, currentY + 45)
                .text(`$${total.toFixed(2)}`, 460, currentY + 45);
        }

        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Confirmación de Cotización', 50, doc.y + 30);
        doc.font('Helvetica').fontSize(10)
            .text('Firma del Cliente: _______________________', 50, doc.y + 20)
            .text('Nombre y Fecha: ________________________', 50, doc.y + 15)
            //.text(`Sucursal: ${cotizacion.Sucursal}`, 300, doc.y + 5)
            .text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 300, doc.y + 20);

        doc.end();
    } catch (error) {
        console.error("Error al generar PDF:", error);
        if (!res.headersSent) res.status(500).json({ error: "Error al generar el PDF: " + error.message });
        else res.end();
    }
});
app.get("/generar-pdf-entrega", async (req, res) => {
    try {
        const { folio } = req.query;
        if (!folio) return res.status(400).json({ error: "Folio es requerido" });

        const pool = await poolPromise;
        
        // Obtener datos principales del ingreso
        const ingresoResult = await pool.request()
            .input("folio", sql.VarChar, folio)
            .query(`
                SELECT 
                    i.*, c.Nombre, c.Apellido, c.Domicilio, c.Correo,
                    v.Placas, v.Marca, v.Modelo, v.Linea_Vehiculo, v.Color, v.Kilometraje,
                    a.Nombre AS AsesorNombre, a.Apellido AS AsesorApellido,
                    s.Nombre AS Sucursal, s.Direccion AS SucursalDireccion, s.Telefono AS SucursalTelefono,
                    e.Fecha AS FechaEntrega,
                    co.Mano_Obra AS ManoObraCotizada
                FROM Ingresos i
                INNER JOIN Clientes c ON i.IDCliente = c.IDCliente
                INNER JOIN Vehiculos v ON i.IDVehiculo = v.IDVehiculo
                INNER JOIN Asesor a ON i.IDAsesor = a.IDAsesor
                INNER JOIN Sucursales s ON a.IDSucursal = s.IDSucursal
                LEFT JOIN Entrega e ON i.IDEntrega = e.IDEntrega
                LEFT JOIN Cotizaciones co ON i.IDCotizacion = co.IDCotizacion
                WHERE i.Folio = @folio
            `);

        if (ingresoResult.recordset.length === 0)
            return res.status(404).json({ error: "Ingreso no encontrado" });

        const ingreso = ingresoResult.recordset[0];

        // Obtener piezas utilizadas
        const piezasResult = await pool.request()
            .input("IDIngreso", sql.Int, ingreso.IDIngreso)
            .query(`
                SELECT 
                    p.Nombre_pieza, dp.Cantidad_Usada, dp.Precio,
                    (dp.Cantidad_Usada * dp.Precio) AS Total
                FROM DetallePiezas dp
                JOIN Piezas p ON dp.IDPieza = p.IDPieza
                WHERE dp.IDIngreso = @IDIngreso
            `);
        const piezas = piezasResult.recordset;

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=recibo_entrega_${folio}.pdf`);
        doc.pipe(res);

        // Estilos
        const primaryColor = '#2c3e50';
        const secondaryColor = '#3498db';
        const lightGrey = '#ecf0f1';

        // Encabezado
        doc.fillColor(primaryColor).fontSize(16).font('Helvetica-Bold')
            .text('Recibo de Entrega de Vehículo', 50, 40)
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 450, 10, { width: 80 });
            }

        // Informacion de la sucursal
        doc.fontSize(9).fillColor('#7f8c8d')
            .text(`${ingreso.Sucursal} | ${ingreso.SucursalDireccion} | Tel: ${ingreso.SucursalTelefono}`, 50, 70)
            .fillColor(secondaryColor).fontSize(11)
            .text(`Folio: ${folio}`, 50, 90)
            .text(`Fecha Entrega: ${new Date().toLocaleDateString()}`, { align: 'right' });

        // Seccion Cliente y Asesor
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Cliente:', 50, 120)
            .text('Asesor:', 300, 120);

        doc.font('Helvetica').fillColor('#2c3e50').fontSize(10)
            .text(`${ingreso.Nombre} ${ingreso.Apellido}`, 50, 135)
            .text(ingreso.Domicilio, 50, 150)
            .text(ingreso.Correo || 'N/A', 50, 165)
            .text(`${ingreso.AsesorNombre} ${ingreso.AsesorApellido}`, 300, 135)
            .text(`Sucursal: ${ingreso.Sucursal}`, 300, 150);

        // Detalles del Vehículo
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Vehículo:', 50, 190);
        doc.font('Helvetica').fillColor('#2c3e50').fontSize(10)
            .text(`Placas: ${ingreso.Placas}`, 50, 205)
            .text(`Marca: ${ingreso.Marca}`, 50, 220)
            .text(`Modelo: ${ingreso.Modelo}`, 50, 235)
            .text(`Línea: ${ingreso.Linea_Vehiculo}`, 300, 205)
            .text(`Color: ${ingreso.Color}`, 300, 220)
            .text(`Kilometraje: ${ingreso.Kilometraje} km`, 300, 235);

        // Detalle de Servicios y Piezas
        doc.addPage();
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(14)
            .text('Detalle del Servicio', 50, 40);

        // Diagnostico
        doc.fontSize(12).fillColor(primaryColor)
            .text('Diagnóstico Inicial Y Final:', 50, 70)
            .font('Helvetica').fillColor('#2c3e50').fontSize(10)
            .text(ingreso.Diagnostico || 'Sin diagnóstico especificado', 50, 85, { width: 500 });

        // Tabla de Piezas
        if (piezas.length > 0) {
            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
                .text('Piezas Utilizadas:', 50, 120);

            const startY = 140;
            doc.rect(50, startY, 500, 20).fill(secondaryColor);
            doc.fontSize(10).fillColor('#ffffff').font('Helvetica-Bold')
                .text('Descripción', 55, startY + 5)
                .text('Cantidad', 300, startY + 5)
                .text('P. Unitario', 380, startY + 5)
                .text('Total', 460, startY + 5);

            let currentY = startY + 25;
            piezas.forEach((pieza, i) => {
                doc.fillColor(i % 2 === 0 ? lightGrey : '#ffffff')
                    .rect(50, currentY, 500, 18).fill();
                doc.fillColor('#2c3e50').font('Helvetica').fontSize(9)
                    .text(pieza.Nombre_pieza, 55, currentY + 4)
                    .text(pieza.Cantidad_Usada, 300, currentY + 4)
                    .text(`$${pieza.Precio.toFixed(2)}`, 380, currentY + 4)
                    .text(`$${pieza.Total.toFixed(2)}`, 460, currentY + 4);
                currentY += 18;
            });

            // Totales
            const totalPiezas = piezas.reduce((sum, p) => sum + p.Total, 0);
            const manoObra = ingreso.ManoObraCotizada || 0;
            const totalFinal = totalPiezas + manoObra;

            doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(11)
                .text('Total Piezas:', 350, currentY + 10)
                .text(`$${totalPiezas.toFixed(2)}`, 460, currentY + 10)
                .text('Mano de Obra:', 350, currentY + 25)
                .text(`$${manoObra.toFixed(2)}`, 460, currentY + 25)
                .moveTo(350, currentY + 38).lineTo(550, currentY + 38).stroke()
                .text('TOTAL GENERAL:', 350, currentY + 45)
                .text(`$${totalFinal.toFixed(2)}`, 460, currentY + 45);
        }

        // Firma de conformidad
        doc.font('Helvetica-Bold').fillColor(primaryColor).fontSize(12)
            .text('Confirmación de Entrega', 50, doc.y + 30)
            .font('Helvetica').fontSize(10)
            .text('Firma del Cliente: _________________________', 50, doc.y + 20)
            .text('Nombre y Fecha: ____________________________', 50, doc.y + 35)
            .text(`Entregado por: ${ingreso.AsesorNombre} ${ingreso.AsesorApellido}`, 300, doc.y + 20)
            .text(`Sucursal: ${ingreso.Sucursal}`, 300, doc.y + 35);

        doc.end();
    } catch (error) {
        console.error("Error al generar PDF de entrega:", error);
        if (!res.headersSent) res.status(500).json({ error: "Error al generar el PDF: " + error.message });
        else res.end();
    }
});
app.get('/generar-reporte-ventas', async (req, res) => {
    try {
        const { tipo, fechaInicio, fechaFin, usuario } = req.query;
        const pool = await poolPromise;

        // Validar si el usuario es admin
        const rolResult = await pool.request()
            .input("usuario", sql.VarChar, usuario)
            .query("SELECT rol FROM usuarios WHERE usuario = @usuario");

        const userData = rolResult.recordset[0];
        if (!userData || userData.rol !== 'admin') {
            return res.status(403).send("Acceso no autorizado");
        }

        // Consulta principal mejorada
        const ingresosResult = await pool.request()
            .input('startDate', sql.Date, new Date(fechaInicio))
            .input('endDate', sql.Date, new Date(fechaFin))
            .query(`
                SELECT 
                    i.IDIngreso,
                    i.Folio,
                    FORMAT(i.FechaIngreso, 'dd/MM/yyyy') AS FechaFormateada,
                    i.Total,
                    COALESCE(co.Mano_Obra, 0) AS Mano_Obra,
                    c.Nombre,
                    c.Apellido,
                    v.Placas,
                    v.Marca,
                    v.Modelo,
                    (SELECT SUM(dp.Cantidad_Usada * dp.Precio) 
                        FROM DetallePiezas dp 
                        WHERE dp.IDIngreso = i.IDIngreso) AS Total_Piezas
                FROM Ingresos i
                INNER JOIN Clientes c ON i.IDCliente = c.IDCliente
                INNER JOIN Vehiculos v ON i.IDVehiculo = v.IDVehiculo
                LEFT JOIN Cotizaciones co ON i.IDCotizacion = co.IDCotizacion
                WHERE i.IDEntrega IS NOT NULL
                    AND i.FechaIngreso BETWEEN @startDate AND @endDate
                ORDER BY i.FechaIngreso
            `);

        if (ingresosResult.recordset.length === 0) {
            return res.status(404).send('No se encontraron registros para el período seleccionado');
        }

        const doc = new PDFDocument({ margin: 40 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename=reporte_${tipo}_${fechaInicio}_a_${fechaFin}.pdf`);
        doc.pipe(res);

        // Encabezado mejorado
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 30, 15, { width: 80 });
        }
        doc.font('Helvetica-Bold')
            .fontSize(16)
            .fillColor('#2c3e50')
            .text('TRANSMISIONES FRÍAS', 110, 20)
            .fontSize(10)
            .fillColor('#555555')
            .text(`Reporte: ${tipo.toUpperCase()}`, 110, 40)
            .text(`Del ${new Date(fechaInicio).toLocaleDateString()} al ${new Date(fechaFin).toLocaleDateString()}`, 110, 55)
            .text(`Generado por: ${usuario}`, 110, 70)
            .moveDown(2);

        // Configuracion de columnas
        const columns = [
            { name: 'FOLIO', width: 80, x: 45 },
            { name: 'CLIENTE', width: 130, x: 130 },
            { name: 'VEHÍCULO', width: 130, x: 265 },
            { name: 'MANO OBRA', width: 80, x: 400, align: 'right' },
            { name: 'TOTAL', width: 80, x: 485, align: 'right' }
        ];

        let yPosition = 120;

        // Encabezados de tabla
        doc.font('Helvetica-Bold')
            .fontSize(10)
            .fillColor('#ffffff')
            .rect(40, yPosition, 520, 20)
            .fill('#dbd5c9');

        columns.forEach(col => {
            doc.text(col.name, col.x, yPosition + 5, {
                width: col.width,
                align: col.align || 'left'
            });
        });

        yPosition += 25;

        // Variables para totales
        let totalGeneral = 0;
        let totalManoObra = 0;
        let totalPiezas = 0;

        // Procesar cada registro
        for (let i = 0; i < ingresosResult.recordset.length; i++) {
            const ingreso = ingresosResult.recordset[i];
            const rowColor = i % 2 === 0 ? '#ffffff' : '#f8f9fa';

            // Validar y formatear valores
            const manoObra = Number(ingreso.Mano_Obra) || 0;
            const totalPiezasIngreso = Number(ingreso.Total_Piezas) || 0;
            const totalIngreso = Number(ingreso.Total) || 0;

            // Fondo de fila
            doc.rect(40, yPosition - 2, 520, 20).fill(rowColor);

            // Datos principales
            doc.font('Helvetica')
                .fontSize(9)
                .fillColor('#333333')
                .text(ingreso.Folio || 'N/A', columns[0].x, yPosition)
                .text(`${ingreso.Nombre || ''} ${ingreso.Apellido || ''}`.trim(), columns[1].x, yPosition)
                .text(`${ingreso.Marca || ''} ${ingreso.Modelo || ''} (${ingreso.Placas || 'N/A'})`, columns[2].x, yPosition)
                .text(`$${manoObra.toFixed(2)}`, columns[3].x, yPosition, { width: columns[3].width, align: columns[3].align })
                .text(`$${totalIngreso.toFixed(2)}`, columns[4].x, yPosition, { width: columns[4].width, align: columns[4].align });

            yPosition += 20;

            // Detalle de piezas
            if (totalPiezasIngreso > 0) {
                doc.fontSize(8).fillColor('#666666');
                
                const piezasResult = await pool.request()
                    .input('IDIngreso', sql.Int, ingreso.IDIngreso)
                    .query(`
                        SELECT 
                            p.Nombre_pieza,
                            dp.Cantidad_Usada AS Cantidad,
                            dp.Precio,
                            (dp.Cantidad_Usada * dp.Precio) AS Total
                        FROM DetallePiezas dp
                        JOIN Piezas p ON dp.IDPieza = p.IDPieza
                        WHERE dp.IDIngreso = @IDIngreso
                    `);

                piezasResult.recordset.forEach(pieza => {
                    const nombre = pieza.Nombre_pieza || 'Pieza sin nombre';
                    const cantidad = pieza.Cantidad || 0;
                    const precio = pieza.Precio || 0;
                    doc.text(`› ${nombre} (${cantidad} x $${precio.toFixed(2)})`, columns[1].x, yPosition);
                    yPosition += 12;
                });

                yPosition += 5;
            }

            // Acumular totales
            totalManoObra += manoObra;
            totalPiezas += totalPiezasIngreso;
            totalGeneral += totalIngreso;
        }

        // Calculo de margenes
        const margen = totalGeneral > 0 ? (totalManoObra / totalGeneral) * 100 : 0;

        // Seccion de totales
        yPosition += 30;
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#2c3e50');
        
        // Linea divisoria
        doc.moveTo(40, yPosition).lineTo(560, yPosition).strokeColor('#2c3e50').lineWidth(1).stroke();
        yPosition += 25;

        // Ajuste de alineacion visual
        const labelX = 350;
        const valueX = 450;

        doc.text('TOTAL PIEZAS:', labelX, yPosition)
    .text(`$${totalPiezas.toFixed(2)}`, valueX, yPosition, { align: 'right', width: 90 });
    yPosition += 20;

        doc.text('TOTAL MANO DE OBRA:', labelX, yPosition)
    .text(`$${totalManoObra.toFixed(2)}`, valueX, yPosition, { align: 'right', width: 90 });
    yPosition += 20;

        doc.text('TOTAL GENERAL:', labelX, yPosition)
    .text(`$${totalGeneral.toFixed(2)}`, valueX, yPosition, { align: 'right', width: 90 });
    yPosition += 20;

        doc.text('MARGEN:', labelX, yPosition)
    .text(`${margen.toFixed(2)}%`, valueX, yPosition, { align: 'right', width: 90 });

        // Pie de pagina
        doc.fontSize(8).fillColor('#777777')
            .text(`Generado el ${new Date().toLocaleDateString()} a las ${new Date().toLocaleTimeString()}`, 40, 780)
            .text(`Sistema Transmisiones Frías v2.0`, 40, 795, { align: 'left' });

        doc.end();
    } catch (error) {
        console.error("Error al generar reporte:", error);
        if (!res.headersSent) {
            res.status(500).send('Error interno del servidor');
        }
    }
});

app.get('/generar-reporte-inventario', async (req, res) => {
    try {
        const pool = await poolPromise;
        
        const result = await pool.request().query(`
            SELECT 
                ISNULL(p.Nombre_pieza, 'Sin nombre') AS Nombre_pieza,
                ISNULL(p.SKU, 'N/A') AS SKU,
                ISNULL(p.Marca, 'N/A') AS Marca,
                COALESCE(p.Cantidad, 0) AS Cantidad,
                COALESCE(p.Costo_compra, 0) AS Costo_compra,
                COALESCE(p.Precio_venta, 0) AS Precio_venta,
                (COALESCE(p.Cantidad, 0) * COALESCE(p.Costo_compra, 0)) AS Valor_costo,
                (COALESCE(p.Cantidad, 0) * COALESCE(p.Precio_venta, 0)) AS Valor_venta
            FROM Piezas p
            ORDER BY p.Nombre_pieza
        `);

        const piezas = result.recordset;
        
        if (piezas.length === 0) {
            return res.status(404).send('No se encontraron registros en el inventario');
        }

        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename=reporte_inventario.pdf');
        
        // Manejo mejorado de errores
        let streamClosed = false;
        doc.on('error', (error) => {
            if (!streamClosed && !res.headersSent) {
                res.status(500).send('Error generando PDF');
                streamClosed = true;
            }
        });

        doc.pipe(res);

        const columnPositions = {
            NOMBRE: 45,     
            SKU: 180,       
            MARCA: 260,     
            EXIST: 360,     
            VALOR: 460      
        };

        let yPosition = 120;
        let pageNumber = 1;
        const MAX_Y = 750;
        const ROW_HEIGHT = 20;

    
        const formatMoney = (value) => {
            return new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }).format(value).replace('USD', '').trim(); 
        };

        const dibujarEncabezados = () => {
            try {
                doc.fillColor('#2c3e50')
                    .rect(40, yPosition, 520, 25)
                    .fill();
                
                doc.font('Helvetica-Bold')
                    .fontSize(10)
                    .fillColor('#ffffff')
                    .text('NOMBRE', columnPositions.NOMBRE, yPosition + 8)
                    .text('SKU', columnPositions.SKU, yPosition + 8)
                    .text('MARCA', columnPositions.MARCA, yPosition + 8)
                    .text('STOCK', columnPositions.EXIST, yPosition + 8, { width: 60, align: 'right' })
                    .text('VALOR', columnPositions.VALOR, yPosition + 8, { width: 60, align: 'right' });

                yPosition += 30;
            } catch (error) {
                console.error('Error dibujando encabezados:', error);
                throw error;
            }
        };

        // Cabecera
        try {
            if (fs.existsSync(logoPath)) {
                doc.image(logoPath, 490, 10, { width: 60 });
            }
            doc.font('Helvetica-Bold')
                .fontSize(16)
                .fillColor('#2c3e50')
                .text('REPORTE DE INVENTARIO', 110, 20)
                .fontSize(10)
                .fillColor('#666666')
                .text(`Generado: ${new Date().toLocaleDateString()}`, 400, 25)
                .text(`Total registros: ${piezas.length}`, 400, 40);

            dibujarEncabezados();
        } catch (headerError) {
            console.error('Error en cabecera:', headerError);
            if (!streamClosed && !res.headersSent) {
                return res.status(500).send('Error generando cabecera');
            }
            return;
        }

        // Procesar registros
        for (const [index, pieza] of piezas.entries()) {
            try {
                if (yPosition + ROW_HEIGHT > MAX_Y) {
                    doc.addPage();
                    pageNumber++;
                    yPosition = 40;
                    dibujarEncabezados();
                }

                // Validacion numerica
                const valorCosto = Number(pieza.Valor_costo) || 0;
                
                const nombre = pieza.Nombre_pieza?.substring(0, 25) || 'Sin nombre';
                const marca = pieza.Marca?.substring(0, 15) || 'N/A';
                const sku = pieza.SKU || 'N/A';

                doc.fillColor(index % 2 === 0 ? '#FFFFFF' : '#F8F9FA')
                    .rect(40, yPosition, 520, ROW_HEIGHT)
                    .fill();

                doc.font('Helvetica')
                    .fontSize(9)
                    .fillColor('#333333')
                    .text(nombre, columnPositions.NOMBRE, yPosition + 6, { width: 110 })
                    .text(sku, columnPositions.SKU, yPosition + 6, { width: 80 })
                    .text(marca, columnPositions.MARCA, yPosition + 6, { width: 90 })
                    .text(pieza.Cantidad.toString(), columnPositions.EXIST, yPosition + 6, { width: 60, align: 'right' })
                    .text(formatMoney(valorCosto), columnPositions.VALOR, yPosition + 6, { width: 60, align: 'right' });


                yPosition += ROW_HEIGHT;
            } catch (rowError) {
                console.error(`Error en fila ${index + 1}:`, rowError);
                continue;
            }
        }

        // Totales
        try {
            const totales = piezas.reduce((acc, pieza) => ({
                cantidad: acc.cantidad + Number(pieza.Cantidad),
                valorCosto: acc.valorCosto + Number(pieza.Valor_costo),
                valorVenta: acc.valorVenta + Number(pieza.Valor_venta)
            }), { cantidad: 0, valorCosto: 0, valorVenta: 0 });

            const margenGanancia = totales.valorVenta - totales.valorCosto;
            const porcentajeMargen = totales.valorCosto > 0 ? 
            ((margenGanancia / totales.valorCosto) * 100) : 0;

            //Validacion de espacio para los totales
            doc.moveTo(40, yPosition).lineTo(550, yPosition).stroke();
            yPosition += 20;

            const labelX = 400;
            const valueX = 470;

            doc.text('TOTAL GENERAL:', labelX, yPosition, { width: 160, align: 'left' })
                .text(formatMoney(totales.valorCosto), valueX, yPosition, { align: 'right' });

            yPosition += 20;
            doc.text('Total De Piezas:', labelX, yPosition, { width: 160, align: 'left' })
                .text(totales.cantidad.toString(), valueX, yPosition, { align: 'right' });

            yPosition += 20;
            doc.text('Valor Total De Venta:', labelX, yPosition, { width: 160, align: 'left' })
                .text(formatMoney(totales.valorVenta), valueX, yPosition, { align: 'right' });

            yPosition += 20;
            doc.text('Margen Aproximado:', labelX, yPosition, { width: 160, align: 'left' })
                .text(`${porcentajeMargen.toFixed(2)}%`, valueX, yPosition, { align: 'right' });


            if (yPosition < 750) {
                doc.fontSize(8)
                    .fillColor('#666666')
                    .text(`Sistema Transmisiones Frías - Página ${pageNumber}`, 40, 780, { align: 'center' });
            }

            doc.end();
            streamClosed = true;
        } catch (footerError) {
            console.error('Error en totales:', footerError);
            if (!streamClosed && !res.headersSent) {
                res.status(500).send('Error generando totales');
            }
        }

    } catch (error) {
        console.error('Error general:', error);
        if (!streamClosed && !res.headersSent) {
            res.status(500).send('Error al generar reporte');
        }
    }
});

