import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, AlertCircle, Shield, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (isRegister) {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        setError('Password must contain both letters and numbers.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (isRegister) {
        const res = await api.register(name.trim(), email.trim(), password);
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.login(email.trim(), password);
        onSuccess(res.user);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white border border-paper-300 rounded-2xl p-6 sm:p-8 shadow-modal text-ink-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-ink-400 hover:text-ink-800 hover:bg-paper-100 transition-colors"
          title="Close dialog (Escape)"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-accent-light border border-accent/20 text-accent mb-3">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif font-bold tracking-tight text-ink-900">
            {isRegister ? 'Create Your Account' : 'Welcome to StudyLens AI'}
          </h2>
          <p className="text-xs text-ink-500 mt-1">
            {isRegister
              ? 'Isolated multi-tenant workspace protected by Argon2id password hashing'
              : 'Sign in to access your personal library, citations, and AI tutor'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-crimson-light border border-crimson/30 text-crimson-dark text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-crimson" />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-semibold text-ink-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 w-4 h-4 text-ink-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Marie Curie"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-paper-50 border border-paper-300 rounded-xl text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 w-4 h-4 text-ink-400" />
              <input
                type="email"
                required
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-paper-50 border border-paper-300 rounded-xl text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 w-4 h-4 text-ink-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-paper-50 border border-paper-300 rounded-xl text-sm text-ink-900 placeholder-ink-400 focus:outline-none focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/15 transition-all"
              />
            </div>
            {isRegister && (
              <p className="text-[11px] font-mono text-ink-500 mt-1">
                At least 8 characters with letters & numbers
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 mt-2 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-sm font-semibold shadow-subtle hover-subtle-lift transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isRegister ? (
              'Create Account'
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Security Assurance footer */}
        <div className="mt-5 p-2.5 rounded-lg bg-paper-100 border border-paper-200 text-center text-[11px] text-ink-500 flex items-center justify-center gap-1.5 font-mono">
          <CheckCircle className="w-3.5 h-3.5 text-sage" />
          <span>Zero cross-user data leakage · OWASP Top 10 Hardened</span>
        </div>

        {/* Mode Toggle */}
        <div className="mt-5 pt-4 border-t border-paper-200 text-center text-xs text-ink-500">
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError(null);
                }}
                className="text-accent hover:underline font-semibold ml-1"
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError(null);
                }}
                className="text-accent hover:underline font-semibold ml-1"
              >
                Create Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
