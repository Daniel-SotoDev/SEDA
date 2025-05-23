const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const { dialog } = require('electron');
const { fork } = require('child_process')
const Store  = require('electron-store');
const store = new Store({
    defaults: {
        serverPort: 4000,
        configVersion: "1.0.0"
    }
});
const path = require("path");
const { sql, poolPromise } = require("./server/db");
const bcrypt = require("bcryptjs");

let mainWindow;
let loginWindow;
let ingresoWindow;
let cotizacionesWindow;
let diagnosticoWindow;
let clienteWindow;
let vehiculoWindow;
let catalogoWindow;
let crearSucursalWindow;
let crearUsuarioWindow;
let asesorWindow;
let entregaWindow;
let splashWindow;
let serverProcess = null;
let reporteWindow;

app.disableHardwareAcceleration();
const { spawn } = require('child_process');
function startServer() {
    const isPackaged = app.isPackaged;
    const serverPath = isPackaged
        ? path.join(process.resourcesPath, "app.asar.unpacked", "server", "server.js")
        : path.join(__dirname, "server", "server.js");

    if (serverProcess) {
        console.log("El servidor ya está en ejecución");
        return;
    }

    console.log(" Iniciando servidor desde:", serverPath);

    serverProcess = spawn(process.execPath, [serverPath], {
        stdio: "inherit",
        env: {
            ...process.env,
            NODE_ENV: isPackaged ? "production" : "development"
        }
    });

    serverProcess.on("error", (err) => {
        console.error(" Error al iniciar el servidor:", err);
    });

    serverProcess.on("exit", (code) => {
        console.warn(" Servidor cerrado con código:", code);
        serverProcess = null;
        if (code === 1) {
            const { dialog } = require('electron');
            dialog.showErrorBox("Error", "El puerto 4000 está en uso. Cierre otras instancias de la aplicación.");
            app.quit();
        }
    });
}



function stopServer() {
    if (serverProcess) {
        serverProcess.kill();
        serverProcess = null;
    }
}

///BORRAR AL FINALIZAR QUE NO SE ME OLVIDEE
async function updatePasswords() {
    try {
        const pool = await poolPromise;
        const result = await pool.request().query("SELECT id, password FROM usuarios");

        for (let user of result.recordset) {
            if (!user.password) { 
                console.error(`usuario con ID ${user.id} contraseña invalida.`);
                continue;
            }

            if (!user.password.startsWith("$2a$")) { 
                const hashedPassword = await bcrypt.hash(user.password, 10);
                await pool.request()
                .input("hashedPassword", sql.VarChar, hashedPassword)
                .input("userId", sql.Int, user.id)
                .query("UPDATE usuarios SET password = @hashedPassword WHERE id = @userId");

                console.log(` Contraseña actualizada para el ID ${user.id}`);
            }
        }
    } catch (error) {
        console.error("Error al actualizar las contraseñas:", error);
    }
}

const checkPort = (port) => new Promise((resolve) => {
    const net = require('net');
    const tester = net.createServer()
        .once('error', () => resolve(false))
        .once('listening', () => {
            tester.close(() => resolve(true));
        })
        .listen(port);
});

app.whenReady().then(async () => {
    const portAvailable = await checkPort(4000);
    if (!portAvailable) {
        dialog.showErrorBox("Error", "El puerto 4000 está siendo usado por otra aplicación");
        app.quit();
        return;
    }
    updatePasswords() //------------NO OLVIDAR BORRAR / SE COMENTA POR SI SE NECESITA MAS ADELANTE
    startServer(); 
    createSplashWindow();
});

app.on('window-all-closed', () => {
    stopServer();
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    stopServer();
    if (serverProcess) {
        serverProcess.kill('SIGTERM');
    }
});

