import React, { useState, useEffect } from "react";
import { User, CategoryNode } from "./types";
import { api } from "./lib/api";
import {
  initSessionInactivityTracker,
  isSessionExpiredDueToInactivity,
  clearUserSession,
  recordUserActivity,
  TOKEN_KEY,
  BACKUP_TOKEN_KEY,
} from "./lib/sessionManager";
import { useTheme } from "./context/ThemeContext";
import { Header } from "./components/Header";
import { SidebarTree } from "./components/SidebarTree";
import { NodeContentViewer } from "./components/NodeContentViewer";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AuthModal } from "./components/AuthModal";
import { AiAssistantDrawer } from "./components/AiAssistantDrawer";
import { Bot } from "lucide-react";

export function App() {
  const { isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Nodes Data
  const [nodes, setNodes] = useState<CategoryNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedTargetTab, setSelectedTargetTab] = useState<
    "subcategories" | "documents" | "process" | "faqs" | undefined
  >(undefined);
  const [searchQuery, setSearchQuery] = useState("");

  // Views & UI Drawers
  const [viewMode, setViewMode] = useState<"viewer" | "admin">("viewer");
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initial Auth Check on Page Load / Refresh
  useEffect(() => {
    checkInitialAuth();
  }, []);

  // 30-Minute Inactivity Session Tracker (Active while user is logged in)
  useEffect(() => {
    if (!currentUser) return;

    // Start tracking user activity (mouse, keyboard, scroll, touch, clicks)
    const cleanupTracker = initSessionInactivityTracker(() => {
      // Callback triggered when 30 minutes of inactivity is reached
      setCurrentUser(null);
      setNodes([]);
      setSelectedNodeId(null);
      setSelectedTargetTab(undefined);
    });

    return () => {
      cleanupTracker();
    };
  }, [currentUser]);

  const checkInitialAuth = async () => {
    // 1. Check if 30 minutes of inactivity has already elapsed
    if (isSessionExpiredDueToInactivity()) {
      clearUserSession("inactivity");
      setIsAuthChecking(false);
      return;
    }

    const token = localStorage.getItem(TOKEN_KEY) || localStorage.getItem(BACKUP_TOKEN_KEY);
    if (!token) {
      setIsAuthChecking(false);
      return;
    }

    try {
      const user = await api.getCurrentUser();
      if (user && user.id) {
        setCurrentUser(user);
        recordUserActivity(true);
        await fetchCategoryNodes();
      } else {
        clearUserSession("manual");
      }
    } catch (err) {
      console.warn("Session validation error on refresh:", err);
      // If error is specifically inactivity expiration
      if (isSessionExpiredDueToInactivity()) {
        clearUserSession("inactivity");
      }
    } finally {
      setIsAuthChecking(false);
    }
  };

  const fetchCategoryNodes = async () => {
    try {
      const data = await api.getNodes();
      setNodes(data);
    } catch (err) {
      console.error("Error fetching nodes:", err);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    recordUserActivity(true);
    await fetchCategoryNodes();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setNodes([]);
    setSelectedNodeId(null);
    setSelectedTargetTab(undefined);
  };

  const handleSelectNode = (
    id: string | null,
    targetTab?: "subcategories" | "documents" | "process" | "faqs"
  ) => {
    setSelectedNodeId(id);
    setSelectedTargetTab(targetTab);
  };

  if (isAuthChecking) {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center space-y-4 font-sans ${
          isDark ? "bg-[#0a0a0a] text-white" : "bg-slate-50 text-slate-900"
        }`}
      >
        <div
          className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${
            isDark ? "border-[#c9a050]" : "border-[#0b216f]"
          }`}
        />
        <p
          className={`text-xs font-bold animate-pulse ${
            isDark ? "text-[#c9a050]" : "text-[#0b216f]"
          }`}
        >
          در حال بارگذاری مرجع محتوای مباشر...
        </p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) || null : null;

  return (
    <div
      dir="rtl"
      className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
        isDark ? "bg-[#0a0a0a] text-white" : "bg-[#f8fafc] text-slate-900"
      }`}
    >
      {/* Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        activeView={viewMode}
        onToggleView={(mode) => setViewMode(mode)}
        onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
        onGoHome={() => handleSelectNode(null)}
      />

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative">
        {viewMode === "admin" && currentUser.role === "ADMIN" ? (
          <AdminDashboard nodes={nodes} onRefreshNodes={fetchCategoryNodes} currentUser={currentUser} />
        ) : (
          <>
            {/* Sidebar Navigation */}
            <SidebarTree
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
              isMobileOpen={isMobileMenuOpen}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />

            {/* Content Display Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <NodeContentViewer
                node={selectedNode}
                allNodes={nodes}
                onSelectNode={handleSelectNode}
                onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
                searchQuery={searchQuery}
                targetTab={selectedTargetTab}
              />
            </div>
          </>
        )}
      </main>

      {/* Floating AI Assistant Trigger Button (Bottom Left) */}
      <button
        onClick={() => setIsAiDrawerOpen(true)}
        className={`fixed bottom-6 left-6 z-40 p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 transition hover:scale-105 cursor-pointer border ${
          isDark
            ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] border-[#c9a050]"
            : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
        }`}
        title="دستیار هوشمند پاسخگویی کال‌سنتر"
      >
        <div className="relative">
          <Bot className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
        </div>
        <span className="text-xs font-bold hidden sm:inline">دستیار هوشمند AI</span>
      </button>

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />
    </div>
  );
}

export default App;
