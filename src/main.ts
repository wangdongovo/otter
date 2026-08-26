import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs, { promises as fsp } from 'node:fs';
import type {
  CdnProvider,
  GithubImageHostConfig,
  GithubImageHostConnection,
  GithubImageHostPublicConfig,
  GithubImageUploadRecord,
} from './github-image-host-types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const imageFilters = [
  {
    name: 'Images',
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'],
  },
];
const allowedImagePaths = new Set<string>();
const allowedOutputDirs = new Set<string>();

const defaultGithubImageHostConfig: GithubImageHostConfig = {
  owner: '',
  repo: '',
  branch: 'main',
  directory: 'images',
  token: '',
  cdnProvider: 'jsdelivr',
  customCdnPrefix: '',
};

const sanitizeFileName = (fileName: string) =>
  path
    .basename(fileName)
    .split('')
    .map((character) =>
      character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character,
    )
    .join('');

const getGithubImageHostConfigPath = () =>
  path.join(app.getPath('userData'), 'github-image-host-config.json');

const getGithubImageHostRecordsPath = () =>
  path.join(app.getPath('userData'), 'github-image-host-records.json');

const readJsonFile = async <T,>(filePath: string, fallback: T): Promise<T> => {
  try {
    const content = await fsp.readFile(filePath, 'utf8');

    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
};

const writeJsonFile = async (filePath: string, value: unknown) => {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const normalizeGithubConfig = (
  config: Partial<GithubImageHostConfig>,
): GithubImageHostConfig => ({
  ...defaultGithubImageHostConfig,
  ...config,
  owner: (config.owner ?? '').trim(),
  repo: (config.repo ?? '').trim(),
  branch: (config.branch ?? defaultGithubImageHostConfig.branch).trim() || 'main',
  directory: (config.directory ?? defaultGithubImageHostConfig.directory)
    .trim()
    .replace(/^\/+|\/+$/g, ''),
  token: (config.token ?? '').trim(),
  cdnProvider: config.cdnProvider ?? defaultGithubImageHostConfig.cdnProvider,
  customCdnPrefix: (config.customCdnPrefix ?? '').trim(),
});

const toPublicGithubConfig = (
  config: GithubImageHostConfig,
): GithubImageHostPublicConfig => {
  return {
    ...config,
    hasToken: config.token.length > 0,
  };
};

const readGithubImageHostConfig = async () =>
  normalizeGithubConfig(
    await readJsonFile<Partial<GithubImageHostConfig>>(
      getGithubImageHostConfigPath(),
      defaultGithubImageHostConfig,
    ),
  );

const readGithubImageUploadRecords = async () =>
  await readJsonFile<GithubImageUploadRecord[]>(
    getGithubImageHostRecordsPath(),
    [],
  );

const writeGithubImageUploadRecords = async (
  records: GithubImageUploadRecord[],
) => {
  await writeJsonFile(getGithubImageHostRecordsPath(), records);
};

const encodeUrlPath = (value: string) =>
  value
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');

const buildRawGithubUrl = (config: GithubImageHostConfig, repoPath: string) =>
  `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${encodeUrlPath(repoPath)}`;

const buildCdnUrl = (
  config: GithubImageHostConfig,
  repoPath: string,
  provider: CdnProvider,
) => {
  if (provider === 'raw') {
    return buildRawGithubUrl(config, repoPath);
  }

  if (provider === 'jsdelivr') {
    return `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${config.branch}/${encodeUrlPath(repoPath)}`;
  }

  if (provider === 'statically') {
    return `https://cdn.statically.io/gh/${config.owner}/${config.repo}/${config.branch}/${encodeUrlPath(repoPath)}`;
  }

  const prefix = config.customCdnPrefix.replace(/\/+$/g, '');

  return prefix
    ? `${prefix}/${config.owner}/${config.repo}/${config.branch}/${encodeUrlPath(repoPath)}`
    : buildRawGithubUrl(config, repoPath);
};

const createGithubHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
});

const ensureGithubConfigReady = (config: GithubImageHostConfig) => {
  if (!config.owner || !config.repo || !config.branch || !config.token) {
    throw new Error('请完整填写 GitHub owner、repo、branch 和 token。');
  }
};

