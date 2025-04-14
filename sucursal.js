document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("sucursalForm");
    const errorMsg = document.getElementById("error-msg");
    const closeModal = document.getElementById("closeModal");

    // Cerrar la ventana al hacer clic en la X
    closeModal.addEventListener("click", () => {
        window.close();
    });

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nombre = document.getElementById("nombre").value;
        const direccion = document.getElementById("direccion").value;
        const telefono = document.getElementById("telefono").value;

        window.electron.send("guardar-sucursal", { nombre, direccion, telefono });
    });

    window.electron.receive("sucursal-guardada", (message) => {
        alert(message);
        window.close();
    });

    window.electron.receive("sucursal-error", (message) => {
        errorMsg.textContent = message;
        errorMsg.style.display = "block";
    });
});