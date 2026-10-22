import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Download,
  Search,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  Hash,
} from 'lucide-react';
import { Document, DocumentChunk } from '../types';
import { api } from '../services/api';
import { EmptyState } from './EmptyState';

interface PdfPreviewProps {
  document: Document | null;
  targetPage: number | null;
  onPageChange?: (page: number) => void;
}

export const PdfPreview: React.FC<PdfPreviewProps> = ({
  document,
  targetPage,
  onPageChange,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fontSizeLevel, setFontSizeLevel] = useState<'normal' | 'large' | 'larger'>('normal');
  const [highlightPage, setHighlightPage] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document) {
      loadDocumentDetails(document.id);
      setCurrentPage(1);
    } else {
      setChunks([]);
    }
  }, [document]);

  useEffect(() => {
    if (targetPage && document && targetPage >= 1 && targetPage <= document.page_count) {
      setCurrentPage(targetPage);
      setHighlightPage(targetPage);
      // Trigger flash animation
      const timer = setTimeout(() => setHighlightPage(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [targetPage, document]);

  const loadDocumentDetails = async (docId: string) => {
    setIsLoading(true);
    try {
      const detail = await api.getDocumentDetail(docId);
      setChunks(detail.chunks || []);
    } catch {
      setChunks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const setPage = (page: number) => {
    if (!document) return;
    const clamped = Math.max(1, Math.min(page, document.page_count));
    setCurrentPage(clamped);
    onPageChange?.(clamped);
    containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!document) {
    return <EmptyState type="no-selection" />;
  }

  // Filter chunks for current page
  const pageChunks = chunks.filter((c) => c.page_number === currentPage);

  const fontClass = {
    normal: 'text-sm leading-relaxed',
    large: 'text-base leading-loose',
    larger: 'text-lg leading-loose',
  }[fontSizeLevel];

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-paper-300 shadow-card overflow-hidden">
      {/* Top Reading Toolbar */}
      <div className="px-4 py-2.5 border-b border-paper-300 bg-paper-50/70 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-paper-200 border border-paper-300 flex items-center justify-center text-ink-600 flex-shrink-0">
            <BookOpen className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-ink-900 truncate max-w-[200px] sm:max-w-xs" title={document.title}>
              {document.title}
            </h3>
            <p className="text-[10px] text-ink-500">
              {document.page_count} Pages · Grounded Study Excerpts
            </p>
          </div>
        </div>

        {/* Navigation & Display Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom / Font Size Selector */}
          <div className="hidden sm:flex items-center rounded-lg bg-white border border-paper-300 p-0.5 text-xs text-ink-600">
            <button
              onClick={() => setFontSizeLevel('normal')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                fontSizeLevel === 'normal' ? 'bg-paper-200 text-ink-900 font-semibold' : 'hover:text-ink-900'
              }`}
              title="Standard Font Size"
            >
              A
            </button>
            <button
              onClick={() => setFontSizeLevel('large')}
              className={`px-2 py-0.5 rounded text-[12px] font-medium transition-colors ${
                fontSizeLevel === 'large' ? 'bg-paper-200 text-ink-900 font-semibold' : 'hover:text-ink-900'
              }`}
              title="Large Font Size"
            >
              A+
            </button>
          </div>

          {/* Page Navigator */}
          <div className="flex items-center bg-white border border-paper-300 rounded-lg p-0.5 text-xs text-ink-700 shadow-subtle">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              aria-label="Previous Page"
              className="p-1 rounded text-ink-500 hover:text-ink-900 hover:bg-paper-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-medium font-mono text-ink-800">
              {currentPage} / {document.page_count}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= document.page_count}
              aria-label="Next Page"
              className="p-1 rounded text-ink-500 hover:text-ink-900 hover:bg-paper-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Download Original PDF */}
          <a
            href={api.getDocumentDownloadUrl(document.id)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download Original PDF"
            className="p-1.5 rounded-lg bg-white border border-paper-300 text-ink-600 hover:text-ink-900 hover:bg-paper-100 shadow-subtle transition-colors"
            title="Download Original PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Reading Canvas */}
      <div ref={containerRef} className="flex-1 p-6 sm:p-8 overflow-y-auto space-y-5 bg-paper-50/30">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-56 text-ink-400 gap-2.5">
            <span className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <span className="text-xs">Extracting verified page passages...</span>
          </div>
        ) : pageChunks.length > 0 ? (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center justify-between text-xs text-ink-500 pb-2 border-b border-paper-300">
              <span className="font-semibold text-accent flex items-center gap-1.5 font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                Page {currentPage} Verified Excerpts
              </span>
              <span className="text-[11px] text-ink-400">
                {pageChunks.length} indexed passage(s)
              </span>
            </div>

            {pageChunks.map((chunk, idx) => {
              const isFlashed = highlightPage === currentPage;
              return (
                <article
                  key={chunk.id}
                  className={`p-6 rounded-xl bg-white border border-paper-300 shadow-card transition-all ${
                    isFlashed ? 'citation-flash' : ''
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-paper-200 text-[10px] text-ink-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-ink-400" />
                      Passage {chunk.chunk_index + 1}
                    </span>
                    <span>~{chunk.token_count} words</span>
                  </div>

                  <div className={`font-serif text-ink-800 whitespace-pre-wrap select-text ${fontClass}`}>
                    {chunk.content}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 text-ink-400 max-w-sm mx-auto">
            <BookOpen className="w-8 h-8 text-ink-300 mx-auto mb-2.5 stroke-[1.5]" />
            <p className="text-xs font-medium text-ink-600">No selectable digital text on Page {currentPage}</p>
            <p className="text-[11px] text-ink-400 mt-1">
              This page may contain formulas, illustrations, or graphical scans.
            </p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-white border-t border-paper-200 flex items-center justify-between text-[11px] text-ink-500">
        <span className="flex items-center gap-1 text-ink-400">
          💡 Clicking citations in Chat jumps here directly
        </span>
        <span className="font-mono text-ink-400 text-[10px]">
          SHA256: {document.sha256_hash.substring(0, 10)}...
        </span>
      </div>
    </div>
  );
};