const testGithubConnection = async (
  config: GithubImageHostConfig,
): Promise<GithubImageHostConnection> => {
  try {
    ensureGithubConfigReady(config);

    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}`,
      {
        headers: createGithubHeaders(config.token),
      },
    );

    if (!response.ok) {
      return {
        ok: false,
        message: `连接失败：GitHub 返回 ${response.status}`,
        checkedAt: new Date().toISOString(),
      };
    }

    return {
      ok: true,
      message: '连接正常，可以上传图片。',
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : '连接失败',
      checkedAt: new Date().toISOString(),
    };
  }
};

const createRepoPath = (config: GithubImageHostConfig, fileName: string) => {
  const safeFileName = sanitizeFileName(fileName);
  const parsed = path.parse(safeFileName);
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '-');
  const uniqueName = `${parsed.name || 'image'}-${timestamp}${parsed.ext}`;

  return [config.directory, uniqueName].filter(Boolean).join('/');
};

const registerImageCompressorHandlers = () => {
  ipcMain.handle('select-image-files', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择图片',
      properties: ['openFile', 'multiSelections'],
      filters: imageFilters,
    });

    if (result.canceled) {
      return [];
    }

    result.filePaths.forEach((filePath) => allowedImagePaths.add(filePath));

    return result.filePaths.map((filePath) => {
      const stats = fs.statSync(filePath);

      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
      };
    });
  });

  ipcMain.handle('select-output-folder', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择保存文件夹',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled) {
      return null;
    }

    const selectedDir = result.filePaths[0] ?? null;

    if (selectedDir) {
      allowedOutputDirs.add(selectedDir);
    }

    return selectedDir;
  });

  ipcMain.handle('read-image-data-url', async (_event, filePath: string) => {
    if (!allowedImagePaths.has(filePath)) {
      throw new Error('Image file was not selected by the user');
    }

    const data = await fsp.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    const mimeType =
      extension === '.png'
        ? 'image/png'
        : extension === '.webp'
          ? 'image/webp'
          : extension === '.gif'
            ? 'image/gif'
            : extension === '.bmp'
              ? 'image/bmp'
              : 'image/jpeg';

    return `data:${mimeType};base64,${data.toString('base64')}`;
  });

  ipcMain.handle(
    'save-compressed-image',
    async (
      _event,
      payload: {
        outputDir: string;
        fileName: string;
        dataUrl: string;
      },
    ) => {
      if (!allowedOutputDirs.has(payload.outputDir)) {
        throw new Error('Output folder was not selected by the user');
      }

      const safeFileName = sanitizeFileName(payload.fileName);
      const outputPath = path.join(payload.outputDir, safeFileName);
      const base64 = payload.dataUrl.split(',')[1];

      if (!base64) {
        throw new Error('Invalid image data');
      }

      await fsp.mkdir(payload.outputDir, { recursive: true });
      await fsp.writeFile(outputPath, Buffer.from(base64, 'base64'));

      const stats = await fsp.stat(outputPath);

      return {
        path: outputPath,
        size: stats.size,
      };
    },
  );

  ipcMain.handle('show-image-in-folder', async (_event, filePath: string) => {
    const isAllowedImage = allowedImagePaths.has(filePath);
    const isAllowedOutput = [...allowedOutputDirs].some((outputDir) => {
      const relativePath = path.relative(outputDir, filePath);

      return relativePath && !relativePath.startsWith('..') && !path.isAbsolute(relativePath);
    });

    if (!isAllowedImage && !isAllowedOutput) {
      throw new Error('File path was not selected or created by the user');
    }

    shell.showItemInFolder(filePath);
  });
};

const registerGithubImageHostHandlers = () => {
  ipcMain.handle('github-image-host-get-config', async () => {
    const config = await readGithubImageHostConfig();

    return toPublicGithubConfig(config);
  });

  ipcMain.handle(
    'github-image-host-save-config',
    async (_event, config: GithubImageHostConfig) => {
      const previousConfig = await readGithubImageHostConfig();
      const normalizedConfig = normalizeGithubConfig({
        ...config,
        token: config.token.trim() || previousConfig.token,
      });

      await writeJsonFile(getGithubImageHostConfigPath(), normalizedConfig);

      return toPublicGithubConfig(normalizedConfig);
    },
  );

  ipcMain.handle(
    'github-image-host-test-connection',
    async (_event, config?: GithubImageHostConfig) => {
      const previousConfig = await readGithubImageHostConfig();
      const effectiveConfig = config
        ? normalizeGithubConfig({
            ...config,
            token: config.token.trim() || previousConfig.token,
          })
        : previousConfig;

      return await testGithubConnection(effectiveConfig);
    },
  );

  ipcMain.handle('github-image-host-list-records', async () => {
    return await readGithubImageUploadRecords();
  });

  ipcMain.handle('github-image-host-get-record-preview', async (_event, id: string) => {
    const records = await readGithubImageUploadRecords();
    const record = records.find((item) => item.id === id);

    if (!record || !fs.existsSync(record.localPath)) {
      return null;
    }

    const extension = path.extname(record.localPath).toLowerCase();

    if (!imageFilters[0].extensions.includes(extension.replace('.', ''))) {
      return null;
    }

    const data = await fsp.readFile(record.localPath);
    const mimeType =
      extension === '.png'
        ? 'image/png'
        : extension === '.webp'
          ? 'image/webp'
          : extension === '.gif'
            ? 'image/gif'
            : extension === '.bmp'
              ? 'image/bmp'
              : 'image/jpeg';

    return `data:${mimeType};base64,${data.toString('base64')}`;
  });

  ipcMain.handle(
    'github-image-host-delete-record',
    async (_event, id: string) => {
      const records = await readGithubImageUploadRecords();
      const nextRecords = records.filter((record) => record.id !== id);

      await writeGithubImageUploadRecords(nextRecords);

      return nextRecords;
    },
  );

  ipcMain.handle(
    'github-image-host-upload-image',
    async (
      _event,
      payload: {
        filePath: string;
        fileName?: string;
      },
    ) => {
      if (!allowedImagePaths.has(payload.filePath)) {
        throw new Error('Image file was not selected by the user');
      }

      const config = await readGithubImageHostConfig();

      ensureGithubConfigReady(config);

      const fileData = await fsp.readFile(payload.filePath);
      const stat = await fsp.stat(payload.filePath);
      const originalName = payload.fileName || path.basename(payload.filePath);
      const repoPath = createRepoPath(config, originalName);
      const endpoint = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeUrlPath(repoPath)}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: createGithubHeaders(config.token),
        body: JSON.stringify({
          message: `Upload image ${path.basename(repoPath)}`,
          content: fileData.toString('base64'),
          branch: config.branch,
        }),
      });

      if (!response.ok) {
        const message = await response.text();

        throw new Error(`上传失败：GitHub 返回 ${response.status} ${message}`);
      }

      const result = (await response.json()) as {
        content?: {
          sha?: string;
        };
      };
      const rawUrl = buildRawGithubUrl(config, repoPath);
      const cdnUrl = buildCdnUrl(config, repoPath, config.cdnProvider);
      const record: GithubImageUploadRecord = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        originalName,
        localPath: payload.filePath,
        repoPath,
        size: stat.size,
        sha: result.content?.sha ?? '',
        rawUrl,
        cdnUrl,
        cdnProvider: config.cdnProvider,
        uploadedAt: new Date().toISOString(),
      };
      const records = await readGithubImageUploadRecords();

      await writeGithubImageUploadRecords([record, ...records]);

      return record;
    },
  );
};

const setAppIcon = () => {
  if (process.platform !== 'darwin') return;
  
  const appIconPath = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? path.join(process.cwd(), 'assets/icon-codex-light.png')
    : path.join(process.resourcesPath, 'assets/icon-codex-light.icns');
  
  if (fs.existsSync(appIconPath)) {
    app.dock?.setIcon(appIconPath);
  }
};

const createWindow = () => {
  // Determine the icon path
  const iconPath = MAIN_WINDOW_VITE_DEV_SERVER_URL
    ? path.join(process.cwd(), 'assets/icon-codex-light.png')
    : path.join(process.resourcesPath, 'assets/icon-codex-light.png');

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 960,
    height: 660,
    minWidth: 700,
    minHeight: 500,
    titleBarStyle: 'hiddenInset',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools in development only.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  registerImageCompressorHandlers();
  registerGithubImageHostHandlers();
  setAppIcon();
  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
