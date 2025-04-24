document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("sucursalForm");
    const errorMsg = document.getElementById("error-msg");
    const closeModal = document.getElementById("closeModal");

    
    closeModal.addEventListener("click", () => {
        window.close();
    });

    // Enviar datos del formulario
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombre = document.getElementById("nombre").value;
        const direccion = document.getElementById("direccion").value;
        const telefono = document.getElementById("telefono").value;

        if (window.electronAPI && window.electronAPI.send) {
            window.electronAPI.send("guardar-sucursal", { nombre, direccion, telefono });
        } else {
            alert("No se puede guardar porque la API no está disponible.");
        }
    });

    // Recibir respuesta exitosa
    if (window.electronAPI && window.electronAPI.receive) {
        window.electronAPI.receive("sucursal-guardada", (message) => {
            alert(message);
            window.close();
        });

        window.electronAPI.receive("sucursal-error", (message) => {
            errorMsg.textContent = message;
            errorMsg.style.display = "block";
        });
    }
});
