import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Sparkles, BookOpen, ChevronDown, ChevronUp, AlertCircle, Trash2 } from 'lucide-react';
import DOMPurify from 'dompurify';
import { ChatMessage, CitationItem, Document } from '../types';
import { api } from '../services/api';

interface ChatTutorProps {
  document: Document | null;
  onSelectPage: (page: number) => void;
  onError: (msg: string) => void;
}

export const ChatTutor: React.FC<ChatTutorProps> = ({ document, onSelectPage, onError }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<{ [msgId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document) {
      loadHistory(document.id);
    } else {
      setMessages([]);
      setSessionId(null);
    }
  }, [document]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async (docId: string) => {
    try {
      const session = await api.getChatHistory(docId);
      setSessionId(session.id);
      setMessages(session.messages || []);
    } catch {
      setMessages([]);
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || inputMessage;
    if (!textToSend.trim() || !document || isLoading) return;

    const userText = textToSend.trim();
    setInputMessage('');

    // Optimistic user message
    const tempUserMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      session_id: sessionId || '',
      role: 'user',
      content: userText,
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const assistantMsg = await api.sendChatMessage(document.id, userText, sessionId || undefined);
      setSessionId(assistantMsg.session_id);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      onError(err.message || 'Failed to get answer from tutor. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!sessionId) return;
    if (window.confirm('Clear all messages in this tutoring session?')) {
      try {
        await api.clearChatSession(sessionId);
        setMessages([]);
      } catch (err: any) {
        onError(err.message || 'Could not clear chat history');
      }
    }
  };

  const toggleEvidence = (msgId: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Safe renderer: sanitize HTML and transform [Page X] citations into interactive buttons
  const renderFormattedMessage = (content: string, citations: CitationItem[]) => {
    // Sanitize with DOMPurify against XSS
    const cleanContent = DOMPurify.sanitize(content);

    // Split on [Page X] tokens
    const parts = cleanContent.split(/(\[[Pp]age\s+\d+\])/g);

    return (
      <div className="space-y-2 whitespace-pre-wrap leading-relaxed text-sm">
        {parts.map((part, index) => {
          const pageMatch = part.match(/\[[Pp]age\s+(\d+)\]/i);
          if (pageMatch) {
            const pageNum = parseInt(pageMatch[1], 10);
            return (
              <button
                key={index}
                onClick={() => onSelectPage(pageNum)}
                className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 text-xs font-semibold font-mono transition-all hover:scale-105"
                title={`Jump to Page ${pageNum} in Document Viewer`}
              >
                <BookOpen className="w-3 h-3" />
                Page {pageNum}
              </button>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </div>
    );
  };

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
        <Bot className="w-12 h-12 text-slate-700 mb-3" />
        <h4 className="text-base font-semibold text-slate-300">AI PDF Tutor Offline</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Select an uploaded document to initiate an interactive tutoring session with verified citations.
        </p>
      </div>
    );
  }

  const promptSuggestions = [
    'Explain the core thesis of this document',
    'Summarize Page 1 in simple terms',
    'What are the key formulas or definitions mentioned?',
  ];

  return (
    <div className="h-full flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Top Bar */}
      <div className="p-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">StudyLens Tutor</h3>
            <p className="text-[10px] text-slate-400">Strictly grounded in {document.title}</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 text-xs flex items-center gap-1 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-slate-400 space-y-4">
            <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 inline-flex">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200">How can I help you study?</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Ask any question about "{document.title}". Every answer will be grounded directly in your document with page citations.
              </p>
            </div>

            {/* Prompt Template Pills */}
            <div className="flex flex-col gap-2 max-w-md mx-auto pt-2">
              {promptSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-xs px-3.5 py-2 rounded-xl bg-slate-950/70 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-sky-300 transition-colors"
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm shadow-md ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-tr-none'
                      : 'bg-slate-950/90 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  ) : (
                    <div>
                      {renderFormattedMessage(msg.content, msg.citations || [])}

                      {/* Verified Citation Pill List & Evidence Accordion */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-800/80">
                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span className="font-semibold text-sky-400">
                              Verified Citations ({msg.citations.length}):
                            </span>
                            <button
                              onClick={() => toggleEvidence(msg.id)}
                              className="flex items-center gap-1 text-slate-400 hover:text-slate-200"
                            >
                              <span>{expandedEvidence[msg.id] ? 'Hide Evidence' : 'View Passages'}</span>
                              {expandedEvidence[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {msg.citations.map((c, i) => (
                              <button
                                key={i}
                                onClick={() => onSelectPage(c.page_number)}
                                className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 hover:border-sky-500 text-[10px] text-sky-400 flex items-center gap-1 transition-colors"
                              >
                                <span>Page {c.page_number}</span>
                              </button>
                            ))}
                          </div>

                          {expandedEvidence[msg.id] && (
                            <div className="mt-2 space-y-2 p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300">
                              {msg.citations.map((c, i) => (
                                <div key={i} className="border-b border-slate-800 last:border-b-0 pb-1.5 last:pb-0">
                                  <div className="font-semibold text-sky-400 mb-0.5">Page {c.page_number} Passage:</div>
                                  <div className="italic text-slate-400 font-serif">"{c.snippet}"</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5 text-slate-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-xl bg-sky-600/20 text-sky-400 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <span className="w-4 h-4 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
              <span>Analyzing passages & verifying citations...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-slate-800 bg-slate-950/60 flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask anything about ${document.title}...`}
          disabled={isLoading}
          maxLength={2000}
          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white shadow-lg shadow-sky-600/20 transition-all"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
