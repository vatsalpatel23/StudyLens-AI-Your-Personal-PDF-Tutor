import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCw,
  Sparkles,
  BookOpen,
  Shuffle,
  Keyboard,
} from 'lucide-react';
import { Document, FlashcardItem } from '../types';
import { api } from '../services/api';
import { EmptyState } from './EmptyState';

interface FlashcardsViewProps {
  document: Document | null;
  onSelectPage: (page: number) => void;
  onError: (msg: string) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({
  document,
  onSelectPage,
  onError,
}) => {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [masteredIds, setMasteredIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (document) {
      loadFlashcards(document.id);
      setCurrentIndex(0);
      setIsFlipped(false);
      setMasteredIds(new Set());
    } else {
      setCards([]);
    }
  }, [document]);

  const loadFlashcards = async (docId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getDocumentFlashcards(docId);
      setCards(data.cards || []);
    } catch (err: any) {
      onError(err.message || 'Failed to generate flashcards.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = useCallback(() => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  }, [cards.length]);

  const handlePrev = useCallback(() => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  }, [cards.length]);

  const handleShuffle = () => {
    if (cards.length === 0) return;
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const toggleMastered = useCallback(
    (cardId: string) => {
      setMasteredIds((prev) => {
        const next = new Set(prev);
        if (next.has(cardId)) {
          next.delete(cardId);
        } else {
          next.add(cardId);
        }
        return next;
      });
    },
    []
  );

  const currentCard = cards[currentIndex];

  // Keyboard Navigation: Space/Enter (flip), Left/Right (nav), M (mastered)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture when typing in an input or textarea
      if (
        document &&
        (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
      ) {
        return;
      }

      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'k') {
        e.preventDefault();
        handlePrev();
      } else if ((e.key === 'm' || e.key === 'M') && currentCard) {
        e.preventDefault();
        toggleMastered(currentCard.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev, currentCard, toggleMastered]);

  if (!document) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-white rounded-2xl border border-paper-300 shadow-subtle">
        <EmptyState
          type="no-selection"
          title="No document selected"
          description="Choose a document from your library to generate active recall flashcards with verified page citations."
        />
      </div>
    );
  }

