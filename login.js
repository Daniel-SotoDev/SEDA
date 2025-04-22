document.addEventListener("DOMContentLoaded", () => {
    console.log("login.js cargado correctamente");
    
    const closeModal = document.getElementById("closeModal");
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("login-btn");
    const errorMsg = document.getElementById("error-msg");
    const passwordInput = document.getElementById("password");
    
    closeModal.addEventListener("click", () => window.close());

    if (!loginForm || !loginBtn) {
        console.error("No se encontró el formulario o el botón.");
        return;
    }

    passwordInput.addEventListener("input", () => {
        if (errorMsg.style.display === "block") {
            errorMsg.style.display = "none";
        }
    });

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const username = document.getElementById("username").value;
        const password = passwordInput.value;

        if (!username || !password) {
            errorMsg.textContent = "Por favor, ingresa usuario y contraseña.";
            errorMsg.style.display = "block";
            passwordInput.focus(); 
            return;
        }

        window.electron.send("login-attempt", { username, password });
        console.log("Enviando credenciales al main: ", username);
    });

    window.electron.receive("login-success", () => {
        console.log("Login exitoso");
        window.close();
    });

    window.electron.receive("login-error", (message) => {
        console.error("Error de login:", message);

        errorMsg.textContent = message;
        errorMsg.style.display = "block";

        passwordInput.value = "";
        passwordInput.focus();
    });
});
