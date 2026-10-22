import {
  AuthResponse,
  User,
  Document,
  DocumentDetail,
  ChatMessage,
  ChatSession,
  DocumentSummary,
  FlashcardSet,
  QuizSet,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = localStorage.getItem('studylens_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('studylens_token', token);
    } else {
      localStorage.removeItem('studylens_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }
    if (!(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      this.setToken(null);
      window.dispatchEvent(new Event('auth:unauthorized'));
    }

    if (!response.ok) {
      let errorDetail = 'Request failed';
      try {
        const errJson = await response.json();
        errorDetail = errJson.detail || errorDetail;
      } catch {
        errorDetail = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(errorDetail);
    }

    return response.json();
  }

  // Authentication
  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    return data;
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      this.setToken(null);
    }
  }

  // Documents
  async uploadDocument(file: File): Promise<Document> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<Document>('/documents/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async getDocuments(): Promise<Document[]> {
    return this.request<Document[]>('/documents');
  }

  async getDocumentDetail(documentId: string): Promise<DocumentDetail> {
    return this.request<DocumentDetail>(`/documents/${documentId}`);
  }

  async deleteDocument(documentId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  getDocumentDownloadUrl(documentId: string): string {
    return `${API_BASE}/documents/${documentId}/download`;
  }

  // RAG Chat
  async sendChatMessage(documentId: string, message: string, sessionId?: string): Promise<ChatMessage> {
    return this.request<ChatMessage>('/chat/message', {
      method: 'POST',
      body: JSON.stringify({
        document_id: documentId,
        message,
        session_id: sessionId,
      }),
    });
  }

  async getChatHistory(documentId: string): Promise<ChatSession> {
    return this.request<ChatSession>(`/chat/sessions/${documentId}`);
  }

  async clearChatSession(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/chat/sessions/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Study Tools
  async getDocumentSummary(documentId: string): Promise<DocumentSummary> {
    return this.request<DocumentSummary>(`/study/summary/${documentId}`);
  }

  async getDocumentFlashcards(documentId: string): Promise<FlashcardSet> {
    return this.request<FlashcardSet>(`/study/flashcards/${documentId}`);
  }

  async getDocumentQuiz(documentId: string): Promise<QuizSet> {
    return this.request<QuizSet>(`/study/quiz/${documentId}`);
  }

  // Health
  async getHealth(): Promise<any> {
    return this.request('/health');
  }
}

export const api = new ApiService();
