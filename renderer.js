const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    logInput: (input) => ipcRenderer.send('log-input', input),
    processPayment: (input) => ipcRenderer.send('process-payment', input),
    cancelPayment: () => ipcRenderer.send('cancel-payment')
});