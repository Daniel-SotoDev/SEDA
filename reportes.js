const ipcRenderer = window.electron;

document.addEventListener("DOMContentLoaded", () => {
    const closeModal = document.getElementById("closeModal");
    if (closeModal) {
        closeModal.addEventListener("click", () => window.close());
    }
});

async function generarReporte(tipo) {
    try {
        const rol = localStorage.getItem("rol");
        const usuario = localStorage.getItem("usuario");
        if (rol !== "admin") {
            alert("No tienes permisos para acceder a reportes.");
            return;
        }

        const URL_SERVIDOR = "http://localhost:4000";
        let fechaInicio = document.getElementById("fechaInicio")?.value;
        let fechaFin = document.getElementById("fechaFin")?.value;

        if (!fechaInicio || !fechaFin) {
            throw new Error("Debes seleccionar ambas fechas");
        }

        const params = new URLSearchParams({
            tipo,
            fechaInicio,
            fechaFin,
            usuario
        });

        const pdfUrl = `${URL_SERVIDOR}/generar-reporte-ventas?${params.toString()}`;
        window.open(pdfUrl, "_blank");
    } catch (error) {
        alert(error.message || "Error generando el reporte.");
    }
}
