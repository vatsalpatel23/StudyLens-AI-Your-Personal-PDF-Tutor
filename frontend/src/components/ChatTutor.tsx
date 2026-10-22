import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Trash2,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import DOMPurify from 'dompurify';
import { ChatMessage, CitationItem, Document } from '../types';
import { api } from '../services/api';
import { EmptyState } from './EmptyState';

interface ChatTutorProps {
  document: Document | null;
  onSelectPage: (page: number) => void;
  onError: (msg: string) => void;
  initialQuestion?: string | null;
  onClearInitialQuestion?: () => void;
}

export const ChatTutor: React.FC<ChatTutorProps> = ({
  document,
  onSelectPage,
  onError,
  initialQuestion,
  onClearInitialQuestion,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedEvidence, setExpandedEvidence] = useState<{ [msgId: string]: boolean }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialQuestion) {
      setInputMessage(initialQuestion);
      inputRef.current?.focus();
      onClearInitialQuestion?.();
    }
  }, [initialQuestion, onClearInitialQuestion]);

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
      onError(err.message || 'Tutor request failed. Please check network and retry.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleClearHistory = async () => {
    if (!sessionId) return;
    if (window.confirm('Clear all conversation history with this document?')) {
      try {
        await api.clearChatSession(sessionId);
        setMessages([]);
      } catch (err: any) {
        onError(err.message || 'Could not clear chat history');
      }
    }
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleEvidence = (msgId: string) => {
    setExpandedEvidence((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  // Safe renderer: sanitizes HTML with DOMPurify and turns [Page X] into interactive buttons
  const renderFormattedMessage = (content: string) => {
    const clean = DOMPurify.sanitize(content);
    const parts = clean.split(/(\[[Pp]age\s+\d+\])/g);

    return (
      <div className="space-y-2 whitespace-pre-wrap leading-relaxed text-xs sm:text-sm font-sans text-ink-800">
        {parts.map((part, index) => {
          const pageMatch = part.match(/\[[Pp]age\s+(\d+)\]/i);
          if (pageMatch) {
            const pageNum = parseInt(pageMatch[1], 10);
            return (
              <button
                key={index}
                onClick={() => onSelectPage(pageNum)}
                className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded bg-accent-light hover:bg-accent/20 text-accent-dark border border-accent/20 text-[11px] font-semibold font-mono transition-colors"
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
    return <EmptyState type="no-selection" />;
  }

  const promptSuggestions = [
    'Explain the central thesis of this document',
    'Summarize Page 1 in simple terms',
    'What key definitions or formulas are introduced?',
  ];

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-paper-300 shadow-card overflow-hidden">
      {/* Top Header */}
      <div className="px-4 py-3 border-b border-paper-300 bg-paper-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-light border border-accent/20 text-accent flex items-center justify-center">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-ink-900">Academic Tutor</h3>
            <p className="text-[10px] text-ink-500">Strictly grounded in verified document passages</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-ink-400 hover:text-crimson hover:bg-crimson-light text-xs flex items-center gap-1 transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Clear</span>
          </button>
        )}
      </div>

      {/* Message Stream */}
      <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-paper-50/20">
        {messages.length === 0 ? (
          <div className="py-12 text-center text-ink-500 max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-xl bg-accent-light border border-accent/20 text-accent inline-flex items-center justify-center">
              <Sparkles className="w-6 h-6 stroke-[1.75]" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-ink-900 font-serif">How can I assist your study session?</h4>
              <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                Ask questions about "{document.title}". Every answer will be grounded in verified passages with clickable page citations.
              </p>
            </div>

            {/* Prompt Starter Pills */}
            <div className="flex flex-col gap-2 pt-2">
              {promptSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(prompt)}
                  className="text-left text-xs px-3.5 py-2.5 rounded-xl bg-white hover:bg-paper-50 border border-paper-300 hover:border-accent text-ink-700 hover:text-accent shadow-subtle transition-all"
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
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-accent-light border border-accent/20 text-accent flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl p-4 text-xs sm:text-sm shadow-subtle ${
                    isUser
                      ? 'bg-accent text-white rounded-tr-xs'
                      : 'bg-white border border-paper-300 text-ink-800 rounded-tl-xs'
                  }`}
                >
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  ) : (
                    <div>
                      {renderFormattedMessage(msg.content)}

                      {/* Verified Citation Pill List & Evidence Accordion */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-paper-200">
                          <div className="flex items-center justify-between text-[11px] text-ink-500">
                            <span className="font-semibold text-accent flex items-center gap-1 font-mono">
                              <BookOpen className="w-3 h-3" />
                              {msg.citations.length} Verified Citation(s)
                            </span>
                            <button
                              onClick={() => toggleEvidence(msg.id)}
                              className="flex items-center gap-1 text-ink-400 hover:text-ink-700"
                            >
                              <span>{expandedEvidence[msg.id] ? 'Hide Excerpts' : 'View Passages'}</span>
                              {expandedEvidence[msg.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {msg.citations.map((c, i) => (
                              <button
                                key={i}
                                onClick={() => onSelectPage(c.page_number)}
                                className="px-2 py-0.5 rounded bg-paper-100 hover:bg-accent-light border border-paper-300 hover:border-accent text-[11px] text-ink-700 hover:text-accent font-mono transition-colors"
                              >
                                Page {c.page_number}
                              </button>
                            ))}
                          </div>

                          {expandedEvidence[msg.id] && (
                            <div className="mt-2.5 space-y-2 p-3 rounded-lg bg-paper-50 border border-paper-200 text-[11px]">
                              {msg.citations.map((c, i) => (
                                <div key={i} className="border-b border-paper-200 last:border-b-0 pb-2 last:pb-0">
                                  <div className="font-semibold text-accent font-mono mb-0.5">Page {c.page_number}:</div>
                                  <div className="italic text-ink-600 font-serif leading-relaxed">"{c.snippet}"</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions footer for assistant message */}
                      <div className="mt-3 flex items-center justify-end gap-2 text-ink-400">
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="p-1 rounded text-ink-400 hover:text-ink-700 hover:bg-paper-100 text-[10px] flex items-center gap-1 transition-colors"
                          title="Copy Answer"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check className="w-3 h-3 text-sage" />
                              <span className="text-sage">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-paper-200 border border-paper-300 flex items-center justify-center flex-shrink-0 mt-0.5 text-ink-700 text-xs font-semibold">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex gap-3 justify-start animate-fade-in">
            <div className="w-7 h-7 rounded-lg bg-accent-light border border-accent/20 text-accent flex items-center justify-center flex-shrink-0">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="p-3.5 rounded-xl bg-white border border-paper-300 rounded-tl-xs flex items-center gap-2.5 text-xs text-ink-500 shadow-subtle">
              <span className="w-4 h-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              <span>Analyzing document passages & verifying citations...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 border-t border-paper-300 bg-white flex items-center gap-2"
      >
        <input
          ref={inputRef}
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`Ask anything about ${document.title}...`}
          disabled={isLoading}
          maxLength={2000}
          className="flex-1 bg-paper-50 border border-paper-300 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:border-accent focus:bg-white transition-colors"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          aria-label="Send question"
          className="p-2.5 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:hover:bg-accent text-white shadow-subtle transition-all"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
