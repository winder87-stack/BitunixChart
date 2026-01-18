/**
 * Sidebar Component
 * 
 * Right sidebar container that manages:
 * - Indicator List (default view)
 * - Indicator Settings (when an indicator is selected)
 */

import React, { useState } from 'react';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { getIndicatorDefinition } from '../../services/indicators/definitions';
import { IndicatorList } from './IndicatorList';
import { IndicatorSettings } from './IndicatorSettings';
import { SignalPanel } from '../SignalPanel';
import { ErrorBoundary } from '../ErrorBoundary';

type SidebarTab = 'indicators' | 'signals';

export const Sidebar: React.FC = () => {
  const { selectedIndicatorId, getIndicator, selectIndicator } = useIndicatorStore();
  const [activeTab, setActiveTab] = useState<SidebarTab>('indicators');
  
  // Determine content based on selection
  const selectedIndicator = selectedIndicatorId ? getIndicator(selectedIndicatorId) : undefined;
  const definition = selectedIndicator ? getIndicatorDefinition(selectedIndicator.type) : undefined;

  // Show settings if an indicator is selected and valid (overrides tabs)
  if (selectedIndicator && definition) {
    return (
      <ErrorBoundary fallbackTitle="Indicator Settings Error" onReset={() => selectIndicator(null)}>
        <IndicatorSettings 
          indicator={selectedIndicator} 
          definition={definition} 
          onClose={() => selectIndicator(null)} 
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#131722]">
      <div className="flex border-b border-[#2a2e39]">
        <button
          onClick={() => setActiveTab('indicators')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'indicators' 
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]' 
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          Indicators
        </button>
        <button
          onClick={() => setActiveTab('signals')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'signals' 
              ? 'text-[#2962ff] border-b-2 border-[#2962ff]' 
              : 'text-[#787b86] hover:text-[#d1d4dc]'
          }`}
        >
          Signals
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'indicators' ? (
          <ErrorBoundary fallbackTitle="Indicator List Error">
            <IndicatorList />
          </ErrorBoundary>
        ) : (
          <ErrorBoundary fallbackTitle="Signal Panel Error">
            <SignalPanel />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
