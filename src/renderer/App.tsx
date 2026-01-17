/**
 * Main App Component
 * 
 * Root component that orchestrates the layout and global state.
 */

import React, { useEffect, useState } from 'react';
import { TopBar } from './components/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { ChartContainer } from './components/Chart';
import { StatusBar } from './components/StatusBar/StatusBar';
import { useChartStore } from './stores/chartStore';
import { useIndicators } from './hooks/useIndicators';
import { useWebSocket } from './hooks/useWebSocket';
import { cn } from './lib/utils';

const App: React.FC = () => {
  // Global state
  const { klines, fetchKlines, subscribe } = useChartStore();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Initialize indicator worker
  useIndicators(klines);
  
  // Initialize WebSocket connection
  const { isConnected } = useWebSocket();
  
  // Initial data load
  useEffect(() => {
    fetchKlines();
    subscribe();
  }, [fetchKlines, subscribe]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle sidebar with 'I' (if not typing in input)
      if (e.key.toLowerCase() === 'i' && 
          !(e.target instanceof HTMLInputElement) && 
          !(e.target instanceof HTMLTextAreaElement)) {
        setSidebarOpen(prev => !prev);
      }
      
      // Fullscreen with 'F'
      if (e.key.toLowerCase() === 'f' && 
          !(e.target instanceof HTMLInputElement)) {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
        } else {
          document.exitFullscreen();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-background text-text-primary overflow-hidden">
      {/* Top Header */}
      <TopBar />
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chart Area */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <ChartContainer className="flex-1" />
          
          {/* Overlay for connection issues */}
          {!isConnected && (
            <div className="absolute top-2 right-2 bg-destructive/80 text-destructive-foreground text-xs px-2 py-1 rounded shadow pointer-events-none z-50 animate-pulse">
              Reconnecting...
            </div>
          )}
        </div>
        
        {/* Right Sidebar */}
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out border-l border-border bg-background",
            sidebarOpen ? "w-[300px] opacity-100" : "w-0 opacity-0 overflow-hidden border-none"
          )}
        >
          <div className="w-[300px] h-full">
            <Sidebar />
          </div>
        </div>
        
        {/* Sidebar Toggle Button (floating when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-surface border border-border border-r-0 rounded-l p-1 text-text-secondary hover:text-text-primary shadow-lg z-10"
            title="Open Sidebar (I)"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Bottom Status Bar */}
      <StatusBar />
    </div>
  );
};

export default App;
