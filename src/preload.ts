import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('imageCompressor', {
  selectImageFiles: () => ipcRenderer.invoke('select-image-files'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  readImageDataUrl: (filePath: string) =>
    ipcRenderer.invoke('read-image-data-url', filePath),
  saveCompressedImage: (payload: {
    outputDir: string;
    fileName: string;
    dataUrl: string;
  }) => ipcRenderer.invoke('save-compressed-image', payload),
  showImageInFolder: (filePath: string) =>
    ipcRenderer.invoke('show-image-in-folder', filePath),
});
