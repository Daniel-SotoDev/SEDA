document.addEventListener("DOMContentLoaded", () => {
    console.log("login.js cargado correctamente");
    
    const closeModal = document.getElementById("closeModal");
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("login-btn");
    const errorMsg = document.getElementById("error-msg");
    
    closeModal.addEventListener("click", () => window.close());

    if (!loginForm || !loginBtn) {
        console.error("No se encontró el formulario o el botón.");
        return;
    }

     // Manejar el envío del formulario
    loginForm.addEventListener("submit", (e) => {
        e.preventDefault(); // Evitar que el formulario se envíe automáticamente

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        // Validar que los campos no estén vacíos
        if (!username || !password) {
            errorMsg.textContent = "Por favor, ingresa usuario y contraseña.";
            errorMsg.style.display = "block";
            return;
        }

        // Enviar las credenciales al proceso principal
        window.electron.send("login-attempt", { username, password });

        console.log("Enviando credenciales al main: ", username);
    });

    // Manejar la respuesta de login exitoso
    window.electron.receive("login-success", () => {
        console.log("Login exitoso");
        window.close(); // Cerrar la ventana de login
    });

    // Manejar la respuesta de error de login
    window.electron.receive("login-error", (message) => {
        console.error("Error de login:", message);

        // Mostrar el mensaje de error en la interfaz
        errorMsg.textContent = message;
        errorMsg.style.display = "block";

        // Limpiar el campo de contraseña para permitir un nuevo intento
        document.getElementById("password").value = "";
    });
});

