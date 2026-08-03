import React, { useState, useMemo } from "react";
import { CategoryNode } from "../types";
import {
  Folder,
  FolderOpen,
  ChevronLeft,
  ChevronDown,
  Search,
  Building2,
  Building,
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
  Lock,
  FileCheck2,
  Menu,
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
  onSelectNode: (id: string) => void;
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

// Component for highlighting matching search text
const HighlightText: React.FC<{ text?: string; query: string; className?: string; highlightClass?: string }> = ({
  text,
  query,
  className = "",
  highlightClass = "bg-amber-400/40 text-amber-200 px-0.5 rounded font-bold",
}) => {
  if (!text) return null;
  const q = query.trim();
  if (!q) return <span className={className}>{text}</span>;

  try {
    const escapedQuery = q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, i) =>
          part.toLowerCase() === q.toLowerCase() ? (
            <mark key={i} className={highlightClass}>
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </span>
    );
  } catch (e) {
    return <span className={className}>{text}</span>;
  }
};

// Helper interface for detailed node search matches
interface MatchDetail {
  type: "description" | "document" | "step" | "faq" | "tag" | "cost";
  label: string;
  icon: React.ReactNode;
  snippet: string;
}

interface NodeSearchMatch {
  selfMatches: boolean;
  matchedFields: MatchDetail[];
}

function getNodeSearchMatch(node: CategoryNode, query: string): NodeSearchMatch {
  const q = query.trim().toLowerCase();
  if (!q) {
    return { selfMatches: true, matchedFields: [] };
  }

  let selfMatches = false;
  const matchedFields: MatchDetail[] = [];

  // Title & Subtitle match
  if (node.title.toLowerCase().includes(q)) {
    selfMatches = true;
  }
  if (node.subtitle && node.subtitle.toLowerCase().includes(q)) {
    selfMatches = true;
  }

  // Description match
  if (node.description && node.description.toLowerCase().includes(q)) {
    selfMatches = true;
    matchedFields.push({
      type: "description",
      label: "متن توضیحات",
      icon: <FileText className="w-3 h-3 text-cyan-400 shrink-0" />,
      snippet: getSnippetAroundMatch(node.description, q),
    });
  }

  // Required Documents match
  if (node.requiredDocuments && Array.isArray(node.requiredDocuments)) {
    node.requiredDocuments.forEach((doc) => {
      const inName = doc.name.toLowerCase().includes(q);
      const inDesc = doc.description && doc.description.toLowerCase().includes(q);
      const inNotes = doc.notes && doc.notes.toLowerCase().includes(q);
      if (inName || inDesc || inNotes) {
        selfMatches = true;
        const text = doc.name + (doc.notes ? ` (${doc.notes})` : "");
        matchedFields.push({
          type: "document",
          label: "مدرک",
          icon: <FileCheck className="w-3 h-3 text-emerald-400 shrink-0" />,
          snippet: text,
        });
      }
    });
  }

  // Process Steps match
  if (node.processSteps && Array.isArray(node.processSteps)) {
    node.processSteps.forEach((step) => {
      const inTitle = step.title.toLowerCase().includes(q);
      const inDetail = step.detail && step.detail.toLowerCase().includes(q);
      if (inTitle || inDetail) {
        selfMatches = true;
        matchedFields.push({
          type: "step",
          label: `مرحله ${step.stepNumber}`,
          icon: <ListOrdered className="w-3 h-3 text-blue-400 shrink-0" />,
          snippet: `${step.title}${step.detail ? `: ${step.detail}` : ""}`,
        });
      }
    });
  }

  // FAQs match
  if (node.faqs && Array.isArray(node.faqs)) {
    node.faqs.forEach((faq) => {
      const inQ = faq.question.toLowerCase().includes(q);
      const inA = faq.answer && faq.answer.toLowerCase().includes(q);
      if (inQ || inA) {
        selfMatches = true;
        matchedFields.push({
          type: "faq",
          label: "سوال متداول",
          icon: <HelpCircle className="w-3 h-3 text-amber-400 shrink-0" />,
          snippet: faq.question,
        });
      }
    });
  }

  // Tags match
  if (node.tags && Array.isArray(node.tags)) {
    node.tags.forEach((tag) => {
      if (tag.toLowerCase().includes(q)) {
        selfMatches = true;
        matchedFields.push({
          type: "tag",
          label: "برچسب",
          icon: <Tag className="w-3 h-3 text-purple-400 shrink-0" />,
          snippet: `#${tag}`,
        });
      }
    });
  }

  // Costs & Deadlines match
  if (node.costsAndDeadlines) {
    const cd = node.costsAndDeadlines;
    const combined = [cd.governmentFee, cd.serviceFee, cd.totalDuration, cd.notes].filter(Boolean).join(" ");
    if (combined.toLowerCase().includes(q)) {
      selfMatches = true;
      matchedFields.push({
        type: "cost",
        label: "هزینه/زمان",
        icon: <DollarSign className="w-3 h-3 text-green-400 shrink-0" />,
        snippet: getSnippetAroundMatch(combined, q),
      });
    }
  }

  return { selfMatches, matchedFields };
}

