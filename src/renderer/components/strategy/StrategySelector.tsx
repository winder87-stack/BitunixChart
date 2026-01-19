import { FC, useState } from 'react';
import { cn } from '@/lib/utils';
import { useStrategyStore } from '@/stores/strategyStore';
import { getAllStrategies } from '@/strategies';
import { ChevronDown, Settings, Check } from 'lucide-react';

interface StrategySelectorProps {
  currentTimeframe: string;
  className?: string;
}

export const StrategySelector: FC<StrategySelectorProps> = ({ 
  currentTimeframe,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    activeStrategyId, 
    enabled, 
    setStrategy, 
    setEnabled,
    applyTimeframeConfig 
  } = useStrategyStore();
  
  const strategies = getAllStrategies();
  const activeStrategy = strategies.find(s => s.info.id === activeStrategyId);
  
  const handleSelectStrategy = (strategyId: string) => {
    setStrategy(strategyId);
    applyTimeframeConfig(currentTimeframe);
    setIsOpen(false);
  };

  const toggleEnabled = () => {
    setEnabled(!enabled);
  };
  
  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg transition-all w-full',
          'bg-[#1e222d] border border-[#2a2e39] hover:border-[#3a3e49]',
          enabled ? 'text-[#d1d4dc]' : 'text-[#787b86]'
        )}
      >
        <span 
          className="w-6 h-6 rounded flex items-center justify-center text-sm"
          style={{ backgroundColor: `${activeStrategy?.info.color}20` }}
        >
          {activeStrategy?.info.icon}
        </span>
        
        <div className="text-left flex-1">
          <div className="text-sm font-medium">
            {activeStrategy?.info.shortName || 'Select Strategy'}
          </div>
          <div className="text-xs text-[#787b86] capitalize">
            {activeStrategy?.info.category}
          </div>
        </div>
        
        <ChevronDown 
          size={16} 
          className={cn('transition-transform', isOpen && 'rotate-180')} 
        />
        
        <div 
          className={cn(
            'w-2 h-2 rounded-full',
            enabled ? 'bg-[#26a69a]' : 'bg-[#787b86]'
          )}
        />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl z-50">
          <div className="p-3 border-b border-[#2a2e39]">
            <div className="text-sm font-medium text-[#d1d4dc]">Select Strategy</div>
            <div className="text-xs text-[#787b86]">
              {strategies.length} strategies available
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {strategies.map(strategy => {
              const isActive = strategy.info.id === activeStrategyId;
              const supportsTimeframe = strategy.info.timeframes.includes(currentTimeframe);
              
              return (
                <button
                  key={strategy.info.id}
                  onClick={() => handleSelectStrategy(strategy.info.id)}
                  className={cn(
                    'w-full p-3 flex items-start gap-3 hover:bg-[#2a2e39] transition-colors text-left',
                    isActive && 'bg-[#2a2e39]',
                    !supportsTimeframe && 'opacity-50'
                  )}
                >
                  <span 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${strategy.info.color}20` }}
                  >
                    {strategy.info.icon}
                  </span>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#d1d4dc] truncate">
                        {strategy.info.name}
                      </span>
                      {isActive && <Check size={14} className="text-[#26a69a]" />}
                    </div>
                    
                    <div className="text-xs text-[#787b86] mt-0.5 line-clamp-2">
                      {strategy.info.description}
                    </div>
                    
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] uppercase font-medium',
                        strategy.info.riskLevel === 'low' && 'bg-green-500/20 text-green-400',
                        strategy.info.riskLevel === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                        strategy.info.riskLevel === 'high' && 'bg-red-500/20 text-red-400',
                      )}>
                        {strategy.info.riskLevel} risk
                      </span>
                      
                      {supportsTimeframe ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#2962ff]/20 text-[#2962ff]">
                          ✓ {currentTimeframe}
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-[#787b86]/20 text-[#787b86]">
                          No {currentTimeframe}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          
          <div className="p-3 border-t border-[#2a2e39] flex items-center justify-between">
            <button
              onClick={toggleEnabled}
              className={cn(
                'px-3 py-1.5 rounded text-sm transition-colors font-medium',
                enabled 
                  ? 'bg-[#26a69a]/20 text-[#26a69a] hover:bg-[#26a69a]/30' 
                  : 'bg-[#787b86]/20 text-[#787b86] hover:bg-[#787b86]/30'
              )}
            >
              {enabled ? 'Enabled' : 'Disabled'}
            </button>
            
            <button
              onClick={() => {
                setIsOpen(false);
                useStrategyStore.getState().toggleConfigPanel();
              }}
              className="p-1.5 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors"
            >
              <Settings size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StrategySelector;
