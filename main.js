const { app, BrowserWindow, ipcMain, clipboard } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
let mainWindow;
let clipboardMonitor;
const ClipboardService =
  require('./mainProcess/service/ClipboardService');

const ClipboardHistoryRepo =
  require('./mainProcess/repo/ClipboardHistoryRepo');

const registerClipboardHandlers =
  require('./mainProcess/ipc/registerClipboardHandlers');

const ClipboardMonitor =
  require('./mainProcess/monitor/ClipboardMonitor');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true
    }
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(startUrl);

  // 移除 DevTools（如果需要調試，按 Ctrl+Shift+I 打開）
  // if (isDev) {
  //   mainWindow.webContents.openDevTools();
  // }
}

app.whenReady().then(async () => {
  const historyFilePath = path.join(
    app.getPath('userData'),
    'clipboard-history.json'
  );

  const historyRepo =
    new ClipboardHistoryRepo(historyFilePath, 5);

  historyRepo.on('changed', () => {
    if (
      mainWindow &&
      !mainWindow.isDestroyed()
    ) {
      mainWindow.webContents.send(
        'clipboard:history-updated'
      );
    }
  });

  clipboardMonitor =
    new ClipboardMonitor(
      clipboard,
      historyRepo
    );

  clipboardMonitor.start(500);

  const clipboardService =
    new ClipboardService(
      clipboard,
      historyRepo
    );

  registerClipboardHandlers(
    ipcMain,
    clipboardService
  );

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('before-quit', () => {
  if (clipboardMonitor) {
    clipboardMonitor.stop();
  }
});
