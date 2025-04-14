document.addEventListener("DOMContentLoaded", async () => {
    const listaFolios = document.getElementById("listaFolios");

    async function obtenerURLServidor() {
        try {
            // Esperar a que se cargue la configuración del archivo config.json
            const response = await fetch(window.location.origin + "/config.json");
            if (!response.ok) {
                throw new Error("No se pudo obtener config.json");
            }
    
            const config = await response.json();
            // Usar el puerto de la configuración para construir la URL del servidor
            return `http://127.0.0.1:${config.puerto}`;
        } catch (error) {
            console.error("Error al obtener la URL del servidor:", error);
            return "http://127.0.0.1:4000"; // Fallback si hay un error
        }
    }

    async function obtenerFoliosDelDia() {
        try {
            const urlServidor = await obtenerURLServidor();
            
            // Configurar Socket.io para actualizaciones en tiempo real
            const socket = io(urlServidor);
            
            socket.on("actualizarFolios", (folios) => {
                console.log("Actualizando folios del día...");
                mostrarFolios(folios); 
            });
    
            // Obtener folios iniciales
            const response = await fetch(`${urlServidor}/obtenerFoliosDelDia`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
    
            const folios = await response.json();
            
            if (!Array.isArray(folios)) {
                throw new Error("Formato de datos inválido");
            }
    
            mostrarFolios(folios);
        } catch (error) {
            console.error("Error al obtener los folios del día:", error);
            // Mostrar mensaje de error en la interfaz
            listaFolios.innerHTML = `<li style="color: #ff6b6b;">Error al cargar folios</li>`;
        }
    }

    function mostrarFolios(folios) {
        listaFolios.innerHTML = "";
    
        if (!folios || folios.length === 0) {
            const li = document.createElement("li");
            li.textContent = "No hay folios registrados hoy";
            li.style.color = "#A3D0F8";
            li.style.fontStyle = "italic";
            listaFolios.appendChild(li);
            return;
        }
    
        folios.forEach(folio => {
            const li = document.createElement("li");
            li.style.fontWeight = "bold"; 
            li.style.display = "flex"; 
            li.style.alignItems = "center";
            li.style.justifyContent = "space-between";
            li.style.margin = "5px 0";
    
            const span = document.createElement("span");
            span.textContent = folio;
            li.appendChild(span);
    
            const botonCopiar = document.createElement("button");
            botonCopiar.className = "copiar-btn";
            botonCopiar.innerHTML = '<i class="fa fa-copy"></i>';
            botonCopiar.style.background = "transparent";
            botonCopiar.style.border = "none";
            botonCopiar.style.color = "#A3D0F8";
            botonCopiar.style.cursor = "pointer";
            botonCopiar.addEventListener("click", () => copiarAlPortapapeles(folio));
            
            li.appendChild(botonCopiar);
            listaFolios.appendChild(li);
        });
    }

    function copiarAlPortapapeles(texto) {
        navigator.clipboard.writeText(texto).then(() => {
            alert("Folio copiado al portapapeles: " + texto);
        }).catch(err => {
            console.error("Error al copiar al portapapeles:", err);
        });
    }

    obtenerFoliosDelDia();
});
