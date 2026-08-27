export type AppUpdateState =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloaded'
  | 'error'
  | 'unsupported';

export interface AppUpdateStatus {
  state: AppUpdateState;
  currentVersion: string;
  message: string;
  checkedAt?: string;
  releaseName?: string;
  error?: string;
}

export interface AppUpdaterApi {
  getStatus: () => Promise<AppUpdateStatus>;
  checkForUpdates: () => Promise<AppUpdateStatus>;
  quitAndInstall: () => Promise<void>;
  onStatusChange: (callback: (status: AppUpdateStatus) => void) => () => void;
}

declare global {
  interface Window {
    appUpdater: AppUpdaterApi;
  }
}
