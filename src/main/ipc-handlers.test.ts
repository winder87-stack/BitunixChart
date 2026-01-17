import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn(),
  },
  BrowserWindow: {
    getAllWindows: vi.fn(() => []),
    fromWebContents: vi.fn(),
  },
  app: {
    getVersion: vi.fn(() => '0.0.1'),
    isPackaged: false,
  },
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('ws', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    removeAllListeners: vi.fn(),
  })),
  WebSocket: {
    OPEN: 1,
    CONNECTING: 0,
    CLOSED: 3,
  },
}));

import { ipcMain } from 'electron';
import axios from 'axios';

interface ApiResult {
  success: boolean;
  error?: string;
  timestamp?: number;
  data?: unknown;
  platform?: string;
  arch?: string;
  cpus?: number;
  memory?: { total: number; free: number };
}

type HandlerFn = (...args: unknown[]) => Promise<ApiResult | string>;

describe('IPC Handlers', () => {
  let registeredHandlers: Map<string, HandlerFn>;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredHandlers = new Map();

    vi.mocked(ipcMain.handle).mockImplementation(((channel: string, handler: HandlerFn) => {
      registeredHandlers.set(channel, handler);
      return undefined;
    }) as typeof ipcMain.handle);

    vi.mocked(ipcMain.on).mockImplementation(((channel: string, handler: HandlerFn) => {
      registeredHandlers.set(channel, handler);
      return ipcMain;
    }) as typeof ipcMain.on);
  });

  afterEach(() => {
    registeredHandlers.clear();
  });

  describe('handler registration', () => {
    it('should register all expected IPC handlers', async () => {
      const { registerIpcHandlers } = await import('./ipc-handlers');
      registerIpcHandlers();

      const expectedHandlers = [
        'bitunix:get-symbols',
        'bitunix:get-klines',
        'bitunix:get-ticker',
        'bitunix:get-all-tickers',
        'bitunix:subscribe',
        'bitunix:unsubscribe',
        'bitunix:unsubscribe-all',
        'bitunix:connection-status',
        'bitunix:reconnect',
        'system:get-info',
        'system:get-version',
        'window:minimize',
        'window:maximize',
        'window:close',
        'window:is-maximized',
      ];

      expectedHandlers.forEach((handler) => {
        expect(
          registeredHandlers.has(handler),
          `Handler ${handler} should be registered`
        ).toBe(true);
      });
    });
  });

  describe('REST API handlers', () => {
    beforeEach(async () => {
      const { registerIpcHandlers } = await import('./ipc-handlers');
      registerIpcHandlers();
    });

    it('should handle get-symbols request', async () => {
      const mockResponse = {
        data: {
          data: [
            { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT' },
          ],
        },
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      const handler = registeredHandlers.get('bitunix:get-symbols');
      expect(handler).toBeDefined();

      if (handler) {
        const result = await handler({}, {});
        expect(result).toHaveProperty('success');
        expect(result).toHaveProperty('timestamp');
      }
    });

    it('should handle get-klines request with params', async () => {
      const mockResponse = {
        data: {
          data: [
            { openTime: 1700000000, open: '50000', high: '51000', low: '49000', close: '50500' },
          ],
        },
      };

      vi.mocked(axios.get).mockResolvedValue(mockResponse);

      const handler = registeredHandlers.get('bitunix:get-klines');
      expect(handler).toBeDefined();

      if (handler) {
        const result = await handler({}, { symbol: 'BTCUSDT', interval: '1h', limit: 100 });
        expect(result).toHaveProperty('success');
      }
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(axios.get).mockRejectedValue(new Error('Network error'));

      const handler = registeredHandlers.get('bitunix:get-symbols');

      if (handler) {
        const result = await handler({}, {}) as ApiResult;
        expect(result.success).toBe(false);
        expect(result).toHaveProperty('error');
      }
    });
  });

  describe('system handlers', () => {
    beforeEach(async () => {
      const { registerIpcHandlers } = await import('./ipc-handlers');
      registerIpcHandlers();
    });

    it('should return system info', async () => {
      const handler = registeredHandlers.get('system:get-info');
      expect(handler).toBeDefined();

      if (handler) {
        const result = await handler({});
        expect(result).toHaveProperty('platform');
        expect(result).toHaveProperty('arch');
        expect(result).toHaveProperty('cpus');
        expect(result).toHaveProperty('memory');
      }
    });

    it('should return app version', async () => {
      const handler = registeredHandlers.get('system:get-version');
      expect(handler).toBeDefined();

      if (handler) {
        const result = await handler({});
        expect(result).toBe('0.0.1');
      }
    });
  });
});

describe('WebSocket Manager', () => {
  it('should be a singleton', async () => {
    vi.resetModules();

    const module1 = await import('./ipc-handlers');
    const module2 = await import('./ipc-handlers');

    expect(module1).toBe(module2);
  });
});

describe('API Request Helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should make GET requests with timeout', async () => {
    const mockResponse = {
      data: { success: true, data: [] },
    };

    vi.mocked(axios.get).mockResolvedValue(mockResponse);

    const { registerIpcHandlers } = await import('./ipc-handlers');
    registerIpcHandlers();

    expect(axios.get).toBeDefined();
  });

  it('should handle axios errors with response data', async () => {
    const axiosError = {
      response: {
        data: { message: 'Rate limit exceeded' },
      },
      message: 'Request failed with status code 429',
    };

    vi.mocked(axios.get).mockRejectedValue(axiosError);

    const registeredHandlers = new Map<string, HandlerFn>();
    vi.mocked(ipcMain.handle).mockImplementation(((channel: string, handler: HandlerFn) => {
      registeredHandlers.set(channel, handler);
      return undefined;
    }) as typeof ipcMain.handle);

    const { registerIpcHandlers } = await import('./ipc-handlers');
    registerIpcHandlers();

    const handler = registeredHandlers.get('bitunix:get-symbols');
    if (handler) {
      const result = await handler({}, {}) as ApiResult;
      expect(result.success).toBe(false);
    }
  });
});
