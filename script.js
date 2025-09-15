const send = window.electronAPI?.send || function () {
    console.warn("send() llamado fuera de electron");
};
console.log("Electron:", window.electron || "No disponible en navegador");

let URL_SERVIDOR = null;
document.addEventListener("DOMContentLoaded", async () => {
/*const host = window.location.hostname || "127.0.0.1";
const URL_SERVIDOR = `http://${host}:4000`; */

// Nuevo: esperar a que detect-server haya intentado configurar window.config
// Esperar a que detect-server.js termine su detección
    if (window.serverDetectionPromise) {
        try {
            await window.serverDetectionPromise;
        } catch (e) {
            console.warn("No se detectó servidor automáticamente", e);
        }
    }

    // Definir URL_SERVIDOR de forma segura
    const PORT = 4000;
    function getServerUrlSync() {
        if (window.config && window.config.serverUrl) return window.config.serverUrl;
        if (location.protocol.startsWith('http') && location.hostname) {
            return `${location.protocol}//${location.hostname}:${PORT}`;
        }
        return `http://127.0.0.1:${PORT}`;
    }
    URL_SERVIDOR = getServerUrlSync();

    console.log("URL del servidor en uso:", URL_SERVIDOR);
});
/*async function obtenerURLServidor() {
    try {
        const response = await fetch(window.location.origin + "/config.json");
        if (!response.ok) throw new Error("No se pudo obtener config.json");
        const config = await response.json();
        return `http://127.0.0.1:${config.puerto}`;
    } catch (error) {
        console.error("Error obteniendo la URL del servidor:", error);
        return "http://127.0.0.1:4000";
    }
} */

// Funcion auxiliar para compatibilidad en tablet
function addTouchClickListener(element, handler) {
    if (!element) return;
    if ("ontouchstart" in window) {
        element.addEventListener("touchend", (e) => {
            e.preventDefault(); // Evita que  dispare "click"
            handler(e);
        });
    } else {
        // para pc
        element.addEventListener("click", handler);
    }
}

// Obtener referencias a los elementos del modal
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const closeModal = document.querySelector(".close");
const closeGenericModal = document.getElementById("closeGenericModal");

// Funcion para mostrar el modal de inicio de sesión
function showLoginModal() {
    loginModal.style.display = "block";
}

// Funcion para ocultar el modal de inicio de sesión
function hideLoginModal() {
    loginModal.style.display = "none";
}

// Función para verificar el estado de login
function checkLoginStatus() {
    const isLoggedIn = localStorage.getItem("loggedIn");
    const usuario = localStorage.getItem("usuario");
    const rol = localStorage.getItem("rol");

    const opcionesProtegidas = [
        "crearSucursalBtn",
        "crearUsuarioBtn",
        "crearAsesorBtn"
    ];
    
    opcionesProtegidas.forEach(id => {
        const boton = document.getElementById(id);
        if (boton) {
            addTouchClickListener(boton, (e) => {
                if (rol !== "admin") {
                    e.preventDefault();
                    //alert("Acceso denegado. Solo administradores pueden acceder a esta sección.");
                }
            });
        }
    });

    const protectedLinks = document.querySelectorAll(".protected");
    const loggedInUser = document.getElementById("loggedInUser");
    const reportesMenu = document.getElementById("reportesMenu");
    const opciones = document.getElementById("opcionesMenu");

    if (isLoggedIn) {
        protectedLinks.forEach(link => {
            link.classList.remove("disabled");
            link.style.pointerEvents = "auto";
            link.style.opacity = "1";
        });
        // Ocultar menu de reportes si el rol no es admin
        if (rol === "admin") {
            reportesMenu.style.display = "inline-block";
        } else {
            reportesMenu.style.display = "none";
        }
        loggedInUser.textContent = `${usuario} (${rol})`;
    } else {
        protectedLinks.forEach(link => {
            link.classList.add("disabled");
            link.style.pointerEvents = "none";
            link.style.opacity = "0.5";
        });
        reportesMenu.style.display = "none";
        loggedInUser.textContent = "No logeado";
    }
    
if (isLoggedIn) {
        protectedLinks.forEach(link => {
            link.classList.remove("disabled");
            link.style.pointerEvents = "auto";
            link.style.opacity = "1";
        });
        // Ocultar menu de reportes si el rol no es admin
        if (rol === "admin") {
            opciones.style.display = "inline-block";
        } else {
            opciones.style.display = "none";
        }
        loggedInUser.textContent = `${usuario} (${rol})`;
    } else {
        protectedLinks.forEach(link => {
            link.classList.add("disabled");
            link.style.pointerEvents = "none";
            link.style.opacity = "0.5";
        });
        opciones.style.display = "none";
        loggedInUser.textContent = "No logeado";
    }
}
// Manejar el clic en el boton de "Iniciar Sesión"
addTouchClickListener(document.getElementById("loginBtn"), (e) => {
    e.preventDefault(); // Evitar el comportamiento predeterminado del enlace
    loginForm.reset(); 
    showLoginModal();
});

