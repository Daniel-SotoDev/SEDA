document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("usuarioForm");
    const errorMsg = document.getElementById("error-msg");
    const closeModal = document.getElementById("closeModal");

    // Cerrar la ventana al hacer clic en la X
    closeModal.addEventListener("click", () => {
        window.close();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombreUsuario = document.getElementById("nombreUsuario").value;
        const contraseña = document.getElementById("contraseña").value;
        const permisos = document.getElementById("permisos").value;

        window.electron.send("guardar-usuario", { nombreUsuario, contraseña, permisos });
    });

    window.electron.receive("usuario-guardado", (message) => {
        alert(message);
        window.close();
    });

    window.electron.receive("usuario-error", (message) => {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
    });
});