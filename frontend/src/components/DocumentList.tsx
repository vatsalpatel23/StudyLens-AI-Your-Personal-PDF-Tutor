import React, { useState } from 'react';
import { FileText, Trash2, Calendar, Layers, HardDrive, Search, X } from 'lucide-react';
import { Document } from '../types';
import { EmptyState } from './EmptyState';

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (docId: string) => void;
  onUploadClick?: () => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
  onUploadClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Recent';
    }
  };

  const filteredDocs = documents.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  if (documents.length === 0) {
    return <EmptyState type="no-documents" onAction={onUploadClick} />;
  }

  return (
    <div className="space-y-3">
      {/* Search Input Filter */}
      {documents.length > 3 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-ink-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter library..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-paper-50 border border-paper-300 rounded-lg text-ink-800 placeholder-ink-400 focus:outline-none focus:border-accent focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-2 p-0.5 rounded text-ink-400 hover:text-ink-600"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {filteredDocs.length === 0 ? (
        <EmptyState type="no-search" searchQuery={searchQuery} />
      ) : (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filteredDocs.map((doc) => {
            const isSelected = doc.id === selectedDocumentId;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc)}
                className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-accent-light/60 border-accent/40 shadow-subtle'
                    : 'bg-white border-paper-300 hover:border-paper-400 hover:bg-paper-50/70 shadow-subtle'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-accent text-white shadow-subtle'
                        : 'bg-paper-100 text-ink-500 group-hover:text-ink-800 border border-paper-200'
                    }`}
                  >
                    <FileText className="w-4 h-4 stroke-[1.75]" />
                  </div>
                  <div className="min-w-0">
                    <h5
                      className={`text-xs font-medium truncate ${
                        isSelected ? 'text-accent-dark font-semibold' : 'text-ink-900 group-hover:text-ink-950'
                      }`}
                      title={doc.title}
                    >
                      {doc.title}
                    </h5>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-ink-500">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3 h-3 text-ink-400" />
                        {doc.page_count} pages
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3 h-3 text-ink-400" />
                        {formatBytes(doc.file_size_bytes)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-ink-400" />
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Delete "${doc.title}" and associated study history?`)) {
                      onDeleteDocument(doc.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-ink-400 hover:text-crimson hover:bg-crimson-light opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
                  title="Delete Document"
                  aria-label={`Delete ${doc.title}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