// Manejar el click en el boton de cerrar (×)
addTouchClickListener(closeModal,() => {
    hideLoginModal();
    loginForm.reset();
});
// Cerrar con el botón global closeModal
document.querySelectorAll("#closeModal").forEach(btn => {
    addTouchClickListener(btn, () => {
        // Cerrar login modal si está abierto
        loginModal.style.display = "none";
        loginForm?.reset();

        // Cerrar generic modal si está abierto
        const genericModal = document.getElementById("genericModal");
        const iframe = document.getElementById("modalIframe");
        if (genericModal && genericModal.style.display === "block") {
            genericModal.style.display = "none";
            if (iframe) iframe.src = "";
        }
    });
});


loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const formElements = loginForm.querySelectorAll("input, button");

    if (!username || !password) {
        alert("Debes ingresar un nombre de usuario y una contraseña.");
        return;
    }

    // Deshabilitar inputs mientras se procesa
    formElements.forEach(el => el.disabled = true);

    try {
        const urlServidor = URL_SERVIDOR;
        const response = await fetch(`${urlServidor}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ usuario: username, contraseña: password }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            // Error: limpiar password, mostrar error y enfocar
            alert(data.error || "Error al iniciar sesión.");
            document.getElementById("password").value = "";
            document.getElementById("password").focus();

            // Si estás mostrando un error visual, puedes ocultarlo al teclear
            document.getElementById("password").addEventListener("input", () => {
                // document.getElementById("loginErrorMsg").style.display = "none";
            });

            return;
        }

        // Éxito
        localStorage.setItem("loggedIn", true);
        localStorage.setItem("usuario", data.usuario);
        localStorage.setItem("rol", data.rol);
        checkLoginStatus();
        hideLoginModal();
        alert("Sesión iniciada correctamente.");
        loginForm.reset();
    } catch (error) {
        console.error("Error en login:", error);
        alert("Error en el servidor. Revisa la consola para más detalles.");
    } finally {
        formElements.forEach(el => el.disabled = false);
    }
});


// Manejar el clic en el botón de "Cerrar Sesión"
addTouchClickListener(document.getElementById("logoutBtn"), (e) => {
    e.preventDefault(); // Evitar el comportamiento predeterminado del enlace

    // Eliminar los datos del usuario de localStorage
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("usuario");
    localStorage.removeItem("rol");

    // Actualizar la interfaz de usuario
    checkLoginStatus();
    alert("Sesión cerrada correctamente.");
});

// Verificar el estado de login al cargar la página
document.addEventListener("DOMContentLoaded", checkLoginStatus);
// Detectar clic en el submenú de Opciones
addTouchClickListener(document.getElementById("crearSucursalBtn"), () => {
    abrirVentana("abrir-crear-sucursal");
});

// Reportes
addTouchClickListener(document.getElementById("reporteSemanalBtn"), (e) => {
    e.preventDefault();
    abrirVentana("abrir-reporte-semanal");
});

addTouchClickListener(document.getElementById("reporteMensualBtn"), (e) => {
    e.preventDefault();
    abrirVentana("abrir-reporte-mensual");
});

addTouchClickListener(document.getElementById("reporteGananciasBtn"), (e) => {
    e.preventDefault();
    abrirVentana("abrir-reporte-ganancias");
});

// Función para cargar ventanas (si es necesaria)
function cargarVentana(archivo) {
    abrirVentana("abrir-ventana-generica", archivo);
}
addTouchClickListener(document.getElementById("crearUsuarioBtn"), () => {
    abrirVentana("abrir-crear-usuario");
});
//CREAR ASESORES
addTouchClickListener(document.getElementById("crearAsesorBtn"), () => {
    abrirVentana("abrir-crear-asesor");
});
//detecta click en el submenu de nuevo vehiculo
addTouchClickListener(document.getElementById("catalogoMenu"), () => {
    abrirVentana("abrir-catalogo");
});
//detecta click en el submenu de nuevo vehiculo
addTouchClickListener(document.getElementById("nuevoVehiculoBtn"), () => {
    abrirVentana("abrir-nuevo-vehiculo");
});
//detectar click en el submenu de nuevo cliente
addTouchClickListener(document.getElementById("nuevoClienteBtn"), () => {
    abrirVentana("abrir-nuevo-cliente");
});
// detectar el click en nuevo ingreso
addTouchClickListener(document.getElementById("nuevoIngresoBtn"), () => {
    abrirVentana("abrir-nuevo-ingreso");
});
// detecta click en diagnostico
addTouchClickListener(document.getElementById("diagnosticoBtn"), () => {
    abrirVentana("abrir-diagnosticos");
});
//detecta click en cotizaciones
addTouchClickListener(document.getElementById("cotizacionesMenu"), () => {
    abrirVentana("abrir-cotizaciones");
});
//ENTREGAS 
addTouchClickListener(document.getElementById("entregaMenu"), () => {
    abrirVentana("abrir-entrega");
});
//detecta click en clientes
addTouchClickListener(document.getElementById("clientesMenu"), () => {
    abrirVentana("abrir-clientes");
});


