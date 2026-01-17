/**
 * WebSocket Hook
 * 
 * React hook for managing Bitunix WebSocket connections and subscriptions.
 * Wraps the global BitunixWebSocket service.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { bitunixWS } from '../services/bitunix/websocket';
import type { 
  ConnectionStatus, 
  KlineCallback, 
  TradeCallback,
  // SubscriptionType, // unused
} from '../services/bitunix/websocket';
import type { WSMessage, Timeframe } from '../types/bitunix';

// =============================================================================
// Types
// =============================================================================

interface UseWebSocketReturn {
  /** Connection status */
  status: ConnectionStatus;
  
  /** Whether currently connected */
  isConnected: boolean;
  
  /** Subscribe to kline updates */
  subscribeKline: (
    symbol: string, 
    interval: Timeframe, 
    callback: KlineCallback
  ) => Promise<string>;
  
  /** Subscribe to trade updates */
  subscribeTrades: (
    symbol: string, 
    callback: TradeCallback
  ) => Promise<string>;
  
  /** Unsubscribe by ID */
  unsubscribe: (subscriptionId: string) => Promise<boolean>;
  
  /** Unsubscribe from all active subscriptions created by this hook */
  unsubscribeAll: () => Promise<void>;
  
  /** Last received message (raw) */
  lastMessage: WSMessage | null;
  
  /** Manually connect */
  connect: () => Promise<void>;
  
  /** Manually disconnect */
  disconnect: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useWebSocket(): UseWebSocketReturn {
  // State
  const [status, setStatus] = useState<ConnectionStatus>(bitunixWS.getStatus());
  const [lastMessage] = useState<WSMessage | null>(null);
  
  // Track subscriptions created by this hook instance for cleanup
  const activeSubscriptions = useRef<Set<string>>(new Set());
  
  // ==========================================================================
  // Connection Management
  // ==========================================================================
  
  useEffect(() => {
    // Status listener
    const handleStatusChange = (newStatus: unknown) => {
      setStatus(newStatus as ConnectionStatus);
    };
    
    // Message listener (for debugging/raw access)
    // Note: In a high-frequency trading app, setting state on every message
    // might cause performance issues. Consider removing if not used.
    /*
    const handleMessage = (msg: WSMessage) => {
      setLastMessage(msg);
    };
    */
    
    // Connect listeners
    bitunixWS.on('status', handleStatusChange);
    // bitunixWS.on('message', handleMessage);
    
    // Initial connection if needed
    if (status === 'disconnected') {
      bitunixWS.connect().catch(console.error);
    }
    
    const subscriptions = activeSubscriptions.current;
    
    // Cleanup on unmount
    return () => {
      bitunixWS.off('status', handleStatusChange);
      // bitunixWS.off('message', handleMessage);
      
      // Unsubscribe from all subscriptions created by this hook
      subscriptions.forEach(id => {
        bitunixWS.unsubscribe(id).catch(console.error);
      });
      subscriptions.clear();
    };
  }, [status]);
  
  // ==========================================================================
  // Subscription Wrappers
  // ==========================================================================
  
  const subscribeKline = useCallback(async (
    symbol: string,
    interval: Timeframe,
    callback: KlineCallback
  ): Promise<string> => {
    try {
      const id = await bitunixWS.subscribeKline(symbol, interval, callback);
      activeSubscriptions.current.add(id);
      return id;
    } catch (error) {
      console.error('Failed to subscribe to kline:', error);
      throw error;
    }
  }, []);
  
  const subscribeTrades = useCallback(async (
    symbol: string,
    callback: TradeCallback
  ): Promise<string> => {
    try {
      const id = await bitunixWS.subscribeTrades(symbol, callback);
      activeSubscriptions.current.add(id);
      return id;
    } catch (error) {
      console.error('Failed to subscribe to trades:', error);
      throw error;
    }
  }, []);
  
  const unsubscribe = useCallback(async (id: string): Promise<boolean> => {
    if (activeSubscriptions.current.has(id)) {
      activeSubscriptions.current.delete(id);
      return bitunixWS.unsubscribe(id);
    }
    return false;
  }, []);
  
  const unsubscribeAll = useCallback(async (): Promise<void> => {
    const promises: Promise<boolean>[] = [];
    
    activeSubscriptions.current.forEach(id => {
      promises.push(bitunixWS.unsubscribe(id));
    });
    
    activeSubscriptions.current.clear();
    await Promise.all(promises);
  }, []);
  
  const connect = useCallback(async () => {
    return bitunixWS.connect();
  }, []);
  
  const disconnect = useCallback(async () => {
    return bitunixWS.disconnect();
  }, []);
  
  return {
    status,
    isConnected: status === 'connected',
    subscribeKline,
    subscribeTrades,
    unsubscribe,
    unsubscribeAll,
    lastMessage,
    connect,
    disconnect,
  };
}

export default useWebSocket;
