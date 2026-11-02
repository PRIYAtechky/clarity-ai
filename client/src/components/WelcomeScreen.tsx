import React from 'react';
import { Sparkles, FileSearch, BarChart2, GitCompare, ArrowRight } from 'lucide-react';
import { UploadDropzone } from './UploadDropzone.js';
import { DocumentItem } from '../types/index.js';

interface WelcomeScreenProps {
  conversationId?: string;
  documents: DocumentItem[];
  onUploadSuccess: (doc: DocumentItem) => void;
  onSelectPrompt: (prompt: string) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  conversationId,
  documents,
  onUploadSuccess,
  onSelectPrompt,
}) => {
  const starterPrompts = [
    {
      title: 'Executive Summary',
      description: 'Generate a structured high-level summary with key takeaways and conclusions.',
      prompt: 'Provide a structured executive summary of the uploaded document(s), highlighting the primary thesis, methodology, and key takeaways.',
      icon: Sparkles,
    },
    {
      title: 'Key Statistics & Metrics',
      description: 'Extract critical figures, dates, percentages, and financial data into a table.',
      prompt: 'Extract all key statistics, numerical findings, percentages, and benchmarks mentioned in the document into a Markdown table with exact citations.',
      icon: BarChart2,
    },
    {
      title: 'Key Findings & Definitions',
      description: 'Unpack the core technical findings and terminology defined in the text.',
      prompt: 'List the most important findings and technical definitions established in this document, citing each page or section accurately.',
      icon: FileSearch,
    },
    {
      title: 'Multi-Document Comparison',
      description: 'Compare agreements, contrasts, and discrepancies across multiple sources.',
      prompt: 'Compare the uploaded documents side-by-side: outline shared conclusions, key contradictions, and contrasting methodologies.',
      icon: GitCompare,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 md:py-12 flex flex-col items-center justify-center max-w-4xl mx-auto space-y-8 select-none">
      {/* Title & Tagline */}
      <div className="text-center space-y-3 max-w-xl">
        <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#F0F3ED] border border-[#E9E8E2] text-[#879783] text-xs font-medium mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Grounded Gemini Intelligence</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold text-[#292B29] tracking-tight">
          What would you like to research today?
        </h1>
        <p className="text-xs md:text-sm text-[#777973] leading-relaxed">
          Upload research papers, reports, or transcripts to extract verifiable citations,
          synthesize multiple documents, and query your knowledge base with zero hallucination.
        </p>
      </div>

      {/* Upload Dropzone */}
      <div className="w-full max-w-xl">
        <UploadDropzone
          conversationId={conversationId}
          onUploadSuccess={onUploadSuccess}
        />
      </div>

      {/* Starter Research Prompts */}
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between text-xs text-[#777973] px-1 font-medium">
          <span>Quick Research Starters</span>
          {documents.length > 0 && (
            <span className="text-[#879783]">
              {documents.length} document{documents.length === 1 ? '' : 's'} available
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {starterPrompts.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => onSelectPrompt(item.prompt)}
                className="flex items-start space-x-3.5 p-4 rounded-xl border border-[#E9E8E2] bg-white text-left hover:border-[#879783] hover:bg-[#F0F3ED]/40 transition-all shadow-subtle group"
              >
                <div className="p-2 rounded-lg bg-[#F0F3ED] text-[#879783] group-hover:bg-[#879783] group-hover:text-white transition-colors flex-shrink-0 mt-0.5">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold text-[#292B29] truncate">{item.title}</h3>
                    <ArrowRight className="w-3.5 h-3.5 text-[#777973] opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="text-[11px] text-[#777973] mt-1 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
