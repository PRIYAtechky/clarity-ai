import React, { useState } from 'react';
import {
  X,
  FileText,
  Sparkles,
  GitCompare,
  Trash2,
  BookmarkCheck,
  Check,
  AlertCircle,
  Loader2,
  Copy,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { DocumentItem, Citation } from '../types/index.js';
import { api } from '../api/client.js';

interface InsightsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onDeleteDocument: (id: string) => void;
  activeCitation: Citation | null;
  onClearActiveCitation: () => void;
  onSummarizeDocument: (id: string) => void;
  isSummarizing: boolean;
}

export const InsightsPanel: React.FC<InsightsPanelProps> = ({
  isOpen,
  onClose,
  documents,
  onDeleteDocument,
  activeCitation,
  onClearActiveCitation,
  onSummarizeDocument,
  isSummarizing,
}) => {
  const [activeTab, setActiveTab] = useState<'documents' | 'compare'>('documents');
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleSelectForCompare = (id: string) => {
    setSelectedForCompare(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleRunComparison = async () => {
    if (selectedForCompare.length < 2) {
      setCompareError('Select at least 2 documents to compare.');
      return;
    }

    setCompareError(null);
    setIsComparing(true);
    setComparisonResult(null);

    try {
      const res = await api.compareDocuments(selectedForCompare);
      setComparisonResult(res.comparison);
    } catch (err: any) {
      setCompareError(err.message || 'Comparison failed.');
    } finally {
      setIsComparing(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-full sm:w-96 md:w-[420px] bg-white border-l border-[#E9E8E2] shadow-panel z-30 flex flex-col justify-between transition-transform duration-300 ease-in-out select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#E9E8E2] flex items-center justify-between bg-[#FAF9F6]">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === 'documents'
                ? 'bg-white text-[#292B29] shadow-subtle border border-[#E9E8E2]'
                : 'text-[#777973] hover:text-[#292B29]'
            }`}
          >
            Documents ({documents.length})
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1.5 ${
              activeTab === 'compare'
                ? 'bg-white text-[#292B29] shadow-subtle border border-[#E9E8E2]'
                : 'text-[#777973] hover:text-[#292B29]'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-[#879783]" />
            <span>Compare</span>
          </button>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-[#777973] hover:text-[#292B29] hover:bg-[#F0F3ED] rounded-lg transition-colors"
          title="Close Panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Active Citation Inspector if active */}
        {activeCitation && (
          <div className="p-3.5 rounded-xl border border-[#879783] bg-[#F0F3ED] space-y-2 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#879783]">
                <BookmarkCheck className="w-4 h-4" />
                <span>Verified Source Passage</span>
              </div>
              <button
                onClick={onClearActiveCitation}
                className="text-[#777973] hover:text-[#292B29]"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs text-[#292B29] font-medium">
              {activeCitation.documentTitle}
              {activeCitation.pageNumber && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded bg-white border border-[#E9E8E2] text-[10px] text-[#777973] font-mono">
                  Page {activeCitation.pageNumber}
                </span>
              )}
            </div>

            <p className="text-xs text-[#292B29]/90 italic bg-white p-2.5 rounded-lg border border-[#E9E8E2] leading-relaxed">
              "{activeCitation.snippet}"
            </p>
          </div>
        )}

        {/* Tab 1: Documents */}
        {activeTab === 'documents' && (
          <div className="space-y-3">
            {documents.length === 0 ? (
              <div className="py-12 text-center text-[#777973] space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-40 text-[#777973]" />
                <p className="text-xs">No documents attached yet.</p>
                <p className="text-[11px]">Upload a PDF, Word, or Markdown file to begin.</p>
              </div>
            ) : (
              documents.map(doc => (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-xl border border-[#E9E8E2] bg-[#FAF9F6] space-y-2.5 transition-all hover:border-[#879783]"
                >
                  <div className="flex items-start justify-between space-x-2">
                    <div className="flex items-start space-x-2.5 min-w-0">
                      <div className="p-2 rounded-lg bg-white border border-[#E9E8E2] text-[#879783] flex-shrink-0 mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-[#292B29] truncate" title={doc.filename}>
                          {doc.filename}
                        </h4>
                        <div className="flex items-center space-x-2 text-[10px] text-[#777973] mt-0.5">
                          <span>{doc.page_count} page{doc.page_count === 1 ? '' : 's'}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Remove "${doc.filename}" from research?`)) {
                          onDeleteDocument(doc.id);
                        }
                      }}
                      className="text-[#777973] hover:text-red-600 p-1 rounded"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Status & Summary button */}
                  <div className="flex items-center justify-between pt-1 border-t border-[#E9E8E2]/60">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        doc.status === 'ready'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : doc.status === 'processing'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {doc.status.toUpperCase()}
                    </span>

                    <button
                      onClick={() => onSummarizeDocument(doc.id)}
                      disabled={isSummarizing || doc.status !== 'ready'}
                      className="flex items-center space-x-1 text-[11px] font-medium text-[#879783] hover:text-[#748570] disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Executive Summary</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Compare Multiple Documents */}
        {activeTab === 'compare' && (
          <div className="space-y-4">
            <div className="p-3 bg-[#FAF9F6] border border-[#E9E8E2] rounded-xl space-y-1">
              <h4 className="text-xs font-semibold text-[#292B29]">Select Documents to Compare</h4>
              <p className="text-[11px] text-[#777973]">
                Choose two or more documents to cross-examine agreements, contrasts, and metrics.
              </p>
            </div>

            <div className="space-y-2">
              {documents.map(d => {
                const checked = selectedForCompare.includes(d.id);
                return (
                  <label
                    key={d.id}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-all ${
                      checked
                        ? 'bg-[#F0F3ED] border-[#879783] text-[#292B29] font-medium'
                        : 'bg-white border-[#E9E8E2] text-[#777973] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectForCompare(d.id)}
                      className="rounded border-[#E9E8E2] text-[#879783] focus:ring-[#879783]"
                    />
                    <span className="truncate">{d.filename}</span>
                  </label>
                );
              })}
            </div>

            <button
              onClick={handleRunComparison}
              disabled={isComparing || selectedForCompare.length < 2}
              className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-[#879783] text-white text-xs font-medium hover:bg-[#748570] disabled:opacity-50 transition-all shadow-subtle"
            >
              {isComparing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Documents...</span>
                </>
              ) : (
                <>
                  <GitCompare className="w-4 h-4" />
                  <span>Run Comparative Analysis</span>
                </>
              )}
            </button>

            {compareError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{compareError}</span>
              </div>
            )}

            {comparisonResult && (
              <div className="pt-3 border-t border-[#E9E8E2] space-y-2">
                <h4 className="text-xs font-semibold text-[#292B29]">Comparison Report</h4>
                <div className="markdown-body p-3 bg-[#FAF9F6] border border-[#E9E8E2] rounded-xl text-xs max-h-96 overflow-y-auto">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {comparisonResult}
                  </ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
