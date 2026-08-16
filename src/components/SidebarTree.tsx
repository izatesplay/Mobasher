import React, { useState, useMemo } from "react";
import { CategoryNode } from "../types";
import { useTheme } from "../context/ThemeContext";
import {
  getNodeSearchMatch,
  HighlightText,
  MatchDetail,
  NodeSearchMatch,
} from "../lib/searchUtils";
import {
  Folder,
  ChevronLeft,
  ChevronDown,
  Search,
  Building2,
  Calculator,
  Scale,
  FileText,
  Award,
  ShieldCheck,
  FolderGit2,
  BadgeCheck,
  Receipt,
  FileSpreadsheet,
  QrCode,
  Layers,
  Sparkles,
  Briefcase,
  Landmark,
  Banknote,
  Coins,
  Percent,
  BookOpen,
  PenTool,
  ShieldAlert,
  Gavel,
  HeartHandshake,
  UserCheck,
  Users,
  FileSignature,
  FileEdit,
  RefreshCw,
  TrendingUp,
  Stamp,
  Globe,
  FileCheck2,
  X,
  FileCheck,
  HelpCircle,
  ListOrdered,
  Tag,
  DollarSign,
} from "lucide-react";

interface SidebarTreeProps {
  nodes: CategoryNode[];
  selectedNodeId: string | null;
  onSelectNode: (id: string | null, targetTab?: "subcategories" | "documents" | "process" | "faqs") => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

// Icon mapper helper supporting registration, tax, legal, and financial domains
export const renderCategoryIcon = (iconName?: string, className = "w-4 h-4") => {
  switch (iconName) {
    case "Building2":
    case "Building":
      return <Building2 className={className} />;
    case "Briefcase":
      return <Briefcase className={className} />;
    case "Calculator":
      return <Calculator className={className} />;
    case "Scale":
      return <Scale className={className} />;
    case "Award":
      return <Award className={className} />;
    case "ShieldCheck":
      return <ShieldCheck className={className} />;
    case "FolderGit2":
      return <FolderGit2 className={className} />;
    case "BadgeCheck":
      return <BadgeCheck className={className} />;
    case "Receipt":
      return <Receipt className={className} />;
    case "FileSpreadsheet":
      return <FileSpreadsheet className={className} />;
    case "QrCode":
      return <QrCode className={className} />;
    case "FileText":
      return <FileText className={className} />;
    case "FileSignature":
      return <FileSignature className={className} />;
    case "FileEdit":
      return <FileEdit className={className} />;
    case "RefreshCw":
      return <RefreshCw className={className} />;
    case "Percent":
      return <Percent className={className} />;
    case "Coins":
      return <Coins className={className} />;
    case "BookOpen":
      return <BookOpen className={className} />;
    case "PenTool":
      return <PenTool className={className} />;
    case "ShieldAlert":
      return <ShieldAlert className={className} />;
    case "Gavel":
      return <Gavel className={className} />;
    case "HeartHandshake":
      return <HeartHandshake className={className} />;
    case "Landmark":
      return <Landmark className={className} />;
    case "Banknote":
      return <Banknote className={className} />;
    case "Users":
    case "UserCheck":
      return <UserCheck className={className} />;
    case "TrendingUp":
      return <TrendingUp className={className} />;
    case "Sparkles":
      return <Sparkles className={className} />;
    case "Stamp":
      return <Stamp className={className} />;
    case "Globe":
      return <Globe className={className} />;
    case "FileCheck2":
      return <FileCheck2 className={className} />;
    default:
      return <Folder className={className} />;
  }
};

export const SidebarTree: React.FC<SidebarTreeProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  searchQuery,
  onSearchChange,
  isMobileOpen,
  onCloseMobile,
}) => {
  const { isDark } = useTheme();

  // Track open/collapsed node IDs
  const [expandedNodeIds, setExpandedNodeIds] = useState<Record<string, boolean>>({
    domain_reg: true,
    sub_company_reg: true,
    domain_tax: true,
    domain_legal: true,
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodeIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    nodes.forEach((n) => (allIds[n.id] = true));
    setExpandedNodeIds(allIds);
  };

  const collapseAll = () => {
    setExpandedNodeIds({});
  };

  // Group nodes by parentId
  const nodeMap = useMemo(() => {
    const map = new Map<string | null, CategoryNode[]>();
    nodes.forEach((node) => {
      const parent = node.parentId || null;
      if (!map.has(parent)) {
        map.set(parent, []);
      }
      map.get(parent)!.push(node);
    });

    // Sort by order
    map.forEach((children) => {
      children.sort((a, b) => a.order - b.order);
    });

    return map;
  }, [nodes]);

  // Deep search match evaluator with caching
  const checkTreeMatch = useMemo(() => {
    const matchCache = new Map<string, NodeSearchMatch>();

    const getMatch = (node: CategoryNode): NodeSearchMatch => {
      if (matchCache.has(node.id)) return matchCache.get(node.id)!;
      const match = getNodeSearchMatch(node, searchQuery);
      matchCache.set(node.id, match);
      return match;
    };

    const hasSubtreeMatch = (node: CategoryNode): boolean => {
      if (!searchQuery.trim()) return true;
      const match = getMatch(node);
      if (match.selfMatches) return true;
      const children = nodeMap.get(node.id) || [];
      return children.some((child) => hasSubtreeMatch(child));
    };

    return { getMatch, hasSubtreeMatch };
  }, [nodes, searchQuery, nodeMap]);

  // Count total matching nodes for search results counter
  const totalMatchesCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    let count = 0;
    nodes.forEach((n) => {
      if (checkTreeMatch.getMatch(n).selfMatches) {
        count++;
      }
    });
    return count;
  }, [nodes, searchQuery, checkTreeMatch]);

  const handleSelectNode = (id: string, targetTab?: "subcategories" | "documents" | "process" | "faqs") => {
    onSelectNode(id, targetTab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Recursive Tree Node component
  const TreeNodeItem: React.FC<{ node: CategoryNode; level: number }> = ({ node, level }) => {
    const children = nodeMap.get(node.id) || [];
    const hasChildren = children.length > 0;
    const isExpanded = expandedNodeIds[node.id] || Boolean(searchQuery.trim());
    const isSelected = selectedNodeId === node.id;

    const matchesSubtree = checkTreeMatch.hasSubtreeMatch(node);
    const matchInfo = checkTreeMatch.getMatch(node);

    if (searchQuery.trim() && !matchesSubtree) {
      return null;
    }

    const totalDocsCount = node.requiredDocuments ? node.requiredDocuments.length : 0;
    const totalFaqsCount = node.faqs ? node.faqs.length : 0;
    const highlightQuery = searchQuery.trim();

    return (
      <div className="select-none">
        <div
          onClick={() => handleSelectNode(node.id, matchInfo.bestTab)}
          className={`group flex flex-col px-3.5 py-2.5 my-1 rounded-2xl cursor-pointer transition-all border ${
            isSelected
              ? isDark
                ? "bg-[#c9a050] text-[#0a0a0a] font-bold border-[#c9a050] shadow-md"
                : "bg-[#0b216f] text-white font-bold border-[#0b216f] shadow-md"
              : isDark
              ? "text-[#e0e0e0] bg-[#14120f] border-[rgba(201,160,80,0.15)] hover:bg-[#1a1815] hover:border-[#c9a050]/50 hover:text-white"
              : "text-slate-800 bg-white border-slate-200 hover:bg-blue-50/70 hover:border-blue-300 shadow-xs"
          }`}
          style={{ paddingRight: `${Math.max(12, level * 16)}px` }}
        >
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  onClick={(e) => toggleExpand(node.id, e)}
                  className={`p-1 rounded-lg transition shrink-0 ${
                    isSelected
                      ? isDark
                        ? "text-[#0a0a0a] hover:bg-[#d8bf93]"
                        : "text-white hover:bg-blue-800"
                      : isDark
                      ? "text-[#888888] hover:bg-[#0a0a0a] hover:text-[#c9a050]"
                      : "text-slate-400 hover:bg-slate-100 hover:text-[#0b216f]"
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronLeft className="w-4 h-4" />
                  )}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}

              <span
                className={`shrink-0 ${
                  isSelected
                    ? isDark
                      ? "text-[#0a0a0a]"
                      : "text-white"
                    : isDark
                    ? level === 0
                      ? "text-[#c9a050]"
                      : "text-[#888888]"
                    : level === 0
                    ? "text-[#0b216f]"
                    : "text-slate-500"
                }`}
              >
                {renderCategoryIcon(node.icon, level === 0 ? "w-4.5 h-4.5" : "w-4 h-4")}
              </span>

              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-sm sm:text-[15px] font-bold truncate leading-snug">
                  <HighlightText
                    text={node.title}
                    query={highlightQuery}
                    highlightClass={
                      isSelected
                        ? isDark
                          ? "bg-[#0a0a0a] text-[#c9a050] px-1 py-0.5 rounded font-bold"
                          : "bg-amber-300 text-slate-950 px-1 py-0.5 rounded font-black"
                        : isDark
                        ? "bg-[#c9a050]/30 text-[#d8bf93] px-1 py-0.5 rounded font-bold"
                        : "bg-amber-200 text-amber-950 px-1 py-0.5 rounded font-bold"
                    }
                  />
                </span>
                {node.subtitle && (
                  <span
                    className={`text-xs truncate font-normal mt-0.5 ${
                      isSelected
                        ? isDark
                          ? "text-[#1a1815]"
                          : "text-blue-100"
                        : isDark
                        ? "text-[#888888]"
                        : "text-slate-500"
                    }`}
                  >
                    <HighlightText
                      text={node.subtitle}
                      query={highlightQuery}
                      highlightClass={
                        isSelected
                          ? isDark
                            ? "bg-[#0a0a0a] text-[#c9a050] px-0.5 rounded"
                            : "bg-amber-300 text-slate-950 px-0.5 rounded"
                          : isDark
                          ? "bg-[#c9a050]/30 text-[#d8bf93] px-0.5 rounded"
                          : "bg-amber-200 text-amber-950 px-0.5 rounded"
                      }
                    />
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 mr-2">
              {totalFaqsCount > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    isSelected
                      ? isDark
                        ? "bg-[#0a0a0a]/30 text-[#0a0a0a]"
                        : "bg-blue-800 text-blue-100"
                      : isDark
                      ? "bg-amber-950/40 text-amber-300 border border-amber-800/40"
                      : "bg-amber-50 text-amber-800 border border-amber-200"
                  }`}
                  title={`${totalFaqsCount} سوال متداول`}
                >
                  {totalFaqsCount} FAQ
                </span>
              )}
              {totalDocsCount > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                    isSelected
                      ? isDark
                        ? "bg-[#0a0a0a] text-[#c9a050] font-bold"
                        : "bg-white text-[#0b216f] font-bold"
                      : isDark
                      ? "bg-[#0a0a0a] text-[#c9a050] border border-[rgba(201,160,80,0.3)]"
                      : "bg-slate-100 text-slate-700 border border-slate-200"
                  }`}
                  title={`${totalDocsCount} مدرک لازم`}
                >
                  {totalDocsCount} مدرک
                </span>
              )}
            </div>
          </div>

          {/* Smart Search Match Details Badge Snippets (FAQs, Docs, Description, Steps) */}
          {highlightQuery && matchInfo.matchedFields.length > 0 && (
            <div
              className={`mt-2 space-y-1.5 border-t pt-2 pr-6 ${
                isSelected
                  ? isDark
                    ? "border-[#0a0a0a]/20"
                    : "border-blue-400/40"
                  : isDark
                  ? "border-[rgba(201,160,80,0.2)]"
                  : "border-slate-200"
              }`}
            >
              {matchInfo.matchedFields.slice(0, 3).map((mf, idx) => (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectNode(node.id, mf.targetTab || matchInfo.bestTab);
                  }}
                  className={`flex items-start gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border leading-relaxed transition ${
                    isSelected
                      ? isDark
                        ? "bg-[#0a0a0a] border-[#0a0a0a] text-[#e0e0e0]"
                        : "bg-blue-900/90 border-blue-800 text-white"
                      : isDark
                      ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#e0e0e0] hover:border-[#c9a050]"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300 hover:bg-blue-50/50"
                  }`}
                >
                  <span
                    className={`flex items-center gap-1 shrink-0 font-bold ${
                      isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                    }`}
                  >
                    {mf.icon}
                    <span>{mf.label}:</span>
                  </span>
                  <span className="truncate flex-1">
                    <HighlightText
                      text={mf.snippet}
                      query={highlightQuery}
                      highlightClass={
                        isDark
                          ? "bg-[#c9a050]/40 text-[#d8bf93] px-1 py-0.2 rounded font-bold"
                          : "bg-amber-200 text-amber-950 px-1 py-0.2 rounded font-bold"
                      }
                    />
                  </span>
                </div>
              ))}
              {matchInfo.matchedFields.length > 3 && (
                <span
                  className={`text-[11px] pr-1 block font-medium ${
                    isSelected
                      ? isDark
                        ? "text-[#0a0a0a]"
                        : "text-blue-200"
                      : isDark
                      ? "text-[#888888]"
                      : "text-slate-500"
                  }`}
                >
                  + {matchInfo.matchedFields.length - 3} مطابقت دیگر در سوالات یا محتوا...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Child Subcategories */}
        {hasChildren && isExpanded && (
          <div
            className={`border-r my-0.5 mr-3.5 ${
              isDark ? "border-[rgba(201,160,80,0.2)]" : "border-slate-200"
            }`}
          >
            {children.map((child) => (
              <TreeNodeItem key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const topLevelNodes = nodeMap.get(null) || [];

  const treeContent = (
    <div
      className={`flex flex-col h-full transition-colors ${
        isDark ? "bg-[#0f0e0c] text-white" : "bg-slate-50/70 text-slate-900"
      }`}
    >
      {/* Search & Tree Controls Header */}
      <div
        className={`p-3.5 border-b space-y-2.5 ${
          isDark ? "border-[rgba(201,160,80,0.2)]" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex items-center justify-between lg:hidden mb-1">
          <span
            className={`text-sm font-bold flex items-center gap-1.5 ${
              isDark ? "text-[#c9a050]" : "text-[#0b216f]"
            }`}
          >
            <Layers className="w-4 h-4" /> منوی سرفصل‌های موضوعی
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className={`p-1.5 rounded-xl border ${
                isDark
                  ? "text-[#888888] hover:text-white bg-[#14120f] border-[rgba(201,160,80,0.2)]"
                  : "text-slate-500 hover:text-slate-900 bg-slate-100 border-slate-200"
              }`}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Smart Deep Search Input Box */}
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute right-3.5 top-3 ${
              isDark ? "text-[#888888]" : "text-slate-400"
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجو در موضوعات، سوالات متداول، مدارک، قوانین..."
            className={`w-full rounded-2xl pr-10 pl-9 py-2.5 text-xs sm:text-sm transition shadow-inner focus:outline-none focus:ring-2 ${
              isDark
                ? "bg-[#0a0a0a] border border-[rgba(201,160,80,0.25)] text-white placeholder-[#888888] focus:border-[#c9a050] focus:ring-[#c9a050]/20"
                : "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0b216f] focus:ring-[#0b216f]/15"
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className={`absolute left-3 top-2.5 p-1 rounded-full transition ${
                isDark
                  ? "text-[#888888] hover:text-white hover:bg-[#14120f]"
                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              }`}
              title="پاک کردن جستجو"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Summary & Expand/Collapse Controls */}
        <div
          className={`flex items-center justify-between text-xs px-1 pt-1 font-medium ${
            isDark ? "text-[#888888]" : "text-slate-500"
          }`}
        >
          {searchQuery.trim() ? (
            <span
              className={`flex items-center gap-1 font-bold ${
                isDark ? "text-emerald-400" : "text-emerald-700"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {totalMatchesCount > 0
                ? `${totalMatchesCount} سرفصل یافت شد`
                : "موردی یافت نشد"}
            </span>
          ) : (
            <span
              className={`flex items-center gap-1.5 font-bold ${
                isDark ? "text-[#c9a050]" : "text-[#0b216f]"
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> ساختار خدمات
            </span>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={expandAll}
              className={`transition cursor-pointer hover:underline ${
                isDark ? "hover:text-[#d8bf93]" : "hover:text-[#0b216f]"
              }`}
            >
              باز کردن همه
            </button>
            <span>•</span>
            <button
              onClick={collapseAll}
              className={`transition cursor-pointer hover:underline ${
                isDark ? "hover:text-[#d8bf93]" : "hover:text-[#0b216f]"
              }`}
            >
              بستن همه
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
        {/* Main Center Domains Quick Link */}
        <button
          onClick={() => {
            onSelectNode(null);
            if (onCloseMobile) onCloseMobile();
          }}
          className={`w-full flex items-center justify-between p-3 rounded-2xl text-sm font-bold transition mb-2 border cursor-pointer ${
            selectedNodeId === null
              ? isDark
                ? "bg-[#c9a050] text-[#0a0a0a] border-[#c9a050] shadow-md"
                : "bg-[#0b216f] text-white border-[#0b216f] shadow-md"
              : isDark
              ? "bg-[#14120f] hover:bg-[#1a1815] text-[#c9a050] border-[rgba(201,160,80,0.2)]"
              : "bg-white hover:bg-slate-100 text-[#0b216f] border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="w-4.5 h-4.5" />
            <span>صفحه اصلی (حوزه‌های خدمات)</span>
          </div>
          <ChevronLeft className="w-4 h-4 opacity-60" />
        </button>

        {topLevelNodes.length === 0 ? (
          <div
            className={`p-6 text-center text-sm ${
              isDark ? "text-[#888888]" : "text-slate-500"
            }`}
          >
            هیچ حوزه یا خدمت منتشرشده‌ای یافت نشد.
          </div>
        ) : searchQuery.trim() && totalMatchesCount === 0 ? (
          <div
            className={`p-6 text-center text-sm rounded-2xl border space-y-2.5 my-2 ${
              isDark
                ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] text-[#e0e0e0]"
                : "bg-white border-slate-200 text-slate-700 shadow-xs"
            }`}
          >
            <Search className="w-8 h-8 mx-auto opacity-40" />
            <p className={`font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              موردی با عبارت «{searchQuery}» یافت نشد.
            </p>
            <p
              className={`text-xs leading-relaxed ${
                isDark ? "text-[#888888]" : "text-slate-500"
              }`}
            >
              جستجوی هوشمند در عنوان، سوالات متداول (پرسش و پاسخ)، مدارک، مراحل و قوانین انجام شد.
            </p>
            <button
              onClick={() => onSearchChange("")}
              className={`mt-2 text-xs font-bold hover:underline inline-block ${
                isDark ? "text-[#c9a050]" : "text-[#0b216f]"
              }`}
            >
              پاک کردن فیلتر جستجو
            </button>
          </div>
        ) : (
          topLevelNodes.map((node) => <TreeNodeItem key={node.id} node={node} level={0} />)
        )}
      </div>

      {/* Bottom info badge */}
      <div
        className={`p-3.5 border-t text-xs flex items-center justify-between font-medium ${
          isDark
            ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#888888]"
            : "bg-white border-slate-200 text-slate-500"
        }`}
      >
        <span className="flex items-center gap-1.5 font-bold">
          <Sparkles className={`w-3.5 h-3.5 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
          جستجوی عمیق و هوشمند
        </span>
        <span className="font-mono text-xs">{nodes.length} سرفصل</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside
        className={`hidden lg:flex flex-col w-84 h-[calc(100vh-4rem)] sticky top-16 shadow-inner shrink-0 border-l transition-colors ${
          isDark
            ? "bg-[#0f0e0c] border-[rgba(201,160,80,0.2)]"
            : "bg-slate-50/70 border-slate-200"
        }`}
      >
        {treeContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div
            className={`relative w-84 max-w-[85vw] h-full shadow-2xl z-10 flex flex-col ${
              isDark ? "bg-[#0f0e0c]" : "bg-white"
            }`}
          >
            {treeContent}
          </div>
        </div>
      )}
    </>
  );
};
