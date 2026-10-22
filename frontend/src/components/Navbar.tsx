import React from 'react';
import {
  BookOpen,
  MessageSquare,
  FileText,
  Layers,
  Award,
  UploadCloud,
  LogIn,
  LogOut,
  User as UserIcon,
  ChevronRight,
} from 'lucide-react';
import { User, Document, StudyMode } from '../types';
import { SecurityBadge } from './SecurityBadge';

interface NavbarProps {
  user: User | null;
  selectedDocument: Document | null;
  activeMode: StudyMode;
  onSelectMode: (mode: StudyMode) => void;
  onOpenUpload: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  selectedDocument,
  activeMode,
  onSelectMode,
  onOpenUpload,
  onOpenAuth,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-sm border-b border-paper-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand & Context Breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-white shadow-subtle">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif font-bold text-base tracking-tight text-ink-900">
                StudyLens
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent-light text-accent-dark border border-accent/20">
                AI
              </span>
            </div>
          </div>

          {selectedDocument && (
            <div className="hidden md:flex items-center gap-1.5 text-xs text-ink-500 pl-3 border-l border-paper-300 min-w-0">
              <span className="text-ink-400">Library</span>
              <ChevronRight className="w-3.5 h-3.5 text-ink-400 flex-shrink-0" />
              <span className="font-medium text-ink-800 truncate max-w-[220px]" title={selectedDocument.title}>
                {selectedDocument.title}
              </span>
            </div>
          )}
        </div>

        {/* Center: Segmented Study Mode Switcher (Visible on desktop/tablet) */}
        <div className="hidden lg:flex items-center gap-1 p-1 rounded-xl bg-paper-100 border border-paper-300">
          <button
            onClick={() => onSelectMode('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'chat'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900 hover:bg-paper-200/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Tutor</span>
          </button>

          <button
            onClick={() => onSelectMode('summary')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'summary'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900 hover:bg-paper-200/60'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Summary</span>
          </button>

          <button
            onClick={() => onSelectMode('flashcards')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'flashcards'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900 hover:bg-paper-200/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Flashcards</span>
          </button>

          <button
            onClick={() => onSelectMode('quiz')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'quiz'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900 hover:bg-paper-200/60'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Practice Quiz</span>
          </button>
        </div>

        {/* Right: Actions & User Account */}
        <div className="flex items-center gap-2.5">
          <SecurityBadge />

          {user && (
            <button
              onClick={onOpenUpload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-medium shadow-subtle transition-all hover-subtle-lift"
              title="Upload PDF Document"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Upload PDF</span>
            </button>
          )}

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-paper-300">
              <div className="w-7 h-7 rounded-full bg-paper-200 border border-paper-300 flex items-center justify-center text-ink-700 text-xs font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-md text-ink-500 hover:text-crimson hover:bg-crimson-light transition-colors"
                title="Log Out"
                aria-label="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-ink-900 hover:bg-ink-800 text-white text-xs font-semibold shadow-subtle transition-all"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
