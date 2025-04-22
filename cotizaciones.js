document.addEventListener("DOMContentLoaded", async () => {
    const closeModal = document.getElementById("closeModal");
    const form = document.getElementById("cotizacionForm");
    const buscarCliente = document.getElementById("buscarCliente");
    const btnBuscarCliente = document.getElementById("btnBuscarCliente");
    const buscarVehiculo = document.getElementById("buscarVehiculo");
    const btnBuscarVehiculo = document.getElementById("btnBuscarVehiculo");
    const buscarPieza = document.getElementById("buscarPieza");
    const btnBuscarPieza = document.getElementById("btnBuscarPieza");
    const tablaClientes = document.getElementById("tablaClientes");
    const tablaVehiculos = document.getElementById("tablaVehiculos");
    const tablaPiezas = document.getElementById("tablaPiezas");
    const cantidad = document.getElementById("cantidad");
    const precioUnitario = document.getElementById("precioUnitario");
    const precioTotal = document.getElementById("precioTotal");
    const folioInput = document.getElementById("folio");

    let clienteSeleccionado = null;
    let vehiculoSeleccionado = null;
    let piezasSeleccionadas = [];


    async function obtenerURLServidor() {
        try {
            const response = await fetch(window.location.origin + "/config.json");
            const config = await response.json();
            console.log("Puerto obtenido:", config.puerto);
            return `http://localhost:${config.puerto}`;
        } catch (error) {
            console.error("Error al obtener la configuración del servidor:", error);
            return "";
        }
    }
    
    async function generarFolio() {
        try {
            const urlServidor = await obtenerURLServidor(); // Obtener la URL base
            const response = await fetch(`${urlServidor}/generar-folio-cotizacion`);
            if (!response.ok)
                throw new Error("Error al generar el folio");
            const data = await response.json();
            folioInput.value = data.folio; // Asignar el folio al campo
        } catch (error) {
            console.error("Error al generar folio:", error);
            folioInput.value = "C-ERROR-000001"; // Valor de respaldo
        }
    }
    await generarFolio();
    closeModal.addEventListener("click", () => window.close());

// Función para buscar clientes
async function buscarClientes(filtro) {
    const urlServidor = await obtenerURLServidor();
    const response = await fetch(`${urlServidor}/buscarClientes?filtro=${encodeURIComponent(filtro)}`);
    if (!response.ok) return;

    const clientes = await response.json();
    const tbody = tablaClientes.querySelector("tbody");
    tbody.innerHTML = clientes.length 
        ? clientes.map(cliente => `
            <tr>
                <td>${cliente.IDCliente}</td>
                <td>${cliente.Nombre}</td>
                <td>${cliente.Apellido}</td>
                <td><button type="button" class="btnSeleccionarCliente" data-id="${cliente.IDCliente}">✔</button></td>
            </tr>`).join("")
        : `<tr><td colspan="4">No se encontraron clientes.</td></tr>`;
    tablaClientes.style.display = "table";
}

    // Evento para buscar clientes
    btnBuscarCliente.addEventListener("click", () => {
        const filtro = buscarCliente.value.trim();
        if (filtro) buscarClientes(filtro);
    });
    // Seleccionar cliente
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("btnSeleccionarCliente")) {
            const idCliente = event.target.getAttribute("data-id");
            const nombreCliente = event.target.parentElement.previousElementSibling.textContent;
            const apellidoCliente = event.target.parentElement.previousElementSibling.previousElementSibling.textContent;
            // Actualizar campos de cliente
        document.getElementById("IDCliente").value = `${nombreCliente} ${apellidoCliente}`;
        document.getElementById("IDClienteHidden").value = idCliente;
        clienteSeleccionado = { idCliente, nombreCliente, apellidoCliente };

    }
});
    // Función para buscar vehículos
    async function buscarVehiculos(filtro) {
        console.log("Buscando vehículos para el cliente:", filtro);
        const urlServidor = await obtenerURLServidor();
        const response = await fetch(`${urlServidor}/obtenerVehiculos?filtro=${encodeURIComponent(filtro)}`);
        if (!response.ok) return;
        

        const vehiculos = await response.json();
        console.log("Vehículos encontrados:", vehiculos);
        
        const tbody = tablaVehiculos.querySelector("tbody");
        tbody.innerHTML = vehiculos.length
        ? vehiculos.map(vehiculo => `
            <tr>
                <td>${vehiculo.IDVehiculo}</td>
                <td>${vehiculo.Placas}</td>
                <td>${vehiculo.Marca}</td>
                <td>${vehiculo.Modelo || "No registrado"}</td>
                <td><button type="button" class="btnSeleccionarVehiculo" data-id="${vehiculo.IDVehiculo}">✔</button></td>
            </tr>`).join("")
        : `<tr><td colspan="4">No se encontraron vehículos.</td></tr>`;
    tablaVehiculos.style.display = "table";
}
// Evento para buscar vehículos
btnBuscarVehiculo.addEventListener("click", () => {
    const filtro = buscarVehiculo.value.trim();
    if (filtro) buscarVehiculos(filtro);
});
    // Seleccionar vehículo
    document.addEventListener("click", (event) => {
        if (event.target.classList.contains("btnSeleccionarVehiculo")) {
            const idVehiculo = event.target.getAttribute("data-id");
            const placas = event.target.parentElement.previousElementSibling.textContent;
            const marca = event.target.parentElement.previousElementSibling.previousElementSibling.textContent;
            const modelo = event.target.parentElement.previousElementSibling.previousElementSibling.previousElementSibling.textContent;
            // Actualizar campos de vehículo
            document.getElementById("IDVehiculo").value = `${placas} - ${marca} ${modelo}`;
            document.getElementById("IDVehiculoHidden").value = idVehiculo;
            vehiculoSeleccionado = { 
                idVehiculo: idVehiculo,
                placas: placas,
                marca: marca,
                modelo: modelo
            };
        }
});

