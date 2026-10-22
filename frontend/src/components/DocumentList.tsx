import React from 'react';
import { FileText, Trash2, Calendar, Layers, HardDrive } from 'lucide-react';
import { Document } from '../types';

interface DocumentListProps {
  documents: Document[];
  selectedDocumentId: string | null;
  onSelectDocument: (doc: Document) => void;
  onDeleteDocument: (docId: string) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  selectedDocumentId,
  onSelectDocument,
  onDeleteDocument,
}) => {
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

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 px-4 rounded-2xl bg-slate-900/40 border border-slate-800/80">
        <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-400">No documents uploaded yet</p>
        <p className="text-xs text-slate-400 mt-1">Upload a PDF above to begin tutoring</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
      {documents.map((doc) => {
        const isSelected = doc.id === selectedDocumentId;
        return (
          <div
            key={doc.id}
            onClick={() => onSelectDocument(doc)}
            className={`group relative p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              isSelected
                ? 'bg-sky-500/10 border-sky-500/40 shadow-md shadow-sky-500/5'
                : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`p-2 rounded-lg flex-shrink-0 ${
                  isSelected ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h5 className="text-xs font-semibold text-slate-200 truncate group-hover:text-white" title={doc.title}>
                  {doc.title}
                </h5>
                <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-500" />
                    {doc.page_count} pages
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-slate-500" />
                    {formatBytes(doc.file_size_bytes)}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    {formatDate(doc.created_at)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${doc.title}" and all its study sessions?`)) {
                  onDeleteDocument(doc.id);
                }
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
              title="Delete Document"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
