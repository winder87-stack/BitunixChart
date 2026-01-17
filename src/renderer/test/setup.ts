import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

vi.mock('electron', () => ({
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
    removeListener: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  contextBridge: {
    exposeInMainWorld: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    fromWebContents: vi.fn(),
  },
  app: {
    getVersion: vi.fn(() => '0.0.1'),
    isPackaged: false,
    requestSingleInstanceLock: vi.fn(() => true),
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
    quit: vi.fn(),
  },
}));

Object.defineProperty(window, 'bitunix', {
  value: {
    getSymbols: vi.fn(),
    getKlines: vi.fn(),
    getTicker: vi.fn(),
    getAllTickers: vi.fn(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
    unsubscribeAll: vi.fn(),
    getConnectionStatus: vi.fn(),
    reconnect: vi.fn(),
    onKlineUpdate: vi.fn(() => vi.fn()),
    onConnectionStatus: vi.fn(() => vi.fn()),
    onError: vi.fn(() => vi.fn()),
    getSystemInfo: vi.fn(),
    getAppVersion: vi.fn(),
    minimizeWindow: vi.fn(),
    maximizeWindow: vi.fn(),
    closeWindow: vi.fn(),
    isMaximized: vi.fn(),
  },
  writable: true,
});
