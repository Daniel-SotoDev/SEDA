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

        const urlServidor = await obtenerURLServidor();
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

        const pdfUrl = `${urlServidor}/generar-reporte-ventas?${params.toString()}`;
        window.open(pdfUrl, "_blank");
    } catch (error) {
        alert(error.message || "Error generando el reporte.");
    }
}

async function obtenerURLServidor() {
    try {
        const response = await fetch(window.location.origin + "/config.json");
        if (!response.ok) throw new Error("Error obteniendo configuración");
        const config = await response.json();
        return `http://127.0.0.1:${config.puerto}`;
    } catch (error) {
        console.error("Error al obtener el puerto del servidor:", error);
        return "http://127.0.0.1:4000";
    }
}
