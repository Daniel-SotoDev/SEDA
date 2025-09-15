const ipcRenderer = window.electron;
let URL_SERVIDOR = null;
document.addEventListener("DOMContentLoaded", async() => {
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
    URL_SERVIDOR = getServerUrlSync();

    console.log("URL del servidor en uso:", URL_SERVIDOR);
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

        /*const host = window.location.hostname || "127.0.0.1";
        const URL_SERVIDOR = `http://${host}:4000`; */
        

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
