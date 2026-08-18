export type Role = 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface RequiredDocument {
  id: string;
  name: string;
  description?: string;
  isMandatory: boolean;
  recipientRole?: string; // e.g., 'همه شرکا', 'مدیرعامل', 'سهامداران'
  notes?: string;
}

export interface ProcessStep {
  id: string;
  stepNumber: number;
  title: string;
  detail: string;
  estimatedTime?: string; // e.g. '۲ روز کاری'
}

export type FAQStatus = 'PENDING' | 'ANSWERED' | 'REJECTED';

export interface FAQ {
  id: string;
  nodeId?: string;
  nodeTitle?: string;
  question: string;
  answer: string;
  status?: FAQStatus; // 'PENDING' for operator submissions, 'ANSWERED' when published
  submittedBy?: {
    id: string;
    username: string;
    fullName: string;
  };
  submittedAt?: string;
  answeredBy?: {
    id: string;
    username: string;
    fullName: string;
  };
  answeredAt?: string;
  similarityNote?: string;
  matchedSimilarQuestion?: string;
  matchedSimilarityPercent?: number;
}

export interface SimilarFaqItem {
  id: string;
  nodeId: string;
  nodeTitle: string;
  question: string;
  answer: string;
  similarityPercent: number;
}

export interface SimilarityCheckResult {
  isSimilar: boolean; // true if maxSimilarity >= 70%
  maxSimilarity: number;
  similarFaqs: SimilarFaqItem[];
}

export interface CategoryNode {
  id: string;
  parentId: string | null; // null if top-level Domain
  title: string;
  subtitle?: string;
  description?: string;
  icon?: string; // e.g. 'building', 'scale', 'file-text', 'calculator', etc.
  order: number;
  isPublished: boolean;
  
  // Detailed Content for leaf or nested nodes
  requiredDocuments: RequiredDocument[];
  processSteps: ProcessStep[];
  faqs: FAQ[];
  costsAndDeadlines?: {
    governmentFee?: string;
    serviceFee?: string;
    totalDuration?: string;
    notes?: string;
  };
  tags?: string[];
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action:
    | 'CREATE_NODE'
    | 'UPDATE_NODE'
    | 'DELETE_NODE'
    | 'CREATE_USER'
    | 'UPDATE_USER'
    | 'DELETE_USER'
    | 'RESET_PASSWORD'
    | 'SYSTEM_INIT'
    | 'SUBMIT_FAQ'
    | 'ANSWER_FAQ'
    | 'DELETE_FAQ';
  details: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SearchResultItem {
  node: CategoryNode;
  breadcrumbs: string[];
  matchedField: 'title' | 'description' | 'document' | 'faq' | 'tag';
  matchedSnippet: string;
}

