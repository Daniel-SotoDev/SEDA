document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("usuarioForm");
    const errorMsg = document.getElementById("error-msg");
    const closeModal = document.getElementById("closeModal");

    closeModal.addEventListener("click", () => {
        window.close();
    });

    // Enviar datos del formulario
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombreUsuario = document.getElementById("nombreUsuario").value;
        const contraseña = document.getElementById("contraseña").value;
        const permisos = document.getElementById("permisos").value;

        if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send("guardar-usuario", { nombreUsuario, contraseña, permisos });
        } else {
            alert("No se puede guardar porque la API no está disponible.");
        }
    });

    // Escuchar respuestas del proceso principal
    if (window.electronAPI && window.electronAPI.receive) {
        window.electronAPI.receive("usuario-guardado", (message) => {
            alert(message);
            window.close();
        });

        window.electronAPI.receive("usuario-error", (message) => {
            errorMsg.textContent = message;
            errorMsg.style.display = "block";
        });
    }
});