function getSnippetAroundMatch(fullText: string, query: string, maxLength = 60): string {
  const idx = fullText.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return fullText.slice(0, maxLength);

  const start = Math.max(0, idx - 15);
  const end = Math.min(fullText.length, idx + query.length + 35);
  let snippet = fullText.slice(start, end);
  if (start > 0) snippet = "..." + snippet;
  if (end < fullText.length) snippet = snippet + "...";
  return snippet;
}

export const SidebarTree: React.FC<SidebarTreeProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  searchQuery,
  onSearchChange,
  isMobileOpen,
  onCloseMobile,
}) => {
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

  // Check if a node or its children match search query
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

  const handleSelectNode = (id: string) => {
    onSelectNode(id);
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
    const highlightQuery = searchQuery.trim();

    return (
      <div className="select-none">
        <div
          onClick={() => handleSelectNode(node.id)}
          className={`group flex flex-col px-3 py-2 my-1 rounded-xl text-sm cursor-pointer transition ${
            isSelected
              ? "bg-amber-500 text-slate-950 font-bold shadow-md ring-1 ring-amber-400"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
          style={{ paddingRight: `${Math.max(12, level * 16)}px` }}
        >
          <div className="flex items-center justify-between min-w-0">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {hasChildren ? (
                <button
                  onClick={(e) => toggleExpand(node.id, e)}
                  className={`p-1 rounded-md hover:bg-slate-700/50 transition shrink-0 ${
                    isSelected ? "text-slate-950 hover:bg-slate-950/20" : "text-slate-400"
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronLeft className="w-3.5 h-3.5" />
                  )}
                </button>
              ) : (
                <span className="w-5 shrink-0" />
              )}

              <span
                className={`shrink-0 ${
                  isSelected ? "text-slate-950" : level === 0 ? "text-amber-400" : "text-slate-400"
                }`}
              >
                {renderCategoryIcon(node.icon, level === 0 ? "w-4 h-4" : "w-3.5 h-3.5")}
              </span>

              <div className="flex flex-col min-w-0">
                <span className="truncate">
                  <HighlightText
                    text={node.title}
                    query={highlightQuery}
                    highlightClass={
                      isSelected
                        ? "bg-slate-950 text-amber-300 px-1 py-0.5 rounded"
                        : "bg-amber-400/40 text-amber-200 px-1 py-0.5 rounded font-bold"
                    }
                  />
                </span>
                {node.subtitle && (
                  <span
                    className={`text-[10px] truncate font-normal ${
                      isSelected ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    <HighlightText
                      text={node.subtitle}
                      query={highlightQuery}
                      highlightClass={
                        isSelected
                          ? "bg-slate-950 text-amber-300 px-0.5 rounded"
                          : "bg-amber-400/30 text-amber-200 px-0.5 rounded"
                      }
                    />
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs shrink-0 mr-2">
              {totalDocsCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected
                      ? "bg-slate-950/30 text-slate-950 border border-slate-950/40 font-bold"
                      : "bg-slate-800 text-amber-300 border border-slate-700"
                  }`}
                  title={`${totalDocsCount} مدرک لازم`}
                >
                  {totalDocsCount} مدرک
                </span>
              )}
            </div>
          </div>

          {/* Smart Search Match Details Badge Snippets */}
          {highlightQuery && matchInfo.matchedFields.length > 0 && (
            <div className="mt-2 space-y-1 border-t border-slate-800/80 pt-1.5 pr-6">
              {matchInfo.matchedFields.slice(0, 3).map((mf, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-1.5 text-[11px] px-2 py-1 rounded-lg border leading-tight ${
                    isSelected
                      ? "bg-slate-950/80 border-slate-900 text-slate-200 font-normal"
                      : "bg-slate-950/90 border-slate-800 text-slate-300"
                  }`}
                >
                  <span className="flex items-center gap-1 shrink-0 font-bold text-amber-400">
                    {mf.icon}
                    <span>{mf.label}:</span>
                  </span>
                  <span className="truncate flex-1">
                    <HighlightText
                      text={mf.snippet}
                      query={highlightQuery}
                      highlightClass="bg-amber-400/40 text-amber-200 px-0.5 rounded font-bold"
                    />
                  </span>
                </div>
              ))}
              {matchInfo.matchedFields.length > 3 && (
                <span
                  className={`text-[9px] font-mono pr-1 ${
                    isSelected ? "text-slate-900 font-semibold" : "text-slate-400"
                  }`}
                >
                  + {matchInfo.matchedFields.length - 3} مطابقت محتوایی دیگر...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Child Subtitles / Subcategories */}
        {hasChildren && isExpanded && (
          <div className="border-r border-slate-800 my-0.5 mr-3">
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
    <div className="flex flex-col h-full bg-slate-900 text-slate-100">
      {/* Search & Tree Controls Header */}
      <div className="p-3 border-b border-slate-800 space-y-2">
        <div className="flex items-center justify-between lg:hidden mb-1">
          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
            <Layers className="w-4 h-4" /> منوی سرفصل‌های موضوعی
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Smart Search Input Box */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجوی هوشمند در موضوعات، توضیحات، مدارک و سوالات..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pr-9 pl-8 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white p-0.5 rounded-full hover:bg-slate-800 transition"
              title="پاک کردن جستجو"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Summary & Controls */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
          {searchQuery.trim() ? (
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {totalMatchesCount > 0
                ? `${totalMatchesCount} سرفصل مطابقت دارد`
                : "هیچ نتایجی یافت نشد"}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Layers className="w-3.5 h-3.5" /> ساختار خدمات
            </span>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="hover:text-amber-300 transition cursor-pointer"
            >
              باز کردن همه
            </button>
            <span>•</span>
            <button
              onClick={collapseAll}
              className="hover:text-amber-300 transition cursor-pointer"
            >
              بستن همه
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {topLevelNodes.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500">
            هیچ حوزه یا خدمت منتشرشده‌ای یافت نشد.
          </div>
        ) : searchQuery.trim() && totalMatchesCount === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 space-y-2">
            <Search className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="font-bold text-slate-300">موردی با عبارت «{searchQuery}» یافت نشد.</p>
            <p className="text-[11px] text-slate-500">
              جستجو در عنوان، توضیحات، مدارک، مراحل، سوالات متداول و برچسب‌ها انجام شد.
            </p>
            <button
              onClick={() => onSearchChange("")}
              className="mt-2 text-xs text-amber-400 hover:underline inline-block font-semibold"
            >
              پاک کردن فیلتر جستجو
            </button>
          </div>
        ) : (
          topLevelNodes.map((node) => <TreeNodeItem key={node.id} node={node} level={0} />)
        )}
      </div>

      {/* Bottom info badge */}
      <div className="p-3 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-400" /> سیستم جستجوی هوشمند
        </span>
        <span className="font-mono text-[10px] text-slate-500">{nodes.length} سرفصل</span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 bg-slate-900 border-l border-slate-800 h-[calc(100vh-4rem)] sticky top-16 shadow-inner shrink-0">
        {treeContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-80 max-w-[85vw] h-full bg-slate-900 shadow-2xl z-10 flex flex-col">
            {treeContent}
          </div>
        </div>
      )}
    </>
  );
};

