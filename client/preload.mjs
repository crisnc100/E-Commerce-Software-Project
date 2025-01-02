import { contextBridge, ipcRenderer } from 'electron';

// Expose APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
    send: (channel, data) => ipcRenderer.send(channel, data),
    receive: (channel, callback) =>
        ipcRenderer.on(channel, (event, ...args) => callback(...args)),
});
