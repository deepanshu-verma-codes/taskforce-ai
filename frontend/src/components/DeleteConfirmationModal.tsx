import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2 } from 'lucide-react';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  problemTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  problemTitle,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isDeleting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-[#0b0e11]/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      onClick={e => {
        if (e.target === e.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-md bg-white dark:bg-[#1e2329] border border-[#eaecef] dark:border-[#2b3139] rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all">
        {/* Header */}
        <div className="p-4 border-b border-[#eaecef] dark:border-[#2b3139] flex items-center justify-between bg-white dark:bg-[#1e2329]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#f6465d]/15 text-[#f6465d] flex items-center justify-center shrink-0">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#181a20] dark:text-white">Delete Problem</h3>
              <p className="text-[11px] text-[#707a8a]">Permanent removal from swarm floor</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-1.5 rounded-md text-[#707a8a] hover:text-[#181a20] dark:hover:text-white hover:bg-[#f5f5f5] dark:hover:bg-[#2b3139] transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3.5 bg-white dark:bg-[#1e2329]">
          <div className="p-3.5 rounded-lg bg-[#fff5f5] dark:bg-[#2b1f24] border border-[#fed7d7] dark:border-[#f6465d]/30 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-[#f6465d] shrink-0 mt-0.5" />
            <div className="text-xs text-[#181a20] dark:text-[#eaecef] space-y-1">
              <p className="font-semibold text-[#f6465d]">This action cannot be undone.</p>
              <p className="text-[#707a8a] dark:text-[#929aa5] leading-relaxed">
                All specialist agent deliverables, event logs, LangSmith trace references, and evaluation scorecards for this problem will be permanently deleted.
              </p>
            </div>
          </div>

          <div>
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#707a8a]">Target Problem:</span>
            <p className="mt-1 text-xs font-semibold text-[#181a20] dark:text-white bg-[#f8f9fa] dark:bg-[#12161c] p-2.5 rounded-lg border border-[#eaecef] dark:border-[#2b3139] line-clamp-2">
              "{problemTitle}"
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t border-[#eaecef] dark:border-[#2b3139] bg-[#f8f9fa] dark:bg-[#181d24] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold rounded-md border border-[#eaecef] dark:border-[#2b3139] hover:bg-[#eaecef] dark:hover:bg-[#2b3139] text-[#707a8a] hover:text-[#181a20] dark:hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md bg-[#f6465d] hover:bg-[#d9384f] text-white transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Problem</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
