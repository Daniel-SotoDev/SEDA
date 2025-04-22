document.addEventListener("DOMContentLoaded", async () => {
    let piezasSeleccionadas = [];
    let folioActual = null;
    let IDCotizacionActual = null;

    async function obtenerURLServidor() {
        try {
            const response = await fetch(window.location.origin + "/config.json");
            const config = await response.json();
            return `http://127.0.0.1:${config.puerto}`;
        } catch (error) {
            console.error("Error obteniendo la URL del servidor:", error);
            alert("No se pudo conectar al servidor.");
            return null;
        }
    }
    document.getElementById("closeModal").addEventListener("click", () => {
        window.close();
    });

    // Función para mostrar resultados de búsqueda en tabla dinámica
    function mostrarResultadosBusqueda(resultados, tipo, elementoPadre) {
        // Limpiar resultados anteriores
        const resultadosAnteriores = document.getElementById(`resultados${tipo}`);
        if (resultadosAnteriores) {
            resultadosAnteriores.remove();
        }

        if (resultados.length === 0) {
            return;
        }

        const divResultados = document.createElement('div');
        divResultados.id = `resultados${tipo}`;
        divResultados.className = 'resultados-busqueda';
        
        const tabla = document.createElement('table');
        tabla.innerHTML = `
            <thead>
                <tr>
                    ${tipo === 'Folios' ? '<th>Folio</th><th>Cliente</th><th>Vehículo</th>' : ''}
                    ${tipo === 'Piezas' ? '<th>ID</th><th>Nombre</th><th>Precio</th><th>Stock</th>' : ''}
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
                ${resultados.map(item => `
                    <tr>
                        ${tipo === 'Folios' ? `
                            <td>${item.Folio}</td>
                            <td>${item.Cliente}</td>
                            <td>${item.Vehiculo}</td>
                        ` : ''}
                        ${tipo === 'Piezas' ? `
                            <td>${item.IDPieza}</td>
                            <td>${item.Nombre_pieza}</td>
                            <td>$${item.Precio_venta.toFixed(2)}</td>
                            <td>${item.Cantidad || 0}</td>
                        ` : ''}
                        <td>
                            <button class="btnSeleccionar" 
                                    data-id="${tipo === 'Folios' ? item.IDCotizacion : item.IDPieza}"
                                    ${tipo === 'Piezas' ? `data-nombre="${item.Nombre_pieza}" data-precio="${item.Precio_venta}"` : ''}>
                                ✔
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;
        
        divResultados.appendChild(tabla);
        elementoPadre.appendChild(divResultados);

        // Manejar selección
        tabla.querySelectorAll('.btnSeleccionar').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (tipo === 'Folios') {
                    IDCotizacionActual = btn.getAttribute('data-id');
                    await cargarDatosCotizacion(IDCotizacionActual);
                } else if (tipo === 'Piezas') {
                    const idPieza = btn.getAttribute('data-id');
                    const nombrePieza = btn.getAttribute('data-nombre');
                    const precio = btn.getAttribute('data-precio');
                    
                    document.getElementById('nombrepieza').value = nombrePieza;
                    document.getElementById('precioUnitario').value = precio;
                    document.getElementById('precioTotal').value = precio;
                    document.getElementById('idPiezaHidden').value = idPieza;
                }
                divResultados.remove();
            });
        });
    }

     // Buscar folios al hacer clic en el botón
    document.getElementById('btnBuscarFolio').addEventListener('click', async () => {
        const filtro = document.getElementById('buscarFolio').value.trim();
        if (!filtro) return;

        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/buscarCotizaciones?filtro=${filtro}`);
            const cotizaciones = await response.json();
            
            const contenedor = document.getElementById('tablaFolios').parentElement;
            mostrarResultadosBusqueda(cotizaciones, 'Folios', contenedor);
            document.getElementById('tablaFolios').style.display = 'none';
        } catch (error) {
            console.error("Error buscando cotizaciones:", error);
            alert("Error al buscar cotizaciones");
        }
    });

     // Cargar datos de cotización
    async function cargarDatosCotizacion(IDCotizacion) {
        try {
            const urlServidor = await obtenerURLServidor();
            
            const responseCotizacion = await fetch(`${urlServidor}/obtenerCotizacionCompleta?id=${IDCotizacion}`);
            const dataCotizacion = await responseCotizacion.json();
    
            const responseIngreso = await fetch(`${urlServidor}/obtenerIngresoPorCotizacion?id=${IDCotizacion}`);
            const ingreso = await responseIngreso.json();
    
            if (ingreso) {
                folioActual = ingreso.Folio;
            const responseDiagnostico = await fetch(`${urlServidor}/obtenerDiagnostico?folio=${ingreso.Folio}`);
            const diagnostico = await responseDiagnostico.json();

            // Actualizar campos del formulario
            document.getElementById('nombreCliente').value = diagnostico.Nombre + ' ' + diagnostico.Apellido;
            document.getElementById('placas').value = diagnostico.Placas;
            document.getElementById('marca').value = diagnostico.Marca;
            document.getElementById('modelo').value = diagnostico.Modelo || diagnostico.Linea_Vehiculo;
            document.getElementById('kilometraje').value = diagnostico.Kilometraje || "";
            document.getElementById('diagnostico').value = diagnostico.Problema || diagnostico.Diagnostico || "";
            
            document.getElementById('manoObra').value = 
                dataCotizacion.Mano_Obra || diagnostico.Mano_Obra || 0;

            } else {
                // Generar nuevo folio para el ingreso
                const responseFolio = await fetch(`${urlServidor}/generarFolioIngreso`);
                const { folio } = await responseFolio.json();
                folioActual = folio;

                await fetch(`${urlServidor}/crearIngresoInicial`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        Folio: folio,
                        IDCotizacion: IDCotizacion,
                        IDCliente: dataCotizacion.IDCliente,
                        IDVehiculo: dataCotizacion.IDVehiculo
                    })
                });

                document.getElementById('manoObra').value = dataCotizacion.Mano_Obra || 0;
            }

            // Actualizar campos del formulario
            document.getElementById('nombreCliente').value = dataCotizacion.Nombre + ' ' + dataCotizacion.Apellido;
            document.getElementById('placas').value = dataCotizacion.Placas;
            document.getElementById('marca').value = dataCotizacion.Marca;
            document.getElementById('modelo').value = dataCotizacion.Modelo || dataCotizacion.Linea_Vehiculo;
            document.getElementById('kilometraje').value = dataCotizacion.Kilometraje || "";
            document.getElementById('diagnostico').value = dataCotizacion.Falla || "";
            
            if (!document.getElementById('manoObra').value) {
                document.getElementById('manoObra').value = dataCotizacion.Mano_Obra || 0;
            }

            actualizarTotal();

            function actualizarTotal() {
                const totalPiezas = piezasSeleccionadas.reduce((sum, pieza) => sum + parseFloat(pieza.total), 0);
                const manoObra = parseFloat(document.getElementById('manoObra').value) || 0;
                document.getElementById('totalCotizacion').value = (totalPiezas + manoObra).toFixed(2);
            }
            
            document.getElementById('manoObra').addEventListener('input', actualizarTotal);
            
            // Cargar piezas existentes
            if (dataCotizacion.piezas && dataCotizacion.piezas.length > 0) {
                piezasSeleccionadas = dataCotizacion.piezas.map(p => ({
                    IDPieza: p.IDPieza,
                    nombre: p.Nombre_pieza,
                    cantidad: p.Cantidad_Cotizada,
                    precio: p.Precio,
                    total: (p.Cantidad_Cotizada * p.Precio).toFixed(2)
                }));
                actualizarTablaPiezas();
            }
        } catch (error) {
            console.error("Error cargando cotización:", error);
            alert("Error al cargar los datos de la cotización");
        }
    }

    // Buscar piezas dinámicamente
    document.getElementById('btnBuscarPieza').addEventListener('click', async () => {
        const filtro = document.getElementById('buscarPieza').value.trim();
        if (!filtro) return;

        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/obtenerPiezas?filtro=${filtro}`);
            const piezas = await response.json();
            
            const contenedor = document.getElementById('tablaPiezas').parentElement;
            mostrarResultadosBusqueda(piezas, 'Piezas', contenedor);
            document.getElementById('tablaPiezas').style.display = 'none';
        } catch (error) {
            console.error("Error buscando piezas:", error);
            alert("Error al buscar piezas");
        }
    });
