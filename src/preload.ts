import { contextBridge, ipcRenderer } from 'electron';
import type { GithubImageHostConfig } from './github-image-host-types';

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

contextBridge.exposeInMainWorld('githubImageHost', {
  getConfig: () => ipcRenderer.invoke('github-image-host-get-config'),
  saveConfig: (config: GithubImageHostConfig) =>
    ipcRenderer.invoke('github-image-host-save-config', config),
  testConnection: (config?: GithubImageHostConfig) =>
    ipcRenderer.invoke('github-image-host-test-connection', config),
  listRecords: () => ipcRenderer.invoke('github-image-host-list-records'),
  uploadImage: (payload: { filePath: string; fileName?: string }) =>
    ipcRenderer.invoke('github-image-host-upload-image', payload),
  getRecordPreview: (id: string) =>
    ipcRenderer.invoke('github-image-host-get-record-preview', id),
  deleteRecord: (id: string) =>
    ipcRenderer.invoke('github-image-host-delete-record', id),
});
