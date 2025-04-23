window.electronAPI.getServerPort().then(port => {
    console.log('Puerto actual:', port);
});

window.electronAPI.setServerPort(nuevoPuerto);