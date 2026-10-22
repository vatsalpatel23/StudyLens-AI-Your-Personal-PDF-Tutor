import React, { useState, useEffect } from 'react';
import {
  FileText,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  ArrowRight,
  BookOpen,
} from 'lucide-react';
import { Document, DocumentSummary } from '../types';
import { api } from '../services/api';
import { EmptyState } from './EmptyState';

interface SummaryViewProps {
  document: Document | null;
  onAskQuestion: (question: string) => void;
  onError: (msg: string) => void;
}

export const SummaryView: React.FC<SummaryViewProps> = ({
  document,
  onAskQuestion,
  onError,
}) => {
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleCopySummary = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary.summary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API restricted
    }
  };

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-white rounded-2xl border border-paper-300 shadow-subtle">
        <EmptyState
          type="no-selection"
          title="No document selected"
          description="Choose a document from your library to generate an executive synthesis, core takeaways, and suggested discussion topics."
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-paper-300 shadow-subtle overflow-hidden">
      {/* Editorial Header */}
      <div className="px-6 py-4 border-b border-paper-200 bg-paper-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-light text-accent flex items-center justify-center border border-accent/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900 tracking-tight">
              Executive Summary & Study Guide
            </h3>
            <p className="text-xs text-ink-500 truncate max-w-sm sm:max-w-md">
              Grounded synthesis of <span className="font-medium text-ink-700">{document.title}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {summary && (
            <button
              onClick={handleCopySummary}
              className="p-1.5 rounded-lg text-ink-500 hover:text-ink-800 hover:bg-paper-200/70 text-xs flex items-center gap-1 transition-colors"
              title="Copy summary text"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-sage" />
                  <span className="hidden sm:inline text-xs text-sage font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-xs">Copy</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => loadSummary(document.id)}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-ink-500 hover:text-accent hover:bg-paper-200/70 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Regenerate Summary"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs">Refresh</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-7">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-500 gap-3">
            <span className="w-7 h-7 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-xs font-medium text-ink-600">
              Synthesizing key insights, themes, and study questions...
            </p>
          </div>
        ) : summary ? (
          <>
            {/* Core Executive Summary Card */}
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-ink-500 font-semibold flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-accent" />
                  Executive Synthesis
                </span>
                <span className="text-[11px] font-mono text-ink-400">
                  {summary.summary.split(/\s+/).length} words
                </span>
              </div>
              <div className="p-5 rounded-xl bg-paper-50 border border-paper-200">
                <p className="text-sm text-ink-800 leading-relaxed font-serif whitespace-pre-line selection:bg-accent-light">
                  {summary.summary}
                </p>
              </div>
            </section>

            {/* Key Takeaways */}
            {summary.key_takeaways && summary.key_takeaways.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-sage" />
                  <h4 className="text-xs font-mono uppercase tracking-wider text-ink-600 font-semibold">
                    Core Concepts & Takeaways
                  </h4>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {summary.key_takeaways.map((takeaway, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white border border-paper-200 hover:border-paper-300 text-xs sm:text-sm text-ink-800 flex items-start gap-3 shadow-sm transition-all"
                    >
                      <span className="w-5 h-5 rounded-full bg-sage-light text-sage-dark border border-sage/20 text-[11px] font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed font-sans">{takeaway}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Suggested Study & Discussion Questions */}
            {summary.suggested_questions && summary.suggested_questions.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-accent" />
                  <h4 className="text-xs font-mono uppercase tracking-wider text-ink-600 font-semibold">
                    Suggested Review Questions
                  </h4>
                </div>
                <p className="text-xs text-ink-500 -mt-1">
                  Click any question below to ask the AI Tutor and inspect verified page citations.
                </p>
                <div className="space-y-2">
                  {summary.suggested_questions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => onAskQuestion(q)}
                      className="w-full text-left p-3.5 rounded-xl bg-white hover:bg-paper-50 border border-paper-200 hover:border-accent/40 text-xs sm:text-sm text-ink-800 hover:text-accent-dark transition-all flex items-center justify-between gap-3 group shadow-sm hover-subtle-lift"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-accent text-xs font-mono font-semibold">
                          Q{idx + 1}
                        </span>
                        <span className="truncate">{q}</span>
                      </div>
                      <span className="text-[11px] text-accent font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <span>Ask Tutor</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-ink-400">
            <p className="text-sm">Summary could not be loaded.</p>
          </div>
        )}
      </div>
    </div>
  );
};
