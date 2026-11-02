import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Paperclip, Square, Filter } from 'lucide-react';
import { DocumentItem } from '../types/index.js';

interface ComposerProps {
  onSend: (message: string, targetDocIds?: string[]) => void;
  onStop: () => void;
  onAttachClick: () => void;
  isStreaming: boolean;
  documents: DocumentItem[];
}

export const Composer: React.FC<ComposerProps> = ({
  onSend,
  onStop,
  onAttachClick,
  isStreaming,
  documents,
}) => {
  const [text, setText] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string>('all');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (!text.trim() || isStreaming) return;
    const targetIds = selectedDocId === 'all' ? undefined : [selectedDocId];
    onSend(text.trim(), targetIds);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  return (
    <div className="p-3 sm:p-4 bg-[#FAF9F6] border-t border-[#E9E8E2] select-none">
      <div className="max-w-4xl mx-auto space-y-2">
        {/* Document target selector pill if documents exist */}
        {documents.length > 0 && (
          <div className="flex items-center space-x-2 text-[11px] text-[#777973] px-1">
            <Filter className="w-3 h-3 text-[#879783]" />
            <span>Search scope:</span>
            <select
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
              className="bg-white border border-[#E9E8E2] text-[#292B29] rounded-md px-2 py-0.5 text-[11px] focus:outline-none focus:border-[#879783]"
            >
              <option value="all">All Documents ({documents.length})</option>
              {documents.map(d => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Input Card */}
        <div className="relative flex items-end rounded-2xl bg-white border border-[#E9E8E2] shadow-subtle focus-within:border-[#879783] focus-within:ring-1 focus-within:ring-[#879783]/20 transition-all p-2">
          {/* Attach file button */}
          <button
            onClick={onAttachClick}
            type="button"
            className="p-2 rounded-xl text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] transition-colors flex-shrink-0"
            title="Attach research document"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              documents.length > 0
                ? 'Ask a question, request statistics, or compare findings...'
                : 'Upload a document or ask research questions...'
            }
            className="flex-1 bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-[#292B29] placeholder-[#777973] resize-none focus:outline-none max-h-44 leading-relaxed"
          />

          {/* Action button: Send or Stop */}
          <div className="flex-shrink-0 ml-1">
            {isStreaming ? (
              <button
                onClick={onStop}
                type="button"
                className="p-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors shadow-subtle"
                title="Stop generation"
              >
                <Square className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                type="button"
                className={`p-2 rounded-xl transition-all shadow-subtle ${
                  text.trim()
                    ? 'bg-[#879783] text-white hover:bg-[#748570] active:scale-95'
                    : 'bg-[#E9E8E2] text-[#777973] cursor-not-allowed opacity-60'
                }`}
                title="Send message (Enter)"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-[#777973]">
            Clarity AI provides grounded citations from your documents. Always verify critical facts.
          </p>
        </div>
      </div>
    </div>
  );
};
