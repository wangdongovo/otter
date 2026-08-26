import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import fs, { promises as fsp } from 'node:fs';

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

const sanitizeFileName = (fileName: string) =>
  path
    .basename(fileName)
    .split('')
    .map((character) =>
      character.charCodeAt(0) < 32 || /[<>:"/\\|?*]/.test(character) ? '-' : character,
    )
    .join('');

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
