import React from 'react';
import { X } from 'lucide-react';
import { UploadDropzone } from './UploadDropzone.js';
import { DocumentItem } from '../types/index.js';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId?: string;
  onUploadSuccess: (doc: DocumentItem) => void;
}

export const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({
  isOpen,
  onClose,
  conversationId,
  onUploadSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white rounded-2xl border border-[#E9E8E2] shadow-panel w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#E9E8E2] flex items-center justify-between bg-[#FAF9F6]">
          <h3 className="text-sm font-semibold text-[#292B29]">Attach Research Document</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <UploadDropzone
            conversationId={conversationId}
            onUploadSuccess={(doc) => {
              onUploadSuccess(doc);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};
