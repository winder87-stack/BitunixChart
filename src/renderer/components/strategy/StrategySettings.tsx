import * as Dialog from '@radix-ui/react-dialog';
import { StrategyConfigPanel } from './StrategyConfigPanel';
import { X } from 'lucide-react';

export const StrategySettings = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-[400px] bg-[#1e222d] border border-[#2a2e39] rounded-lg shadow-xl z-50 max-h-[85vh] flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2">
          <div className="flex items-center justify-between p-4 border-b border-[#2a2e39]">
            <Dialog.Title className="text-sm font-medium text-[#d1d4dc]">
              Strategy Settings
            </Dialog.Title>
            <button 
              onClick={onClose}
              className="p-1 rounded hover:bg-[#2a2e39] text-[#787b86] hover:text-[#d1d4dc] transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <StrategyConfigPanel className="border-0" />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
