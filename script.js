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

    const protectedLinks = document.querySelectorAll(".protected");
    const loggedInUser = document.getElementById("loggedInUser");

    if (isLoggedIn) {
        protectedLinks.forEach(link => {
            link.classList.remove("disabled");
            link.style.pointerEvents = "auto";
            link.style.opacity = "1";
        });
        loggedInUser.textContent = `${usuario} (${rol})`;
    } else {
        protectedLinks.forEach(link => {
            link.classList.add("disabled");
            link.style.pointerEvents = "none";
            link.style.opacity = "0.5";
        });
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
    e.preventDefault(); // Evitar el envío del formulario

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    if (username && password) {
        // Deshabilitar el formulario mientras se procesa la solicitud
        const formElements = loginForm.querySelectorAll("input, button");
        formElements.forEach(element => element.disabled = true);
        try {
            const urlServidor = await obtenerURLServidor(); // Obtén la URL del servidor
            const response = await fetch(`${urlServidor}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario: username, contraseña: password }),
            });

            if (!response.ok) {
                throw new Error("Error en la respuesta del servidor");
            }

            const data = await response.json();

            if (data.success) {
                localStorage.setItem("loggedIn", true);
                localStorage.setItem("usuario", data.usuario);
                localStorage.setItem("rol", data.rol);
                checkLoginStatus();
                hideLoginModal();
                alert("Sesión iniciada correctamente.");
                loginForm.reset();
            } else {
                alert(data.error || "Error al iniciar sesión.");
            }
        } catch (error) {
            console.error("Error en login:", error);
            alert("Error en el servidor. Revisa la consola para más detalles.");
        } finally {
            // Habilitar el formulario después de completar la solicitud
            formElements.forEach(element => element.disabled = false);
        }
    } else {
        alert("Debes ingresar un nombre de usuario y una contraseña.");
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


