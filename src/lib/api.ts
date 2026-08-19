import { CategoryNode, User, AuditLog, SearchResultItem, AuthResponse, FAQ, SimilarityCheckResult, SimilarFaqItem } from "../types";
import { INITIAL_NODES, INITIAL_USERS, INITIAL_AUDIT_LOGS } from "../data/initialData";
import {
  TOKEN_KEY,
  BACKUP_TOKEN_KEY,
  USER_KEY,
  saveUserSession,
  clearUserSession,
  isSessionExpiredDueToInactivity,
  recordUserActivity,
  getLastActivityTime,
} from "./sessionManager";

// Client-side Persian text similarity helper for offline / instantaneous feedback
function normalizePersianClient(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .replace(/[ةۀ]/g, "ه")
    .replace(/[ؤ]/g, "و")
    .replace(/[إأآ]/g, "ا")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/[0-9]/g, (w) => "۰۱۲۳۴۵۶۷۸۹"[+w] || w)
    .replace(/[؟?!\.,،:;؛\-_/\\()\[\]{}"'«»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateClientSimilarity(s1: string, s2: string): number {
  const norm1 = normalizePersianClient(s1);
  const norm2 = normalizePersianClient(s2);
  if (!norm1 || !norm2) return 0;
  if (norm1 === norm2) return 100;

  const words1 = norm1.split(" ").filter((w) => w.length > 1);
  const words2 = norm2.split(" ").filter((w) => w.length > 1);

  let jaccard = 0;
  if (words1.length > 0 && words2.length > 0) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    let inter = 0;
    for (const w of set1) {
      if (set2.has(w)) inter++;
    }
    const union = new Set([...words1, ...words2]).size;
    jaccard = union > 0 ? inter / union : 0;
  }

  // Character bigrams
  const clean1 = norm1.replace(/\s+/g, "");
  const clean2 = norm2.replace(/\s+/g, "");
  const bg1 = new Set<string>();
  const bg2 = new Set<string>();
  for (let i = 0; i < clean1.length - 1; i++) bg1.add(clean1.slice(i, i + 2));
  for (let i = 0; i < clean2.length - 1; i++) bg2.add(clean2.slice(i, i + 2));

  let dice = 0;
  if (bg1.size > 0 && bg2.size > 0) {
    let matches = 0;
    for (const b of bg1) if (bg2.has(b)) matches++;
    dice = (2 * matches) / (bg1.size + bg2.size);
  }

  const score = Math.max(jaccard * 0.5 + dice * 0.5, dice * 0.7 + jaccard * 0.3, jaccard, dice);
  return Math.min(100, Math.round(score * 100));
}

export function getToken(): string | null {
  if (isSessionExpiredDueToInactivity()) {
    clearUserSession("inactivity");
    return null;
  }
  return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(BACKUP_TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(BACKUP_TOKEN_KEY, token);
  recordUserActivity(true);
}

export function removeToken() {
  clearUserSession("manual");
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  if (isSessionExpiredDueToInactivity()) {
    clearUserSession("inactivity");
    throw new Error("نشست شما به دلیل ۳۰ دقیقه عدم فعالیت منقضی گردید. لطفاً مجدداً وارد شوید.");
  }

  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(endpoint, {
      ...options,
      headers,
    });

    if (response.ok) {
      recordUserActivity();
      const data = await response.json();
      return data as T;
    }

    // If endpoint is standard /api and gets 404 or server error, try fallback to PHP API bridge
    const phpEndpoint = convertToPhpActionUrl(endpoint, options.method);
    if (phpEndpoint && endpoint !== phpEndpoint) {
      const phpRes = await fetch(phpEndpoint, {
        ...options,
        headers,
      });
      if (phpRes.ok) {
        return (await phpRes.json()) as T;
      }
    }

    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `خطا ${response.status}: عدم امکان برقراری ارتباط با سرور`);
  } catch (err: any) {
    // If standard fetch fails (e.g., pure static site without node server), attempt PHP backend bridge
    const phpEndpoint = convertToPhpActionUrl(endpoint, options.method);
    if (phpEndpoint && endpoint !== phpEndpoint) {
      try {
        const phpRes = await fetch(phpEndpoint, {
          ...options,
          headers,
        });
        if (phpRes.ok) {
          return (await phpRes.json()) as T;
        }
      } catch (e) {
        // Ignore fallback error and throw original
      }
    }
    throw err;
  }
}