function createSplashWindow() {
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        frame: false,
        alwaysOnTop: true,
        transparent: false,
        resizable: false,
        show: true,
        icon: path.join(__dirname, "img", "TF_LOGO.png"),
        webPreferences: {
            contextIsolation: true
        }
    });

    splashWindow.loadFile("splash.html");

    setTimeout(() => {
        splashWindow.close();
        createLoginWindow(); // Mostrar login después del splash
    }, 5000);
}

function createLoginWindow() {
    loginWindow = new BrowserWindow({
        width: 350,
        height: 370,
        frame: false,
        resizable: false,
        alwaysOnTop: true,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            contextBridge: true,
        },
    });

    loginWindow.loadFile("login.html");

    loginWindow.on("closed", () => {
        loginWindow = null;
    });
}
function createMainWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, "img", "TF_MENU2.png"),
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true,
            contextBridge: true,
        },
    });
    mainWindow.loadFile("index.html");

    

    //Menu.setApplicationMenu(null);

    mainWindow.on("closed", () => {
        mainWindow = null;
    });

    ipcMain.handle('get-server-port', () => {
        return store.get('serverPort') || 4000; // Valor por defecto
    });

    ipcMain.on('set-server-port', (event, port) => {
        store.set('serverPort', port);
        console.log('Puerto guardado:', port);
    });
    
    ipcMain.on("abrir-crear-sucursal", () => {
        if (!crearSucursalWindow) {
            crearSucursalWindow = new BrowserWindow({
                width: 500,
                height: 500,
                parent: mainWindow,
                modal: true,
                frame: false,
                resizable: false,
                webPreferences: {
                    preload: path.join(__dirname, "preload.js"),
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: true,
                    contextBridge: true,
                },
            });
            crearSucursalWindow.loadFile(path.join(__dirname, "sucursal.html"));
            crearSucursalWindow.on("closed", () => {
                crearSucursalWindow = null;
            });
        }
    });
    // Crear ventana de Crear Usuario
ipcMain.on("abrir-crear-usuario", () => {
    if (!crearUsuarioWindow) {
        crearUsuarioWindow = new BrowserWindow({
            width: 500,
            height: 500,
            parent: mainWindow,
            modal: true,
            frame: false,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                contextBridge: true,
            },
        });
        crearUsuarioWindow.loadFile(path.join(__dirname, "usuario.html"));
        crearUsuarioWindow.on("closed", () => {
            crearUsuarioWindow = null;
        });
    }
});
ipcMain.on("abrir-crear-asesor", () => {
    if (!asesorWindow) {
        asesorWindow = new BrowserWindow({
            width: 600,
            height: 500,
            parent: mainWindow,
            modal: true,
            frame: false,
            resizable: false,
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                contextBridge: true,
            },
        });
        asesorWindow.loadFile(path.join(__dirname, "asesor.html"));
        asesorWindow.on("closed", () => {
            asesorWindow = null;
        });
    }
});
    // Guardar Sucursal
ipcMain.on("guardar-sucursal", async (event, { nombre, direccion, telefono }) => {
    try {
        const pool = await poolPromise;
        await pool.request()
            .input("nombre", sql.VarChar, nombre)
            .input("direccion", sql.VarChar, direccion)
            .input("telefono", sql.VarChar, telefono)
            .query("INSERT INTO Sucursales (Nombre, Direccion, Telefono) VALUES (@nombre, @direccion, @telefono)");
        event.reply("sucursal-guardada", "Sucursal guardada correctamente.");
    } catch (error) {
        event.reply("sucursal-error", "Error al guardar la sucursal: " + error.message);
    }
});

