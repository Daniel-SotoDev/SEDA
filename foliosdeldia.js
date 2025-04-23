document.addEventListener("DOMContentLoaded", () => {
    const PUERTO = 4000;
    const URL_SERVIDOR = `http://localhost:${PUERTO}`;
    const listaFolios = document.getElementById("listaFolios");

    const socket = io(URL_SERVIDOR, {
        reconnection: true,
        reconnectionAttempts: 5,
        transports: ['websocket']
    });

    socket.on("actualizarFolios", (folios) => {
        mostrarFolios(folios);
    });

    async function obtenerFolios() {
        try {
            const response = await fetch(`${URL_SERVIDOR}/obtenerFoliosDelDia`);
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

    // Llamada inicial para obtener los folios
    obtenerFolios();
});
