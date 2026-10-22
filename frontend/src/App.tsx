import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  FileText,
  Layers,
  Award,
  BookOpen,
  FolderOpen,
  UploadCloud,
  ShieldCheck,
  ChevronRight,
  Info,
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
import { Toast } from './components/Toast';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [activeMode, setActiveMode] = useState<StudyMode>('chat');
  const [targetPage, setTargetPage] = useState<number | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [leftTab, setLeftTab] = useState<'preview' | 'library'>('preview');
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);

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
      message: `Welcome back, ${user.name}! Workspace unlocked.`,
      type: 'success',
    });
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setDocuments([]);
    setSelectedDocument(null);
    setToast({
      message: 'Successfully signed out. Access token invalidated.',
      type: 'info',
    });
  };

  const handleUploadSuccess = (newDoc: Document) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocument(newDoc);
    setLeftTab('preview');
    setToast({
      message: `"${newDoc.title}" indexed and ready for study!`,
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
        message: 'Document and vector embeddings deleted permanently.',
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

  const handleAskSummaryQuestion = (question: string) => {
    setPendingQuestion(question);
    setActiveMode('chat');
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper-100 text-ink-900 font-sans selection:bg-accent-light selection:text-ink-900">
      {/* Top Editorial Navbar */}
      <Navbar
        user={currentUser}
        selectedDocument={selectedDocument}
        activeMode={activeMode}
        onSelectMode={setActiveMode}
        onOpenUpload={() => setLeftTab('library')}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={handleLogout}
      />

      {/* Mobile/Tablet Segmented Study Mode Switcher (Visible when top navbar switcher is hidden) */}
      <div className="lg:hidden bg-white border-b border-paper-300 px-4 py-2">
        <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-paper-100 border border-paper-300">
          <button
            onClick={() => setActiveMode('chat')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'chat'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Chat</span>
          </button>
          <button
            onClick={() => setActiveMode('summary')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'summary'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Summary</span>
          </button>
          <button
            onClick={() => setActiveMode('flashcards')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'flashcards'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Cards</span>
          </button>
          <button
            onClick={() => setActiveMode('quiz')}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeMode === 'quiz'
                ? 'bg-white text-accent font-semibold shadow-subtle'
                : 'text-ink-600 hover:text-ink-900'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Quiz</span>
          </button>
        </div>
      </div>

      {/* Main Studio Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-6 flex flex-col gap-5">
        {/* Guest Session Notice */}
        {!currentUser && (
          <div className="p-4 rounded-2xl bg-white border border-paper-300 shadow-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-accent-light text-accent flex items-center justify-center border border-accent/20 flex-shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-semibold text-ink-900">
                  Guest Workspace Mode
                </h3>
                <p className="text-xs text-ink-500 mt-0.5">
                  Sign in or create an account to persist documents, save question histories, and maintain isolated vector collections.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="px-4 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-semibold shadow-subtle hover-subtle-lift transition-all flex-shrink-0"
            >
              Sign In or Register
            </button>
          </div>
        )}

        {/* 2-Column Split Studio Workspace */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[660px]">
          {/* Left Column (5 Cols): Reader / Library */}
          <div className="lg:col-span-5 flex flex-col gap-3 min-h-[500px]">
            {/* Left Column Subheader Tabs */}
            <div className="flex items-center justify-between bg-white p-1 rounded-xl border border-paper-300 shadow-subtle">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setLeftTab('preview')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    leftTab === 'preview'
                      ? 'bg-paper-100 text-ink-900 font-semibold shadow-subtle'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Reader</span>
                </button>
                <button
                  onClick={() => setLeftTab('library')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    leftTab === 'library'
                      ? 'bg-paper-100 text-ink-900 font-semibold shadow-subtle'
                      : 'text-ink-500 hover:text-ink-800'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Library ({documents.length})</span>
                </button>
              </div>

              {selectedDocument && leftTab === 'preview' && (
                <button
                  onClick={() => setLeftTab('library')}
                  className="text-xs text-ink-500 hover:text-accent flex items-center gap-1 pr-2 transition-colors font-medium"
                >
                  <span>Switch</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Left Content Body */}
            <div className="flex-1 flex flex-col">
              {leftTab === 'preview' ? (
                <PdfPreview
                  document={selectedDocument}
                  targetPage={targetPage}
                  onPageChange={(page) => setTargetPage(page)}
                />
              ) : (
                <div className="flex flex-col gap-4 h-full">
                  {currentUser && (
                    <DocumentUpload
                      onUploadSuccess={handleUploadSuccess}
                      onError={(msg) => setToast({ message: msg, type: 'error' })}
                    />
                  )}
                  <div className="flex-1 min-h-[380px]">
                    <DocumentList
                      documents={documents}
                      selectedDocumentId={selectedDocument?.id || null}
                      onSelectDocument={(doc) => {
                        setSelectedDocument(doc);
                        setLeftTab('preview');
                      }}
                      onDeleteDocument={handleDeleteDocument}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column (7 Cols): Active Study Studio */}
          <div className="lg:col-span-7 flex flex-col min-h-[500px]">
            {activeMode === 'chat' && (
              <ChatTutor
                document={selectedDocument}
                onSelectPage={handleSelectPage}
                onError={(msg) => setToast({ message: msg, type: 'error' })}
                initialQuestion={pendingQuestion}
                onClearInitialQuestion={() => setPendingQuestion(null)}
              />
            )}

            {activeMode === 'summary' && (
              <SummaryView
                document={selectedDocument}
                onAskQuestion={handleAskSummaryQuestion}
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
