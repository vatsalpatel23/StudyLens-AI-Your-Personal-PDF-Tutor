import React from 'react';
import { BookOpen, UploadCloud, Search } from 'lucide-react';

interface EmptyStateProps {
  type: 'no-documents' | 'no-search' | 'no-selection';
  title?: string;
  description?: string;
  onAction?: () => void;
  searchQuery?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  title,
  description,
  onAction,
  searchQuery,
}) => {
  if (type === 'no-search') {
    return (
      <div className="py-12 px-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-paper-200 border border-paper-300 text-ink-500 mx-auto flex items-center justify-center mb-3">
          <Search className="w-5 h-5 text-ink-500" />
        </div>
        <h4 className="text-sm font-semibold text-ink-800">
          {title || 'No matching study notes'}
        </h4>
        <p className="text-xs text-ink-500 mt-1 max-w-xs mx-auto">
          {description ||
            `No documents found matching "${searchQuery}". Check spelling or clear your search query.`}
        </p>
      </div>
    );
  }

  if (type === 'no-selection') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-white rounded-xl border border-paper-300">
        <div className="w-16 h-16 rounded-2xl bg-paper-100 border border-paper-300 flex items-center justify-center mb-4 text-ink-400">
          <BookOpen className="w-8 h-8 text-ink-400 stroke-[1.5]" />
        </div>
        <h3 className="text-base font-semibold text-ink-800 font-serif">
          {title || 'Select a Study Document'}
        </h3>
        <p className="text-xs text-ink-500 mt-1.5 max-w-sm leading-relaxed">
          {description ||
            'Choose a document from your library on the left, or upload new lecture notes to start reading and chatting with verified citations.'}
        </p>
      </div>
    );
  }

  // Default: no-documents
  return (
    <div className="py-12 px-6 text-center border-2 border-dashed border-paper-300 rounded-xl bg-paper-50/60">
      <div className="w-14 h-14 rounded-2xl bg-accent-light border border-accent/20 flex items-center justify-center mx-auto mb-3.5 text-accent">
        <UploadCloud className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h3 className="text-sm font-semibold text-ink-900 font-serif">
        {title || 'Your Study Library is Empty'}
      </h3>
      <p className="text-xs text-ink-500 mt-1 max-w-xs mx-auto leading-relaxed">
        {description ||
          'Upload textbook chapters, lecture notes, or research papers in PDF format (up to 20 MB, 100 pages).'}
      </p>
      {onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-subtle transition-all hover-subtle-lift inline-flex items-center gap-1.5"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload First Document</span>
        </button>
      )}
    </div>
  );
};