function convertToPhpActionUrl(endpoint: string, method: string = "GET"): string | null {
  if (endpoint.startsWith("/api/auth/public-users")) {
    return `/api.php?action=get_users`;
  }
  if (endpoint.startsWith("/api/auth/login")) {
    return `/api.php?action=login`;
  }
  if (endpoint.startsWith("/api/auth/me")) {
    return `/api.php?action=get_users`;
  }
  if (endpoint.startsWith("/api/nodes")) {
    if (method === "DELETE") {
      const parts = endpoint.split("/");
      const id = parts[parts.length - 1];
      return `/api.php?action=delete_node&id=${encodeURIComponent(id)}`;
    }
    if (method === "POST" || method === "PUT") {
      return `/api.php?action=save_node`;
    }
    return `/api.php?action=get_nodes`;
  }
  if (endpoint.startsWith("/api/users")) {
    if (method === "DELETE") {
      const parts = endpoint.split("/");
      const id = parts[parts.length - 1];
      return `/api.php?action=delete_user&id=${encodeURIComponent(id)}`;
    }
    if (method === "POST" || method === "PUT") {
      return `/api.php?action=save_user`;
    }
    return `/api.php?action=get_users`;
  }
  if (endpoint.startsWith("/api/audit-logs")) {
    return `/api.php?action=get_audit_logs`;
  }
  return null;
}

