/**
 * Sidebar Component
 * 
 * Right sidebar container that manages:
 * - Indicator List (default view)
 * - Indicator Settings (when an indicator is selected)
 */

import React from 'react';
import { useIndicatorStore } from '../../stores/indicatorStore';
import { getIndicatorDefinition } from '../../services/indicators/definitions';
import { IndicatorList } from './IndicatorList';
import { IndicatorSettings } from './IndicatorSettings';

export const Sidebar: React.FC = () => {
  const { selectedIndicatorId, getIndicator, selectIndicator } = useIndicatorStore();
  
  // Determine content based on selection
  const selectedIndicator = selectedIndicatorId ? getIndicator(selectedIndicatorId) : undefined;
  const definition = selectedIndicator ? getIndicatorDefinition(selectedIndicator.type) : undefined;

  // Show settings if an indicator is selected and valid
  if (selectedIndicator && definition) {
    return (
      <IndicatorSettings 
        indicator={selectedIndicator} 
        definition={definition} 
        onClose={() => selectIndicator(null)} 
      />
    );
  }

  // Otherwise show the list
  return <IndicatorList />;
};

export default Sidebar;
