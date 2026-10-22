import React, { useState } from 'react';
import { ShieldCheck, Lock, FileCheck, Brain, Server, X } from 'lucide-react';

export const SecurityBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-paper-100 hover:bg-paper-200 border border-paper-300 text-ink-700 hover:text-ink-900 text-xs font-medium transition-colors"
        title="View Security & Defense-in-Depth Architecture"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-sage" />
        <span className="hidden sm:inline">Defense-in-Depth</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
        >
          <div className="relative w-full max-w-lg bg-white border border-paper-300 rounded-2xl p-6 shadow-modal text-ink-800">
            <div className="flex items-center justify-between pb-4 border-b border-paper-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sage-light border border-sage-border text-sage flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-ink-900 font-serif">Security & Trust Verification</h3>
                  <p className="text-xs text-ink-500">Defense-in-depth architectural safeguards</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                aria-label="Close security modal"
                className="p-1.5 rounded-lg text-ink-400 hover:text-ink-700 hover:bg-paper-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs leading-relaxed">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-paper-50 border border-paper-200">
                <Lock className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink-900">Argon2id Authentication & Token Revocation</h4>
                  <p className="text-ink-600 mt-0.5">
                    Passwords are cryptographic hashes created with Argon2id (64 MiB memory cost, 3 iterations). Sessions are revoked server-side upon logout.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-paper-50 border border-paper-200">
                <Server className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink-900">Multi-Tenant Isolation (Zero IDOR / BOLA)</h4>
                  <p className="text-ink-600 mt-0.5">
                    Every database query and vector retrieval requires authenticated user ownership. Documents, text chunks, and chats are isolated strictly per student.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-paper-50 border border-paper-200">
                <FileCheck className="w-4 h-4 text-sage flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink-900">Untrusted File Sandbox</h4>
                  <p className="text-ink-600 mt-0.5">
                    Binary magic-bytes (%PDF-) verification, 20 MB size limit, and 100-page DoS cap. Stored with random UUID paths outside the web root.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-paper-50 border border-paper-200">
                <Brain className="w-4 h-4 text-amber flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-ink-900">Citation Integrity & Prompt Injection Defense</h4>
                  <p className="text-ink-600 mt-0.5">
                    Document text is enclosed in delimited XML blocks. Model citations [Page X] are verified server-side against actual retrieved chunks before display.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-paper-200 hover:bg-paper-300 text-ink-800 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
