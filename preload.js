const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getServerInfo: () => ipcRenderer.invoke('get-server-info'),
    getServerPort: () => 4000,
    send: (channel, data) => ipcRenderer.send(channel, data),
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },
    closeWindow: () => ipcRenderer.send('close-window')
});

