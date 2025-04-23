document.addEventListener('DOMContentLoaded', async () => {
    // Obtener elementos del DOM
    const asesorForm = document.getElementById('asesorForm');
    const closeBtn = document.getElementById('closeModal');
    const sucursalSelect = document.getElementById('sucursal');
    
    const URL_SERVIDOR = "http://localhost:4000";
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