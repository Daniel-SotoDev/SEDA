const ipcRenderer = window.electron;
console.log("Electron:", window.electron);

async function obtenerURLServidor() {
    try {
        const response = await fetch(window.location.origin + "/config.json");
        if (!response.ok) throw new Error("No se pudo obtener config.json");
        const config = await response.json();
        return `http://127.0.0.1:${config.puerto}`;
    } catch (error) {
        console.error("Error obteniendo la URL del servidor:", error);
        return "http://127.0.0.1:4000";
    }
}

// Obtener referencias a los elementos del modal
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const closeModal = document.querySelector(".close");

// Función para mostrar el modal de inicio de sesión
function showLoginModal() {
    loginModal.style.display = "block";
}

// Función para ocultar el modal de inicio de sesión
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
            boton.addEventListener("click", (e) => {
                if (rol !== "admin") {
                    e.preventDefault();
                    alert("Acceso denegado. Solo administradores pueden acceder a esta sección.");
                }
            });
        }
    });

    const protectedLinks = document.querySelectorAll(".protected");
    const loggedInUser = document.getElementById("loggedInUser");
    const reportesMenu = document.getElementById("reportesMenu");

    if (isLoggedIn) {
        protectedLinks.forEach(link => {
            link.classList.remove("disabled");
            link.style.pointerEvents = "auto";
            link.style.opacity = "1";
        });
        // Ocultar menú de reportes si el rol no es admin
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
}

// Manejar el clic en el botón de "Iniciar Sesión"
document.getElementById("loginBtn")?.addEventListener("click", (e) => {
    e.preventDefault(); // Evitar el comportamiento predeterminado del enlace
    loginForm.reset(); 
    showLoginModal();
});

// Manejar el clic en el botón de cerrar (×)
closeModal?.addEventListener("click", () => {
    hideLoginModal();
    loginForm.reset();
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
        const urlServidor = await obtenerURLServidor();
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
document.getElementById("logoutBtn")?.addEventListener("click", (e) => {
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
document.getElementById("crearSucursalBtn").addEventListener("click", () => {
    ipcRenderer.send("abrir-crear-sucursal");
});

// Reportes
document.getElementById("reporteSemanalBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    ipcRenderer.send("abrir-reporte-semanal");
});

document.getElementById("reporteMensualBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    ipcRenderer.send("abrir-reporte-mensual");
});

document.getElementById("reporteGananciasBtn")?.addEventListener("click", (e) => {
    e.preventDefault();
    ipcRenderer.send("abrir-reporte-ganancias");
});

// Función para cargar ventanas (si es necesaria)
function cargarVentana(archivo) {
    ipcRenderer.send("abrir-ventana-generica", archivo);
}
document.getElementById("crearUsuarioBtn").addEventListener("click", () => {
    ipcRenderer.send("abrir-crear-usuario");
});
//CREAR ASESORES
document.getElementById("crearAsesorBtn").addEventListener("click", () => {
    ipcRenderer.send("abrir-crear-asesor");
});
//detecta click en el submenu de nuevo vehiculo
document.getElementById("catalogoMenu").addEventListener("click", () => {
    ipcRenderer.send("abrir-catalogo");
});
//detecta click en el submenu de nuevo vehiculo
document.getElementById("nuevoVehiculoBtn").addEventListener("click", () => {
    ipcRenderer.send("abrir-nuevo-vehiculo");
});
//detectar click en el submenu de nuevo cliente
document.getElementById("nuevoClienteBtn").addEventListener("click", () => {
    ipcRenderer.send("abrir-nuevo-cliente");
});
// detectar el click en nuevo ingreso
document.getElementById("nuevoIngresoBtn").addEventListener("click", () => {
    ipcRenderer.send("abrir-nuevo-ingreso");
});
// detecta click en diagnostico
document.getElementById("diagnosticoBtn").addEventListener("click", () => {
    ipcRenderer.send("abrir-diagnosticos");
});
//detecta click en cotizaciones
document.getElementById("cotizacionesMenu").addEventListener("click", () => {
    ipcRenderer.send("abrir-cotizaciones");
});
//ENTREGAS 
document.getElementById("entregaMenu").addEventListener("click", () => {
    ipcRenderer.send("abrir-entrega");
});
//detecta click en clientes
document.getElementById("clientesMenu").addEventListener("click", () => {
    ipcRenderer.send("abrir-clientes");
});


