/**
 * Indicator List Component
 * 
 * Lists active indicators and allows adding new ones.
 */

import React, { useState } from 'react';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { 
  INDICATORS_BY_CATEGORY, 
  getIndicatorDefinition 
} from '../../services/indicators/definitions';
import type { IndicatorCategory, IndicatorType } from '../../types/indicators';
import { cn } from '../../lib/utils';

// =============================================================================
// Icons
// =============================================================================

const AddIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const ChevronRightIcon = ({ expanded }: { expanded: boolean }) => (
  <svg 
    className={cn("w-3 h-3 transition-transform", expanded ? "rotate-90" : "")} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const VisibleIcon = ({ visible }: { visible: boolean }) => (
  visible ? (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg className="w-3.5 h-3.5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  )
);

const SettingsIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export const IndicatorList: React.FC = () => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    active: true,
    trend: true,
  });
  
  const { 
    activeIndicators, 
    addIndicator, 
    removeIndicator, 
    toggleIndicatorVisibility, 
    selectIndicator,
    canAddMore
  } = useIndicatorStore();

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const handleAdd = (type: IndicatorType) => {
    addIndicator(type);
  };

  // Group definitions for the add menu
  const categories: IndicatorCategory[] = ['trend', 'momentum', 'volatility', 'volume', 'custom'];

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border">
        <h2 className="text-sm font-medium text-text-primary">Indicators</h2>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        {/* Active Indicators Section */}
        <div className="mb-4">
          <button 
            onClick={() => toggleCategory('active')}
            className="flex items-center w-full gap-2 p-2 text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors"
          >
            <ChevronRightIcon expanded={expandedCategories['active']} />
            <span>Active ({activeIndicators.length})</span>
          </button>
          
          {expandedCategories['active'] && (
            <div className="mt-1 space-y-1">
              {activeIndicators.length === 0 ? (
                <div className="px-6 py-2 text-xs text-text-secondary italic">
                  No active indicators
                </div>
              ) : (
                activeIndicators.map(ind => {
                  const def = getIndicatorDefinition(ind.type);
                  return (
                    <div 
                      key={ind.id}
                      className="flex items-center justify-between p-2 rounded hover:bg-surface group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-1 h-8 rounded-full" 
                          style={{ backgroundColor: ind.style.color }} 
                        />
                        <div className="flex flex-col">
                          <span className="text-sm text-text-primary">{def?.name}</span>
                          <span className="text-[10px] text-text-secondary">
                            {ind.type} {ind.params.period ? `(${ind.params.period})` : ''}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleIndicatorVisibility(ind.id)}
                          className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-border"
                          title={ind.visible ? "Hide" : "Show"}
                        >
                          <VisibleIcon visible={ind.visible} />
                        </button>
                        <button
                          onClick={() => selectIndicator(ind.id)}
                          className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-border"
                          title="Settings"
                        >
                          <SettingsIcon />
                        </button>
                        <button
                          onClick={() => removeIndicator(ind.id)}
                          className="p-1.5 text-text-secondary hover:text-danger rounded hover:bg-border"
                          title="Remove"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="w-full h-px bg-border my-2" />

        {/* Add Indicators Section */}
        {categories.map(cat => (
          <div key={cat}>
            <button 
              onClick={() => toggleCategory(cat)}
              className="flex items-center w-full gap-2 p-2 text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors"
            >
              <ChevronRightIcon expanded={expandedCategories[cat]} />
              <span>{cat}</span>
            </button>
            
            {expandedCategories[cat] && (
              <div className="mt-1 pl-4 space-y-1">
                {INDICATORS_BY_CATEGORY[cat].map(def => (
                  <button
                    key={def.type}
                    onClick={() => handleAdd(def.type)}
                    disabled={!canAddMore()}
                    className={cn(
                      "flex items-center justify-between w-full p-2 text-left rounded text-xs transition-colors",
                      !canAddMore() 
                        ? "opacity-50 cursor-not-allowed text-text-secondary" 
                        : "hover:bg-surface text-text-primary hover:text-white"
                    )}
                  >
                    <span>{def.name}</span>
                    <span className="opacity-0 group-hover:opacity-100 text-primary">
                      <AddIcon />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default IndicatorList;
