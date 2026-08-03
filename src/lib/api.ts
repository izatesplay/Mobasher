import { CategoryNode, User, AuditLog, SearchResultItem, AuthResponse } from "../types";

const TOKEN_KEY = "mobasher_karmon_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
    return `/api.php?action=get_users`;
  }
  if (endpoint.startsWith("/api/audit-logs")) {
    return `/api.php?action=get_all`;
  }
  return null;
}

export const api = {
  // Auth
  async getPublicUsers(): Promise<Pick<User, "id" | "username" | "fullName" | "role">[]> {
    return request<Pick<User, "id" | "username" | "fullName" | "role">[]>("/api/auth/public-users");
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setToken(res.token);
    return res;
  },

  async getMe(): Promise<{ user: User }> {
    return request<{ user: User }>("/api/auth/me");
  },

  async getCurrentUser(): Promise<User> {
    const res = await this.getMe();
    return res.user;
  },

  logout() {
    removeToken();
  },

  // Knowledge Base Nodes
  async getNodes(): Promise<CategoryNode[]> {
    return request<CategoryNode[]>("/api/nodes");
  },

  async getNode(id: string): Promise<{ node: CategoryNode; breadcrumbs: string[] }> {
    return request<{ node: CategoryNode; breadcrumbs: string[] }>(`/api/nodes/${id}`);
  },

  async searchNodes(query: string): Promise<SearchResultItem[]> {
    return request<SearchResultItem[]>(`/api/search?q=${encodeURIComponent(query)}`);
  },

  async createNode(data: Partial<CategoryNode>): Promise<CategoryNode> {
    return request<CategoryNode>("/api/nodes", {
      method: "POST",
      body: JSON.stringify(data),
    });
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
    return request<User[]>("/api/users");
  },

  async createUser(data: { username: string; password: string; fullName: string; role: string }): Promise<User> {
    return request<User>("/api/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateUser(id: string, data: { fullName?: string; role?: string; isActive?: boolean; password?: string }): Promise<User> {
    return request<User>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/users/${id}`, {
      method: "DELETE",
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<AuditLog[]> {
    return request<AuditLog[]>("/api/audit-logs");
  },

  // Gemini AI Assistant
  async askAi(question: string): Promise<{ answer: string }> {
    return request<{ answer: string }>("/api/ai/ask", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
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
