/**
 * Indicator Settings Panel
 * 
 * Dynamic settings form for configuring indicator parameters and styles.
 * Uses react-hook-form for state management and validation.
 */

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useIndicatorStore } from '../../stores/indicatorStore';
import type { 
  IndicatorConfig, 
  IndicatorDefinition, 
  ParamDefinition 
} from '../../types/indicators';
// cn removed as unused locally (Button handles class merging)
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Slider } from '../ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

// =============================================================================
// Types
// =============================================================================

interface IndicatorSettingsProps {
  indicator: IndicatorConfig;
  definition: IndicatorDefinition;
  onClose: () => void;
}

type FormData = Record<string, number | string | boolean>;

// =============================================================================
// Components
// =============================================================================

const BackIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const DuplicateIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ResetIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

// =============================================================================
// Helper Components for Inputs
// =============================================================================

interface InputWrapperProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

const InputWrapper: React.FC<InputWrapperProps> = ({ label, description, children }) => (
  <div className="mb-4">
    <div className="flex justify-between items-center mb-1.5">
      <label className="text-xs font-medium text-text-primary">{label}</label>
    </div>
    {children}
    {description && (
      <p className="mt-1 text-[10px] text-text-secondary">{description}</p>
    )}
  </div>
);

// =============================================================================
// Main Component
// =============================================================================

