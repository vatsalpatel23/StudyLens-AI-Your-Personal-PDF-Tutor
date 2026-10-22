import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, XCircle, BookOpen, RotateCcw, Sparkles } from 'lucide-react';
import { Document, QuizQuestionItem } from '../types';
import { api } from '../services/api';

interface QuizViewProps {
  document: Document | null;
  onSelectPage: (page: number) => void;
  onError: (msg: string) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({ document, onSelectPage, onError }) => {
  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qId: string]: number }>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (document) {
      loadQuiz(document.id);
      setSelectedAnswers({});
    } else {
      setQuestions([]);
    }
  }, [document]);

  const loadQuiz = async (docId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getDocumentQuiz(docId);
      setQuestions(data.questions || []);
    } catch (err: any) {
      onError(err.message || 'Failed to generate practice quiz.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    // If already answered, ignore
    if (selectedAnswers[questionId] !== undefined) return;

    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIndex,
    }));
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
  };

  if (!document) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-500 bg-slate-900/60 rounded-2xl border border-slate-800">
        <Award className="w-12 h-12 text-slate-700 mb-3" />
        <h4 className="text-base font-semibold text-slate-300">No Document Selected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Select an uploaded document to generate an interactive practice quiz with instant explanations and page citations.
        </p>
      </div>
    );
  }

  // Calculate score
  const totalAnswered = Object.keys(selectedAnswers).length;
  let correctCount = 0;
  questions.forEach((q) => {
    if (selectedAnswers[q.id] === q.correct_index) {
      correctCount += 1;
    }
  });

  return (
    <div className="h-full flex flex-col bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100">Practice Quiz & Self-Assessment</h3>
            <p className="text-[10px] text-slate-400">
              Score: {correctCount}/{questions.length} ({totalAnswered}/{questions.length} answered)
            </p>
          </div>
        </div>

        {totalAnswered > 0 && (
          <button
            onClick={handleResetQuiz}
            className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 text-xs flex items-center gap-1 transition-colors"
            title="Reset Quiz"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Reset</span>
          </button>
        )}
      </div>

      {/* Questions List */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <span className="w-8 h-8 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
            <p className="text-xs">Generating quiz questions & verified answer explanations...</p>
          </div>
        ) : questions.length > 0 ? (
          questions.map((q, qIndex) => {
            const userAnswer = selectedAnswers[q.id];
            const isAnswered = userAnswer !== undefined;
            const isCorrect = isAnswered && userAnswer === q.correct_index;

            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-md space-y-4"
              >
                {/* Question Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-sky-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {qIndex + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-slate-100 leading-snug">
                      {q.question}
                    </h4>
                  </div>

                  <button
                    onClick={() => onSelectPage(q.page_number)}
                    className="flex-shrink-0 flex items-center gap-1 text-[11px] text-slate-400 hover:text-sky-400 px-2 py-1 rounded bg-slate-900 border border-slate-800"
                    title={`Jump to Page ${q.page_number}`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Page {q.page_number}</span>
                  </button>
                </div>

                {/* Option Buttons */}
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    let btnStyle = 'bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300';

                    if (isAnswered) {
                      if (optIdx === q.correct_index) {
                        btnStyle = 'bg-emerald-950/50 border-emerald-500/60 text-emerald-200 font-semibold';
                      } else if (optIdx === userAnswer) {
                        btnStyle = 'bg-rose-950/50 border-rose-500/60 text-rose-200';
                      } else {
                        btnStyle = 'bg-slate-950/40 border-slate-800/40 text-slate-600 opacity-50';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full text-left p-3 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-all ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-md bg-slate-800/80 border border-slate-700/60 text-[10px] font-bold flex items-center justify-center">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span>{opt}</span>
                        </div>

                        {isAnswered && optIdx === q.correct_index && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        )}
                        {isAnswered && optIdx === userAnswer && optIdx !== q.correct_index && (
                          <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Box when Answered */}
                {isAnswered && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      isCorrect
                        ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-1">
                      {isCorrect ? '✓ Correct Answer!' : '✗ Incorrect Answer'}
                    </div>
                    <p className="font-serif text-slate-300">{q.explanation}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-slate-500">
            <p className="text-sm">No quiz questions generated for this document.</p>
          </div>
        )}
      </div>
    </div>
  );
};
