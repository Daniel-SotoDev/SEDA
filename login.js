document.addEventListener("DOMContentLoaded", async() => {
    console.log("login.js cargado correctamente");
    
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
    const URL_SERVIDOR = getServerUrlSync();

    console.log("URL del servidor en uso:", URL_SERVIDOR);
    
    const closeModal = document.getElementById("closeModal");
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("login-btn");
    const errorMsg = document.getElementById("error-msg");
    const passwordInput = document.getElementById("password");
    
    /*const host = window.location.hostname || "127.0.0.1";
    const URL_SERVIDOR = `http://${host}:4000`;*/

    closeModal.addEventListener("click", () => {
        window.close();
    });

    if (!loginForm || !loginBtn) {
        console.error("No se encontró el formulario o el botón.");
        return;
    }

    passwordInput.addEventListener("input", () => {
        errorMsg.style.display = "none";
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = passwordInput.value.trim();

        if (!username || !password) {
            showError("Por favor, ingresa usuario y contraseña.");
            return;
        }

        try {
            // Usar la API segura de preload
            window.electronAPI.send('login-attempt', { 
                username: username,
                password: password
            });
            
            console.log("Credenciales enviadas al proceso principal");
        } catch (error) {
            showError("Error en la comunicación con el servidor");
            console.error("Error IPC:", error);
        }
    });

    // Escuchar respuestas del proceso principal
    window.electronAPI.receive('login-response', (response) => {
        if (response.success) {
            window.close();
        } else {
            showError(response.message || "Error de autenticación");
            passwordInput.value = "";
            passwordInput.focus();
        }
    });

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
        passwordInput.focus();
    }
});
