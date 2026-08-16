import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CategoryNode } from "../types";
import { useTheme } from "../context/ThemeContext";
import { renderCategoryIcon } from "./SidebarTree";
import { LetterheadPdfModal } from "./LetterheadPdfModal";
import { HighlightText } from "../lib/searchUtils";
import {
  ChevronLeft,
  Copy,
  CheckCircle2,
  FileCheck2,
  Clock,
  Coins,
  HelpCircle,
  Sparkles,
  AlertCircle,
  FolderTree,
  Home,
  Layers,
  ArrowRight,
  FileDown,
  Building2,
  Calculator,
  Scale,
  Receipt,
  QrCode,
  FileText,
  Search,
  Check,
  PhoneCall,
  Info,
} from "lucide-react";

interface NodeContentViewerProps {
  node: CategoryNode | null;
  allNodes?: CategoryNode[];
  breadcrumbs?: string[];
  childNodes?: CategoryNode[];
  onSelectNode?: (id: string | null, targetTab?: "subcategories" | "documents" | "process" | "faqs") => void;
  onOpenAiAssistant?: () => void;
  searchQuery?: string;
  targetTab?: "subcategories" | "documents" | "process" | "faqs";
}

// Animation variants for smooth page transitions
const pageVariants = {
  initial: { opacity: 0, y: 12, scale: 0.99 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.24, ease: "easeOut" } },
  exit: { opacity: 0, y: -12, scale: 0.99, transition: { duration: 0.16, ease: "easeIn" } },
};

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.22, ease: "easeOut" } },
};