cantidad.addEventListener("input", () => {
    const precio = parseFloat(precioUnitario.value) || 0;
    const cantidadValor = parseInt(cantidad.value) || 1;
    precioTotal.value = (precio * cantidadValor).toFixed(2);
});
   // Función para buscar piezas
    async function buscarPiezas(filtro) {
    console.log("Buscando piezas con filtro:", filtro);
    const urlServidor = await obtenerURLServidor();
    const response = await fetch(`${urlServidor}/obtenerPiezas?filtro=${encodeURIComponent(filtro)}`);
    
    if (!response.ok) return;
    

    const piezas = await response.json();
    console.log("Piezas encontradas:", piezas);
    const tbody = tablaPiezas.querySelector("tbody");

    tbody.innerHTML = piezas.length 
            ? piezas.map(pieza => `
                <tr>
                    <td>${pieza.IDPieza}</td>
                    <td>${pieza.Nombre_pieza}</td>
                    <td>${pieza.SKU}</td>
                    <td>${pieza.Marca || 'N/A'}</td>
                    <td>${pieza.Precio_venta.toFixed(2)}</td>
                    <td>${pieza.Cantidad || '0'}</td>
                    <td><button type="button" class="btnSeleccionarPieza" data-id="${pieza.IDPieza}">✔</button></td>
                </tr>`).join("")
            : `<tr><td colspan="7">No se encontraron piezas.</td></tr>`;
        tablaPiezas.style.display = "table";
    }
