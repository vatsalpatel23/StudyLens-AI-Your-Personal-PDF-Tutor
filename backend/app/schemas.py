from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime


# ---------------------------------------------------------
# Authentication Schemas
# ---------------------------------------------------------

class UserRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        has_digit = any(c.isdigit() for c in v)
        has_alpha = any(c.isalpha() for c in v)
        if not (has_digit and has_alpha):
            raise ValueError("Password must contain at least one letter and one number")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_active: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int
    user: UserResponse


# ---------------------------------------------------------
# Document Schemas
# ---------------------------------------------------------

class DocumentChunkResponse(BaseModel):
    id: str
    chunk_index: int
    page_number: int
    content: str
    token_count: int

    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: str
    title: str
    file_size_bytes: int
    page_count: int
    sha256_hash: str
    summary: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentDetailResponse(DocumentResponse):
    chunk_count: int
    chunks: list[DocumentChunkResponse] = []


# ---------------------------------------------------------
# RAG Chat Schemas
# ---------------------------------------------------------

class CitationItem(BaseModel):
    chunk_id: str
    page_number: int
    snippet: str


class ChatSendRequest(BaseModel):
    document_id: str
    message: str = Field(min_length=1, max_length=2000)
    session_id: Optional[str] = None


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    citations: list[CitationItem] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatSessionResponse(BaseModel):
    id: str
    document_id: str
    title: str
    created_at: datetime
    messages: list[ChatMessageResponse] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------
# Study Tools Schemas (Summary, Flashcards, Quiz)
# ---------------------------------------------------------

class FlashcardItem(BaseModel):
    id: str
    question: str
    answer: str
    page_number: int


class FlashcardSetResponse(BaseModel):
    id: str
    document_id: str
    title: str
    cards: list[FlashcardItem]
    created_at: datetime


class QuizQuestionItem(BaseModel):
    id: str
    question: str
    options: list[str]
    correct_index: int
    explanation: str
    page_number: int


class QuizSetResponse(BaseModel):
    id: str
    document_id: str
    title: str
    questions: list[QuizQuestionItem]
    created_at: datetime


class DocumentSummaryResponse(BaseModel):
    document_id: str
    title: str
    summary: str
    key_takeaways: list[str]
    suggested_questions: list[str]
