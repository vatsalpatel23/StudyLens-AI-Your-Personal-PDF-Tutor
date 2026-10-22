export interface User {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  user: User;
}

export interface DocumentChunk {
  id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  token_count: number;
}

export interface Document {
  id: string;
  title: string;
  file_size_bytes: number;
  page_count: number;
  sha256_hash: string;
  summary?: string;
  created_at: string;
}

export interface DocumentDetail extends Document {
  chunk_count: number;
  chunks: DocumentChunk[];
}

export interface CitationItem {
  chunk_id: string;
  page_number: number;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: CitationItem[];
  created_at: string;
}

export interface ChatSession {
  id: string;
  document_id: string;
  title: string;
  created_at: string;
  messages: ChatMessage[];
}

export interface DocumentSummary {
  document_id: string;
  title: string;
  summary: string;
  key_takeaways: string[];
  suggested_questions: string[];
}

export interface FlashcardItem {
  id: string;
  question: string;
  answer: string;
  page_number: number;
}

export interface FlashcardSet {
  id: string;
  document_id: string;
  title: string;
  cards: FlashcardItem[];
  created_at: string;
}

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  page_number: number;
}

export interface QuizSet {
  id: string;
  document_id: string;
  title: string;
  questions: QuizQuestionItem[];
  created_at: string;
}

export type StudyMode = 'chat' | 'summary' | 'flashcards' | 'quiz';