  const masteryPercentage =
    cards.length > 0 ? Math.round((masteredIds.size / cards.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-paper-300 shadow-subtle overflow-hidden">
      {/* Top Studio Bar */}
      <div className="px-6 py-4 border-b border-paper-200 bg-paper-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-light text-accent flex items-center justify-center border border-accent/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900 tracking-tight">
              Active Recall Flashcards
            </h3>
            <p className="text-xs text-ink-500 font-mono">
              {cards.length} cards · {masteredIds.size} mastered ({masteryPercentage}%)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {cards.length > 0 && (
            <button
              onClick={handleShuffle}
              className="p-1.5 rounded-lg text-ink-500 hover:text-ink-800 hover:bg-paper-200/70 text-xs flex items-center gap-1.5 transition-colors"
              title="Shuffle Cards"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Shuffle</span>
            </button>
          )}

          <button
            onClick={() => loadFlashcards(document.id)}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-ink-500 hover:text-accent hover:bg-paper-200/70 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Regenerate Flashcards"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs">Reset</span>
          </button>
        </div>
      </div>

      {/* Main Flashcard Arena */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-ink-500">
            <span className="w-7 h-7 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
            <p className="text-xs font-medium text-ink-600">
              Generating active recall cards from document passages...
            </p>
          </div>
        ) : cards.length > 0 && currentCard ? (
          <div className="w-full max-w-lg flex flex-col items-center gap-5">
            {/* Progress Bar & Counter */}
            <div className="w-full space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono text-ink-500">
                <span className="font-semibold text-ink-700">
                  Card {currentIndex + 1} of {cards.length}
                </span>
                <span
                  className={
                    masteredIds.has(currentCard.id)
                      ? 'text-sage font-medium'
                      : 'text-ink-400'
                  }
                >
                  {masteredIds.has(currentCard.id) ? '✓ Mastered' : 'Unmastered'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-paper-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${((currentIndex + 1) / cards.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 3D Flip Card Container */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full h-72 cursor-pointer perspective-1000 select-none group"
              role="button"
              tabIndex={0}
              aria-label={
                isFlipped
                  ? `Answer: ${currentCard.answer}`
                  : `Question: ${currentCard.question}. Press Space to reveal answer.`
              }
            >
              <div
                className={`w-full h-full relative duration-500 transform-style-preserve-3d transition-transform ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Side: Question */}
                <div className="absolute inset-0 backface-hidden p-7 rounded-2xl bg-paper-50 border border-paper-300 shadow-md flex flex-col justify-between group-hover:border-accent/40 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-accent px-2 py-0.5 rounded bg-accent-light border border-accent/20">
                      Prompt
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage(currentCard.page_number);
                      }}
                      className="text-xs font-mono text-ink-500 hover:text-accent flex items-center gap-1.5 px-2 py-1 rounded bg-white border border-paper-200 transition-colors"
                      title={`Jump to Page ${currentCard.page_number}`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-accent" />
                      <span>Page {currentCard.page_number}</span>
                    </button>
                  </div>

                  <div className="my-auto text-center px-4">
                    <p className="text-base sm:text-lg font-serif font-semibold text-ink-900 leading-snug">
                      {currentCard.question}
                    </p>
                  </div>

                  <div className="text-center text-[11px] text-ink-400 font-mono flex items-center justify-center gap-1.5">
                    <RotateCw className="w-3 h-3 text-ink-300" />
                    <span>Click or press <kbd className="px-1.5 py-0.5 rounded bg-paper-200 text-ink-600 font-mono text-[10px] border border-paper-300">Space</kbd> to flip</span>
                  </div>
                </div>

                {/* Back Side: Answer */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 p-7 rounded-2xl bg-white border border-accent/40 shadow-card flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-sage-dark px-2 py-0.5 rounded bg-sage-light border border-sage/20">
                      Answer & Source
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage(currentCard.page_number);
                      }}
                      className="text-xs font-mono text-accent hover:underline flex items-center gap-1.5 font-semibold px-2 py-1 rounded bg-accent-light/50 border border-accent/20"
                      title={`Jump to Page ${currentCard.page_number}`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Grounded on Page {currentCard.page_number}</span>
                    </button>
                  </div>

                  <div className="my-auto text-center px-4">
                    <p className="text-sm sm:text-base font-serif text-ink-900 leading-relaxed">
                      {currentCard.answer}
                    </p>
                  </div>

                  <div className="text-center text-[11px] text-ink-400 font-mono flex items-center justify-center gap-1.5">
                    <RotateCw className="w-3 h-3 text-ink-300" />
                    <span>Click or press <kbd className="px-1.5 py-0.5 rounded bg-paper-200 text-ink-600 font-mono text-[10px] border border-paper-300">Space</kbd> to return</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation & Mastery Controls */}
            <div className="flex items-center justify-between w-full pt-1">
              <button
                onClick={handlePrev}
                className="p-2.5 rounded-xl bg-white hover:bg-paper-50 border border-paper-300 text-ink-700 hover:text-ink-900 transition-colors shadow-subtle hover-subtle-lift"
                title="Previous Card (Left Arrow / K)"
                aria-label="Previous Flashcard"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => toggleMastered(currentCard.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  masteredIds.has(currentCard.id)
                    ? 'bg-sage-light text-sage-dark border-sage/40 shadow-sm'
                    : 'bg-white text-ink-600 border-paper-300 hover:border-paper-400 hover:text-ink-900'
                }`}
                title="Mark as Mastered (M key)"
              >
                <Check className="w-4 h-4" />
                <span>{masteredIds.has(currentCard.id) ? 'Mastered!' : 'Mark as Mastered'}</span>
                <kbd className="hidden sm:inline ml-1 px-1 py-0.5 rounded bg-paper-100 text-[10px] font-mono border border-paper-200">
                  M
                </kbd>
              </button>

              <button
                onClick={handleNext}
                className="p-2.5 rounded-xl bg-white hover:bg-paper-50 border border-paper-300 text-ink-700 hover:text-ink-900 transition-colors shadow-subtle hover-subtle-lift"
                title="Next Card (Right Arrow / J)"
                aria-label="Next Flashcard"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-ink-400 pt-2">
              <span className="flex items-center gap-1">
                <Keyboard className="w-3 h-3 text-ink-400" />
                <span>Shortcuts:</span>
              </span>
              <span><kbd className="px-1 rounded bg-paper-100 border border-paper-200">Space</kbd> Flip</span>
              <span><kbd className="px-1 rounded bg-paper-100 border border-paper-200">←</kbd> <kbd className="px-1 rounded bg-paper-100 border border-paper-200">→</kbd> Nav</span>
              <span><kbd className="px-1 rounded bg-paper-100 border border-paper-200">M</kbd> Master</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-ink-400">
            <p className="text-sm">No flashcards could be generated for this document.</p>
          </div>
        )}
      </div>
    </div>
  );
};