// Guardar Usuario
ipcMain.on("guardar-usuario", async (event, { nombreUsuario, contraseña, permisos }) => {
    try {
        const hashedPassword = await bcrypt.hash(contraseña, 10); // Cifrar la contraseña
        const pool = await poolPromise;
        await pool.request()
            .input("nombreUsuario", sql.VarChar, nombreUsuario)
            .input("contraseña", sql.NVarChar, hashedPassword)
            .input("permisos", sql.VarChar, permisos)
            .query("INSERT INTO usuarios (usuario, password, rol) VALUES (@nombreUsuario, @contraseña, @permisos)");
        event.reply("usuario-guardado", "Usuario guardado correctamente.");
    } catch (error) {
        event.reply("usuario-error", "Error al guardar el usuario: " + error.message);
    }
});

    ipcMain.on("close-app", () => {
        app.quit();
    });
    ipcMain.on("abrir-nuevo-ingreso", () => {
        console.log("Intentando abrir la ventana de Nuevo Ingreso...");
        if (!ingresoWindow) {
            ingresoWindow = new BrowserWindow({
                width: 900,
                height: 500,
                parent: mainWindow,
                modal: false,
                frame: false,
                resizable: true,
                title: "Nuevo Ingreso",
                webPreferences: {
                    preload: path.join(__dirname, "preload.js"),
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: true,
                    contextBridge: true,
                },
            });
            ingresoWindow.loadFile(path.join(__dirname, "nuevoIngreso.html"));
            ingresoWindow.on("closed", () => {
                ingresoWindow = null;
            });
        }
    });

    ipcMain.on("abrir-cotizaciones", () => {
        console.log("Intentando abrir la ventana de Cotizaciones...");
        if (!cotizacionesWindow) {
            cotizacionesWindow = new BrowserWindow({
                width: 900,
                height: 500,
                parent: mainWindow,
                modal: false,
                frame: false,
                resizable: true,
                title: "Cotizaciones",
                webPreferences: {
                    preload: path.join(__dirname, "preload.js"),
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: true,
                    contextBridge: true,
                },
            });
            cotizacionesWindow.loadFile(path.join(__dirname, "cotizaciones.html"));
            cotizacionesWindow.on("closed", () => {
                cotizacionesWindow = null;
            });
        }
    });