// Actualizar cantidad y precio total cuando cambia la cantidad
document.getElementById('cantidad').addEventListener('input', () => {
    const cantidad = parseInt(document.getElementById('cantidad').value) || 1;
    const precioUnitario = parseFloat(document.getElementById('precioUnitario').value) || 0;
    document.getElementById('precioTotal').value = (cantidad * precioUnitario).toFixed(2);
});

document.getElementById('btnAgregarPieza').addEventListener('click', async () => {
    const idPieza = document.getElementById('idPiezaHidden').value;
    const nombre = document.getElementById('nombrepieza').value;
    const cantidad = parseInt(document.getElementById('cantidad').value) || 1;
    const precio = parseFloat(document.getElementById('precioUnitario').value) || 0;
    
    if (!idPieza || !nombre || !precio) {
        alert("Seleccione una pieza válida antes de agregar");
        return;
    }

    try {
        const urlServidor = await obtenerURLServidor();
        const response = await fetch(`${urlServidor}/verificarStockPieza?id=${idPieza}&cantidad=${cantidad}`);
        const resultado = await response.json();
        
        if (!resultado.suficiente) {
            throw new Error(`No hay suficiente stock. Disponible: ${resultado.stock}`);
        }

        // Verificar si la pieza ya está agregada
        const index = piezasSeleccionadas.findIndex(p => p.IDPieza == idPieza);
        
        if (index >= 0) {
            // Verificar stock total si ya existe
            const nuevaCantidad = piezasSeleccionadas[index].cantidad + cantidad;
            const responseTotal = await fetch(`${urlServidor}/verificarStockPieza?id=${idPieza}&cantidad=${nuevaCantidad}`);
            const resultadoTotal = await responseTotal.json();
            
            if (!resultadoTotal.suficiente) {
                throw new Error(`No hay suficiente stock para la cantidad total. Disponible: ${resultadoTotal.stock}`);
            }
            
            // Actualizar cantidad si hay stock suficiente
            piezasSeleccionadas[index].cantidad = nuevaCantidad;
            piezasSeleccionadas[index].total = (nuevaCantidad * precio).toFixed(2);
        } else {
            // Agregar nueva pieza
            piezasSeleccionadas.push({
                IDPieza: idPieza,
                nombre: nombre,
                cantidad: cantidad,
                precio: precio,
                total: (cantidad * precio).toFixed(2)
            });
        }

        actualizarTablaPiezas();
        limpiarCamposPieza();
    } catch (error) {
        alert(error.message);
        console.error("Error al agregar pieza:", error);
    }
});

