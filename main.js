const {
  app,
  BrowserWindow,
  ipcMain,
  clipboard,
  screen
} = require('electron');
const path = require('path');
let mainWindow;
let handleWindow;
let tray;
let clipboardMonitor;
let isQuitting = false;
let dockCollapsed = false;
let dockSide = 'right';
let dockY = null;
let dockDragOffsetY = null;

const expandedWindowSize = {
  width: 210,
  height: 302
};

const collapsedWindowSize = {
  width: 36,
  height: 64
};
const ClipboardService =
  require('./mainProcess/service/ClipboardService');

const ClipboardHistoryRepo =
  require('./mainProcess/repo/ClipboardHistoryRepo');

const registerClipboardHandlers =
  require('./mainProcess/ipc/registerClipboardHandlers');

const ClipboardMonitor =
  require('./mainProcess/monitor/ClipboardMonitor');

const createTray =
  require('./mainProcess/tray/createTray');

function getDockState() {
  return {
    collapsed: dockCollapsed,
    side: dockSide
  };
}

function sendDockState() {
  [mainWindow, handleWindow].forEach((window) => {
    if (window && !window.isDestroyed()) {
      window.webContents.send('window:dock-state', getDockState());
    }
  });
}

function getDockedBounds(collapsed = dockCollapsed) {
  const visibleWindow = [mainWindow, handleWindow].find(
    (window) => window && !window.isDestroyed() && window.isVisible()
  );
  const display = visibleWindow
    ? screen.getDisplayMatching(visibleWindow.getBounds())
    : screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const { workArea } = display;
  const requestedSize = collapsed
    ? collapsedWindowSize
    : expandedWindowSize;
  const width = Math.min(requestedSize.width, workArea.width);
  const height = Math.min(requestedSize.height, workArea.height);
  const centeredY = workArea.y + Math.round((workArea.height - height) / 2);
  const y = Math.max(
    workArea.y,
    Math.min(dockY ?? centeredY, workArea.y + workArea.height - height)
  );

  return {
    x: dockSide === 'left'
      ? workArea.x
      : workArea.x + workArea.width - width,
    y,
    width,
    height
  };
}

function setDockCollapsed(collapsed) {
  dockCollapsed = collapsed;
  dockDragOffsetY = null;

  if (
    !mainWindow || mainWindow.isDestroyed() ||
    !handleWindow || handleWindow.isDestroyed()
  ) {
    return getDockState();
  }

  if (collapsed) {
    handleWindow.setBounds(getDockedBounds(true));
    handleWindow.showInactive();
    mainWindow.hide();
  } else {
    mainWindow.setBounds(getDockedBounds(false));
    mainWindow.show();
    handleWindow.hide();
  }

  sendDockState();
  return getDockState();
}

function startDockDrag(screenY) {
  if (!dockCollapsed || !handleWindow || handleWindow.isDestroyed()) return;

  dockDragOffsetY = screenY - handleWindow.getBounds().y;
}

function updateDockDrag(screenX, screenY) {
  if (
    dockDragOffsetY === null ||
    !handleWindow || handleWindow.isDestroyed()
  ) {
    return;
  }

  const display = screen.getDisplayNearestPoint({ x: screenX, y: screenY });
  const { workArea } = display;
  const previousSide = dockSide;
  dockSide = screenX < workArea.x + workArea.width / 2
    ? 'left'
    : 'right';
  dockY = Math.max(
    workArea.y,
    Math.min(
      Math.round(screenY - dockDragOffsetY),
      workArea.y + workArea.height - collapsedWindowSize.height
    )
  );

  handleWindow.setBounds({
    x: dockSide === 'left'
      ? workArea.x
      : workArea.x + workArea.width - collapsedWindowSize.width,
    y: dockY,
    ...collapsedWindowSize
  });

  if (dockSide !== previousSide) {
    sendDockState();
  }
}

function endDockDrag() {
  dockDragOffsetY = null;
  sendDockState();
  return getDockState();
}

function showClipboardWindow() {
  if (
    mainWindow && !mainWindow.isDestroyed() &&
    handleWindow && !handleWindow.isDestroyed()
  ) {
    setDockCollapsed(false);
    mainWindow.focus();
    return;
  }

  createWindow();
}

function hideClipboardWindows() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.hide();
  }

  if (handleWindow && !handleWindow.isDestroyed()) {
    handleWindow.hide();
  }
}

function createDockWindow(size) {
  return new BrowserWindow({
    ...size,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    maximizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      sandbox: true,
      backgroundThrottling: false
    }
  });
}

function createWindow() {
  mainWindow = createDockWindow(expandedWindowSize);
  handleWindow = createDockWindow(collapsedWindowSize);

  const baseUrl = !app.isPackaged
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, 'build/index.html')}`;

  mainWindow.loadURL(`${baseUrl}?mode=panel`);
  handleWindow.loadURL(`${baseUrl}?mode=handle`);

  let readyWindows = 0;
  const showInitialWindow = () => {
    readyWindows += 1;
    if (readyWindows !== 2) return;

    mainWindow.setBounds(getDockedBounds(false));
    handleWindow.setBounds(getDockedBounds(true));
    mainWindow.show();
  };

  mainWindow.once('ready-to-show', showInitialWindow);
  handleWindow.once('ready-to-show', showInitialWindow);

  mainWindow.on('close', (event) => {
    if (isQuitting) return;

    event.preventDefault();
    hideClipboardWindows();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (handleWindow && !handleWindow.isDestroyed()) {
      handleWindow.close();
    }
  });

  handleWindow.on('closed', () => {
    handleWindow = null;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.close();
    }
  });

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

  ipcMain.handle('window:toggle-docked', () =>
    setDockCollapsed(!dockCollapsed)
  );
  ipcMain.handle('window:get-dock-state', getDockState);
  ipcMain.on('window:start-dock-drag', (_event, screenY) => {
    startDockDrag(screenY);
  });
  ipcMain.on('window:update-dock-drag', (_event, screenX, screenY) => {
    updateDockDrag(screenX, screenY);
  });
  ipcMain.handle('window:end-dock-drag', endDockDrag);
  ipcMain.handle('window:hide', () => {
    hideClipboardWindows();
    return true;
  });

  createWindow();
  tray = await createTray({
    app,
    iconPath: path.join(__dirname, 'clipboard.png'),
    onShow: showClipboardWindow,
    onQuit: () => {
      isQuitting = true;
      app.quit();
    }
  });

  screen.on('display-metrics-changed', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBounds(getDockedBounds(false));
    }
    if (handleWindow && !handleWindow.isDestroyed()) {
      handleWindow.setBounds(getDockedBounds(true));
    }
  });

  app.on('activate', function () {
    showClipboardWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('before-quit', () => {
  isQuitting = true;

  if (clipboardMonitor) {
    clipboardMonitor.stop();
  }

  if (tray) {
    tray.destroy();
    tray = null;
  }
});
