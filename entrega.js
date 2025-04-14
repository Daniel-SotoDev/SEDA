document.addEventListener('DOMContentLoaded', async function() {
    // Elementos del DOM
    const searchFolio = document.getElementById('searchFolio');
    const searchBtn = document.getElementById('searchBtn');
    const resultsTable = document.getElementById('resultsTable').getElementsByTagName('tbody')[0];
    const closeBtn = document.getElementById('closeBtn');
    
    // Campos del formulario
    const folioInput = document.getElementById('folio');
    const fechaInput = document.getElementById('fecha');
    const clienteInput = document.getElementById('cliente');
    const vehiculoInput = document.getElementById('vehiculo');
    const placasInput = document.getElementById('placas');
    const marcaInput = document.getElementById('marca');
    const modeloInput = document.getElementById('modelo');
    const lineaInput = document.getElementById('linea');
    const diagnosticoInput = document.getElementById('diagnostico');
    const totalInput = document.getElementById('total');
    const estatusSelect = document.getElementById('estatus');
    const piezasTable = document.getElementById('piezasTable').getElementsByTagName('tbody')[0];
    const saveBtn = document.getElementById('saveBtn');
    const printBtn = document.getElementById('printBtn');
    
    let currentIngresoId = null;
    
    // Función para obtener la URL del servidor
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
    
    // Cerrar ventana
    closeBtn.addEventListener('click', () => {
        window.close();
    });
    
    // Buscar ingresos
    searchBtn.addEventListener('click', buscarIngresos);
    searchFolio.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            buscarIngresos();
        }
    });
    
    async function buscarIngresos() {
        const filtro = searchFolio.value.trim();
        if (!filtro) return;
        
        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/buscarIngresosParaEntrega?filtro=${encodeURIComponent(filtro)}`);
            
            if (!response.ok) {
                throw new Error('Error al buscar ingresos');
            }
            
            const ingresos = await response.json();
            mostrarResultados(ingresos);
        } catch (error) {
            console.error('Error:', error);
            alert('Error al buscar ingresos: ' + error.message);
        }
    }
    
    function mostrarResultados(ingresos) {
        resultsTable.innerHTML = '';
        
        if (ingresos.length === 0) {
            const row = resultsTable.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 8;
            cell.textContent = 'No se encontraron resultados';
            return;
        }
        
        ingresos.forEach(ingreso => {
            const row = resultsTable.insertRow();
            row.insertCell(0).textContent = ingreso.Folio;
            row.insertCell(1).textContent = `${ingreso.Nombre} ${ingreso.Apellido}`;
            row.insertCell(2).textContent = `${ingreso.Marca} ${ingreso.Linea_Vehiculo}`;
            row.insertCell(3).textContent = ingreso.Placas;
            row.insertCell(4).textContent = ingreso.Marca;
            row.insertCell(5).textContent = ingreso.Modelo;
            row.insertCell(6).textContent = new Date(ingreso.FechaIngreso).toLocaleDateString();
            
            const piezasCell = row.insertCell(7);
            piezasCell.textContent = ingreso.TotalPiezas > 0 ? `${ingreso.TotalPiezas} pieza(s)` : 'Sin piezas';
            piezasCell.style.color = ingreso.TotalPiezas > 0 ? '#A3D0F8' : '#888';

            const actionCell = row.insertCell(7);
            const selectBtn = document.createElement('button');
            selectBtn.textContent = '✔';
            selectBtn.className = 'btn-select';
            selectBtn.addEventListener('click', () => cargarDetallesIngreso(ingreso));
            actionCell.appendChild(selectBtn);
        });
    }
    
    async function cargarDetallesIngreso(ingreso) {
        currentIngresoId = ingreso.IDIngreso;
        
        // Llenar campos básicos
        folioInput.value = ingreso.Folio;
        fechaInput.value = new Date(ingreso.FechaIngreso).toLocaleString();
        clienteInput.value = `${ingreso.Nombre} ${ingreso.Apellido}`;
        vehiculoInput.value = `${ingreso.Marca} ${ingreso.Linea_Vehiculo}`;
        placasInput.value = ingreso.Placas;
        marcaInput.value = ingreso.Marca;
        modeloInput.value = ingreso.Modelo;
        lineaInput.value = ingreso.Linea_Vehiculo;
        diagnosticoInput.value = ingreso.Diagnostico || 'Sin diagnóstico';
        totalInput.value = ingreso.Total ? `$${ingreso.Total.toFixed(2)}` : '$0.00';
        
        // Verificar si ya tiene entrega
        if (ingreso.IDEntrega) {
            estatusSelect.value = 'ENTREGADO';
            estatusSelect.disabled = true;
            saveBtn.disabled = true;
        } else {
            estatusSelect.value = 'PENDIENTE';
            estatusSelect.disabled = false;
            saveBtn.disabled = false;
        }
        
        // Cargar piezas utilizadas
        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/obtenerPiezasPorIngreso?IDIngreso=${ingreso.IDIngreso}`);
            
            if (!response.ok) {
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const piezas = await response.json();
            if (!Array.isArray(piezas)) {
                throw new Error('Formato de datos inválido');
            }

            mostrarPiezas(piezas);
        } catch (error) {
            console.error('Error al cargar piezas:', error);
            piezasTable.innerHTML = '<tr><td colspan="3">Error al cargar piezas</td></tr>';
        }
    }
    
    function mostrarPiezas(piezas) {
        piezasTable.innerHTML = '';
        
        if (!piezas || piezas.length === 0) {
            const row = piezasTable.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = 'No se encontraron piezas asociadas';
            return;
        }
        
        const piezasReales = piezas.filter(p => 
            p.Nombre_pieza && 
            (p.Cantidad_Usada > 0 || p.Cantidad_Cotizada > 0)
        );

        if (piezasReales.length === 0) {
            const row = piezasTable.insertRow();
            const cell = row.insertCell(0);
            cell.colSpan = 3;
            cell.textContent = 'No se utilizaron piezas en este servicio';
            return;
        }
        piezasReales.forEach(pieza => {
            const row = piezasTable.insertRow();
            row.insertCell(0).textContent = pieza.Nombre_pieza || 'Sin nombre';
            row.insertCell(1).textContent = pieza.Cantidad_Usada || pieza.Cantidad_Cotizada || 0;
            row.insertCell(2).textContent = pieza.Precio ? `$${parseFloat(pieza.Precio).toFixed(2)}` : '$0.00';
        });
    }
    // Guardar entrega
    saveBtn.addEventListener('click', async () => {
        if (!currentIngresoId) {
            alert('No hay un ingreso seleccionado');
            return;
        }
        
        if (estatusSelect.value !== 'ENTREGADO') {
            alert('Seleccione "ENTREGADO" para guardar la entrega');
            return;
        }
        
        try {
            const urlServidor = await obtenerURLServidor();
            const response = await fetch(`${urlServidor}/registrarEntrega`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    IDIngreso: currentIngresoId
                })
            });
            
            if (!response.ok) {
                throw new Error('Error al registrar entrega');
            }
            
            const result = await response.json();
            alert('Entrega registrada correctamente');
            estatusSelect.disabled = true;
            saveBtn.disabled = true;
            
            // Actualizar la lista de folios del día
            if (window.opener && window.opener.actualizarFoliosDelDia) {
                window.opener.actualizarFoliosDelDia();
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al registrar entrega: ' + error.message);
        }
    });
    
    // Imprimir recibo (placeholder)
    printBtn.addEventListener('click', () => {
        if (!currentIngresoId) {
            alert('No hay un ingreso seleccionado');
            return;
        }
        
        // Aquí implementarías la lógica para imprimir el recibo
        alert('Funcionalidad de impresión será implementada aquí');
    });
});