// Evento para buscar piezas
btnBuscarPieza.addEventListener("click", () => {
    const filtro = buscarPieza.value.trim();
    if (filtro) buscarPiezas(filtro);
});
// Seleccionar pieza
document.addEventListener("click", (event) => {
    if (event.target.classList.contains("btnSeleccionarPieza")) {
        const row = event.target.closest('tr');
        const idPieza = event.target.getAttribute("data-id");
        const nombrePieza = row.cells[1].textContent;
        const skuPieza = row.cells[2].textContent; // SKU de la pieza
        const precioVenta = parseFloat(row.cells[4].textContent) || 0;

        document.getElementById("nombrepieza").value = nombrePieza;
        document.getElementById("precioUnitario").value = precioVenta;
        document.getElementById("precioTotal").value = precioVenta;

        document.getElementById("idPiezaHidden").value = idPieza;
    }
});
// Agregar pieza a la lista de piezas seleccionadas
document.getElementById("btnAgregarPieza").addEventListener("click", () => {
    const nombrePieza = document.getElementById("nombrepieza").value;
    const idPieza = document.getElementById("idPiezaHidden").value;
    const cantidadPieza = parseInt(document.getElementById("cantidad").value) || 1;
    const precioVenta = parseFloat(document.getElementById("precioUnitario").value) || 0;
    const totalPieza = (precioVenta * cantidadPieza).toFixed(2);

    if (!nombrePieza || !precioVenta || !idPieza) {
        alert("Por favor, selecciona una pieza válida antes de agregarla.");
        return;
    }

    // Agregar la pieza a la lista de piezas seleccionadas
    piezasSeleccionadas.push({
        idPieza: idPieza,
        IDPieza: idPieza, // Asegurar que este campo esté para el servidor
        nombrePieza: nombrePieza,
        cantidadPieza: cantidadPieza,
        precioVenta: precioVenta,
        totalPieza: totalPieza
    });

    // Actualizar la tabla de piezas seleccionadas
    actualizarTablaPiezasSeleccionadas();

    // Limpiar campos
    document.getElementById("nombrepieza").value = "";
    document.getElementById("cantidad").value = 1;
    document.getElementById("precioUnitario").value = "";
    document.getElementById("precioTotal").value = "";
    document.getElementById("idPiezaHidden").value = "";
});
// Actualizar tabla de piezas seleccionadas
function actualizarTablaPiezasSeleccionadas() {
    const tbody = document.querySelector("#tablaPiezasSeleccionadas tbody");
    if (tbody) {
        tbody.innerHTML = piezasSeleccionadas.map(pieza => `
            <tr data-id="${pieza.idPieza}">
                <td>${pieza.nombrePieza}</td> <!-- Mostrar nombre en lugar de SKU -->
                <td>${pieza.cantidadPieza}</td>
                <td>$${pieza.precioVenta.toFixed(2)}</td>
                <td>$${pieza.totalPieza}</td>
                <td><button type="button" class="btnEliminarPieza" data-id="${pieza.idPieza}">X</button></td>
            </tr>`).join("");
    }

    // Calcular y mostrar el total de la cotización
    const totalCotizacion = piezasSeleccionadas.reduce((total, pieza) => total + parseFloat(pieza.totalPieza), 0);
    document.getElementById("totalCotizacion").value = totalCotizacion.toFixed(2);

    // Mostrar/ocultar tabla según haya piezas
    document.getElementById("tablaPiezasSeleccionadas").style.display = 
        piezasSeleccionadas.length > 0 ? "table" : "none";
}
 // Eliminar pieza seleccionada
document.addEventListener("click", (event) => {
    if (event.target.classList.contains("btnEliminarPieza")) {
        const idPieza = event.target.getAttribute("data-id");
        piezasSeleccionadas = piezasSeleccionadas.filter(pieza => pieza.idPieza !== idPieza);
        actualizarTablaPiezasSeleccionadas();
    }
});
function actualizarTotal() {
    const totalPiezas = piezasSeleccionadas.reduce((sum, pieza) => sum + parseFloat(pieza.totalPieza || 0), 0);
    const manoObra = parseFloat(document.getElementById('manoObra').value) || 0;
    const total = totalPiezas + manoObra;
    document.getElementById('totalCotizacion').value = total.toFixed(2);
}
// Agregar evento al campo mano de obra
document.getElementById('manoObra').addEventListener('input', actualizarTotal);
document.getElementById('manoObra').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') actualizarTotal();
});
 // Registrar cotización