// Actualizar tabla de piezas seleccionadas
function actualizarTablaPiezas() {
    const tbody = document.querySelector("#tablaPiezasSeleccionadas tbody");
    tbody.innerHTML = piezasSeleccionadas.map(pieza => `
        <tr data-id="${pieza.IDPieza}">
            <td>${pieza.nombre}</td>
            <td>${pieza.cantidad}</td>
            <td>$${pieza.precio.toFixed(2)}</td>
            <td>$${pieza.total}</td>
            <td><button class="btnEliminarPieza">X</button></td>
        </tr>
    `).join("");

    // Calcular y mostrar el total
    const total = piezasSeleccionadas.reduce((sum, pieza) => sum + parseFloat(pieza.total), 0);
    document.getElementById("totalCotizacion").value = total.toFixed(2);

    // Mostrar tabla si hay piezas
    document.getElementById("tablaPiezasSeleccionadas").style.display = 
        piezasSeleccionadas.length > 0 ? "table" : "none";
}

// Eliminar pieza de la lista
document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btnEliminarPieza")) {
        const fila = e.target.closest("tr");
        const idPieza = fila.getAttribute("data-id");
        piezasSeleccionadas = piezasSeleccionadas.filter(p => p.IDPieza != idPieza);
        actualizarTablaPiezas();
    }
});

// Limpiar campos de pieza después de agregar
function limpiarCamposPieza() {
    document.getElementById('nombrepieza').value = "";
    document.getElementById('cantidad').value = "1";
    document.getElementById('precioUnitario').value = "";
    document.getElementById('precioTotal').value = "";
    document.getElementById('idPiezaHidden').value = "";
}

// Guardar diagnóstico
document.getElementById('btnGuardar').addEventListener('click', async () => {
    const diagnostico = document.getElementById('diagnostico').value;
    const total = parseFloat(document.getElementById('totalCotizacion').value) || 0;
    const ManoObra = parseFloat(document.getElementById('manoObra').value) || 0;

    if (!IDCotizacionActual || !folioActual) {
        alert("Complete la información de la cotización primero");
        return;
    }
    // Validar stock antes de guardar
    try {
        const urlServidor = await obtenerURLServidor();
        
        // Verificar stock para cada pieza
        for (const pieza of piezasSeleccionadas) {
            const response = await fetch(`${urlServidor}/verificarStockPieza?id=${pieza.IDPieza}&cantidad=${pieza.cantidad}`);
            const resultado = await response.json();
            
            if (!resultado.suficiente) {
                throw new Error(`No hay suficiente stock para la pieza: ${pieza.nombre}. Stock disponible: ${resultado.stock}`);
            }
        }

        const response = await fetch(`${urlServidor}/guardarDiagnostico`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                folio: folioActual,
                diagnostico: diagnostico,
                piezas: piezasSeleccionadas,
                total: total,
                ManoObra: ManoObra,
                IDCotizacion: IDCotizacionActual
            })
        });

        const result = await response.json();
        if (result.success) {
            alert("Diagnóstico guardado correctamente");
        } else {
            alert("Error al guardar: " + (result.error || "Error desconocido"));
        }
    } catch (error) {
        console.error("Error:", error);
        alert("Error al guardar el diagnóstico");
    }
});
document.getElementById('btnPDF').addEventListener('click', async () => {
    if (!folioActual) {
        alert("Primero debe cargar un diagnóstico válido");
        return;
    }

    try {
        const urlServidor = await obtenerURLServidor();
        
        // Crear un enlace temporal para descargar el PDF
        const link = document.createElement('a');
        link.href = `${urlServidor}/generar-pdf-diagnostico?folio=${encodeURIComponent(folioActual)}`;
        link.target = '_blank';
        link.download = `diagnostico_${folioActual}.pdf`;
        
        // Simular click en el enlace
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
    } catch (error) {
        console.error("Error al generar PDF:", error);
        alert("Error al generar el PDF: " + error.message);
    }
});

});