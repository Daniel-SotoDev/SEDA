document.addEventListener("DOMContentLoaded", async () => {
    const closeModal = document.getElementById("closeModal");
    const form = document.getElementById("ingresoForm");
    const folioInput = document.getElementById("Folio");
    const btnBuscarCotizacion = document.getElementById("btnBuscarCotizacion");
    const buscarCotizacionInput = document.getElementById("buscarCotizacion");

    //FUNCIONES AUXILIARES
    async function esperarConfigJson(reintentos = 5, intervalo = 1000) {
        for (let i = 0; i < reintentos; i++) {
            try {
                const response = await fetch(window.location.origin + "/config.json");
                if (response.ok) return await response.json();
            } catch (error) {
                console.warn(`Intento ${i + 1}/${reintentos}: Esperando config.json...`);
            }
            await new Promise(resolve => setTimeout(resolve, intervalo));
        }
        throw new Error("No se pudo obtener config.json");
    }

    async function obtenerURLServidor() {
        try {
            const config = await esperarConfigJson();
            return `http://127.0.0.1:${config.puerto}`;
        } catch (error) {
            console.error("Error obteniendo URL:", error);
            return "http://127.0.0.1:4000";
        }
    }

    async function generarFolio(urlServidor) {
        try {
            const response = await fetch(`${urlServidor}/obtenerUltimoFolio`);
            if (!response.ok) throw new Error("Error HTTP: " + response.status);
            const data = await response.json();
            return data.ultimoFolio || "F-ERROR-000000";
        } catch (error) {
            console.error("Error generando folio:", error);
            return "F-ERROR-000000";
        }
    }

    //INICIALIZACION
    try {
        const urlServidor = await obtenerURLServidor();
        folioInput.value = await generarFolio(urlServidor);

         // Cargar asesores
    const response = await fetch(`${urlServidor}/obtenerAsesores`);
    if (!response.ok) throw new Error("Error cargando asesores");
    const asesores = await response.json();
    
    const selectAsesor = document.getElementById("IDAsesor");
    asesores.forEach(asesor => {
        const option = document.createElement("option");
        option.value = asesor.IDAsesor;
        option.textContent = `${asesor.Nombre} ${asesor.Apellido}`;
        selectAsesor.appendChild(option);
    });
    
    } catch (error) {
        console.error("Error inicializando:", error);
        alert("Error crítico al inicializar el formulario");
        return;
    }

    //MANEJO DE COTIZACIONES
    btnBuscarCotizacion.addEventListener("click", buscarCotizaciones);

    async function buscarCotizaciones() {
        const filtro = buscarCotizacionInput.value.trim();
        if (!filtro) return;

        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/buscarCotizaciones?filtro=${encodeURIComponent(filtro)}`);
            
            if (!response.ok) throw new Error("Error en respuesta del servidor");
            
            const cotizaciones = await response.json();
            renderizarResultadosCotizaciones(cotizaciones);
            
        } catch (error) {
            console.error("Error buscando cotizaciones:", error);
            alert("Error al buscar cotizaciones");
        }
    }

    function renderizarResultadosCotizaciones(cotizaciones) {
        const tbody = document.getElementById("tablaCotizaciones");
        const contenedorResultados = document.getElementById("resultadosCotizaciones");
        
        tbody.innerHTML = cotizaciones.map(c => `
            <tr>
            <td>${c.Folio}</td>
            <td>${c.Cliente}</td>
            <td>${c.Vehiculo}</td>
            <td><button type="button" 
                class="seleccionarCotizacion" 
                data-id="${c.IDCotizacion}"
                data-placas="${c.Placas || ''}"
                data-marca="${c.Marca || ''}"
                data-modelo="${c.Modelo || ''}"
                data-idcliente="${c.IDCliente}"
                data-idvehiculo="${c.IDVehiculo}">✔</button></td>
        </tr>
        `).join("");

        contenedorResultados.style.display = cotizaciones.length ? "block" : "none";
    }

    //SELECCIÓN DE COTIZACIÓN
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("seleccionarCotizacion")) {
            const idCotizacion = e.target.dataset.id;
            const placas = e.target.dataset.placas;
            const marca = e.target.dataset.marca;
            const modelo = e.target.dataset.modelo;

            try {
                const urlServidor = await obtenerURLServidor();
                const response = await fetch(`${urlServidor}/obtenerCotizacionCompleta?id=${idCotizacion}`);
                
                if (!response.ok) throw new Error("Error obteniendo detalles");
                
                const data = await response.json();
                actualizarFormulario(data, placas, marca, modelo);
                
            } catch (error) {
                console.error("Error cargando cotización:", error);
                alert("Error al cargar detalles de la cotización");
            }
        }
    });

    function actualizarFormulario(data, placas, marca, modelo) {

        const clienteField = document.getElementById("IDCliente");
        const vehiculoField = document.getElementById("IDVehiculo");
        const cotizacionField = document.getElementById("IDCotizacion");

        // Convertir explícitamente a números
    const idCliente = Number(data.IDCliente);
    const idVehiculo = Number(data.IDVehiculo);
    
    // Validar conversión
    if (isNaN(idCliente) || isNaN(idVehiculo)) {
        alert("Error: IDs inválidos en los datos recibidos");
        return;
    }

    document.getElementById("hiddenIDCliente").value = idCliente;
    document.getElementById("hiddenIDVehiculo").value = idVehiculo;
    
    // Mostrar información descriptiva en los campos visibles
    clienteField.value = `${data.Nombre || ''} ${data.Apellido || ''}`.trim();
    vehiculoField.value = `${placas || 'N/A'} - ${marca || ''} ${modelo || ''}`.trim();
    cotizacionField.value = data.IDCotizacion || '';
        
        const tbodyPiezas = document.querySelector("#tablaPiezasCotizadas tbody");
        if (tbodyPiezas) {
            tbodyPiezas.innerHTML = data.piezas?.map(p => `
                <tr>
                    <td>${p.Nombre_pieza || 'Sin nombre'}</td>
                    <td>${p.Cantidad_Cotizada || 0}</td>
                    <td>$${(p.Precio || 0).toFixed(2)}</td>
                    <td>$${((p.Precio || 0) * (p.Cantidad_Cotizada || 0)).toFixed(2)}</td>
                </tr>
            `).join("") || "<tr><td colspan='4'>No hay piezas</td></tr>";
        }
    }

    //ENVÍO DEL FORMULARIO 
    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const IDCliente = document.getElementById("hiddenIDCliente").value;
        const IDVehiculo = document.getElementById("hiddenIDVehiculo").value;
        
        if (!IDCliente || !IDVehiculo || isNaN(IDCliente) || isNaN(IDVehiculo)) {
            alert("Seleccione un cliente y vehículo válidos");
            return;
        }
        
         // Asegurar que la fecha esté establecida
    const fechaInput = document.getElementById("FechaIngreso");
    if (!fechaInput.value) {
        const today = new Date();
        fechaInput.value = today.toISOString().split('T')[0];
    }

        const formData = new FormData(form);
        
        console.log("Datos del formulario:", {
            Folio: formData.get("Folio"),
            IDCliente: formData.get("IDCliente"),
            IDVehiculo: formData.get("IDVehiculo"),
            FechaIngreso: formData.get("FechaIngreso")
        });

        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/guardarIngreso`, {
                method: "POST",
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Error ${response.status}: ${errorText}`);
            }

            const resultado = await response.json();
            manejarExitoEnvio(resultado);
            
        } catch (error) {
            manejarErrorEnvio(error);
        }
    });

    function manejarExitoEnvio(resultado) {
        alert("Ingreso registrado exitosamente!");
        form.reset();
        
        const tbodyPiezas = document.querySelector("#tablaPiezasCotizadas tbody");
        if (tbodyPiezas) {
            tbodyPiezas.innerHTML = "";
        }
        
        folioInput.value = "";  
        generarFolio(obtenerURLServidor());
    }

    function manejarErrorEnvio(error) {
        console.error("Error en el envío:", error);
        alert(`Error al registrar ingreso: ${error.message}`);
    }

    if (closeModal) {
        closeModal.addEventListener("click", () => window.close());
    }
});