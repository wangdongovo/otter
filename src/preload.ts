import { contextBridge, ipcRenderer } from 'electron';
import type { SavePastedImagePayload } from './image-compressor-types';
import type {
  GithubClipboardImagePayload,
  GithubImageHostConfig,
} from './github-image-host-types';
import type { AppUpdateStatus } from './app-update-types';

contextBridge.exposeInMainWorld('imageCompressor', {
  selectImageFiles: () => ipcRenderer.invoke('select-image-files'),
  selectOutputFolder: () => ipcRenderer.invoke('select-output-folder'),
  readImageDataUrl: (filePath: string) =>
    ipcRenderer.invoke('read-image-data-url', filePath),
  readClipboardImage: () =>
    ipcRenderer.invoke('read-clipboard-image'),
  savePastedImage: (payload: SavePastedImagePayload) =>
    ipcRenderer.invoke('save-pasted-image', payload),
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
  readClipboardImage: () =>
    ipcRenderer.invoke('github-image-host-read-clipboard-image'),
  savePastedImage: (payload: GithubClipboardImagePayload) =>
    ipcRenderer.invoke('github-image-host-save-pasted-image', payload),
  uploadImage: (payload: { filePath: string; fileName?: string }) =>
    ipcRenderer.invoke('github-image-host-upload-image', payload),
  getRecordPreview: (id: string) =>
    ipcRenderer.invoke('github-image-host-get-record-preview', id),
  deleteRecord: (id: string) =>
    ipcRenderer.invoke('github-image-host-delete-record', id),
});

contextBridge.exposeInMainWorld('appUpdater', {
  getStatus: () => ipcRenderer.invoke('app-updater-get-status'),
  checkForUpdates: () => ipcRenderer.invoke('app-updater-check-for-updates'),
  quitAndInstall: () => ipcRenderer.invoke('app-updater-quit-and-install'),
  onStatusChange: (callback: (status: AppUpdateStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: AppUpdateStatus) => {
      callback(status);
    };

    ipcRenderer.on('app-updater-status-changed', listener);

    return () => {
      ipcRenderer.removeListener('app-updater-status-changed', listener);
    };
  },
});
