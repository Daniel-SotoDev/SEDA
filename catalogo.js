document.addEventListener("DOMContentLoaded", async () => {
    const modal = document.getElementById("modalPieza");
    const btnAbrirModal = document.getElementById("btnAbrirModal");
    const cerrarModal = document.getElementById("cerrarModal");
    const formPieza = document.getElementById("formPieza");
    const buscarPieza = document.getElementById("buscar_pieza");
    const btnBuscar = document.getElementById("btnBuscar");
    const tablaPiezas = document.getElementById("tabla_piezas");
    const closeModal = document.getElementById("closeModal");
    
    const btnActualizarExistencias = document.getElementById("btnActualizarExistencias");
    const modalActualizarExistencias = document.getElementById("modalActualizarExistencias");
    const cerrarModalActualizar = document.getElementById("cerrarModalActualizar");
    const formActualizarExistencias = document.getElementById("formActualizarExistencias");
    const buscarSKU = document.getElementById("buscarSKU");
    const btnBuscarSKU = document.getElementById("btnBuscarSKU");
    const nombrePieza = document.getElementById("nombrePieza");
    const cantidadAgregar = document.getElementById("cantidadAgregar");
    const costoCompra = document.getElementById("costoCompra");
    const precioVenta = document.getElementById("precioVenta");

    closeModal.addEventListener("click", () => window.close());

    // Obtener el puerto dinámico desde config.json
    async function obtenerURLServidor() {
        try {
            const response = await fetch(window.location.origin + "/config.json");
            if (!response.ok) throw new Error("No se pudo obtener config.json");
            const config = await response.json();
            return `http://127.0.0.1:${config.puerto}`;
        } catch (error) {
            console.error("Error obteniendo la URL del servidor:", error);
            return "http://127.0.0.1:4000";
        }
    }

 /*   // Cargar lista de estatus de piezas
    async function cargarEstatusPiezas() {
        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/obtenerEstatusPiezas`);
            const estatus = await response.json();

            const selectEstatus = document.getElementById("Estatus");
            selectEstatus.innerHTML = estatus.map(e => `<option value="${e.IDEstatus}">${e.Estatus}</option>`).join("");
        } catch (error) {
            console.error("Error al obtener estatus de piezas:", error);
        }
    }
        */
    // Cargar piezas desde la base de datos
    async function cargarPiezas(filtro = "") {
        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/obtenerPiezas?filtro=${filtro}`);
            const piezas = await response.json();

            tablaPiezas.innerHTML = "";
            piezas.forEach(pieza => {
                const fila = document.createElement("tr");
                fila.innerHTML = `
                    <td><img src="data:image/png;base64,${pieza.Foto}" alt="Imagen"></td>
                    <td>${pieza.Nombre_pieza}</td>
                    <td>${pieza.SKU}</td>
                    <td>${pieza.Marca}</td>
                    <td>${pieza.Precio_venta.toFixed(2)}</td>
                    <td>${pieza.Cantidad || 0} </td>
                `;
                tablaPiezas.appendChild(fila);
            });
        } catch (error) {
            console.error("Error al cargar piezas:", error);
        }
    }

    // Buscar piezas
    btnBuscar.addEventListener("click", () => {
        const filtro = buscarPieza.value.trim();
        cargarPiezas(filtro);
    });

    buscarPieza.addEventListener("keypress", (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            const filtro = buscarPieza.value.trim();
            cargarPiezas(filtro);
        }
    });

    // Abrir modal
    btnAbrirModal.addEventListener("click", () => {
        modal.style.display = "flex";
    });

    // Cerrar modal
    cerrarModal.addEventListener("click", () => {
        formPieza.reset();
        modal.style.display = "none";
    });

    // Registrar nueva pieza
    formPieza.addEventListener("submit", async (event) => {
        event.preventDefault();

        formPieza.querySelectorAll("input, select, button").forEach(e => e.disabled = true);

        const formData = new FormData();
        formData.append("Nombre_pieza", document.getElementById("nombre").value);
        formData.append("SKU", document.getElementById("sku").value);
        formData.append("Marca", document.getElementById("marca").value);
        formData.append("Costo_compra", document.getElementById("compra").value);
        formData.append("Precio_venta", document.getElementById("precio").value);
        formData.append("Cantidad", document.getElementById("existencia").value);
        formData.append("Foto", document.getElementById("foto").files[0]);

        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/registrarPieza`, {
                method: "POST",
                body: formData, // Envía FormData directamente
            });

            if (!response.ok) throw new Error("Error en la respuesta del servidor");

            alert("Pieza registrada correctamente");

            modal.style.display = "none";
            
            formPieza.reset();
            await cargarPiezas();

        // Abrir el modal nuevamente después de un pequeño retraso
        setTimeout(() => {
            modal.style.display = "flex";
        }, 100);
        } catch (error) {
            console.error("Error al registrar pieza:", error);
            alert("Error al registrar pieza");
        } finally {
            // Habilitar el formulario nuevamente
            formPieza.querySelectorAll("input, select, button").forEach(e => e.disabled = false);
        }
    });

    // Abrir modal de actualización de existencias
    btnActualizarExistencias.addEventListener("click", () => {
        modalActualizarExistencias.style.display = "flex";
    });

    // Cerrar modal de actualización de existencias
    cerrarModalActualizar.addEventListener("click", () => {
        formActualizarExistencias.reset();
        modalActualizarExistencias.style.display = "none";
    });

    // Buscar pieza por SKU
    btnBuscarSKU.addEventListener("click", async () => {
        const sku = buscarSKU.value.trim();

        if (!sku) {
            alert("Por favor, ingresa un SKU válido.");
            return;
        }

        try {
            const urlServidor = await obtenerURLServidor();
            const url = `${urlServidor}/buscarPiezaPorSKU?sku=${encodeURIComponent(sku)}`;
            console.log("URL de búsqueda:", url); // Verifica la URL aquí

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Error en la respuesta del servidor: ${response.statusText}`);
            }
            const pieza = await response.json();

            if (pieza) {
                nombrePieza.value = pieza.Nombre_pieza;
                costoCompra.value = pieza.Costo_compra || ""; // Mostrar costo_compra si existe
                precioVenta.value = pieza.Precio_venta || ""; // Mostrar precio_venta si existe
            } else {
                alert("No se encontró ninguna pieza con ese SKU.");
                nombrePieza.value = "";
                costoCompra.value = "";
                precioVenta.value = "";
            }
        } catch (error) {
            console.error("Error al buscar pieza:", error);
            alert("Error al buscar pieza.");
        }
    });

    // Actualizar existencias, costo_compra y precio_venta
    formActualizarExistencias.addEventListener("submit", async (event) => {
        event.preventDefault();

        const sku = buscarSKU.value.trim();
        const cantidad = parseInt(cantidadAgregar.value) || 0;;
        const costo = parseFloat(costoCompra.value);
        const precio = parseFloat(precioVenta.value);

        if (!sku) {
            alert("Por favor, ingresa un SKU válido.");
            return;
        }

        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/actualizarExistencias`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    SKU: sku, 
                    cantidad: isNaN(cantidad) ? null : cantidad, // Enviar null si no se ingresó cantidad
                    costo_compra: isNaN(costo) ? null : costo,  // Enviar null si no se ingresó costo
                    precio_venta: isNaN(precio) ? null : precio // Enviar null si no se ingresó precio
                }),
            });

            if (!response.ok) {
                const errorData = await response.json(); // Captura el mensaje de error del servidor
                throw new Error(`Error en la respuesta del servidor: ${errorData.error || response.statusText}`);
            }
            const responseData = await response.json(); // Captura la respuesta del servidor
            console.log("Respuesta del servidor:", responseData);

            alert("Datos actualizados correctamente.");
            formActualizarExistencias.reset();
            modalActualizarExistencias.style.display = "none";
            await cargarPiezas(); // Recargar la lista de piezas
        } catch (error) {
            console.error("Error al actualizar datos:", error);
            alert("Error al actualizar datos.");
        }
    });
   /* await cargarEstatusPiezas(); // Cargar estatus al inicio */
    await cargarPiezas(); // Cargar piezas al inicio
});