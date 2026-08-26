export type CdnProvider = 'raw' | 'jsdelivr' | 'statically' | 'custom';

export interface GithubImageHostConfig {
  owner: string;
  repo: string;
  branch: string;
  directory: string;
  token: string;
  cdnProvider: CdnProvider;
  customCdnPrefix: string;
}

export interface GithubImageHostPublicConfig extends GithubImageHostConfig {
  hasToken: boolean;
}

export interface GithubImageHostConnection {
  ok: boolean;
  message: string;
  checkedAt: string;
}

export interface GithubImageUploadRecord {
  id: string;
  originalName: string;
  localPath: string;
  repoPath: string;
  size: number;
  sha: string;
  rawUrl: string;
  cdnUrl: string;
  cdnProvider: CdnProvider;
  uploadedAt: string;
}

export interface GithubImageUploadPayload {
  filePath: string;
  fileName?: string;
}

export interface GithubImageHostApi {
  getConfig: () => Promise<GithubImageHostPublicConfig>;
  saveConfig: (
    config: GithubImageHostConfig,
  ) => Promise<GithubImageHostPublicConfig>;
  testConnection: (
    config?: GithubImageHostConfig,
  ) => Promise<GithubImageHostConnection>;
  listRecords: () => Promise<GithubImageUploadRecord[]>;
  uploadImage: (
    payload: GithubImageUploadPayload,
  ) => Promise<GithubImageUploadRecord>;
  getRecordPreview: (id: string) => Promise<string | null>;
  deleteRecord: (id: string) => Promise<GithubImageUploadRecord[]>;
}

declare global {
  interface Window {
    githubImageHost: GithubImageHostApi;
  }
}
