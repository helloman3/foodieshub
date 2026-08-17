import React from 'react';

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  icon?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmModalProps {
  dialog: ConfirmDialogState | null;
  onClose: () => void;
}

export default function ConfirmModal({ dialog, onClose }: ConfirmModalProps) {
  if (!dialog || !dialog.isOpen) return null;

  const handleConfirm = () => {
    dialog.onConfirm();
    onClose();
  };

  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel();
    onClose();
  };

  return (
    <div
      id="confirm-modal-backdrop"
      className="fixed inset-0 bg-black/45 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-fade-in font-sans"
      onClick={handleCancel}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white border border-border-light rounded-3xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-4 animate-scale-up overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              dialog.isDestructive ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">
              {dialog.icon || (dialog.isDestructive ? 'delete_forever' : 'help_outline')}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-base font-extrabold font-display text-on-surface leading-snug">
              {dialog.title}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1.5 leading-relaxed">
              {dialog.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-2 pt-3 border-t border-border-light/60">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2.5 rounded-xl border border-outline-variant/70 text-xs font-bold text-on-surface hover:bg-surface-container transition-colors cursor-pointer active:scale-95"
          >
            {dialog.cancelLabel || 'Keep Order'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95 flex items-center gap-1.5 ${
              dialog.isDestructive
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-primary hover:bg-surface-tint text-on-primary'
            }`}
          >
            <span>{dialog.confirmLabel || 'Confirm'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
