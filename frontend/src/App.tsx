import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  FileText,
  Layers,
  Award,
  BookOpen,
  UploadCloud,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { User, Document, StudyMode } from './types';
import { api } from './services/api';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { DocumentUpload } from './components/DocumentUpload';
import { DocumentList } from './components/DocumentList';
import { PdfPreview } from './components/PdfPreview';
import { ChatTutor } from './components/ChatTutor';
import { SummaryView } from './components/SummaryView';
import { FlashcardsView } from './components/FlashcardsView';
import { QuizView } from './components/QuizView';
import { Toast, ToastProps } from './components/Toast';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeMode, setActiveMode] = useState<StudyMode>('chat');
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [leftTab, setLeftTab] = useState<'preview' | 'documents'>('preview');

  // Load current user profile on startup
  useEffect(() => {
    if (api.getToken()) {
      api
        .getMe()
        .then((user) => {
          setCurrentUser(user);
          loadDocuments();
        })
        .catch(() => {
          api.setToken(null);
          setCurrentUser(null);
        });
    }

    const handleUnauthorized = () => {
      setCurrentUser(null);
      setDocuments([]);
      setSelectedDocument(null);
      setToast({
        message: 'Your session has expired. Please sign in again.',
        type: 'info',
      });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !selectedDocument) {
        setSelectedDocument(docs[0]);
      }
    } catch {
      setDocuments([]);
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    loadDocuments();
    setToast({
      message: `Welcome, ${user.name}! Authenticated with Argon2id.`,
      type: 'success',
    });
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setDocuments([]);
    setSelectedDocument(null);
    setToast({
      message: 'Successfully logged out. Access token has been revoked.',
      type: 'info',
    });
  };

  const handleUploadSuccess = (newDoc: Document) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocument(newDoc);
    setLeftTab('preview');
    setToast({
      message: `"${newDoc.title}" uploaded and indexed successfully!`,
      type: 'success',
    });
  };

  const handleDeleteDocument = async (docId: string) => {
    try {
      await api.deleteDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocument?.id === docId) {
        const remaining = documents.filter((d) => d.id !== docId);
        setSelectedDocument(remaining.length > 0 ? remaining[0] : null);
      }
      setToast({
        message: 'Document and vector records deleted successfully.',
        type: 'success',
      });
    } catch (err: any) {
      setToast({
        message: err.message || 'Failed to delete document',
        type: 'error',
      });
    }
  };

  const handleSelectPage = (page: number) => {
    setTargetPage(page);
    setLeftTab('preview');
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 font-sans">
      {/* Top Navbar */}
      <Navbar
        user={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {/* If user is not logged in banner */}
        {!currentUser && (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-sky-950/60 to-indigo-950/60 border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Guest Session Mode</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Sign in or create a student account to save notes, isolate private study files, and track learning progress.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-lg shadow-sky-600/20 flex-shrink-0"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* 2-Column Split Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[640px]">
          {/* Left Column (5 Cols on Large screens): Upload, Document List & PDF Page Preview */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Upload Zone */}
            {currentUser && (
              <DocumentUpload
                onUploadSuccess={handleUploadSuccess}
                onError={(msg) => setToast({ message: msg, type: 'error' })}
              />
            )}

            {/* Left Tabs (Preview vs Documents) */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLeftTab('preview')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                    leftTab === 'preview'
                      ? 'bg-slate-800 text-sky-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Document Viewer
                </button>
                <button
                  onClick={() => setLeftTab('documents')}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all ${
                    leftTab === 'documents'
                      ? 'bg-slate-800 text-sky-400 border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  My Documents ({documents.length})
                </button>
              </div>

              {selectedDocument && leftTab === 'preview' && (
                <button
                  onClick={() => setLeftTab('documents')}
                  className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1"
                >
                  <span>Switch Doc</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Left Content Area */}
            <div className="flex-1 min-h-[460px]">
              {leftTab === 'preview' ? (
                <PdfPreview
                  document={selectedDocument}
                  targetPage={targetPage}
                  onPageChange={(page) => setTargetPage(page)}
                />
              ) : (
                <DocumentList
                  documents={documents}
                  selectedDocumentId={selectedDocument?.id || null}
                  onSelectDocument={(doc) => {
                    setSelectedDocument(doc);
                    setLeftTab('preview');
                  }}
                  onDeleteDocument={handleDeleteDocument}
                />
              )}
            </div>
          </div>

          {/* Right Column (7 Cols on Large screens): Interactive AI Studio & Modes */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {/* Study Mode Selector Pills */}
            <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-800 rounded-2xl overflow-x-auto">
              <button
                onClick={() => setActiveMode('chat')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeMode === 'chat'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>AI Tutor Chat</span>
              </button>

              <button
                onClick={() => setActiveMode('summary')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeMode === 'summary'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Summary & Takeaways</span>
              </button>

              <button
                onClick={() => setActiveMode('flashcards')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeMode === 'flashcards'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>Flashcard Studio</span>
              </button>

              <button
                onClick={() => setActiveMode('quiz')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  activeMode === 'quiz'
                    ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Award className="w-4 h-4" />
                <span>Practice Quiz</span>
              </button>
            </div>

            {/* Active Study View */}
            <div className="flex-1 min-h-[500px]">
              {activeMode === 'chat' && (
                <ChatTutor
                  document={selectedDocument}
                  onSelectPage={handleSelectPage}
                  onError={(msg) => setToast({ message: msg, type: 'error' })}
                />
              )}

              {activeMode === 'summary' && (
                <SummaryView
                  document={selectedDocument}
                  onAskQuestion={(q) => {
                    setActiveMode('chat');
                  }}
                  onError={(msg) => setToast({ message: msg, type: 'error' })}
                />
              )}

              {activeMode === 'flashcards' && (
                <FlashcardsView
                  document={selectedDocument}
                  onSelectPage={handleSelectPage}
                  onError={(msg) => setToast({ message: msg, type: 'error' })}
                />
              )}

              {activeMode === 'quiz' && (
                <QuizView
                  document={selectedDocument}
                  onSelectPage={handleSelectPage}
                  onError={(msg) => setToast({ message: msg, type: 'error' })}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Toast Alert */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default App;
