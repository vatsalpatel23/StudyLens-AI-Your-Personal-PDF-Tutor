import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, BookOpen, Download, Search, Sparkles } from 'lucide-react';
import { Document, DocumentChunk } from '../types';
import { api } from '../services/api';

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
  const [searchQuery, setSearchQuery] = useState('');

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
  };

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800">
        <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
        <h4 className="text-base font-semibold text-slate-300">No Document Selected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Select an uploaded document from the left sidebar to preview pages and study side-by-side with your AI tutor.
        </p>
      </div>
    );
  }

  // Filter chunks for current page
  const pageChunks = chunks.filter((c) => c.page_number === currentPage);

  return (
    <div className="h-full flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <BookOpen className="w-4 h-4" />
            </span>
            <h3 className="text-sm font-bold text-slate-100 truncate max-w-[240px] sm:max-w-xs" title={document.title}>
              {document.title}
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {document.page_count} Pages · Grounded Study Material
          </p>
        </div>

        {/* Page Nav */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-800 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-semibold text-slate-300">
              Page {currentPage} of {document.page_count}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= document.page_count}
              className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 hover:bg-slate-800 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <a
            href={api.getDocumentDownloadUrl(document.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Download Original PDF"
          >
            <Download className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Page Content Viewer */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-500 gap-2">
            <span className="w-6 h-6 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
            <span className="text-xs">Loading page passages...</span>
          </div>
        ) : pageChunks.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 pb-2 border-b border-slate-800/80">
              <span className="font-semibold text-sky-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Verified Text from Page {currentPage}
              </span>
              <span>{pageChunks.length} indexed passage(s)</span>
            </div>

            {pageChunks.map((chunk, idx) => (
              <div
                key={chunk.id}
                className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 text-xs sm:text-sm leading-relaxed font-serif shadow-inner whitespace-pre-wrap select-text"
              >
                {chunk.content}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No selectable text extracted on Page {currentPage}.</p>
            <p className="text-xs text-slate-400 mt-1">This page may contain graphical diagrams or formulas.</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 bg-slate-950/50 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 px-4">
        <span>Click citation badges in chat to jump directly to source pages</span>
        <span className="font-mono text-slate-400">SHA256: {document.sha256_hash.substring(0, 10)}...</span>
      </div>
    </div>
  );
};
