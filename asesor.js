document.addEventListener('DOMContentLoaded', async () => {
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
    const URL_SERVIDOR = getServerUrlSync();

    console.log("URL del servidor en uso:", URL_SERVIDOR);
    // Obtener elementos del DOM
    const asesorForm = document.getElementById('asesorForm');
    const closeBtn = document.getElementById('closeModal');
    const sucursalSelect = document.getElementById('sucursal');
    
    /*const host = window.location.hostname || "127.0.0.1";
    const URL_SERVIDOR = `http://${host}:4000`;*/
    

    /*async function obtenerURLServidor() {
        try {
            const response = await fetch(window.location.origin + "/config.json");
            const config = await response.json();
            return `http://127.0.0.1:${config.puerto}`;
        } catch (error) {
            console.error("Error obteniendo la URL del servidor:", error);
            alert("No se pudo conectar al servidor.");
            return null;
        }
    } */

    // Cargar sucursales
    await cargarSucursales();
    
    // Evento para cerrar el modal
    closeBtn.addEventListener('click', () => {
        window.close();
    });
    
    // Evento para enviar el formulario
    asesorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nombre = document.getElementById('nombre').value.trim();
        const apellido = document.getElementById('apellido').value.trim();
        const sucursalId = sucursalSelect.value;
        
        if (!nombre || !apellido || !sucursalId) {
            alert('Todos los campos son obligatorios');
            return;
        }
        
        try {
            const response = await fetch(`${URL_SERVIDOR}/registrar-asesor`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre,
                    apellido,
                    sucursalId
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                alert('Asesor registrado correctamente');
                asesorForm.reset();
            } else {
                throw new Error(data.error || 'Error al registrar asesor');
            }
        } catch (error) {
            console.error('Error:', error);
            alert(error.message);
        }
    });
    
    // Función para cargar sucursales
    async function cargarSucursales() {
        try {
            const response = await fetch(`${URL_SERVIDOR}/obtener-sucursales`);
            const data = await response.json();
            
            if (response.ok) {
                data.forEach(sucursal => {
                    const option = document.createElement('option');
                    option.value = sucursal.IDSucursal;
                    option.textContent = sucursal.Nombre;
                    sucursalSelect.appendChild(option);
                });
            } else {
                throw new Error(data.error || 'Error al cargar sucursales');
            }
        } catch (error) {
            console.error('Error al cargar sucursales:', error);
            alert('Error al cargar sucursales');
        }
    }
});