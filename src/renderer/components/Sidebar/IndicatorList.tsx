/**
 * Indicator List Component
 * 
 * Lists active indicators and allows adding new ones.
 */

import React, { useState, useMemo } from 'react';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { 
  INDICATORS_BY_CATEGORY, 
  getIndicatorDefinition 
} from '../../services/indicators/definitions';
import type { IndicatorCategory, IndicatorType } from '../../types/indicators';
import { cn } from '../../lib/utils';
import { Input } from '../ui/input';
import { getAllStrategies, getStrategy } from '../../strategies';
import { useStrategyStore } from '../../stores/strategyStore';
import { StrategySettings } from '../strategy/StrategySettings';
import { Settings, ChevronDown, EyeOff } from 'lucide-react';

// =============================================================================
// Icons
// =============================================================================

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

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
// Component
// =============================================================================

export const IndicatorList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    active: true,
    trend: true,
    momentum: true,
    volatility: true,
    volume: true,
    custom: true,
  });
  
  // Strategy state
  const [strategiesExpanded, setStrategiesExpanded] = useState(true);
  const [showStrategySettings, setShowStrategySettings] = useState(false);
  const { activeStrategyId, setStrategy: setActiveStrategy, enabled, setEnabled: setStrategyEnabled, activeIndicators } = useStrategyStore();
  const strategies = getAllStrategies();
  const activeStrategy = activeStrategyId ? getStrategy(activeStrategyId) : null;

  const { 
    activeIndicators: manualIndicators, 
    addIndicator,
    removeIndicator, 
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

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    const categories: IndicatorCategory[] = ['trend', 'momentum', 'volatility', 'volume', 'custom'];
    if (!searchQuery.trim()) return categories;

    const lowerQuery = searchQuery.toLowerCase();
    return categories.filter(cat => {
      const indicators = INDICATORS_BY_CATEGORY[cat];
      return indicators.some(ind => 
        ind.name.toLowerCase().includes(lowerQuery) || 
        ind.shortName.toLowerCase().includes(lowerQuery)
      );
    });
  }, [searchQuery]);

  // Filter indicators within categories
  const getFilteredIndicators = (cat: IndicatorCategory) => {
    const indicators = INDICATORS_BY_CATEGORY[cat];
    if (!searchQuery.trim()) return indicators;

    const lowerQuery = searchQuery.toLowerCase();
    return indicators.filter(ind => 
      ind.name.toLowerCase().includes(lowerQuery) || 
      ind.shortName.toLowerCase().includes(lowerQuery)
    );
  };

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-[300px]">
      {/* Header */}
      <div className="flex flex-col gap-2 px-4 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-text-primary">Indicators</h2>
        <div className="relative">
          <SearchIcon />
          <div className="absolute left-2.5 top-2.5 text-text-secondary pointer-events-none">
          </div>
          <Input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search indicators..." 
            className="h-8 pl-8 text-xs bg-surface border-input focus:ring-1 focus:ring-primary"
          />
          <div className="absolute left-2.5 top-2.5 text-text-secondary pointer-events-none">
            
          </div>
          <div className="absolute left-2 top-2 text-text-secondary">
             <SearchIcon />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
        <div className="mb-4">
          <button 
            onClick={() => toggleCategory('active')}
            className="flex items-center w-full gap-2 p-2 text-xs font-semibold text-text-secondary uppercase tracking-wider hover:text-text-primary transition-colors"
          >
            <ChevronRightIcon expanded={expandedCategories['active']} />
            <span>Active ({(enabled && activeStrategy ? activeIndicators.length : 0) + manualIndicators.length}/10)</span>
          </button>
          
          {expandedCategories['active'] && (
            <div className="mt-1 space-y-1">
              {/* Show active strategy first */}
              {enabled && activeStrategy && (
                <div className="flex flex-col bg-surface rounded mb-1 border-l-2" style={{ borderColor: activeStrategy.info.color }}>
                  <div className="flex items-center justify-between px-2 py-2 group">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-lg shrink-0">
                        {activeStrategy.info.icon}
                      </span>
                      <span className="text-sm text-text-primary font-medium truncate">
                        {activeStrategy.info.shortName || activeStrategy.info.name}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowStrategySettings(true)}
                        className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-border"
                        title="Settings"
                      >
                        <Settings size={14} />
                      </button>
                      <button
                        onClick={() => setStrategyEnabled(false)}
                        className="p-1.5 text-text-secondary hover:text-text-primary rounded hover:bg-border"
                        title="Disable Strategy"
                      >
                        <EyeOff size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Strategy Indicators List */}
                  {activeIndicators.map((ind, idx) => (
                    <div 
                      key={ind.id}
                      className={cn(
                        "flex items-center justify-between px-3 py-1.5 text-xs bg-background/50 hover:bg-background transition-colors",
                        idx === activeIndicators.length - 1 && "rounded-b"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ind.style.kLine?.color || ind.style.color }}
                        />
                        <span className="text-text-secondary w-16 truncate">{ind.shortName}</span>
                        {ind.isPrimary && (
                          <span className="px-1 py-0.5 text-[9px] bg-accent/20 text-accent rounded uppercase font-bold tracking-wider">PRIMARY</span>
                        )}
                        {ind.isHTFProxy && (
                          <span className="px-1 py-0.5 text-[9px] bg-[#e91e63]/20 text-[#e91e63] rounded uppercase font-bold tracking-wider">HTF</span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-secondary opacity-70 font-mono">
                        ({ind.params.kPeriod},{ind.params.dPeriod},{ind.params.smooth})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {manualIndicators.length === 0 && (!enabled || !activeStrategy) ? (
                <div className="px-6 py-2 text-xs text-text-secondary italic">
                  No active indicators
                </div>
              ) : (
                manualIndicators.map((ind) => {
                  const def = getIndicatorDefinition(ind.type);
                  return (
                    <div
                      key={ind.id}
                      className="flex items-center justify-between px-2 py-2 hover:bg-surface rounded group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-primary">
                          {def ? def.shortName : ind.type}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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

        {/* Strategies Section */}
        <section className="mb-2">
          <div 
            className="flex items-center justify-between px-2 py-2 cursor-pointer hover:bg-surface rounded transition-colors"
            onClick={() => setStrategiesExpanded(!strategiesExpanded)}
          >
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
              Strategies
            </span>
            <ChevronDown className={cn(
              'w-4 h-4 text-text-secondary transition-transform',
              strategiesExpanded && 'rotate-180'
            )} />
          </div>
          
          {strategiesExpanded && (
            <div className="px-2 pb-2 space-y-1">
              {strategies.map(strategy => (
                <div
                  key={strategy.info.id}
                  onClick={() => setActiveStrategy(strategy.info.id)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded cursor-pointer transition-colors border',
                    activeStrategyId === strategy.info.id 
                      ? 'bg-accent/20 border-accent/50' 
                      : 'border-transparent hover:bg-surface'
                  )}
                >
                  <span 
                    className="w-8 h-8 rounded flex items-center justify-center text-lg shrink-0"
                    style={{ backgroundColor: `${strategy.info.color}20`, color: strategy.info.color }}
                  >
                    {strategy.info.icon}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-text-primary font-medium truncate">
                        {strategy.info.name}
                      </span>
                      {activeStrategyId === strategy.info.id && enabled && (
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse shrink-0" />
                      )}
                    </div>
                    <span className="text-[10px] text-text-secondary truncate block">
                      {strategy.info.category} • {strategy.info.timeframes.join(', ')}
                    </span>
                  </div>
                  
                  {activeStrategyId === strategy.info.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowStrategySettings(true);
                      }}
                      className="p-1.5 rounded hover:bg-background shrink-0"
                    >
                      <Settings size={14} className="text-text-secondary hover:text-text-primary" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Add Indicators Section */}
        {filteredCategories.map(cat => {
           const indicators = getFilteredIndicators(cat);
           if (indicators.length === 0) return null;

           return (
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
                  {indicators.map(def => (
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
          );
        })}
      </div>

      <StrategySettings 
        isOpen={showStrategySettings} 
        onClose={() => setShowStrategySettings(false)} 
      />
    </div>
  );
};

export default IndicatorList;
