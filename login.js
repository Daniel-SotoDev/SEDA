document.addEventListener("DOMContentLoaded", () => {
    console.log("login.js cargado correctamente");
    
    const closeModal = document.getElementById("closeModal");
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("login-btn");
    const errorMsg = document.getElementById("error-msg");
    const passwordInput = document.getElementById("password");
    
    const URL_SERVIDOR = "http://localhost:4000";

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
