import React, { useState, useEffect } from 'react';
import { Layers, RotateCcw, ChevronLeft, ChevronRight, Check, X, Sparkles, BookOpen, Shuffle } from 'lucide-react';
import { Document, FlashcardItem } from '../types';
import { api } from '../services/api';

interface FlashcardsViewProps {
  document: Document | null;
  onSelectPage: (page: number) => void;
  onError: (msg: string) => void;
}

export const FlashcardsView: React.FC<FlashcardsViewProps> = ({ document, onSelectPage, onError }) => {
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

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
  };

  const toggleMastered = (cardId: string) => {
    setMasteredIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
        <Layers className="w-12 h-12 text-slate-700 mb-3" />
        <h4 className="text-base font-semibold text-slate-300">No Document Selected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Select an uploaded document to study interactive flashcards with verifiable page citations.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 border border-sky-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">StudyLens Flashcards</h3>
            <p className="text-[10px] text-slate-400">
              {cards.length} cards · {masteredIds.size} mastered
            </p>
          </div>
        </div>

        {cards.length > 0 && (
          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
            title="Shuffle Flashcards"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Shuffle</span>
          </button>
        )}
      </div>

      {/* Main Flashcard Arena */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
            <span className="w-8 h-8 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
            <p className="text-xs">Generating study flashcards with page references...</p>
          </div>
        ) : cards.length > 0 && currentCard ? (
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            {/* Progress indicator */}
            <div className="w-full flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold">
                Card {currentIndex + 1} of {cards.length}
              </span>
              <span className="text-[11px] text-emerald-400">
                {Math.round((masteredIds.size / cards.length) * 100)}% Mastered
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden -mt-3">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${(masteredIds.size / cards.length) * 100}%` }}
              />
            </div>

            {/* 3D Flip Card Container */}
            <div
              onClick={() => setIsFlipped(!isFlipped)}
              className="w-full h-72 cursor-pointer perspective-1000 select-none"
            >
              <div
                className={`w-full h-full relative duration-500 transform-style-preserve-3d transition-transform ${
                  isFlipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Side (Question) */}
                <div className="absolute inset-0 backface-hidden p-8 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">
                      Question
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage(currentCard.page_number);
                      }}
                      className="text-[11px] text-slate-400 hover:text-sky-300 flex items-center gap-1"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Page {currentCard.page_number}
                    </button>
                  </div>

                  <p className="text-base sm:text-lg font-semibold text-slate-100 text-center leading-snug">
                    {currentCard.question}
                  </p>

                  <div className="text-center text-[11px] text-slate-500">Click card to reveal answer ↺</div>
                </div>

                {/* Back Side (Answer) */}
                <div className="absolute inset-0 backface-hidden rotate-y-180 p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/40 border border-indigo-500/40 shadow-2xl flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                      Answer
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPage(currentCard.page_number);
                      }}
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1 font-mono font-semibold"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Page {currentCard.page_number}
                    </button>
                  </div>

                  <p className="text-sm sm:text-base font-serif text-slate-200 text-center leading-relaxed">
                    {currentCard.answer}
                  </p>

                  <div className="text-center text-[11px] text-slate-500">Click to flip back ↻</div>
                </div>
              </div>
            </div>

            {/* Navigation & Mastery Controls */}
            <div className="flex items-center justify-between w-full">
              <button
                onClick={handlePrev}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Previous Card"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => toggleMastered(currentCard.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                  masteredIds.has(currentCard.id)
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Check className="w-4 h-4" />
                <span>{masteredIds.has(currentCard.id) ? 'Mastered!' : 'Mark as Mastered'}</span>
              </button>

              <button
                onClick={handleNext}
                className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Next Card"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No flashcards could be generated for this document.</p>
          </div>
        )}
      </div>
    </div>
  );
};