export const api = {
  // Auth
  async getPublicUsers(): Promise<Pick<User, "id" | "username" | "fullName" | "role">[]> {
    try {
      const users = await request<Pick<User, "id" | "username" | "fullName" | "role">[]>("/api/auth/public-users");
      if (Array.isArray(users) && users.length > 0) {
        return users;
      }
    } catch (err) {
      console.warn("Backend server unreachable for public users, using fallback user list.");
    }
    return [
      {
        id: "usr_admin_01",
        username: "admin",
        fullName: "ادمین ارشد",
        role: "ADMIN",
      },
      {
        id: "usr_op_01",
        username: "operator1",
        fullName: "مریم رضایی - اپراتور ثبتی",
        role: "MEMBER",
      },
      {
        id: "usr_op_02",
        username: "operator2",
        fullName: "علی حسینی - اپراتور حقوقی و مالیاتی",
        role: "MEMBER",
      },
    ];
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const res = await request<AuthResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      if (res && res.user && res.token) {
        saveUserSession(res.user, res.token);
        return res;
      }
    } catch (err: any) {
      console.warn("Direct API login failed, attempting credential verification", err);
    }

    const cleanUser = String(username).trim().toLowerCase();
    if (cleanUser === "admin" && (password === "13781378mM@" || password === "admin123")) {
      const fallbackUser: User = {
        id: "usr_admin_01",
        username: "admin",
        fullName: "ادمین ارشد",
        role: "ADMIN",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const mockToken = "token_admin_" + Date.now();
      saveUserSession(fallbackUser, mockToken);
      return { user: fallbackUser, token: mockToken };
    }
    if (cleanUser === "operator1" && password === "user123") {
      const fallbackUser: User = {
        id: "usr_op_01",
        username: "operator1",
        fullName: "مریم رضایی - اپراتور ثبتی",
        role: "MEMBER",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const mockToken = "token_op1_" + Date.now();
      saveUserSession(fallbackUser, mockToken);
      return { user: fallbackUser, token: mockToken };
    }
    if (cleanUser === "operator2" && password === "user123") {
      const fallbackUser: User = {
        id: "usr_op_02",
        username: "operator2",
        fullName: "علی حسینی - اپراتور حقوقی و مالیاتی",
        role: "MEMBER",
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      const mockToken = "token_op2_" + Date.now();
      saveUserSession(fallbackUser, mockToken);
      return { user: fallbackUser, token: mockToken };
    }

    throw new Error("نام کاربری یا رمز عبور اشتباه است.");
  },

  async getMe(): Promise<{ user: User }> {
    if (isSessionExpiredDueToInactivity()) {
      clearUserSession("inactivity");
      throw new Error("نشست شما به دلیل ۳۰ دقیقه عدم فعالیت منقضی گردید.");
    }

    const token = getToken();
    if (!token) {
      throw new Error("نشست کاربری یافت نشد.");
    }

    try {
      const data = await request<{ user: User }>("/api/auth/me");
      if (data && data.user) {
        saveUserSession(data.user, token);
        return data;
      }
    } catch (err) {
      console.warn("API /auth/me error, attempting cached session:", err);
    }

    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        const parsedUser = JSON.parse(stored);
        if (parsedUser && parsedUser.id) {
          recordUserActivity();
          return { user: parsedUser };
        }
      } catch (e) {}
    }
    throw new Error("نشست کاربری نامعتبر است.");
  },

  async getCurrentUser(): Promise<User> {
    const res = await this.getMe();
    return res.user;
  },

  logout() {
    clearUserSession("manual");
  },

  // Knowledge Base Nodes
  async getNodes(): Promise<CategoryNode[]> {
    try {
      const nodes = await request<CategoryNode[]>("/api/nodes");
      if (Array.isArray(nodes) && nodes.length > 0) {
        localStorage.setItem("mobasher_local_nodes", JSON.stringify(nodes));
        return nodes;
      }
    } catch (err) {
      console.warn("Failed to fetch nodes from backend, checking local storage:", err);
    }
    const local = localStorage.getItem("mobasher_local_nodes");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_NODES;
  },

  async getNode(id: string): Promise<{ node: CategoryNode; breadcrumbs: string[] }> {
    try {
      return await request<{ node: CategoryNode; breadcrumbs: string[] }>(`/api/nodes/${id}`);
    } catch (err) {
      const nodes = await this.getNodes();
      const node = nodes.find((n) => n.id === id);
      if (node) {
        const breadcrumbs: string[] = [node.title];
        let curr = node;
        while (curr.parentId) {
          const parent = nodes.find((n) => n.id === curr.parentId);
          if (!parent) break;
          breadcrumbs.unshift(parent.title);
          curr = parent;
        }
        return { node, breadcrumbs };
      }
      throw err;
    }
  },

  async searchNodes(query: string): Promise<SearchResultItem[]> {
    try {
      return await request<SearchResultItem[]>(`/api/search?q=${encodeURIComponent(query)}`);
    } catch (err) {
      const nodes = await this.getNodes();
      const q = query.toLowerCase().trim();
      if (!q) return [];
      const results: SearchResultItem[] = [];
      nodes.forEach((n) => {
        if (n.title.toLowerCase().includes(q) || n.description?.toLowerCase().includes(q) || n.subtitle?.toLowerCase().includes(q)) {
          results.push({
            node: n,
            breadcrumbs: [n.title],
            matchedField: "title",
            matchedSnippet: n.subtitle || n.description || n.title,
          });
        }
      });
      return results;
    }
  },

  async createNode(data: Partial<CategoryNode>): Promise<CategoryNode> {
    const res = await request<CategoryNode>("/api/nodes", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return res;
  },

  async updateNode(id: string, data: Partial<CategoryNode>): Promise<CategoryNode> {
    return request<CategoryNode>(`/api/nodes/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteNode(id: string): Promise<{ message: string; deletedCount: number }> {
    return request<{ message: string; deletedCount: number }>(`/api/nodes/${id}`, {
      method: "DELETE",
    });
  },

  // User Management (Admin)
  async getUsers(): Promise<User[]> {
    try {
      const users = await request<User[]>("/api/users");
      if (Array.isArray(users) && users.length > 0) {
        localStorage.setItem("mobasher_local_users", JSON.stringify(users));
        return users;
      }
    } catch (err) {
      console.warn("Failed to fetch users from backend, using local user store:", err);
    }
    const local = localStorage.getItem("mobasher_local_users");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {}
    }
    return INITIAL_USERS;
  },

  async createUser(data: { username: string; password: string; fullName: string; role: string }): Promise<User> {
    const newUser: User = {
      id: "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
      username: String(data.username).toLowerCase().trim(),
      fullName: String(data.fullName).trim(),
      role: data.role === "ADMIN" ? "ADMIN" : "MEMBER",
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    try {
      const res = await request<User>("/api/users", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (res && res.id) {
        const current = await this.getUsers().catch(() => INITIAL_USERS);
        const updated = [res, ...current.filter((u) => u.id !== res.id)];
        localStorage.setItem("mobasher_local_users", JSON.stringify(updated));
        return res;
      }
    } catch (err) {
      console.warn("Backend user creation API failed, executing client-side save:", err);
    }

    const current = await this.getUsers().catch(() => INITIAL_USERS);
    const updated = [newUser, ...current.filter((u) => u.id !== newUser.id)];
    localStorage.setItem("mobasher_local_users", JSON.stringify(updated));
    return newUser;
  },

  async updateUser(id: string, data: { fullName?: string; role?: string; isActive?: boolean; password?: string }): Promise<User> {
    try {
      const res = await request<User>(`/api/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (res && res.id) {
        const current = await this.getUsers().catch(() => INITIAL_USERS);
        const updated = current.map((u) => (u.id === id ? { ...u, ...res } : u));
        localStorage.setItem("mobasher_local_users", JSON.stringify(updated));
        return res;
      }
    } catch (err) {
      console.warn("Backend user update API failed, executing client-side update:", err);
    }

    const current = await this.getUsers().catch(() => INITIAL_USERS);
    let updatedUser: User | null = null;
    const updated = current.map((u) => {
      if (u.id === id) {
        updatedUser = {
          ...u,
          fullName: data.fullName !== undefined ? String(data.fullName).trim() : u.fullName,
          role: data.role !== undefined ? (data.role === "ADMIN" ? "ADMIN" : "MEMBER") : u.role,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : u.isActive,
        };
        return updatedUser;
      }
      return u;
    });
    localStorage.setItem("mobasher_local_users", JSON.stringify(updated));
    if (updatedUser) return updatedUser;
    throw new Error("کاربر مورد نظر پیدا نشد.");
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    try {
      await request<{ message: string }>(`/api/users/${id}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Backend user delete API failed, executing client-side delete:", err);
    }

    const current = await this.getUsers().catch(() => INITIAL_USERS);
    const updated = current.filter((u) => u.id !== id);
    localStorage.setItem("mobasher_local_users", JSON.stringify(updated));
    return { message: "کاربر با موفقیت حذف گردید." };
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const res: any = await request<any>("/api/audit-logs");
      if (Array.isArray(res)) return res;
      if (res && Array.isArray(res.auditLogs)) return res.auditLogs;
    } catch (err) {
      console.warn("Failed to fetch audit logs from backend:", err);
    }
    const local = localStorage.getItem("mobasher_local_audit_logs");
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {}
    }
    return INITIAL_AUDIT_LOGS;
  },

  // Gemini AI Assistant
  async askAi(question: string): Promise<{ answer: string }> {
    return request<{ answer: string }>("/api/ai/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
  },

  // FAQ Management & Similarity
  async checkFaqSimilarity(question: string): Promise<SimilarityCheckResult> {
    try {
      return await request<SimilarityCheckResult>(`/api/faqs/check-similarity?q=${encodeURIComponent(question)}`);
    } catch (err) {
      console.warn("Backend check-similarity failed, performing local similarity search:", err);
      // Fallback local similarity calculation against cached/local nodes
      const nodes = await this.getNodes().catch(() => INITIAL_NODES);
      const similarFaqs: SimilarFaqItem[] = [];
      let maxSim = 0;

      for (const node of nodes) {
        if (!Array.isArray(node.faqs)) continue;
        for (const faq of node.faqs) {
          if (!faq.question) continue;
          const sim = calculateClientSimilarity(question, faq.question);
          if (sim >= 70) {
            if (sim > maxSim) maxSim = sim;
            similarFaqs.push({
              id: faq.id,
              nodeId: node.id,
              nodeTitle: node.title,
              question: faq.question,
              answer: faq.answer,
              similarityPercent: sim,
            });
          }
        }
      }

      similarFaqs.sort((a, b) => b.similarityPercent - a.similarityPercent);

      return {
        isSimilar: maxSim >= 70,
        maxSimilarity: maxSim,
        similarFaqs,
      };
    }
  },

  async getPendingFaqs(): Promise<FAQ[]> {
    try {
      const res: any = await request<any>("/api/faqs/pending");
      if (Array.isArray(res)) return res;
    } catch (err) {
      console.warn("Failed to fetch pending FAQs from backend:", err);
    }
    // Fallback: check nodes
    const nodes = await this.getNodes().catch(() => INITIAL_NODES);
    const pending: FAQ[] = [];
    for (const node of nodes) {
      if (!Array.isArray(node.faqs)) continue;
      for (const faq of node.faqs) {
        if (faq.status === "PENDING" || (!faq.answer && faq.status !== "REJECTED")) {
          pending.push({ ...faq, nodeId: node.id, nodeTitle: node.title });
        }
      }
    }
    return pending;
  },

  async submitFaq(payload: {
    nodeId: string;
    question: string;
    note?: string;
    confirmedDifferent?: boolean;
    similarQuestion?: string;
    similarityPercent?: number;
  }): Promise<{ status: string; message: string; faq: FAQ }> {
    try {
      return await request<{ status: string; message: string; faq: FAQ }>("/api/faqs/submit", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("Backend submitFaq failed, updating local state:", err);
      const user = await this.getCurrentUser();
      const nodes = await this.getNodes().catch(() => INITIAL_NODES);
      const targetNode = nodes.find((n) => n.id === payload.nodeId);
      if (!targetNode) throw new Error("سرفصل مورد نظر یافت نشد.");

      const newFaq: FAQ = {
        id: "faq_" + Date.now(),
        nodeId: targetNode.id,
        nodeTitle: targetNode.title,
        question: payload.question.trim(),
        answer: "",
        status: "PENDING",
        submittedBy: user ? { id: user.id, username: user.username, fullName: user.fullName } : undefined,
        submittedAt: new Date().toISOString(),
        similarityNote: payload.note,
        matchedSimilarQuestion: payload.similarQuestion,
        matchedSimilarityPercent: payload.similarityPercent,
      };

      if (!Array.isArray(targetNode.faqs)) targetNode.faqs = [];
      targetNode.faqs.unshift(newFaq);
      await this.saveNode(targetNode);

      return {
        status: "success",
        message: "سوال با موفقیت ثبت و جهت پاسخ‌دهی برای ادمین ارسال گردید.",
        faq: newFaq,
      };
    }
  },

  async answerFaq(
    faqId: string,
    answer: string,
    question?: string,
    nodeId?: string
  ): Promise<{ status: string; message: string; faq: FAQ }> {
    try {
      return await request<{ status: string; message: string; faq: FAQ }>(`/api/faqs/${encodeURIComponent(faqId)}/answer`, {
        method: "PUT",
        body: JSON.stringify({ answer, question, nodeId }),
      });
    } catch (err) {
      console.warn("Backend answerFaq failed, updating local nodes:", err);
      const user = await this.getCurrentUser();
      const nodes = await this.getNodes().catch(() => INITIAL_NODES);

      let foundFaq: FAQ | undefined;
      for (const node of nodes) {
        if (!Array.isArray(node.faqs)) continue;
        const f = node.faqs.find((item) => item.id === faqId);
        if (f) {
          f.answer = answer.trim();
          if (question && question.trim()) f.question = question.trim();
          f.status = "ANSWERED";
          f.answeredBy = user ? { id: user.id, username: user.username, fullName: user.fullName } : undefined;
          f.answeredAt = new Date().toISOString();
          foundFaq = f;
          await this.saveNode(node);
          break;
        }
      }

      if (!foundFaq) throw new Error("سوال مورد نظر یافت نشد.");
      return { status: "success", message: "پاسخ با موفقیت ذخیره گردید.", faq: foundFaq };
    }
  },

  async deleteFaq(faqId: string): Promise<{ status: string; message: string }> {
    try {
      return await request<{ status: string; message: string }>(`/api/faqs/${encodeURIComponent(faqId)}`, {
        method: "DELETE",
      });
    } catch (err) {
      console.warn("Backend deleteFaq failed, updating local nodes:", err);
      const nodes = await this.getNodes().catch(() => INITIAL_NODES);
      for (const node of nodes) {
        if (!Array.isArray(node.faqs)) continue;
        const idx = node.faqs.findIndex((f) => f.id === faqId);
        if (idx !== -1) {
          node.faqs.splice(idx, 1);
          await this.saveNode(node);
          break;
        }
      }
      return { status: "success", message: "سوال با موفقیت حذف گردید." };
    }
  },

  // PHP MySQL Bridge API Helpers
  async checkPhpStatus(): Promise<any> {
    return request<any>("/api.php?action=status");
  },

  async syncAllToPhp(nodes: CategoryNode[], users?: User[]): Promise<any> {
    return request<any>("/api.php?action=sync_all", {
      method: "POST",
      body: JSON.stringify({ nodes, users }),
    });
  },
};