export const IndicatorSettings: React.FC<IndicatorSettingsProps> = ({
  indicator,
  definition,
  onClose,
}) => {
  // Store actions
  const { 
    updateIndicatorParams, 
    updateIndicatorStyle, 
    removeIndicator, 
    duplicateIndicator,
    resetIndicatorParams
  } = useIndicatorStore();

  // Form setup
  const { control, watch, reset } = useForm<FormData>({
    defaultValues: {
      ...indicator.params,
      // Style props flattened for form
      color: indicator.style.color,
      lineWidth: indicator.style.lineWidth,
      opacity: indicator.style.opacity,
      lineStyle: indicator.style.lineStyle || 'solid',
    },
    mode: 'onChange',
  });

  // Watch for changes and update store (debounced)
  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (!name) return;
      
      // Separate params from style
      const styleKeys = ['color', 'lineWidth', 'opacity', 'lineStyle'];
      
      if (styleKeys.includes(name)) {
        updateIndicatorStyle(indicator.id, { [name]: value[name] });
      } else {
        // It's a param
        updateIndicatorParams(indicator.id, { [name]: value[name] });
      }
    });
    
    return () => subscription.unsubscribe();
  }, [watch, indicator.id, updateIndicatorParams, updateIndicatorStyle]);

  // Handle indicator removal
  const handleDelete = () => {
    removeIndicator(indicator.id);
    onClose();
  };

  // Handle duplication
  const handleDuplicate = () => {
    duplicateIndicator(indicator.id);
    onClose();
  };

  // Handle reset
  const handleReset = () => {
    resetIndicatorParams(indicator.id);
    // Also reset form values
    reset({
      ...definition.defaultParams,
      color: indicator.style.color, // Keep current color
      lineWidth: 2,
      opacity: 1,
      lineStyle: 'solid',
    });
  };

  // Group params by group property
  const groupedParams = React.useMemo(() => {
    const groups: Record<string, ParamDefinition[]> = {
      'Inputs': [],
    };
    
    definition.paramDefinitions.forEach(param => {
      const groupName = param.group || 'Inputs';
      if (!groups[groupName]) {
        groups[groupName] = [];
      }
      groups[groupName].push(param);
    });
    
    return groups;
  }, [definition.paramDefinitions]);

  return (
    <div className="flex flex-col h-full bg-background border-l border-border w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between h-12 px-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-8 w-8 text-text-secondary hover:text-text-primary"
          >
            <BackIcon />
          </Button>
          <h2 className="text-sm font-medium text-text-primary">{definition.name}</h2>
        </div>
        
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDuplicate}
            className="h-8 w-8 text-text-secondary hover:text-text-primary hover:bg-accent"
            title="Duplicate"
          >
            <DuplicateIcon />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleDelete}
            className="h-8 w-8 text-text-secondary hover:text-destructive hover:bg-accent"
            title="Remove"
          >
            <TrashIcon />
          </Button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        
        {/* Style Section */}
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
            Style
          </h3>
          
          {/* Color & Opacity */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label className="text-xs font-medium text-text-primary mb-1.5 block">Color</label>
              <Controller
                name="color"
                control={control}
                render={({ field }) => (
                  <div className="flex items-center gap-2 h-8 bg-surface border border-border rounded px-2">
                    <input
                      type="color"
                      {...field}
                      value={field.value as string}
                      className="w-6 h-6 border-0 p-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs text-text-primary font-mono">{field.value}</span>
                  </div>
                )}
              />
            </div>
            
            <div className="flex-1">
              <label className="text-xs font-medium text-text-primary mb-1.5 block">Opacity</label>
              <Controller
                name="opacity"
                control={control}
                render={({ field }) => (
                  <div className="h-8 flex items-center px-1">
                    <Slider
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={[field.value as number]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="w-full"
                    />
                  </div>
                )}
              />
            </div>
          </div>
          
          {/* Line Width & Style */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-text-primary mb-1.5 block">Thickness</label>
              <Controller
                name="lineWidth"
                control={control}
                render={({ field }) => (
                  <Select
                    value={String(field.value)}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select width" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Thin (1px)</SelectItem>
                      <SelectItem value="2">Normal (2px)</SelectItem>
                      <SelectItem value="3">Thick (3px)</SelectItem>
                      <SelectItem value="4">Heavy (4px)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            
            <div className="flex-1">
              <label className="text-xs font-medium text-text-primary mb-1.5 block">Style</label>
              <Controller
                name="lineStyle"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value as string}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Select style" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Parameters Sections */}
        {Object.entries(groupedParams).map(([groupName, params]) => (
          <div key={groupName} className="mb-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              {groupName}
            </h3>
            
            {params.map(param => (
              <InputWrapper 
                key={param.key} 
                label={param.label} 
                description={param.description}
              >
                <Controller
                  name={param.key}
                  control={control}
                  render={({ field }) => {
                    if (param.type === 'number') {
                      return (
                        <Input
                          type="number"
                          {...field}
                          value={field.value as number}
                          onChange={(e) => field.onChange(parseFloat(e.target.value))}
                          min={param.min}
                          max={param.max}
                          step={param.step || 1}
                          className="h-8 text-sm"
                        />
                      );
                    }
                    
                    if (param.type === 'select') {
                      return (
                        <Select
                          value={String(field.value)}
                          onValueChange={(val) => {
                            // Check if original options were numbers
                            const isNumber = typeof param.options?.[0]?.value === 'number';
                            field.onChange(isNumber ? Number(val) : val);
                          }}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder="Select option" />
                          </SelectTrigger>
                          <SelectContent>
                            {param.options?.map(opt => (
                              <SelectItem key={opt.value} value={String(opt.value)}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      );
                    }
                    
                    if (param.type === 'boolean') {
                      return (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-primary">
                            {field.value ? 'Enabled' : 'Disabled'}
                          </span>
                          <Switch
                            checked={field.value as boolean}
                            onCheckedChange={field.onChange}
                          />
                        </div>
                      );
                    }
                    
                    return <div />;
                  }}
                />
              </InputWrapper>
            ))}
          </div>
        ))}
        
        {/* Additional Outputs Styling (if defined) */}
        {definition.outputDefinitions && definition.outputDefinitions.length > 1 && (
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">
              Output Colors
            </h3>
            <div className="space-y-3">
              {definition.outputDefinitions.map(output => (
                <div key={output.key} className="flex items-center justify-between">
                  <span className="text-xs text-text-primary">{output.name}</span>
                  <div className="w-6 h-6 rounded border border-border" 
                       style={{ backgroundColor: output.color }}>
                    {/* Note: Individual output color editing not implemented in simple form */}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-text-secondary mt-2">
              * Individual output styling requires advanced settings
            </p>
          </div>
        )}
        
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-border bg-background">
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex items-center justify-center gap-2 w-full bg-surface hover:bg-accent text-text-primary border-border"
        >
          <ResetIcon />
          <span>Reset to Defaults</span>
        </Button>
      </div>
    </div>
  );
};

export default IndicatorSettings;
