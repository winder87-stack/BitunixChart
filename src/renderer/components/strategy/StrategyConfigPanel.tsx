import { useState, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { useStrategyStore } from '../../stores/strategyStore';
import type { StrategyConfig } from '../../types/strategy';
import type { SignalStrength } from '../../types/quadStochastic';
import { Save, Trash2, Check, X } from 'lucide-react';

function SectionHeader({ title, isOpen, onClick }: { title: string; isOpen: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center justify-between px-3 py-2 text-xs font-medium uppercase tracking-wider',
        'bg-[#1e222d] hover:bg-[#2a2e39] transition-colors border-b border-[#2a2e39]',
        isOpen ? 'text-[#d1d4dc]' : 'text-[#787b86]'
      )}
    >
      {title}
      <svg
        className={cn('w-4 h-4 transition-transform', isOpen ? 'rotate-180' : '')}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

function NumberInput({ 
  label, 
  value, 
  onChange, 
  step = 0.1, 
  min, 
  max,
  suffix 
}: { 
  label: string; 
  value: number; 
  onChange: (val: number) => void;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <label className="text-xs text-[#787b86]">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          step={step}
          min={min}
          max={max}
          className="w-16 px-2 py-1 text-right text-xs bg-[#131722] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
        />
        {suffix && <span className="text-xs text-[#787b86] w-4">{suffix}</span>}
      </div>
    </div>
  );
}

function SelectInput({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (val: string) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <label className="text-xs text-[#787b86]">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-2 py-1 text-xs bg-[#131722] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleInput({
  label,
  value,
  onChange
}: {
  label: string;
  value: boolean;
  onChange: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <label className="text-xs text-[#787b86]">{label}</label>
      <button
        onClick={() => onChange(!value)}
        className={cn(
          'relative w-8 h-4 rounded-full transition-colors',
          value ? 'bg-[#26a69a]' : 'bg-[#2a2e39]'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform',
            value ? 'left-4.5 translate-x-0.5' : 'left-0.5'
          )}
        />
      </button>
    </div>
  );
}

export function StrategyConfigPanel({ className }: { className?: string }) {
  const { activeConfig, updateConfig, resetConfig, presets, activePresetId, loadPreset, savePreset, deletePreset } = useStrategyStore();
  const [openSection, setOpenSection] = useState<string | null>('rules');
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const handleSavePreset = () => {
    if (newPresetName.trim()) {
      savePreset(newPresetName.trim());
      setNewPresetName('');
      setShowSaveInput(false);
    }
  };

  const handleUpdate = useCallback((section: keyof StrategyConfig, key: string, value: any) => {
    updateConfig({
      [section]: {
        ...activeConfig[section],
        [key]: value
      }
    });
  }, [activeConfig, updateConfig]);

  return (
    <div className={cn('flex flex-col border border-[#2a2e39] rounded-lg overflow-hidden', className)}>
      <div className="p-3 bg-[#1e222d] border-b border-[#2a2e39] space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-medium text-[#d1d4dc]">Configuration</h3>
          <button 
            onClick={resetConfig}
            className="text-xs text-[#2962ff] hover:text-[#2962ff]/80 transition-colors"
          >
            Reset Default
          </button>
        </div>

        {/* Presets Section */}
        <div className="flex items-center gap-2">
          {showSaveInput ? (
            <div className="flex-1 flex items-center gap-1">
              <input
                type="text"
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Preset Name"
                className="flex-1 px-2 py-1 text-xs bg-[#131722] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSavePreset();
                  if (e.key === 'Escape') setShowSaveInput(false);
                }}
              />
              <button 
                onClick={handleSavePreset}
                className="p-1 hover:bg-[#2a2e39] rounded text-[#26a69a]"
              >
                <Check size={14} />
              </button>
              <button 
                onClick={() => setShowSaveInput(false)}
                className="p-1 hover:bg-[#2a2e39] rounded text-[#ef5350]"
              >
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <select
                value={activePresetId || ''}
                onChange={(e) => {
                  if (e.target.value) loadPreset(e.target.value);
                }}
                className="flex-1 px-2 py-1 text-xs bg-[#131722] border border-[#2a2e39] rounded text-[#d1d4dc] focus:outline-none focus:border-[#2962ff]"
              >
                <option value="">Custom Configuration</option>
                {presets.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setShowSaveInput(true)}
                className="p-1.5 hover:bg-[#2a2e39] rounded text-[#787b86] hover:text-[#d1d4dc]"
                title="Save Preset"
              >
                <Save size={14} />
              </button>
              {activePresetId && (
                <button 
                  onClick={() => deletePreset(activePresetId)}
                  className="p-1.5 hover:bg-[#2a2e39] rounded text-[#787b86] hover:text-[#ef5350]"
                  title="Delete Preset"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <SectionHeader 
        title="Signal Rules" 
        isOpen={openSection === 'rules'} 
        onClick={() => toggleSection('rules')} 
      />
      {openSection === 'rules' && (
        <div className="p-3 bg-[#131722]">
          <NumberInput
            label="Min Confidence"
            value={activeConfig.signalRules.minConfirmationScore}
            onChange={(v) => handleUpdate('signalRules', 'minConfirmationScore', v)}
            step={1}
            min={0}
            max={10}
          />
          <SelectInput
            label="Min Strength"
            value={activeConfig.signalRules.minStrength}
            options={[
              { label: 'WEAK', value: 'WEAK' },
              { label: 'MODERATE', value: 'MODERATE' },
              { label: 'STRONG', value: 'STRONG' },
              { label: 'SUPER', value: 'SUPER' },
            ]}
            onChange={(v) => handleUpdate('signalRules', 'minStrength', v as SignalStrength)}
          />
          <ToggleInput
            label="Require MTF Align"
            value={activeConfig.signalRules.requireMTFAlignment}
            onChange={(v) => handleUpdate('signalRules', 'requireMTFAlignment', v)}
          />
          <NumberInput
            label="Max Signals"
            value={activeConfig.signalRules.maxSignalsPerSymbol}
            onChange={(v) => handleUpdate('signalRules', 'maxSignalsPerSymbol', v)}
            step={1}
            min={1}
            max={5}
          />
        </div>
      )}

      <SectionHeader 
        title="Risk Management" 
        isOpen={openSection === 'risk'} 
        onClick={() => toggleSection('risk')} 
      />
      {openSection === 'risk' && (
        <div className="p-3 bg-[#131722]">
          <NumberInput
            label="Risk Per Trade"
            value={activeConfig.risk.riskPerTrade}
            onChange={(v) => handleUpdate('risk', 'riskPerTrade', v)}
            suffix="%"
          />
          <NumberInput
            label="Max Daily Loss"
            value={activeConfig.risk.maxDailyLoss}
            onChange={(v) => handleUpdate('risk', 'maxDailyLoss', v)}
            suffix="%"
          />
          <SelectInput
            label="Stop Method"
            value={activeConfig.risk.defaultStopMethod}
            options={[
              { label: 'ATR', value: 'ATR' },
              { label: 'Swing High/Low', value: 'SWING' },
              { label: 'Percentage', value: 'PERCENT' },
              { label: 'Fixed Amount', value: 'FIXED' },
            ]}
            onChange={(v) => handleUpdate('risk', 'defaultStopMethod', v)}
          />
          <NumberInput
            label="Stop Multiplier"
            value={activeConfig.risk.stopMultiplier}
            onChange={(v) => handleUpdate('risk', 'stopMultiplier', v)}
            step={0.1}
          />
        </div>
      )}

      <SectionHeader 
        title="Targets & Exits" 
        isOpen={openSection === 'targets'} 
        onClick={() => toggleSection('targets')} 
      />
      {openSection === 'targets' && (
        <div className="p-3 bg-[#131722]">
          <div className="mb-2">
            <h4 className="text-[10px] text-[#787b86] uppercase mb-1">Target 1</h4>
            <NumberInput
              label="Risk Ratio"
              value={activeConfig.targets.target1RR}
              onChange={(v) => handleUpdate('targets', 'target1RR', v)}
              suffix="R"
            />
            <NumberInput
              label="Exit Amount"
              value={activeConfig.targets.target1ExitPercent}
              onChange={(v) => handleUpdate('targets', 'target1ExitPercent', v)}
              suffix="%"
            />
          </div>
          <div className="mb-2 pt-2 border-t border-[#2a2e39]">
            <h4 className="text-[10px] text-[#787b86] uppercase mb-1">Target 2</h4>
            <NumberInput
              label="Risk Ratio"
              value={activeConfig.targets.target2RR}
              onChange={(v) => handleUpdate('targets', 'target2RR', v)}
              suffix="R"
            />
            <NumberInput
              label="Exit Amount"
              value={activeConfig.targets.target2ExitPercent}
              onChange={(v) => handleUpdate('targets', 'target2ExitPercent', v)}
              suffix="%"
            />
          </div>
          <div className="pt-2 border-t border-[#2a2e39]">
            <ToggleInput
              label="Use Trailing Stop"
              value={activeConfig.targets.useTrailingStop}
              onChange={(v) => handleUpdate('targets', 'useTrailingStop', v)}
            />
            {activeConfig.targets.useTrailingStop && (
              <SelectInput
                label="Trailing Method"
                value={activeConfig.targets.trailingMethod}
                options={[
                  { label: 'Moving Avg (MA20)', value: 'MA20' },
                  { label: 'ATR', value: 'ATR' },
                  { label: 'Percentage', value: 'PERCENT' },
                ]}
                onChange={(v) => handleUpdate('targets', 'trailingMethod', v)}
              />
            )}
          </div>
        </div>
      )}

      <SectionHeader 
        title="Filters" 
        isOpen={openSection === 'filters'} 
        onClick={() => toggleSection('filters')} 
      />
      {openSection === 'filters' && (
        <div className="p-3 bg-[#131722]">
          <NumberInput
            label="Min 24h Vol"
            value={activeConfig.filters.minVolume24h}
            onChange={(v) => handleUpdate('filters', 'minVolume24h', v)}
            step={1000000}
            suffix="$"
          />
          <ToggleInput
            label="Avoid News"
            value={activeConfig.filters.avoidNews}
            onChange={(v) => handleUpdate('filters', 'avoidNews', v)}
          />
        </div>
      )}
    </div>
  );
}
