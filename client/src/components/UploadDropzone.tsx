import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api/client.js';
import { DocumentItem } from '../types/index.js';

interface UploadDropzoneProps {
  conversationId?: string;
  onUploadSuccess: (doc: DocumentItem) => void;
  compact?: boolean;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  conversationId,
  onUploadSuccess,
  compact = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check extension
    const allowed = ['.pdf', '.docx', '.txt', '.md'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setErrorMessage(
        `Unsupported file type "${ext}". Please upload a PDF, DOCX, TXT, or Markdown (.md) file.`
      );
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setErrorMessage(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Limit is 25 MB.`);
      return;
    }

    setErrorMessage(null);
    setUploading(true);
    setProgress(0);
    setStatusMessage('Uploading document...');

    try {
      const result = await api.uploadDocument(file, conversationId, (pct) => {
        setProgress(pct);
        if (pct === 100) {
          setStatusMessage('Parsing pages and indexing research chunks...');
        }
      });

      setStatusMessage('Document ready for research!');
      onUploadSuccess(result.document);
    } catch (err: any) {
      setErrorMessage(err.message || 'Upload failed.');
    } finally {
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        setStatusMessage('');
      }, 1500);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
          compact ? 'p-4' : 'p-8 sm:p-12'
        } ${
          isDragging
            ? 'border-[#879783] bg-[#F0F3ED] scale-[1.01]'
            : 'border-[#E9E8E2] bg-white hover:border-[#879783] hover:bg-[#FAF9F6]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
          disabled={uploading}
        />

        <div className="flex flex-col items-center justify-center text-center space-y-3">
          {uploading ? (
            <div className="flex flex-col items-center space-y-3 w-full max-w-xs">
              <Loader2 className="w-8 h-8 text-[#879783] animate-spin" />
              <div className="w-full bg-[#E9E8E2] rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-[#879783] h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs font-medium text-[#292B29]">{statusMessage}</p>
              <span className="text-[11px] text-[#777973]">{progress}%</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-[#F0F3ED] border border-[#E9E8E2] flex items-center justify-center text-[#879783]">
                <UploadCloud className="w-6 h-6" />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#292B29]">
                  {compact ? 'Upload a document' : 'Drag and drop your research document'}
                </p>
                <p className="text-xs text-[#777973] mt-1">
                  Supports <span className="font-medium text-[#292B29]">PDF, DOCX, TXT, MD</span> up to 25 MB
                </p>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <span className="text-[11px] px-2.5 py-1 rounded-md bg-[#FAF9F6] border border-[#E9E8E2] text-[#777973] font-mono">
                  .PDF
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-md bg-[#FAF9F6] border border-[#E9E8E2] text-[#777973] font-mono">
                  .DOCX
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-md bg-[#FAF9F6] border border-[#E9E8E2] text-[#777973] font-mono">
                  .MD
                </span>
                <span className="text-[11px] px-2.5 py-1 rounded-md bg-[#FAF9F6] border border-[#E9E8E2] text-[#777973] font-mono">
                  .TXT
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error state */}
      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start space-x-2 text-red-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
