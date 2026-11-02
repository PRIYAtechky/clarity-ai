import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  FileText,
  User,
  Copy,
  Check,
  BookmarkCheck,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Message, Citation } from '../types/index.js';

interface MessageItemProps {
  message: Message;
  onSelectCitation?: (citation: Citation) => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({ message, onSelectCitation }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyCode = (codeText: string, idx: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // Convert raw [[Doc: ..., Page: ...]] into clickable citation buttons
  const renderFormattedContent = (content: string) => {
    // We can replace [[Doc: <name>, Page: <page>]] with inline links or badges
    return content;
  };

  return (
    <div
      className={`py-4 px-4 sm:px-6 flex space-x-3 sm:space-x-4 ${
        isUser ? 'bg-transparent' : 'bg-white border-y border-[#E9E8E2]/60'
      }`}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        {isUser ? (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E9E8E2] text-[#292B29] flex items-center justify-center font-medium text-xs">
            <User className="w-4 h-4 text-[#777973]" />
          </div>
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F0F3ED] border border-[#E9E8E2] text-[#879783] flex items-center justify-center font-semibold text-xs shadow-subtle">
            <FileText className="w-4 h-4" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-[#292B29]">
              {isUser ? 'You' : 'Clarity AI'}
            </span>
            <span className="text-[10px] text-[#777973]">
              {new Date(message.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          {!isUser && (
            <button
              onClick={copyToClipboard}
              className="text-[#777973] hover:text-[#292B29] p-1 rounded transition-colors"
              title="Copy answer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Message Body */}
        {isUser ? (
          <div className="text-xs sm:text-sm text-[#292B29] leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="space-y-2">
            {message.content.startsWith('Error: ') ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 leading-relaxed">
                {message.content}
              </div>
            ) : message.content ? (
              <div className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      const codeString = String(children).replace(/\n$/, '');
                      const codeIdx = Math.random();

                      if (!inline) {
                        return (
                          <div className="relative my-3 rounded-xl border border-[#E9E8E2] bg-[#FAF9F6] overflow-hidden text-xs font-mono">
                            <div className="flex items-center justify-between px-3 py-1.5 bg-[#F0F3ED] border-b border-[#E9E8E2] text-[#777973] text-[11px]">
                              <span>{match ? match[1] : 'code'}</span>
                              <button
                                onClick={() => copyCode(codeString, codeIdx)}
                                className="flex items-center space-x-1 hover:text-[#292B29]"
                              >
                                {copiedCodeIndex === codeIdx ? (
                                  <>
                                    <Check className="w-3 h-3 text-green-600" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <div className="p-3 overflow-x-auto text-[#292B29]">
                              <code>{children}</code>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <code className="bg-[#F0F3ED] text-[#292B29] px-1.5 py-0.5 rounded text-[11px] font-mono" {...props}>
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {renderFormattedContent(message.content)}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="inline-block w-1.5 h-3.5 bg-[#879783] animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            ) : message.isStreaming ? (
              <div className="flex items-center space-x-2 py-1.5 text-xs text-[#777973]">
                <div className="flex space-x-1 items-center">
                  <span className="w-1.5 h-1.5 bg-[#879783] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#879783] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-[#879783] rounded-full animate-bounce"></span>
                </div>
                <span className="text-xs text-[#777973] italic">Clarity AI is analyzing documents & thinking...</span>
              </div>
            ) : null}

            {/* Citations Shelf */}
            {message.citations && message.citations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#E9E8E2] space-y-2">
                <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#777973] uppercase tracking-wider">
                  <BookmarkCheck className="w-3.5 h-3.5 text-[#879783]" />
                  <span>Verified Document Citations ({message.citations.length})</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {message.citations.map((c, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectCitation && onSelectCitation(c)}
                      className="flex items-start space-x-2 p-2.5 rounded-lg border border-[#E9E8E2] bg-[#FAF9F6] hover:bg-[#F0F3ED] hover:border-[#879783] transition-all text-left text-xs group"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#879783] flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#292B29] truncate max-w-[150px]">
                            {c.documentTitle}
                          </span>
                          <span className="text-[10px] text-[#777973] font-mono ml-1">
                            {c.pageNumber ? `p. ${c.pageNumber}` : c.sectionTitle || ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#777973] truncate mt-0.5">
                          {c.snippet}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-[#777973] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
