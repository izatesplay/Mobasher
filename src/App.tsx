import React, { useState, useEffect } from "react";
import { User, CategoryNode } from "./types";
import { api } from "./lib/api";
import { Header } from "./components/Header";
import { SidebarTree } from "./components/SidebarTree";
import { NodeContentViewer } from "./components/NodeContentViewer";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AuthModal } from "./components/AuthModal";
import { AiAssistantDrawer } from "./components/AiAssistantDrawer";
import { Bot, Layers, Sparkles } from "lucide-react";

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // Nodes Data
  const [nodes, setNodes] = useState<CategoryNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Views & UI Drawers
  const [viewMode, setViewMode] = useState<"viewer" | "admin">("viewer");
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Initial Auth Check and Data Fetching
  useEffect(() => {
    checkInitialAuth();
  }, []);

  const checkInitialAuth = async () => {
    const token = localStorage.getItem("mobasher_auth_token");
    if (!token) {
      setIsAuthChecking(false);
      return;
    }

    try {
      const user = await api.getCurrentUser();
      setCurrentUser(user);
      await fetchCategoryNodes();
    } catch (err) {
      console.error("Auth check failed:", err);
      localStorage.removeItem("mobasher_auth_token");
    } finally {
      setIsAuthChecking(false);
    }
  };

  const fetchCategoryNodes = async () => {
    try {
      const data = await api.getNodes();
      setNodes(data);
      // Select first node if none selected
      if (data.length > 0 && !selectedNodeId) {
        setSelectedNodeId(data[0].id);
      }
    } catch (err) {
      console.error("Error fetching nodes:", err);
    }
  };

  const handleLoginSuccess = async (user: User) => {
    setCurrentUser(user);
    await fetchCategoryNodes();
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setNodes([]);
    setSelectedNodeId(null);
  };

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center space-y-4 font-sans">
        <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-amber-400 font-bold animate-pulse">در حال بارگذاری مرجع محتوای مباشر...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthModal onLoginSuccess={handleLoginSuccess} />;
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Header */}
      <Header
        user={currentUser}
        onLogout={handleLogout}
        activeView={viewMode}
        onToggleView={(mode) => setViewMode(mode)}
        onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen((prev) => !prev)}
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
              onSelectNode={(id) => setSelectedNodeId(id)}
              searchQuery={searchQuery}
              onSearchChange={(q) => setSearchQuery(q)}
              isMobileOpen={isMobileMenuOpen}
              onCloseMobile={() => setIsMobileMenuOpen(false)}
            />

            {/* Content Display Area */}
            <NodeContentViewer
              node={selectedNode}
              allNodes={nodes}
              onSelectNode={(id) => setSelectedNodeId(id)}
              onOpenAiAssistant={() => setIsAiDrawerOpen(true)}
            />
          </>
        )}
      </main>

      {/* Floating AI Assistant Trigger Button (Bottom Left) */}
      <button
        onClick={() => setIsAiDrawerOpen(true)}
        className="fixed bottom-6 left-6 z-40 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white p-3.5 rounded-2xl shadow-2xl border border-cyan-400/30 flex items-center gap-2 group transition hover:scale-105 cursor-pointer"
        title="دستیار هوشمند پاسخگویی کال‌سنتر"
      >
        <div className="relative">
          <Bot className="w-5 h-5 text-cyan-200" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full animate-ping" />
        </div>
        <span className="text-xs font-bold text-slate-100 hidden sm:inline">دستیار هوشمند AI</span>
      </button>

      {/* AI Assistant Drawer */}
      <AiAssistantDrawer isOpen={isAiDrawerOpen} onClose={() => setIsAiDrawerOpen(false)} />
    </div>
  );
}

export default App;
