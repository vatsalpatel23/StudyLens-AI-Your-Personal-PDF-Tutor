import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, HelpCircle, Sparkles, RefreshCw } from 'lucide-react';
import { Document, DocumentSummary } from '../types';
import { api } from '../services/api';

interface SummaryViewProps {
  document: Document | null;
  onAskQuestion: (question: string) => void;
  onError: (msg: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({ document, onAskQuestion, onError }) => {
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (document) {
      loadSummary(document.id);
    } else {
      setSummary(null);
    }
  }, [document]);

  const loadSummary = async (docId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getDocumentSummary(docId);
      setSummary(data);
    } catch (err: any) {
      onError(err.message || 'Failed to generate document summary.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
        <FileText className="w-12 h-12 text-slate-700 mb-3" />
        <h4 className="text-base font-semibold text-slate-300">No Document Selected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Select an uploaded document to generate an executive summary, key takeaways, and suggested study questions.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">StudyLens Executive Summary</h3>
            <p className="text-[10px] text-slate-400">Grounded analysis of {document.title}</p>
          </div>
        </div>

        <button
          onClick={() => loadSummary(document.id)}
          disabled={isLoading}
          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
          title="Regenerate Summary"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline text-[11px]">Refresh</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <span className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-xs">Synthesizing document takeaways & study questions...</p>
          </div>
        ) : summary ? (
          <>
            {/* Core Summary */}
            <div className="p-5 rounded-xl bg-slate-950/80 border border-slate-800 shadow-md">
              <h4 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" />
                Executive Summary
              </h4>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-serif whitespace-pre-line">
                {summary.summary}
              </p>
            </div>

            {/* Key Takeaways */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Key Takeaways & Core Concepts
              </h4>
              <div className="space-y-2">
                {summary.key_takeaways.map((takeaway, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs sm:text-sm text-slate-300 flex items-start gap-3"
                  >
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="leading-relaxed">{takeaway}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Questions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5" />
                Suggested Review Questions
              </h4>
              <div className="space-y-2">
                {summary.suggested_questions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => onAskQuestion(q)}
                    className="w-full text-left p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-purple-500/40 text-xs sm:text-sm text-slate-300 hover:text-purple-300 transition-all flex items-center justify-between gap-2 group"
                  >
                    <span>💬 {q}</span>
                    <span className="text-[11px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                      Ask Tutor →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">Summary could not be loaded.</p>
          </div>
        )}
      </div>
    </div>
  );
};