export const NodeContentViewer: React.FC<NodeContentViewerProps> = ({
  node,
  allNodes = [],
  childNodes,
  onSelectNode,
  onOpenAiAssistant,
  searchQuery = "",
  targetTab,
}) => {
  const { isDark } = useTheme();

  // Identify Root Level Nodes (Domains / حوزه‌های اصلی)
  const rootDomains = useMemo(() => {
    return allNodes.filter((n) => !n.parentId);
  }, [allNodes]);

  // Compute full parent hierarchy for breadcrumbs
  const parentChain = useMemo(() => {
    if (!node || !allNodes.length) return [];
    const chain: CategoryNode[] = [node];
    let curr = node;
    while (curr.parentId) {
      const parent = allNodes.find((n) => n.id === curr.parentId);
      if (!parent) break;
      chain.unshift(parent);
      curr = parent;
    }
    return chain;
  }, [node, allNodes]);

  // Compute childNodes for the current selected node
  const derivedChildNodes = useMemo(() => {
    if (childNodes) return childNodes;
    if (!node || !allNodes.length) return [];
    return allNodes.filter((n) => n.parentId === node.id);
  }, [node, allNodes, childNodes]);

  const requiredDocuments = node?.requiredDocuments || [];
  const processSteps = node?.processSteps || [];
  const faqs = node?.faqs || [];

  const [selectedDocIds, setSelectedDocIds] = useState<Record<string, boolean>>({});
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [activeTab, setActiveTab] = useState<"subcategories" | "documents" | "process" | "faqs">("subcategories");
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // If parent specified a target tab (e.g. from search click), activate it
  useEffect(() => {
    if (targetTab) {
      setActiveTab(targetTab);
    }
  }, [targetTab]);

  // Reliable Clipboard Copy Helper
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("navigator.clipboard failed, trying execCommand fallback", err);
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback copy failed", err);
      return false;
    }
  };

  // Reset/update selections and tabs when node changes
  useEffect(() => {
    if (!node) {
      setActiveTab("subcategories");
      return;
    }
    const initial: Record<string, boolean> = {};
    (node.requiredDocuments || []).forEach((doc) => {
      initial[doc.id] = doc.isMandatory;
    });
    setSelectedDocIds(initial);

    // If targetTab is already explicitly passed, honor it
    if (targetTab) {
      setActiveTab(targetTab);
      return;
    }

    const childrenCount = derivedChildNodes.length;
    const docsCount = node.requiredDocuments?.length || 0;

    if (childrenCount > 0) {
      setActiveTab("subcategories");
    } else if (docsCount > 0) {
      setActiveTab("documents");
    } else if (faqs.length > 0) {
      setActiveTab("faqs");
    } else {
      setActiveTab("process");
    }
  }, [node?.id, derivedChildNodes.length]);

  const toggleDocSelection = (docId: string) => {
    setSelectedDocIds((prev) => ({
      ...prev,
      [docId]: !prev[docId],
    }));
  };

  const selectAllDocs = () => {
    const updated: Record<string, boolean> = {};
    requiredDocuments.forEach((doc) => {
      updated[doc.id] = true;
    });
    setSelectedDocIds(updated);
  };

  const deselectAllDocs = () => {
    setSelectedDocIds({});
  };

  // Generate Customer WhatsApp/SMS Copy Text
  const handleCopyCustomerChecklist = async () => {
    if (!node) return;
    let selectedList = requiredDocuments.filter((doc) => selectedDocIds[doc.id]);

    // If no document is checked, auto-select all documents so copy always works
    if (selectedList.length === 0) {
      selectAllDocs();
      selectedList = requiredDocuments;
    }

    if (selectedList.length === 0) return;

    let text = `با سلام و احترام از طرف مجموعه «مباشر»🌸\n\n`;
    text += `📋 **لیست مدارک مورد نیاز جهت ${node.title}**:\n\n`;

    selectedList.forEach((doc, idx) => {
      text += `${idx + 1}. ${doc.name}`;
      if (doc.isMandatory) {
        text += ` (الزامی)`;
      } else {
        text += ` (تکمیلی)`;
      }
      if (doc.recipientRole) {
        text += ` - مربوط به: ${doc.recipientRole}`;
      }
      text += `\n`;
      if (doc.description) {
        text += `   🔹 توضیح: ${doc.description}\n`;
      }
      if (doc.notes) {
        text += `   ⚠️ نکته مهم: ${doc.notes}\n`;
      }
      text += `\n`;
    });

    if (node.costsAndDeadlines?.totalDuration) {
      text += `⏱️ **مدت زمان تخمینی انجام کار:** ${node.costsAndDeadlines.totalDuration}\n`;
    }
    if (node.costsAndDeadlines?.governmentFee) {
      text += `💳 **هزینه‌های قانونی و دولتی:** ${node.costsAndDeadlines.governmentFee}\n`;
    }

    text += `\n📞 در صورت هرگونه سوال یا ارسال مدارک، کارشناسان مباشر در خدمت شما هستند.`;

    const success = await copyToClipboard(text);
    if (success) {
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 3000);
    }
  };

  // Helper styles generator for Root Domain Cards
  const getDomainCardStyles = (index: number) => {
    if (isDark) {
      const styles = [
        {
          border: "border-[rgba(201,160,80,0.3)] hover:border-[#c9a050]",
          iconBg: "bg-[#c9a050] text-[#0a0a0a]",
          accentText: "text-[#c9a050]",
          badgeBg: "bg-[#c9a050]/20 text-[#c9a050] border-[rgba(201,160,80,0.3)]",
          glow: "from-[#c9a050]/15 to-transparent",
        },
        {
          border: "border-blue-500/30 hover:border-blue-400",
          iconBg: "bg-blue-600 text-white",
          accentText: "text-blue-400",
          badgeBg: "bg-blue-500/20 text-blue-300 border-blue-500/30",
          glow: "from-blue-500/15 to-transparent",
        },
        {
          border: "border-emerald-500/30 hover:border-emerald-400",
          iconBg: "bg-emerald-600 text-white",
          accentText: "text-emerald-400",
          badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
          glow: "from-emerald-500/15 to-transparent",
        },
        {
          border: "border-amber-500/30 hover:border-amber-400",
          iconBg: "bg-amber-600 text-white",
          accentText: "text-amber-400",
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          glow: "from-amber-500/15 to-transparent",
        },
      ];
      return styles[index % styles.length];
    } else {
      // Light mode styling
      const styles = [
        {
          border: "border-slate-200 hover:border-[#0b216f] bg-white",
          iconBg: "bg-[#0b216f] text-white",
          accentText: "text-[#0b216f]",
          badgeBg: "bg-blue-50 text-[#0b216f] border-blue-200",
          glow: "from-blue-50 to-transparent",
        },
        {
          border: "border-slate-200 hover:border-indigo-600 bg-white",
          iconBg: "bg-indigo-700 text-white",
          accentText: "text-indigo-700",
          badgeBg: "bg-indigo-50 text-indigo-800 border-indigo-200",
          glow: "from-indigo-50 to-transparent",
        },
        {
          border: "border-slate-200 hover:border-emerald-600 bg-white",
          iconBg: "bg-emerald-700 text-white",
          accentText: "text-emerald-700",
          badgeBg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          glow: "from-emerald-50 to-transparent",
        },
        {
          border: "border-slate-200 hover:border-amber-600 bg-white",
          iconBg: "bg-amber-600 text-white",
          accentText: "text-amber-700",
          badgeBg: "bg-amber-50 text-amber-900 border-amber-200",
          glow: "from-amber-50 to-transparent",
        },
      ];
      return styles[index % styles.length];
    }
  };

  // Helper to calculate total count of items in a domain
  const getDomainStats = (domainNode: CategoryNode) => {
    let docs = domainNode.requiredDocuments?.length || 0;
    let subCategoriesCount = 0;

    const traverse = (nodeId: string) => {
      const children = allNodes.filter((n) => n.parentId === nodeId);
      subCategoriesCount += children.length;
      children.forEach((c) => {
        docs += c.requiredDocuments?.length || 0;
        traverse(c.id);
      });
    };

    traverse(domainNode.id);
    return { docs, subCategoriesCount };
  };

  const highlightClass = isDark
    ? "bg-[#c9a050]/35 text-[#d8bf93] px-1 py-0.5 rounded font-bold"
    : "bg-amber-200 text-amber-950 px-1 py-0.5 rounded font-bold";

  return (
    <div
      className={`p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 transition-colors duration-200 ${
        isDark ? "text-white" : "text-slate-900"
      }`}
    >
      <AnimatePresence mode="wait">
        {!node ? (
          /* CASE 1: ROOT DOMAINS OVERVIEW (HOME DASHBOARD) */
          <motion.div
            key="home-domains"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-8"
          >
            {/* Top Welcome & Navigation Banner */}
            <div
              className={`rounded-3xl p-6 sm:p-8 border shadow-sm relative overflow-hidden transition-all ${
                isDark
                  ? "bg-[#14120f] border-[rgba(201,160,80,0.25)] shadow-black/40"
                  : "bg-white border-slate-200 shadow-slate-200/60"
              }`}
            >
              <div
                className={`absolute top-0 left-0 w-80 h-80 rounded-full blur-3xl pointer-events-none ${
                  isDark ? "bg-[#c9a050]/10" : "bg-blue-100/50"
                }`}
              />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-3 py-1 rounded-full font-bold border ${
                        isDark
                          ? "bg-[#c9a050]/15 text-[#c9a050] border-[rgba(201,160,80,0.3)]"
                          : "bg-blue-50 text-[#0b216f] border-blue-200"
                      }`}
                    >
                      سامانه مرجع کال‌سنتر و مشاوره مباشر
                    </span>
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-mono ${
                        isDark
                          ? "bg-[#0a0a0a] text-[#888888] border border-[rgba(201,160,80,0.2)]"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      نسخه ویژه اپراتورها
                    </span>
                  </div>
                  <h1
                    className={`text-2xl sm:text-3xl font-black tracking-tight ${
                      isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                    }`}
                  >
                    حوزه‌های تخصصی خدمات ثبتی، حقوقی و مالیاتی
                  </h1>
                  <p
                    className={`text-sm sm:text-base leading-relaxed max-w-3xl font-normal ${
                      isDark ? "text-[#e0e0e0]" : "text-slate-600"
                    }`}
                  >
                    برای مشاهده سرفصل‌ها، لیست دقیق مدارک، مراحل اجرایی و سوالات متداول مشتریان، یکی از حوزه‌های زیر را انتخاب فرمایید:
                  </p>
                </div>

                {onOpenAiAssistant && (
                  <button
                    onClick={onOpenAiAssistant}
                    className={`flex items-center justify-center gap-2.5 text-sm font-bold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer shrink-0 border ${
                      isDark
                        ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] border-[#c9a050]"
                        : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
                    }`}
                  >
                    <Sparkles className="w-5 h-5 animate-pulse" />
                    <span>دستیار هوشمند پاسخگویی</span>
                  </button>
                )}
              </div>
            </div>

            {/* Root Domains Bento Grid */}
            <motion.div
              variants={gridVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {rootDomains.map((domain, index) => {
                const style = getDomainCardStyles(index);
                const directChildren = allNodes.filter((n) => n.parentId === domain.id);
                const stats = getDomainStats(domain);

                return (
                  <motion.div
                    key={domain.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.02, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectNode && onSelectNode(domain.id)}
                    className={`border rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden ${
                      isDark
                        ? `bg-[#14120f] ${style.border} shadow-black/40`
                        : `${style.border} shadow-slate-200/50`
                    }`}
                  >
                    <div className="space-y-4">
                      {/* Card Header & Icon */}
                      <div className="flex items-center justify-between">
                        <div
                          className={`p-4 rounded-2xl ${style.iconBg} shadow-md transition-transform group-hover:scale-105`}
                        >
                          {renderCategoryIcon(domain.icon, "w-8 h-8")}
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold border ${style.badgeBg}`}>
                          {directChildren.length} سرفصل اصلی
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h2
                          className={`text-lg sm:text-xl font-black transition-colors ${
                            isDark
                              ? "text-white group-hover:text-[#c9a050]"
                              : "text-slate-900 group-hover:text-[#0b216f]"
                          }`}
                        >
                          <HighlightText text={domain.title} query={searchQuery} highlightClass={highlightClass} />
                        </h2>
                        {domain.subtitle && (
                          <p
                            className={`text-xs sm:text-sm font-medium mt-1 ${
                              isDark ? "text-[#e0e0e0]" : "text-slate-600"
                            }`}
                          >
                            <HighlightText text={domain.subtitle} query={searchQuery} highlightClass={highlightClass} />
                          </p>
                        )}
                        {domain.description && (
                          <p
                            className={`text-xs sm:text-sm mt-3 line-clamp-3 leading-relaxed ${
                              isDark ? "text-[#888888]" : "text-slate-500"
                            }`}
                          >
                            <HighlightText text={domain.description} query={searchQuery} highlightClass={highlightClass} />
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div
                      className={`mt-6 pt-4 border-t flex items-center justify-between ${
                        isDark ? "border-[rgba(201,160,80,0.2)]" : "border-slate-200"
                      }`}
                    >
                      <span
                        className={`text-xs font-medium flex items-center gap-1.5 ${
                          isDark ? "text-[#888888]" : "text-slate-500"
                        }`}
                      >
                        <FileCheck2 className={`w-3.5 h-3.5 ${style.accentText}`} />
                        شامل {stats.docs > 0 ? `${stats.docs} مدرک و راهنما` : "سرفصل‌ها و قوانین کامل"}
                      </span>

                      <div
                        className={`flex items-center gap-1.5 text-xs font-bold ${style.accentText} group-hover:translate-x-[-4px] transition-transform`}
                      >
                        <span>ورود به حوزه</span>
                        <ChevronLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </motion.div>
        ) : (
          /* CASE 2: DOMAIN / SUBCATEGORY / DETAIL DRILL-DOWN VIEW */
          <motion.div
            key={node.id}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6"
          >
            {/* Interactive Breadcrumb Bar & Back Controls */}
            <div
              className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xs ${
                isDark
                  ? "bg-[#0f0e0c] border-[rgba(201,160,80,0.2)] text-[#888888]"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
            >
              {/* Breadcrumb Path Links */}
              <nav className="flex items-center gap-1.5 text-xs sm:text-sm flex-wrap font-medium">
                <button
                  onClick={() => onSelectNode && onSelectNode(null)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition cursor-pointer font-bold ${
                    isDark
                      ? "text-[#e0e0e0] hover:text-[#c9a050] bg-[#14120f] hover:bg-[#1a1815] border-[rgba(201,160,80,0.2)]"
                      : "text-slate-700 hover:text-[#0b216f] bg-slate-100 hover:bg-slate-200 border-slate-200"
                  }`}
                >
                  <Home className={`w-3.5 h-3.5 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
                  <span>حوزه‌های اصلی</span>
                </button>

                {parentChain.map((crumbNode, idx) => {
                  const isCurrent = idx === parentChain.length - 1;
                  return (
                    <React.Fragment key={crumbNode.id}>
                      <ChevronLeft className="w-4 h-4 opacity-40 shrink-0" />
                      <button
                        disabled={isCurrent}
                        onClick={() => onSelectNode && onSelectNode(crumbNode.id)}
                        className={`text-xs sm:text-sm px-3 py-1.5 rounded-xl transition ${
                          isCurrent
                            ? isDark
                              ? "bg-[#c9a050]/20 text-[#c9a050] font-bold border border-[rgba(201,160,80,0.3)]"
                              : "bg-blue-100 text-[#0b216f] font-bold border border-blue-200"
                            : isDark
                            ? "text-[#e0e0e0] hover:text-white bg-[#14120f] hover:bg-[#1a1815] border border-transparent hover:border-[rgba(201,160,80,0.2)] cursor-pointer"
                            : "text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                        }`}
                      >
                        {crumbNode.title}
                      </button>
                    </React.Fragment>
                  );
                })}
              </nav>

              {/* Back Button to Parent Level */}
              {node.parentId && (
                <button
                  onClick={() => onSelectNode && onSelectNode(node.parentId)}
                  className={`flex items-center justify-center gap-1.5 text-xs sm:text-sm font-bold px-3.5 py-1.5 rounded-xl border transition cursor-pointer shrink-0 ${
                    isDark
                      ? "bg-[#14120f] hover:bg-[#1a1815] text-[#e0e0e0] hover:text-white border-[rgba(201,160,80,0.2)]"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border-slate-200"
                  }`}
                >
                  <ArrowRight className={`w-4 h-4 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
                  <span>بازگشت به سطح قبل</span>
                </button>
              )}
            </div>

            {/* Selected Category Main Banner Header */}
            <div
              className={`rounded-3xl p-6 sm:p-8 border shadow-sm relative overflow-hidden transition-all ${
                isDark
                  ? "bg-[#14120f] border-[rgba(201,160,80,0.25)] shadow-black/40"
                  : "bg-white border-slate-200 shadow-slate-200/50"
              }`}
            >
              <div
                className={`absolute top-0 left-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
                  isDark ? "bg-[#c9a050]/10" : "bg-blue-100/60"
                }`}
              />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="flex items-start gap-4 sm:gap-5">
                  <div
                    className={`p-4 rounded-2xl shadow-md mt-1 shrink-0 ${
                      isDark ? "bg-[#c9a050] text-[#0a0a0a]" : "bg-[#0b216f] text-white"
                    }`}
                  >
                    {renderCategoryIcon(node.icon, "w-8 h-8 sm:w-9 sm:h-9")}
                  </div>
                  <div>
                    <h1
                      className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 ${
                        isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                      }`}
                    >
                      <HighlightText text={node.title} query={searchQuery} highlightClass={highlightClass} />
                    </h1>
                    {node.subtitle && (
                      <p
                        className={`text-sm sm:text-base font-semibold mt-1.5 ${
                          isDark ? "text-[#e0e0e0]" : "text-slate-700"
                        }`}
                      >
                        <HighlightText text={node.subtitle} query={searchQuery} highlightClass={highlightClass} />
                      </p>
                    )}
                    {node.description && (
                      <p
                        className={`text-xs sm:text-sm mt-3 leading-relaxed max-w-4xl font-normal ${
                          isDark ? "text-[#888888]" : "text-slate-600"
                        }`}
                      >
                        <HighlightText text={node.description} query={searchQuery} highlightClass={highlightClass} />
                      </p>
                    )}
                  </div>
                </div>

                {/* AI Assistant Quick Trigger */}
                {onOpenAiAssistant && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 md:pt-0 shrink-0">
                    <button
                      onClick={onOpenAiAssistant}
                      className={`flex items-center justify-center gap-2 text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl transition-all shadow-md cursor-pointer border ${
                        isDark
                          ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] border-[#c9a050]"
                          : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
                      }`}
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span>پاسخگویی هوشمند به مشتری</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Meta Badges */}
              <div
                className={`flex items-center gap-3 mt-6 pt-4 border-t text-xs sm:text-sm flex-wrap font-medium ${
                  isDark ? "border-[rgba(201,160,80,0.2)] text-[#888888]" : "border-slate-200 text-slate-600"
                }`}
              >
                {derivedChildNodes.length > 0 && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                      isDark
                        ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#e0e0e0]"
                        : "bg-slate-100 border-slate-200 text-slate-800"
                    }`}
                  >
                    <FolderTree className={`w-4 h-4 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
                    شامل <strong className="font-bold font-mono">{derivedChildNodes.length}</strong> زیرمجموعه
                  </span>
                )}
                {requiredDocuments.length > 0 && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                      isDark
                        ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#e0e0e0]"
                        : "bg-slate-100 border-slate-200 text-slate-800"
                    }`}
                  >
                    <FileCheck2 className={`w-4 h-4 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
                    <strong className="font-bold font-mono">{requiredDocuments.length}</strong> مدرک و اطلاعات لازم
                  </span>
                )}
                {faqs.length > 0 && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                      isDark
                        ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#e0e0e0]"
                        : "bg-slate-100 border-slate-200 text-slate-800"
                    }`}
                  >
                    <HelpCircle className={`w-4 h-4 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
                    <strong className="font-bold font-mono">{faqs.length}</strong> سوال متداول مشتریان
                  </span>
                )}
                {node.costsAndDeadlines?.totalDuration && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                      isDark
                        ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#e0e0e0]"
                        : "bg-slate-100 border-slate-200 text-slate-800"
                    }`}
                  >
                    <Clock className={`w-4 h-4 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
                    زمان تقریبی: <strong className="font-bold">{node.costsAndDeadlines.totalDuration}</strong>
                  </span>
                )}
                {node.costsAndDeadlines?.governmentFee && (
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${
                      isDark
                        ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#10b981]"
                        : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}
                  >
                    <Coins className="w-4 h-4 text-emerald-600" />
                    هزینه دولتی: <strong className="font-bold">{node.costsAndDeadlines.governmentFee}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* View Tabs Selector */}
            <div
              className={`flex items-center gap-2 border-b pb-3 overflow-x-auto ${
                isDark ? "border-[rgba(201,160,80,0.2)]" : "border-slate-200"
              }`}
            >
              {derivedChildNodes.length > 0 && (
                <button
                  onClick={() => setActiveTab("subcategories")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "subcategories"
                      ? isDark
                        ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-black"
                        : "bg-[#0b216f] text-white shadow-md font-black"
                      : isDark
                      ? "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs"
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  زیرمجموعه‌ها و سرفصل‌ها ({derivedChildNodes.length})
                </button>
              )}

              {requiredDocuments.length > 0 && (
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "documents"
                      ? isDark
                        ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-black"
                        : "bg-[#0b216f] text-white shadow-md font-black"
                      : isDark
                      ? "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs"
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" />
                  مدارک و اطلاعات مورد نیاز ({requiredDocuments.length})
                </button>
              )}

              {processSteps.length > 0 && (
                <button
                  onClick={() => setActiveTab("process")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "process"
                      ? isDark
                        ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-black"
                        : "bg-[#0b216f] text-white shadow-md font-black"
                      : isDark
                      ? "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  مراحل و گام‌های اجرایی ({processSteps.length})
                </button>
              )}

              {faqs.length > 0 && (
                <button
                  onClick={() => setActiveTab("faqs")}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "faqs"
                      ? isDark
                        ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-black"
                        : "bg-[#0b216f] text-white shadow-md font-black"
                      : isDark
                      ? "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
                      : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200 shadow-xs"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  سوالات متداول مشتریان ({faqs.length})
                </button>
              )}
            </div>

            {/* TAB CONTENT 1: SUBCATEGORIES DRILL-DOWN GRID */}
            {activeTab === "subcategories" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    className={`text-sm sm:text-base font-bold flex items-center gap-2 ${
                      isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                    }`}
                  >
                    <FolderTree className="w-4 h-4" />
                    زیرمجموعه‌های سرفصل «{node.title}»
                  </h2>
                  <span className={`text-xs ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
                    جهت ورود، روی کارت مورد نظر کلیک کنید:
                  </span>
                </div>

                {derivedChildNodes.length === 0 ? (
                  <div
                    className={`rounded-2xl p-8 text-center text-sm border ${
                      isDark
                        ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] text-[#888888]"
                        : "bg-white border-slate-200 text-slate-600 shadow-xs"
                    }`}
                  >
                    این سرفصل زیرمجموعه دیگری ندارد. می‌توانید از تب «مدارک و اطلاعات مورد نیاز» اطلاعات را مطالعه فرمایید.
                  </div>
                ) : (
                  <motion.div
                    variants={gridVariants}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                  >
                    {derivedChildNodes.map((child) => {
                      const childDocs = child.requiredDocuments?.length || 0;
                      const childChildren = allNodes.filter((n) => n.parentId === child.id);
                      const childFaqs = child.faqs?.length || 0;

                      return (
                        <motion.div
                          key={child.id}
                          variants={cardVariants}
                          whileHover={{ scale: 1.02, y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onSelectNode && onSelectNode(child.id)}
                          className={`p-5 rounded-2xl transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-xs border relative overflow-hidden ${
                            isDark
                              ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] hover:border-[#c9a050] hover:bg-[#1a1815]"
                              : "bg-white border-slate-200 hover:border-[#0b216f] hover:bg-blue-50/40"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div
                                className={`p-2.5 rounded-xl border transition-transform group-hover:scale-105 ${
                                  isDark
                                    ? "bg-[#c9a050]/15 text-[#c9a050] border-[rgba(201,160,80,0.3)]"
                                    : "bg-blue-50 text-[#0b216f] border-blue-200"
                                }`}
                              >
                                {renderCategoryIcon(child.icon, "w-5 h-5")}
                              </div>
                              <div className="flex items-center gap-1.5">
                                {childFaqs > 0 && (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                                      isDark
                                        ? "bg-amber-950/40 text-amber-300 border-amber-800/40"
                                        : "bg-amber-50 text-amber-800 border-amber-200"
                                    }`}
                                  >
                                    {childFaqs} FAQ
                                  </span>
                                )}
                                {childChildren.length > 0 ? (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded font-medium border ${
                                      isDark
                                        ? "bg-[#0a0a0a] text-[#e0e0e0] border-[rgba(201,160,80,0.2)]"
                                        : "bg-slate-100 text-slate-700 border-slate-200"
                                    }`}
                                  >
                                    {childChildren.length} زیربخش
                                  </span>
                                ) : (
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded font-mono border ${
                                      isDark
                                        ? "bg-[#c9a050]/15 text-[#c9a050] border-[rgba(201,160,80,0.3)]"
                                        : "bg-blue-50 text-[#0b216f] border-blue-200"
                                    }`}
                                  >
                                    {childDocs} مدرک
                                  </span>
                                )}
                              </div>
                            </div>

                            <h3
                              className={`text-sm sm:text-base font-bold transition-colors ${
                                isDark
                                  ? "text-white group-hover:text-[#c9a050]"
                                  : "text-slate-900 group-hover:text-[#0b216f]"
                              }`}
                            >
                              <HighlightText text={child.title} query={searchQuery} highlightClass={highlightClass} />
                            </h3>
                            {child.subtitle && (
                              <p
                                className={`text-xs sm:text-sm mt-1 line-clamp-2 leading-relaxed ${
                                  isDark ? "text-[#888888]" : "text-slate-500"
                                }`}
                              >
                                <HighlightText text={child.subtitle} query={searchQuery} highlightClass={highlightClass} />
                              </p>
                            )}
                          </div>

                          <div
                            className={`mt-4 pt-3 border-t flex items-center justify-between text-xs sm:text-sm font-bold ${
                              isDark
                                ? "border-[rgba(201,160,80,0.2)] text-[#c9a050]"
                                : "border-slate-200 text-[#0b216f]"
                            }`}
                          >
                            <span>ورود و مشاهده جزئیات</span>
                            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1.5 transition-transform" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            )}

            {/* TAB CONTENT 2: REQUIRED DOCUMENTS CHECKLIST */}
            {activeTab === "documents" && (
              <div className="space-y-4">
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-xs ${
                    isDark
                      ? "bg-[#14120f] border-[rgba(201,160,80,0.25)]"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div>
                    <h2
                      className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                        isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                      }`}
                    >
                      <FileCheck2 className="w-5 h-5" />
                      لیست مدارک و اطلاعات مورد نیاز برای «{node.title}»
                    </h2>
                    <p className={`text-xs sm:text-sm mt-1 ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
                      مدارک مورد نظر را تیک بزنید و برای ارسال به مشتری یا چاپ PDF از دکمه‌های زیر استفاده کنید.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={selectAllDocs}
                      className={`text-xs sm:text-sm font-medium px-3 py-2 rounded-xl border transition cursor-pointer ${
                        isDark
                          ? "text-[#e0e0e0] hover:text-[#c9a050] bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]"
                          : "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200"
                      }`}
                    >
                      انتخاب همه
                    </button>
                    <button
                      onClick={deselectAllDocs}
                      className={`text-xs sm:text-sm font-medium px-3 py-2 rounded-xl border transition cursor-pointer ${
                        isDark
                          ? "text-[#e0e0e0] hover:text-white bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]"
                          : "text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200"
                      }`}
                    >
                      لغو انتخاب
                    </button>
                    <button
                      onClick={handleCopyCustomerChecklist}
                      className={`flex items-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-md ${
                        copiedMessage
                          ? "bg-emerald-600 text-white"
                          : isDark
                          ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a]"
                          : "bg-emerald-700 hover:bg-emerald-800 text-white"
                      }`}
                    >
                      {copiedMessage ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>متن پیام کپی شد!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>کپی چک‌لیست برای مشتری (واتساپ/پیامک)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setIsPdfModalOpen(true)}
                      className={`flex items-center gap-2 text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl transition cursor-pointer shadow-md border ${
                        isDark
                          ? "bg-[#0b216f] hover:bg-[#123bad] text-white border-[rgba(201,160,80,0.3)]"
                          : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
                      }`}
                    >
                      <FileDown className={`w-4 h-4 ${isDark ? "text-[#c9a050]" : "text-amber-300"}`} />
                      <span>صدور/چاپ PDF با سربرگ «مباشر»</span>
                    </button>
                  </div>
                </div>

                {requiredDocuments.length === 0 ? (
                  <div
                    className={`rounded-2xl p-8 text-center text-sm border ${
                      isDark
                        ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] text-[#888888]"
                        : "bg-white border-slate-200 text-slate-600 shadow-xs"
                    }`}
                  >
                    مدرک خاصی برای این بخش تعریف نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {requiredDocuments.map((doc, index) => {
                      const isSelected = Boolean(selectedDocIds[doc.id]);
                      return (
                        <div
                          key={doc.id}
                          onClick={() => toggleDocSelection(doc.id)}
                          className={`p-4 sm:p-5 rounded-2xl border transition cursor-pointer flex items-start gap-4 ${
                            isSelected
                              ? isDark
                                ? "bg-[#c9a050]/15 border-[#c9a050] shadow-sm"
                                : "bg-blue-50/70 border-[#0b216f] shadow-xs"
                              : isDark
                              ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] hover:border-[#c9a050]/50"
                              : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className={`mt-1 w-4.5 h-4.5 rounded cursor-pointer ${
                              isDark ? "accent-[#c9a050]" : "accent-[#0b216f]"
                            }`}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className={`text-sm sm:text-base font-bold ${
                                  isDark ? "text-white" : "text-slate-900"
                                }`}
                              >
                                {index + 1}. <HighlightText text={doc.name} query={searchQuery} highlightClass={highlightClass} />
                              </span>

                              {doc.isMandatory ? (
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                                    isDark
                                      ? "bg-red-950/40 text-red-300 border-red-800/40"
                                      : "bg-red-50 text-red-700 border-red-200"
                                  }`}
                                >
                                  الزامی
                                </span>
                              ) : (
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${
                                    isDark
                                      ? "bg-[#0a0a0a] text-[#888888] border-[rgba(201,160,80,0.2)]"
                                      : "bg-slate-100 text-slate-600 border-slate-200"
                                  }`}
                                >
                                  اختیاری / تکمیلی
                                </span>
                              )}

                              {doc.recipientRole && (
                                <span
                                  className={`text-xs px-2.5 py-0.5 rounded-md font-mono border ${
                                    isDark
                                      ? "bg-[#c9a050]/15 text-[#c9a050] border-[rgba(201,160,80,0.25)]"
                                      : "bg-amber-50 text-amber-900 border-amber-200"
                                  }`}
                                >
                                  مربوط به: {doc.recipientRole}
                                </span>
                              )}
                            </div>

                            {doc.description && (
                              <p
                                className={`text-xs sm:text-sm mt-2 leading-relaxed ${
                                  isDark ? "text-[#e0e0e0]" : "text-slate-600"
                                }`}
                              >
                                <HighlightText text={doc.description} query={searchQuery} highlightClass={highlightClass} />
                              </p>
                            )}

                            {doc.notes && (
                              <div
                                className={`mt-2.5 text-xs sm:text-sm p-3 rounded-xl border flex items-start gap-2 ${
                                  isDark
                                    ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#c9a050]"
                                    : "bg-amber-50/70 border-amber-200 text-amber-950"
                                }`}
                              >
                                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                <span>
                                  <strong>نکته مهم کارشناس: </strong>
                                  <HighlightText text={doc.notes} query={searchQuery} highlightClass={highlightClass} />
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 3: PROCESS STEPS */}
            {activeTab === "process" && (
              <div className="space-y-4">
                <h2
                  className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                    isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                  }`}
                >
                  <Clock className="w-5 h-5" />
                  فرآیند و گام‌های اجرایی پرونده
                </h2>

                {processSteps.length === 0 ? (
                  <div
                    className={`rounded-2xl p-8 text-center text-sm border ${
                      isDark
                        ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] text-[#888888]"
                        : "bg-white border-slate-200 text-slate-600 shadow-xs"
                    }`}
                  >
                    گام اجرایی خاصی ثبت نشده است.
                  </div>
                ) : (
                  <div
                    className={`relative border-r-2 mr-4 space-y-6 pr-6 ${
                      isDark ? "border-[#c9a050]/30" : "border-[#0b216f]/30"
                    }`}
                  >
                    {processSteps.map((step) => (
                      <div key={step.id} className="relative group">
                        <div
                          className={`absolute -right-[33px] top-0 w-7 h-7 rounded-full font-black text-xs sm:text-sm flex items-center justify-center shadow-md ${
                            isDark ? "bg-[#c9a050] text-[#0a0a0a]" : "bg-[#0b216f] text-white"
                          }`}
                        >
                          {step.stepNumber}
                        </div>

                        <div
                          className={`p-4 sm:p-5 rounded-2xl border space-y-1.5 shadow-xs ${
                            isDark
                              ? "bg-[#14120f] border-[rgba(201,160,80,0.2)]"
                              : "bg-white border-slate-200"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <h3
                              className={`text-sm sm:text-base font-bold ${
                                isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                              }`}
                            >
                              <HighlightText text={step.title} query={searchQuery} highlightClass={highlightClass} />
                            </h3>
                            {step.estimatedTime && (
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-full font-mono border ${
                                  isDark
                                    ? "bg-[#0a0a0a] text-[#d8bf93] border-[rgba(201,160,80,0.2)]"
                                    : "bg-slate-100 text-slate-700 border-slate-200"
                                }`}
                              >
                                {step.estimatedTime}
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-xs sm:text-sm leading-relaxed pt-1 font-normal ${
                              isDark ? "text-[#e0e0e0]" : "text-slate-600"
                            }`}
                          >
                            <HighlightText text={step.detail} query={searchQuery} highlightClass={highlightClass} />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT 4: FAQS */}
            {activeTab === "faqs" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2
                    className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                      isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                    }`}
                  >
                    <HelpCircle className="w-5 h-5" />
                    سوالات متداول مشتریان در تماس‌های تلفنی
                  </h2>
                  <span className={`text-xs ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
                    راهنمای پاسخ سریع اپراتور به مشتری
                  </span>
                </div>

                {faqs.length === 0 ? (
                  <div
                    className={`rounded-2xl p-8 text-center text-sm border ${
                      isDark
                        ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] text-[#888888]"
                        : "bg-white border-slate-200 text-slate-600 shadow-xs"
                    }`}
                  >
                    سوال متداولی در این سرفصل ثبت نشده است.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {faqs.map((faq, idx) => (
                      <div
                        key={faq.id || idx}
                        className={`p-5 rounded-2xl border space-y-2.5 shadow-xs transition-all ${
                          isDark
                            ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] hover:border-[#c9a050]/50"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`flex items-start gap-2.5 text-sm sm:text-base font-bold ${
                            isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                          }`}
                        >
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 mt-0.5 ${
                              isDark
                                ? "bg-[#c9a050]/20 text-[#c9a050] border border-[rgba(201,160,80,0.3)]"
                                : "bg-blue-100 text-[#0b216f] border border-blue-200"
                            }`}
                          >
                            سوال
                          </span>
                          <p className="leading-snug">
                            <HighlightText text={faq.question} query={searchQuery} highlightClass={highlightClass} />
                          </p>
                        </div>
                        <div
                          className={`flex items-start gap-2.5 text-xs sm:text-sm sm:text-[15px] pt-3 border-t font-normal leading-relaxed ${
                            isDark
                              ? "border-[rgba(201,160,80,0.15)] text-[#e0e0e0]"
                              : "border-slate-100 text-slate-700"
                          }`}
                        >
                          <span
                            className={`px-2 py-0.5 rounded-lg text-xs font-bold shrink-0 mt-0.5 ${
                              isDark
                                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            پاسخ اپراتور
                          </span>
                          <p className="leading-relaxed">
                            <HighlightText text={faq.answer} query={searchQuery} highlightClass={highlightClass} />
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COSTS AND DEADLINES SUMMARY BOX */}
            {node.costsAndDeadlines &&
              (node.costsAndDeadlines.governmentFee ||
                node.costsAndDeadlines.serviceFee ||
                node.costsAndDeadlines.totalDuration ||
                node.costsAndDeadlines.notes) && (
                <div
                  className={`rounded-2xl p-5 sm:p-6 mt-6 border shadow-xs ${
                    isDark
                      ? "bg-[#14120f] border-[rgba(201,160,80,0.25)]"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <h3
                    className={`text-sm sm:text-base font-black mb-3 flex items-center gap-2 ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    <Coins className="w-4 h-4 text-emerald-500" />
                    راهنمای تعرفه، هزینه‌ها و زمان‌بندی اعلامی به مشتری
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs sm:text-sm">
                    {node.costsAndDeadlines.governmentFee && (
                      <div
                        className={`p-3 rounded-xl border ${
                          isDark ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className={`block text-xs ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
                          هزینه‌های دولتی و قانونی:
                        </span>
                        <span className="font-bold text-emerald-600 text-sm mt-0.5 block">
                          {node.costsAndDeadlines.governmentFee}
                        </span>
                      </div>
                    )}
                    {node.costsAndDeadlines.serviceFee && (
                      <div
                        className={`p-3 rounded-xl border ${
                          isDark ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className={`block text-xs ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
                          حق‌الزحمه خدمات:
                        </span>
                        <span
                          className={`font-bold text-sm mt-0.5 block ${
                            isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                          }`}
                        >
                          {node.costsAndDeadlines.serviceFee}
                        </span>
                      </div>
                    )}
                    {node.costsAndDeadlines.totalDuration && (
                      <div
                        className={`p-3 rounded-xl border ${
                          isDark ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className={`block text-xs ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
                          مدت زمان کل فرآیند:
                        </span>
                        <span
                          className={`font-bold text-sm mt-0.5 block ${
                            isDark ? "text-[#d8bf93]" : "text-slate-800"
                          }`}
                        >
                          {node.costsAndDeadlines.totalDuration}
                        </span>
                      </div>
                    )}
                  </div>
                  {node.costsAndDeadlines.notes && (
                    <p
                      className={`text-xs sm:text-sm mt-3 p-3 rounded-xl border flex items-start gap-2 ${
                        isDark
                          ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#c9a050]"
                          : "bg-amber-50 border-amber-200 text-amber-950"
                      }`}
                    >
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{node.costsAndDeadlines.notes}</span>
                    </p>
                  )}
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Official Mobasher Letterhead PDF Export Modal */}
      {node && (
        <LetterheadPdfModal
          isOpen={isPdfModalOpen}
          onClose={() => setIsPdfModalOpen(false)}
          node={node}
          selectedDocs={requiredDocuments.filter((doc) => selectedDocIds[doc.id])}
        />
      )}
    </div>
  );
};
