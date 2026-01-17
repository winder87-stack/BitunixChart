import { app, BrowserWindow, nativeTheme, shell } from 'electron';
import path from 'path';
import os from 'os';
import { registerIpcHandlers, cleanupWebSocket } from './ipc-handlers';

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

/**
 * Creates the main application window
 */
function createWindow(): void {
  // Force dark mode for the native frame
  nativeTheme.themeSource = 'dark';

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.DEFAULT_WIDTH,
    height: WINDOW_CONFIG.DEFAULT_HEIGHT,
    minWidth: WINDOW_CONFIG.MIN_WIDTH,
    minHeight: WINDOW_CONFIG.MIN_HEIGHT,
    
    // Dark frame/titlebar
    backgroundColor: '#0a0a0f',
    darkTheme: true,
    
    // Window appearance
    show: false, // Don't show until ready
    autoHideMenuBar: true,
    titleBarStyle: 'default',
    
    // Icon
    icon: getIconPath(),
    
    // Web preferences with security enabled
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
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

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // Open DevTools in development
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

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

  // Log window info in dev mode
  if (isDev) {
    console.log('[Main] Window created');
    console.log('[Main] Platform:', process.platform);
    console.log('[Main] Electron:', process.versions.electron);
    console.log('[Main] Node:', process.versions.node);
    console.log('[Main] Chrome:', process.versions.chrome);
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
  app.whenReady().then(() => {
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
  console.error('[Main] Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Main] Unhandled Rejection:', reason);
});
