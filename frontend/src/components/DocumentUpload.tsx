import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
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
      onError('Invalid format. Please upload standard PDF documents (.pdf).');
      return;
    }

    const MAX_SIZE = 20 * 1024 * 1024; // 20 MB
    if (file.size > MAX_SIZE) {
      onError('File exceeds maximum upload size of 20 MB.');
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
      onError(err.message || 'Upload failed. Please ensure the document is a readable, unprotected PDF.');
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
      onClick={() => fileInputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
        isDragging
          ? 'border-accent bg-accent-light/50'
          : 'border-paper-300 hover:border-paper-400 bg-white hover:bg-paper-50/50 shadow-subtle'
      }`}
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

      <div className="flex flex-col items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-paper-100 border border-paper-300 flex items-center justify-center text-accent">
          {isUploading ? (
            <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin block" />
          ) : (
            <UploadCloud className="w-5 h-5 stroke-[1.75]" />
          )}
        </div>

        <div>
          <h4 className="text-xs font-semibold text-ink-900">
            {isUploading ? 'Inspecting & Indexing PDF Chunks...' : 'Import Study Material'}
          </h4>
          <p className="text-[11px] text-ink-500 mt-0.5">
            Drag & drop PDF here, or click to browse (Max 20 MB · 100 pages)
          </p>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-ink-400">
          <FileText className="w-3 h-3 text-ink-400" />
          <span>Lecture slides, textbook chapters, research papers, exam guides</span>
        </div>
      </div>
    </div>
  );
};