ipcMain.on("abrir-entrega", () => {
    console.log("Intentando abrir la ventana de Entrega...");
    if (!entregaWindow) {
        entregaWindow = new BrowserWindow({
            width: 1000,
            height: 800,
            parent: mainWindow,
            modal: false,
            frame: false,
            resizable: true,
            title: "Entrega de Vehículos",
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                contextBridge: true,
            },
        });
        entregaWindow.loadFile(path.join(__dirname, "entrega.html"));
        entregaWindow.on("closed", () => {
            entregaWindow = null;
        });
    }
});
    ipcMain.on("abrir-diagnosticos", () => {
        console.log("Intentando abrir ventana Diagnosticos...");
        if (!diagnosticoWindow) {
            diagnosticoWindow = new BrowserWindow({
                width: 900,
                height: 480,
                parent: mainWindow,
                modal: false,
                frame: false,
                resizable: true,
                title: "Diagnosticos",
                webPreferences: {
                    preload: path.join(__dirname, "preload.js"),
                    contextIsolation: true,
                    enableRemoteModule: false,
                    webSecurity: true,
                    contextBridge: true,
                },
            });
            diagnosticoWindow.loadFile(path.join(__dirname, "diagnosticos.html"));
            diagnosticoWindow.on("closed", () => {
                diagnosticoWindow = null;
            });
        }
    });
}
ipcMain.on("abrir-nuevo-cliente", () => {
    console.log("Intentando abrir la ventana de clientes...");
    if (!clienteWindow) {
        clienteWindow = new BrowserWindow({
            width: 900,
            height: 500,
            parent: mainWindow,
            modal: false,
            frame: false,
            resizable: true,
            title: "Clientes",
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                contextBridge: true,
            },
        });
        clienteWindow.loadFile(path.join(__dirname, "clientes.html"));
        clienteWindow.on("closed", () => {
            clienteWindow = null;
        });
    }
});
ipcMain.on("abrir-nuevo-vehiculo", () => {
    console.log("Intentando abrir la ventana de vehiculos...");
    if (!vehiculoWindow) {
        vehiculoWindow = new BrowserWindow({
            width: 900,
            height: 500,
            parent: mainWindow,
            modal: false,
            frame: false,
            resizable: true,
            title: "Nuevo Vehiculo",
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                contextBridge: true,
            },
        });
        vehiculoWindow.loadFile(path.join(__dirname, "vehiculos.html"));
        vehiculoWindow.on("closed", () => {
            vehiculoWindow = null;
        });
    }
});
ipcMain.on("abrir-catalogo", () => {
    console.log("Intentando abrir la ventana de catalogos...");
    if (!catalogoWindow) {
        catalogoWindow = new BrowserWindow({
            width: 1000,
            height: 800,
            parent: mainWindow,
            modal: false,
            frame: false,
            resizable: true,
            title: "Nuevo Vehiculo",
            webPreferences: {
                preload: path.join(__dirname, "preload.js"),
                contextIsolation: true,
                enableRemoteModule: false,
                webSecurity: true,
                contextBridge: true,
            },
        });
        catalogoWindow.loadFile(path.join(__dirname, "catalogo.html"));
        catalogoWindow.on("closed", () => {
            catalogoWindow = null;
        });
    }
});
ipcMain.on("abrir-ventana-generica", (event, archivo) => {
    const ventana = new BrowserWindow({
        width: 400,
        height: 200,
        parent: mainWindow,
        modal: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            enableRemoteModule: false,
            webSecurity: true
        }
    });
    ventana.loadFile(path.join(__dirname, archivo));
});
ipcMain.on("abrir-reporte-semanal", () => {
    const reporteWindow = new BrowserWindow({
        width: 450,
        height: 300,
        parent: mainWindow,
        modal: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true
        }
    });
    reporteWindow.loadFile(path.join(__dirname, "reporte-semanal.html"));
});
ipcMain.on("abrir-reporte-mensual", () => {
    const reporteWindow = new BrowserWindow({
        width: 450,
        height: 300,
        parent: mainWindow,
        modal: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true
        }
    });
    reporteWindow.loadFile(path.join(__dirname, "reporte-mensual.html"));
});
ipcMain.on("abrir-reporte-ganancias", () => {
    const reporteWindow = new BrowserWindow({
        width: 450,
        height: 300,
        parent: mainWindow,
        modal: true,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true
        }
    });
    reporteWindow.loadFile(path.join(__dirname, "reporte-ganancias.html"));
});
ipcMain.on('cerrar-ventana', () => {
    if (reporteWindow) {
        reporteWindow.close();
    }
});

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });
}

ipcMain.on("login-attempt", async (event, { username, password }) => {
    try {
        const pool = await poolPromise;
        const result = await pool.request()
            .input("username", sql.VarChar, username)
            .query("SELECT * FROM usuarios WHERE usuario = @username");

        const user = result.recordset[0];

        if (!user || !user.password) {
            event.reply("login-error", "Usuario o contraseña incorrectos.");
            return;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
            if (passwordMatch) {
                const userData = { 
                    usuario: user.usuario, 
                    rol: user.rol // Asegúrate que tu tabla tiene esta columna
                };
                event.reply("login-success", userData);

            if (loginWindow) {
                loginWindow.close();
                loginWindow = null;
            }
            createMainWindow();
        } else {
            event.reply("login-error", "Contraseña incorrecta");
        }
    } catch (err) {
        console.error("Error en la autenticacion:", err);
        event.reply("login-error", "Hubo error al iniciar sesion");
    }
});

// Manejar errores de almacenamiento
store.onDidAnyChange((newValue, oldValue) => {
    console.log('Configuración cambiada:', newValue);
});

process.on('uncaughtException', (error) => {
    console.error('Error no manejado:', error);
    
    store.set('lastError', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date()
    });
});