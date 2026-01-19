import { FC, useState } from 'react';
import { X } from 'lucide-react';
import { useSignalStore } from '../../stores/signalStore';
import { useStrategyStore } from '../../stores/strategyStore';
import { useChartStore, selectChartSettings } from '../../stores/chartStore';
import { cn } from '../../lib/utils';
import { Timeframe } from '../../types/bitunix';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'trading' | 'alerts' | 'display'>('general');
  
  // Get stores
  const { 
    config: signalConfig, 
    updateConfig: updateSignalConfig,
    soundEnabled,
    toggleSound,
    notificationsEnabled,
    toggleNotifications,
    showSignalPanel,
    toggleSignalPanel,
    showQuadPane,
    toggleQuadPane
  } = useSignalStore();

  const { activeConfig, updateConfig: updateStrategyConfig } = useStrategyStore();
  
  const { chartType } = useChartStore(selectChartSettings);
  const { setChartType, setTimeframe, timeframe } = useChartStore();
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[500px] max-h-[80vh] bg-[#131722] border border-[#2a2e39] rounded-lg shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#2a2e39] shrink-0">
          <h2 className="text-lg font-semibold text-[#d1d4dc]">Settings</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#2a2e39] rounded transition-colors">
            <X size={20} className="text-[#787b86]" />
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-[#2a2e39] shrink-0">
          {['general', 'trading', 'alerts', 'display'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={cn(
                'px-4 py-2 text-sm capitalize transition-colors',
                activeTab === tab 
                  ? 'text-[#2962ff] border-b-2 border-[#2962ff]' 
                  : 'text-[#787b86] hover:text-[#d1d4dc]'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[#d1d4dc] mb-2">Theme</h3>
                <select 
                  className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                  defaultValue="dark"
                  disabled
                >
                  <option value="dark">Dark (TradingView)</option>
                  <option value="light">Light</option>
                </select>
                <p className="text-[10px] text-[#787b86] mt-1">Light theme currently unavailable</p>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-[#d1d4dc] mb-2">Default Timeframe</h3>
                <select 
                  className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                >
                  <option value="1m">1 Minute</option>
                  <option value="3m">3 Minutes</option>
                  <option value="5m">5 Minutes</option>
                  <option value="15m">15 Minutes</option>
                  <option value="1h">1 Hour</option>
                  <option value="4h">4 Hours</option>
                  <option value="1d">1 Day</option>
                </select>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-[#d1d4dc] mb-2">Chart Type</h3>
                <select 
                  className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value as 'candles' | 'line' | 'area')}
                >
                  <option value="candles">Candlestick</option>
                  <option value="line">Line</option>
                  <option value="area">Area</option>
                </select>
              </div>
            </div>
          )}
          
          {activeTab === 'trading' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-[#d1d4dc] mb-2">Risk Per Trade (%)</h3>
                <input 
                  type="number" 
                  step="0.5"
                  value={activeConfig.risk.riskPerTrade}
                  onChange={(e) => updateStrategyConfig({ 
                    risk: { ...activeConfig.risk, riskPerTrade: parseFloat(e.target.value) } 
                  })}
                  className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-[#d1d4dc] mb-2">Max Daily Loss (%)</h3>
                <input 
                  type="number" 
                  value={activeConfig.risk.maxDailyLoss}
                  onChange={(e) => updateStrategyConfig({ 
                    risk: { ...activeConfig.risk, maxDailyLoss: parseFloat(e.target.value) } 
                  })}
                  className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-[#d1d4dc] mb-2">Max Open Trades</h3>
                <input 
                  type="number" 
                  value={activeConfig.signalRules.maxSignalsPerSymbol}
                  onChange={(e) => updateStrategyConfig({ 
                    signalRules: { ...activeConfig.signalRules, maxSignalsPerSymbol: parseFloat(e.target.value) } 
                  })}
                  className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                />
              </div>
            </div>
          )}
          
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#d1d4dc]">Sound Alerts</span>
                <input 
                  type="checkbox" 
                  checked={soundEnabled}
                  onChange={toggleSound}
                  className="w-4 h-4 accent-[#2962ff]" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#d1d4dc]">Desktop Notifications</span>
                <input 
                  type="checkbox" 
                  checked={notificationsEnabled}
                  onChange={toggleNotifications}
                  className="w-4 h-4 accent-[#2962ff]" 
                />
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-[#d1d4dc] mb-2">Minimum Signal Strength</h3>
                <select 
                  className="w-full px-3 py-2 bg-[#1e222d] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                  value={signalConfig.minNotificationStrength}
                  onChange={(e) => updateSignalConfig({ minNotificationStrength: e.target.value as any })}
                >
                  <option value="WEAK">All Signals (Weak+)</option>
                  <option value="MODERATE">Moderate+</option>
                  <option value="STRONG">Strong+</option>
                  <option value="SUPER">Super Only</option>
                </select>
              </div>
            </div>
          )}
          
          {activeTab === 'display' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#d1d4dc]">Show Signal Panel</span>
                <input 
                  type="checkbox" 
                  checked={showSignalPanel}
                  onChange={toggleSignalPanel}
                  className="w-4 h-4 accent-[#2962ff]" 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#d1d4dc]">Show Quad Stochastic Pane</span>
                <input 
                  type="checkbox" 
                  checked={showQuadPane}
                  onChange={toggleQuadPane}
                  className="w-4 h-4 accent-[#2962ff]" 
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-[#2a2e39] flex justify-end gap-2 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm bg-[#2962ff] hover:bg-[#2962ff]/90 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
