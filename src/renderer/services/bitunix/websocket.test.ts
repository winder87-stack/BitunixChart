import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BitunixWebSocket } from './websocket';

const mockBitunixApi = {
  getConnectionStatus: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  unsubscribeAll: vi.fn(),
  reconnect: vi.fn(),
  onKlineUpdate: vi.fn(() => vi.fn()),
  onConnectionStatus: vi.fn(() => vi.fn()),
  onError: vi.fn(() => vi.fn()),
};

describe('BitunixWebSocket', () => {
  let ws: BitunixWebSocket;

  beforeEach(() => {
    vi.clearAllMocks();

    (window as unknown as { bitunix: typeof mockBitunixApi }).bitunix = mockBitunixApi;

    ws = new BitunixWebSocket({
      autoReconnect: true,
      maxReconnectAttempts: 3,
      reconnectDelay: 100,
      maxReconnectDelay: 1000,
      debug: false,
    });
  });

  afterEach(async () => {
    await ws.disconnect();
  });

  describe('connection management', () => {
    it('should start in disconnected state', () => {
      expect(ws.getStatus()).toBe('disconnected');
    });

    it('should connect via IPC', async () => {
      mockBitunixApi.getConnectionStatus.mockResolvedValue('connected');

      await ws.connect();

      expect(mockBitunixApi.onConnectionStatus).toHaveBeenCalled();
      expect(mockBitunixApi.onKlineUpdate).toHaveBeenCalled();
      expect(mockBitunixApi.onError).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      mockBitunixApi.getConnectionStatus.mockResolvedValue('connected');

      await ws.connect();
      await ws.connect();

      expect(mockBitunixApi.getConnectionStatus).toHaveBeenCalledTimes(1);
    });

    it('should set status to connecting during connection', async () => {
      mockBitunixApi.getConnectionStatus.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('connected'), 50))
      );

      const connectPromise = ws.connect();

      await new Promise((r) => setTimeout(r, 10));
      expect(ws.getStatus()).toBe('connecting');

      await connectPromise;
    });

    it('should update status on connection', async () => {
      mockBitunixApi.getConnectionStatus.mockResolvedValue('connected');

      await ws.connect();

      expect(ws.getStatus()).toBe('connected');
    });
  });

  describe('status tracking', () => {
    it('should emit status events', async () => {
      mockBitunixApi.getConnectionStatus.mockResolvedValue('connected');

      const statusHandler = vi.fn();
      ws.on('status', statusHandler);

      await ws.connect();

      expect(statusHandler).toHaveBeenCalled();
    });

    it('should return current status', async () => {
      expect(ws.getStatus()).toBe('disconnected');

      mockBitunixApi.getConnectionStatus.mockResolvedValue('connected');
      await ws.connect();

      expect(ws.getStatus()).toBe('connected');
    });

    it('should track connection state correctly', () => {
      expect(ws.isConnected()).toBe(false);
    });
  });

  describe('subscription management', () => {
    beforeEach(async () => {
      mockBitunixApi.getConnectionStatus.mockResolvedValue('connected');
      mockBitunixApi.subscribe.mockResolvedValue({ success: true });
      mockBitunixApi.unsubscribe.mockResolvedValue({ success: true });
      await ws.connect();
    });

    it('should subscribe to kline stream', async () => {
      const callback = vi.fn();
      const id = await ws.subscribeKline('BTCUSDT', '1h', callback);

      expect(id).toBeTruthy();
      expect(mockBitunixApi.subscribe).toHaveBeenCalledWith({
        symbol: 'BTCUSDT',
        interval: '1h',
      });
    });

    it('should track active subscriptions', async () => {
      const callback = vi.fn();
      await ws.subscribeKline('BTCUSDT', '1h', callback);

      expect(ws.getSubscriptionCount()).toBe(1);
    });

    it('should unsubscribe from stream', async () => {
      const callback = vi.fn();
      const id = await ws.subscribeKline('BTCUSDT', '1h', callback);

      await ws.unsubscribe(id);

      expect(mockBitunixApi.unsubscribe).toHaveBeenCalled();
      expect(ws.getSubscriptionCount()).toBe(0);
    });

    it('should unsubscribe all', async () => {
      mockBitunixApi.unsubscribeAll.mockResolvedValue({ success: true });

      const callback = vi.fn();
      await ws.subscribeKline('BTCUSDT', '1h', callback);
      await ws.subscribeKline('ETHUSDT', '1h', callback);

      await ws.unsubscribeAll();

      expect(ws.getSubscriptionCount()).toBe(0);
    });
  });

  describe('event handling', () => {
    it('should register and unregister event handlers', () => {
      const handler = vi.fn();

      const unsubscribe = ws.on('status', handler);
      expect(ws.listenerCount('status')).toBe(1);

      unsubscribe();
      expect(ws.listenerCount('status')).toBe(0);
    });

    it('should emit events to all handlers', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      ws.on('status', handler1);
      ws.on('status', handler2);

      ws.emit('status', 'connected');

      expect(handler1).toHaveBeenCalledWith('connected');
      expect(handler2).toHaveBeenCalledWith('connected');
    });

    it('should handle errors in event handlers gracefully', () => {
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      const goodHandler = vi.fn();

      ws.on('status', errorHandler);
      ws.on('status', goodHandler);

      expect(() => ws.emit('status', 'connected')).not.toThrow();
      expect(goodHandler).toHaveBeenCalled();
    });
  });

  describe('stats tracking', () => {
    it('should return stats object', () => {
      const stats = ws.getStats();

      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('reconnects');
      expect(stats).toHaveProperty('lastMessageTime');
    });
  });

  describe('cleanup', () => {
    it('should cleanup on disconnect', async () => {
      mockBitunixApi.getConnectionStatus.mockResolvedValue('connected');
      mockBitunixApi.subscribe.mockResolvedValue({ success: true });
      mockBitunixApi.unsubscribeAll.mockResolvedValue({ success: true });

      await ws.connect();
      await ws.subscribeKline('BTCUSDT', '1h', vi.fn());

      await ws.disconnect();

      expect(ws.getStatus()).toBe('disconnected');
      expect(ws.getSubscriptionCount()).toBe(0);
    });
  });
});

describe('SimpleEventEmitter (via BitunixWebSocket)', () => {
  let ws: BitunixWebSocket;

  beforeEach(() => {
    (window as unknown as { bitunix: typeof mockBitunixApi }).bitunix = mockBitunixApi;
    ws = new BitunixWebSocket();
  });

  it('should support multiple events', () => {
    const statusHandler = vi.fn();
    const errorHandler = vi.fn();

    ws.on('status', statusHandler);
    ws.on('error', errorHandler);

    ws.emit('status', 'connected');
    ws.emit('error', { message: 'test' });

    expect(statusHandler).toHaveBeenCalledTimes(1);
    expect(errorHandler).toHaveBeenCalledTimes(1);
  });

  it('should remove all listeners for specific event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    ws.on('status', handler1);
    ws.on('status', handler2);

    ws.removeAllListeners('status');

    ws.emit('status', 'connected');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).not.toHaveBeenCalled();
  });

  it('should remove all listeners', () => {
    const statusHandler = vi.fn();
    const errorHandler = vi.fn();

    ws.on('status', statusHandler);
    ws.on('error', errorHandler);

    ws.removeAllListeners();

    ws.emit('status', 'connected');
    ws.emit('error', { message: 'test' });

    expect(statusHandler).not.toHaveBeenCalled();
    expect(errorHandler).not.toHaveBeenCalled();
  });
});
