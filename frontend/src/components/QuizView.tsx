import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  BookOpen,
  RotateCcw,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { Document, QuizQuestionItem } from '../types';
import { api } from '../services/api';
import { EmptyState } from './EmptyState';

interface QuizViewProps {
  document: Document | null;
  onSelectPage: (page: number) => void;
  onError: (msg: string) => void;
}

export const QuizView: React.FC<QuizViewProps> = ({
  document,
  onSelectPage,
  onError,
}) => {
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
      <div className="h-full flex items-center justify-center p-6 bg-white rounded-2xl border border-paper-300 shadow-subtle">
        <EmptyState
          type="no-selection"
          title="No document selected"
          description="Choose a document from your library to generate an interactive practice quiz with instant explanations and page citations."
        />
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

  const percentage =
    totalAnswered > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

  return (
    <div className="h-full flex flex-col bg-white rounded-2xl border border-paper-300 shadow-subtle overflow-hidden">
      {/* Studio Header */}
      <div className="px-6 py-4 border-b border-paper-200 bg-paper-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sage-light text-sage-dark flex items-center justify-center border border-sage/20">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900 tracking-tight">
              Self-Assessment & Practice Quiz
            </h3>
            <p className="text-xs text-ink-500 font-mono">
              Score: {correctCount}/{questions.length} ({percentage}%) · {totalAnswered}/{questions.length} answered
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {totalAnswered > 0 && (
            <button
              onClick={handleResetQuiz}
              className="p-1.5 rounded-lg text-ink-500 hover:text-ink-800 hover:bg-paper-200/70 text-xs flex items-center gap-1.5 transition-colors"
              title="Reset Quiz"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs">Reset</span>
            </button>
          )}

          <button
            onClick={() => loadQuiz(document.id)}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-ink-500 hover:text-accent hover:bg-paper-200/70 text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Generate new questions"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-xs">New Quiz</span>
          </button>
        </div>
      </div>

      {/* Questions Stream */}
      <div className="flex-1 p-6 overflow-y-auto space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-ink-500 gap-3">
            <span className="w-7 h-7 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
            <p className="text-xs font-medium text-ink-600">
              Generating multiple-choice questions & verifying explanations...
            </p>
          </div>
        ) : questions.length > 0 ? (
          questions.map((q, qIndex) => {
            const userAnswer = selectedAnswers[q.id];
            const isAnswered = userAnswer !== undefined;
            const isCorrect = isAnswered && userAnswer === q.correct_index;

            return (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-paper-50 border border-paper-200 shadow-sm space-y-4 transition-all"
              >
                {/* Question Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-md bg-paper-200 border border-paper-300 text-ink-700 text-xs font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {qIndex + 1}
                    </span>
                    <h4 className="text-sm font-semibold text-ink-900 leading-snug">
                      {q.question}
                    </h4>
                  </div>

                  <button
                    onClick={() => onSelectPage(q.page_number)}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-mono text-ink-600 hover:text-accent px-2.5 py-1 rounded-md bg-white border border-paper-300 hover:border-accent/30 shadow-subtle transition-all"
                    title={`Jump to Page ${q.page_number}`}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-accent" />
                    <span>Page {q.page_number}</span>
                  </button>
                </div>

                {/* Options List */}
                <div className="space-y-2 pt-1">
                  {q.options.map((opt, optIdx) => {
                    let btnStyle =
                      'bg-white border-paper-300 hover:border-paper-400 hover:bg-paper-100/50 text-ink-800 shadow-subtle';

                    if (isAnswered) {
                      if (optIdx === q.correct_index) {
                        btnStyle =
                          'bg-sage-light border-sage/50 text-sage-dark font-medium shadow-sm';
                      } else if (optIdx === userAnswer) {
                        btnStyle =
                          'bg-crimson-light border-crimson/50 text-crimson font-medium shadow-sm';
                      } else {
                        btnStyle =
                          'bg-white/50 border-paper-200 text-ink-400 opacity-60';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(q.id, optIdx)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-all ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-5 h-5 rounded-md text-[11px] font-mono font-bold flex items-center justify-center flex-shrink-0 border ${
                              isAnswered && optIdx === q.correct_index
                                ? 'bg-sage text-white border-sage'
                                : isAnswered && optIdx === userAnswer
                                ? 'bg-crimson text-white border-crimson'
                                : 'bg-paper-100 text-ink-600 border-paper-300'
                            }`}
                          >
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                        </div>

                        {isAnswered && optIdx === q.correct_index && (
                          <CheckCircle2 className="w-4 h-4 text-sage flex-shrink-0" />
                        )}
                        {isAnswered && optIdx === userAnswer && optIdx !== q.correct_index && (
                          <XCircle className="w-4 h-4 text-crimson flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Grounded Explanation Box */}
                {isAnswered && (
                  <div
                    className={`p-4 rounded-xl border text-xs leading-relaxed animate-fade-in ${
                      isCorrect
                        ? 'bg-sage-light/60 border-sage/30 text-sage-dark'
                        : 'bg-crimson-light/60 border-crimson/30 text-ink-800'
                    }`}
                  >
                    <div className="font-semibold flex items-center gap-1.5 mb-1.5">
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-sage" />
                          <span>Correct Answer</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4 text-crimson" />
                          <span className="text-crimson font-semibold">
                            Incorrect. Option {String.fromCharCode(65 + q.correct_index)} is correct.
                          </span>
                        </>
                      )}
                    </div>
                    <p className="font-serif text-ink-700 leading-normal pl-5">
                      {q.explanation}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 text-ink-400">
            <p className="text-sm">No quiz questions generated for this document.</p>
          </div>
        )}
      </div>
    </div>
  );
};
