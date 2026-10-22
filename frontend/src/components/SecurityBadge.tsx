import React, { useState } from 'react';
import { ShieldCheck, Lock, FileCheck, Brain, Server, X } from 'lucide-react';

export const SecurityBadge: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors"
        title="View Security & Defense-in-Depth Controls"
      >
        <ShieldCheck className="w-4 h-4 text-emerald-400" />
        <span className="hidden sm:inline">Defense-in-Depth Active</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl p-6 shadow-2xl text-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Security & Verification Controls</h3>
                  <p className="text-xs text-slate-400">OWASP Top 10 + AI RAG Defense-in-Depth</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-sm">
              <div className="flex gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                <Lock className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-100">Argon2id Authentication & Token Revocation</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Passwords hashed via Argon2id (64 MiB, t=3, p=4). Session invalidation with persistent token revocation blocklist.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                <Server className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-100">Zero IDOR / BOLA Multi-Tenant Isolation</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Server-enforced user ownership on every database operation, vector retrieval, and file access. Cross-user leaks are physically impossible.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                <FileCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-100">Safe PDF Ingestion Sandbox</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Strict magic bytes (%PDF-) validation, path traversal neutralization, 20 MB file size limit, and 100-page DoS protection.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 p-3 rounded-xl bg-slate-800/50 border border-slate-800">
                <Brain className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-slate-100">Prompt Injection & Citation Integrity</h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    XML boundary delimiters separate untrusted document text from instructions. Citations are verified server-side against actual retrieved chunks.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors"
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