form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const errores = [];
    if (!clienteSeleccionado) errores.push("Debes seleccionar un cliente");
    if (!vehiculoSeleccionado?.idVehiculo) errores.push("Debes seleccionar un vehículo válido");
    if (piezasSeleccionadas.length === 0) errores.push("Debes agregar al menos una pieza");
    
    if (errores.length > 0) {
        alert(errores.join("\n"));
        return;
    }

    const idEstatus = document.getElementById("Estatus").value;

// Verifica si el valor de IDEstatus es válido
if (![1, 2, 3].includes(Number(idEstatus))) {
    alert("El estatus seleccionado no es válido.");
    return;
}
    const cotizacionData = {
        Folio: folioInput.value,
        Fecha: document.getElementById("fecha").value,
        IDCliente: clienteSeleccionado.idCliente,
        IDVehiculo: vehiculoSeleccionado.idVehiculo,
        Falla: document.getElementById("Falla").value,
        Piezas: piezasSeleccionadas,
        PrecioTotal: piezasSeleccionadas.reduce((total, pieza) => total + parseFloat(pieza.totalPieza), 0),
        IDEstatus: idEstatus,
        ManoObra: parseFloat(document.getElementById("manoObra").value) || 0
    };
    try {
        const urlServidor = await obtenerURLServidor();
        const response = await fetch(`${urlServidor}/registrar-cotizacion`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cotizacionData),
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Error al guardar");
        }

        const folioGuardado = folioInput.value;
        
            document.getElementById("IDCliente").value = "";
            document.getElementById("IDClienteHidden").value = "";
            document.getElementById("IDVehiculo").value = "";
            document.getElementById("IDVehiculoHidden").value = "";
            document.getElementById("Falla").value = "";
            document.getElementById("manoObra").value = "";
            document.getElementById("Estatus").value = "1";
            piezasSeleccionadas = [];
            actualizarTablaPiezasSeleccionadas();

            await generarFolio(); 
            folioInput.value = folioGuardado;

            alert(data.message || "Cotización registrada correctamente");

    } catch (error) {
        console.error("Error al registrar cotización:", error);
        alert("Error al registrar cotización");
    }
});
async function cargarPiezasVehiculo(IDVehiculo) {
    try {
        const urlServidor = await obtenerURLServidor();
        const response = await fetch(`${urlServidor}/obtenerPiezasPorVehiculo?IDVehiculo=${IDVehiculo}`);
        
        if (!response.ok) throw new Error("Error al cargar piezas");
        
        const piezas = await response.json();
        
        // Mostrar en tabla
        const tabla = document.getElementById("tablaPiezasVehiculo");
        tabla.innerHTML = piezas.map(p => `
            <tr>
                <td>${p.Folio}</td>
                <td>${p.Nombre_pieza}</td>
                <td>${p.Cantidad_Cotizada}</td>
                <td>${new Date(p.Fecha).toLocaleDateString()}</td>
            </tr>
        `).join("");
    } catch (error) {
        console.error("Error:", error);
        alert("No se pudieron cargar las piezas");
    }
}

document.getElementById('btnPDF').addEventListener('click', async () => {
    try {
        const folio = document.getElementById('folio').value;
        console.log('Intentando generar PDF para folio:', folio);
        
        if (!folio || folio === "C-ERROR-000001") {
            throw new Error("Folio inválido o no generado");
        }

        const urlServidor = await obtenerURLServidor();
        
        // Verificar primero si existe
        const responseCheck = await fetch(`${urlServidor}/buscarCotizaciones?filtro=${encodeURIComponent(folio)}`);
        const dataCheck = await responseCheck.json();
        
        if (!dataCheck.length) {
            throw new Error("La cotización no existe en el sistema");
        }

        // Generar PDF
        window.open(`${urlServidor}/generar-pdf-cotizacion?folio=${encodeURIComponent(folio)}`, '_blank');
        
    } catch (error) {
        console.error("Error en generación de PDF:", error);
        alert(error.message || "Error al generar PDF");
    }
});

});

