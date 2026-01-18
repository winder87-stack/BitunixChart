import { app, BrowserWindow, nativeTheme, shell, Menu } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import log from 'electron-log';
import { registerIpcHandlers, cleanupWebSocket } from './ipc-handlers';

// Configure logging
log.transports.file.level = 'debug';
log.transports.file.resolvePathFn = () => '/tmp/bitunix-charts.log';

log.info('App starting...');
log.info('__dirname:', __dirname);
log.info('app.getAppPath():', app.getAppPath());

// Environment detection
const isDev = !app.isPackaged;

// Main window reference
let mainWindow: BrowserWindow | null = null;

// Window configuration
const WINDOW_CONFIG = {
  DEFAULT_WIDTH: 1400,
  DEFAULT_HEIGHT: 900,
  MIN_WIDTH: 1000,
  MIN_HEIGHT: 700,
} as const;

// =============================================================================
// Application Menu
// =============================================================================

const template: Electron.MenuItemConstructorOptions[] = [
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { type: 'separator' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    label: 'Debug',
    submenu: [
      {
        label: 'Show DevTools',
        accelerator: 'F12',
        click: () => mainWindow?.webContents.openDevTools()
      },
      {
        label: 'Reload',
        accelerator: 'CmdOrCtrl+R',
        click: () => mainWindow?.reload()
      },
      { type: 'separator' },
      {
        label: 'Log Chart State',
        click: () => mainWindow?.webContents.executeJavaScript(
          'console.log("Chart State:", window.bitunix)'
        )
      }
    ]
  }
];

Menu.setApplicationMenu(Menu.buildFromTemplate(template));

/**
 * Creates the main application window
 */
function createWindow(): void {
  log.info('[Main] Creating window...');
  log.info('[Main] __dirname:', __dirname);
  log.info('[Main] app.getAppPath():', app.getAppPath());
  log.info('[Main] app.isPackaged:', app.isPackaged);

  // Force dark mode for the native frame
  nativeTheme.themeSource = 'dark';

  // Fix preload path
  const preloadPath = app.isPackaged
    ? path.join(__dirname, 'preload.cjs')
    : path.join(__dirname, '../../dist/main/preload.cjs');

  log.info('[Main] Preload path:', preloadPath);
  try {
    log.info('[Main] Preload exists:', fs.existsSync(preloadPath));
  } catch (e: any) {
    log.error('[Main] Preload check error:', e.message);
  }

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.DEFAULT_WIDTH,
    height: WINDOW_CONFIG.DEFAULT_HEIGHT,
    minWidth: WINDOW_CONFIG.MIN_WIDTH,
    minHeight: WINDOW_CONFIG.MIN_HEIGHT,
    
    // Dark frame/titlebar
    backgroundColor: '#131722',
    darkTheme: true,
    
    // Window appearance
    show: false, // Don't show until ready
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    
    // Icon
    icon: getIconPath(),
    
    // Web preferences with security enabled
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: false, // Required for some Electron features
      webviewTag: false,
      allowRunningInsecureContent: false,
      experimentalFeatures: false,
    },
  });

  // Show window when ready to avoid flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Monitor loading errors
  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    log.error('[Main] Load failed:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log.info('[Main] Renderer loaded successfully');
  });

  // Always open DevTools for debugging (remove in production)
  mainWindow.webContents.openDevTools();

  // Handle external links - open in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const appUrl = isDev ? 'http://localhost:5173' : 'file://';
    if (!url.startsWith(appUrl)) {
      event.preventDefault();
    }
  });

  // Window close handling
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Load the app
  if (isDev) {
    log.info('[Main] Loading dev server...');
    mainWindow.loadURL('http://localhost:5173');
  } else {
    const htmlPath = app.isPackaged
      ? path.join(app.getAppPath(), 'dist/renderer/index.html') 
      : path.join(__dirname, '../renderer/index.html');

    log.info('[Main] Loading HTML from:', htmlPath);
    
    try {
      const exists = fs.existsSync(htmlPath);
      log.info('[Main] File exists:', exists);
      if (!exists) {
        const dir = path.dirname(htmlPath);
        log.info(`[Main] Files in ${dir}:`, fs.readdirSync(dir));
      }
    } catch (e: any) {
      log.error('[Main] FS Check error:', e.message);
    }

    mainWindow.loadFile(htmlPath).catch(err => {
      log.error('[Main] Failed to load HTML:', err);
    });
  }
}

/**
 * Get the appropriate icon path based on platform
 */
function getIconPath(): string {
  const iconDir = path.join(__dirname, '../../assets/icons');
  
  // Platform-specific icons
  if (process.platform === 'win32') {
    return path.join(iconDir, 'icon.ico');
  } else if (process.platform === 'darwin') {
    return path.join(iconDir, 'icon.icns');
  }
  
  // Linux and fallback
  return path.join(iconDir, 'icon.png');
}

/**
 * Get the main window instance
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Get system information for status bar
 */
export function getSystemInfo(): {
  platform: NodeJS.Platform;
  arch: string;
  cpus: number;
  memory: { total: number; free: number };
  hostname: string;
} {
  return {
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
    },
    hostname: os.hostname(),
  };
}

// =============================================================================
// App Lifecycle
// =============================================================================

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  // Handle second instance
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      mainWindow.focus();
    }
  });

  // App ready
  if (process.platform === 'linux') {
    app.disableHardwareAcceleration();
    app.commandLine.appendSwitch('no-sandbox');
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('ozone-platform', 'x11');
    app.commandLine.appendSwitch('disable-software-rasterizer');
  }

  app.whenReady().then(async () => {
    // Install React DevTools in development
    if (isDev) {
      try {
        const { default: installExtension, REACT_DEVELOPER_TOOLS } = 
          await import('electron-devtools-installer');
        await installExtension(REACT_DEVELOPER_TOOLS);
        log.info('[Main] React DevTools installed');
      } catch (e) {
        log.error('[Main] Failed to install React DevTools:', e);
      }
    }

    // Register IPC handlers before creating window
    registerIpcHandlers();
    
    // Create the main window
    createWindow();

    // macOS: Re-create window when dock icon is clicked
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  });
}

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  // Cleanup WebSocket connections
  cleanupWebSocket();
  
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Cleanup before quit
app.on('before-quit', () => {
  cleanupWebSocket();
});

// Handle unhandled errors
process.on('uncaughtException', (error) => {
  log.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  log.error('[Main] Unhandled Rejection:', reason);
});
