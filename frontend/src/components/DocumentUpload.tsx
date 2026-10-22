import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Document } from '../types';

interface DocumentUploadProps {
  onUploadSuccess: (newDoc: Document) => void;
  onError: (msg: string) => void;
}

export const DocumentUpload: React.FC<DocumentUploadProps> = ({ onUploadSuccess, onError }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Client-side pre-validation
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      onError('Invalid file format. Only standard PDF documents (.pdf) are permitted.');
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_SIZE) {
      onError('Document exceeds maximum allowed upload size of 20 MB.');
      return;
    }

    if (file.size === 0) {
      onError('Selected file is empty (0 bytes).');
      return;
    }

    setIsUploading(true);
    try {
      const doc = await api.uploadDocument(file);
      onUploadSuccess(doc);
    } catch (err: any) {
      onError(err.message || 'Upload failed. Please ensure the document is a valid readable PDF.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-sky-400 bg-sky-500/10'
          : 'border-slate-800 hover:border-slate-700 bg-slate-900/60'
      }`}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      <div className="flex flex-col items-center gap-3">
        <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
          {isUploading ? (
            <span className="w-6 h-6 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin block" />
          ) : (
            <UploadCloud className="w-6 h-6" />
          )}
        </div>

        <div>
          <h4 className="text-sm font-semibold text-slate-200">
            {isUploading ? 'Validating & Indexing Document...' : 'Upload PDF Study Material'}
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            Drag & drop or click to browse (Max 20 MB · Up to 100 pages)
          </p>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <FileText className="w-3.5 h-3.5" />
          <span>Lecture notes, textbooks, study guides, research papers</span>
        </div>
      </div>
    </div>
  );
};
