import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { IconAlertCircle, IconX } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
  onConfirm,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-ink/40 backdrop-blur-sm z-50 animate-fade-in" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-tile rounded-tile border border-hairline p-6 shadow-xl z-50 focus:outline-none">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 border',
                isDestructive
                  ? 'bg-[#FBEAE5] text-rise border-[#F6D0C5]'
                  : 'bg-cocoa-wash text-cocoa border-hairline'
              )}
            >
              <IconAlertCircle size={20} />
            </div>
            <div className="flex-1">
              <Dialog.Title className="font-serif text-xl text-ink font-normal mb-1">
                {title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted leading-relaxed">
                {description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="text-muted hover:text-ink p-1 rounded-md transition-colors"
                aria-label="Close"
              >
                <IconX size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 rounded-md border border-hairline bg-tile hover:bg-cocoa-wash/30 text-ink text-xs font-medium transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className={cn(
                'px-4 py-2 rounded-md text-white text-xs font-medium transition-colors',
                isDestructive
                  ? 'bg-rise hover:bg-rise/90'
                  : 'bg-cocoa hover:bg-cocoa-deep'
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
