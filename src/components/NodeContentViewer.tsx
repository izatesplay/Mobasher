import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CategoryNode } from "../types";
import { renderCategoryIcon } from "./SidebarTree";
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
  ArrowLeft,
  Building2,
  Calculator,
  Scale,
  FolderGit2,
  ShieldCheck,
  Receipt,
  QrCode,
  FileText,
} from "lucide-react";

interface NodeContentViewerProps {
  node: CategoryNode | null;
  allNodes?: CategoryNode[];
  breadcrumbs?: string[];
  childNodes?: CategoryNode[];
  onSelectNode?: (id: string | null) => void;
  onOpenAiAssistant?: () => void;
}

// Animation variants for smooth, fluid page transitions
const pageVariants = {
  initial: { opacity: 0, y: 16, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.28, ease: "easeOut" } },
  exit: { opacity: 0, y: -16, scale: 0.985, transition: { duration: 0.18, ease: "easeIn" } },
};

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25, ease: "easeOut" } },
};

export const NodeContentViewer: React.FC<NodeContentViewerProps> = ({
  node,
  allNodes = [],
  breadcrumbs,
  childNodes,
  onSelectNode,
  onOpenAiAssistant,
}) => {
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

    const childrenCount = derivedChildNodes.length;
    const docsCount = node.requiredDocuments?.length || 0;

    if (childrenCount > 0) {
      setActiveTab("subcategories");
    } else if (docsCount > 0) {
      setActiveTab("documents");
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
  const handleCopyCustomerChecklist = () => {
    if (!node) return;
    const selectedList = requiredDocuments.filter((doc) => selectedDocIds[doc.id]);
    if (selectedList.length === 0) return;

    let text = `با سلام و احترام از طرف مجموعه «مباشر»🌸\n\n`;
    text += `📋 **لیست مدارک مورد نیاز جهت ${node.title}**:\n\n`;

    selectedList.forEach((doc, idx) => {
      text += `${idx + 1}. **${doc.name}**`;
      if (doc.recipientRole) text += ` (${doc.recipientRole})`;
      text += `\n`;
      if (doc.description) text += `   🔹 ${doc.description}\n`;
      if (doc.notes) text += `   ⚠️ نکته: ${doc.notes}\n`;
      text += `\n`;
    });

    if (node.costsAndDeadlines?.totalDuration) {
      text += `⏱️ **زمان تقریبی تحویل/انجام**: ${node.costsAndDeadlines.totalDuration}\n`;
    }

    text += `\nدر صورت وجود هرگونه سوال، کارشناسان مباشر پاسخگوی شما خواهند بود.\nبا تشکر`;

    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  // Helper to count all leaf/child nodes inside a category tree
  const getSubTreeCount = (categoryId: string): { subcategories: number; docs: number } => {
    const directChildren = allNodes.filter((n) => n.parentId === categoryId);
    let subCount = directChildren.length;
    let docCount = 0;

    directChildren.forEach((child) => {
      docCount += child.requiredDocuments?.length || 0;
      const childRes = getSubTreeCount(child.id);
      subCount += childRes.subcategories;
      docCount += childRes.docs;
    });

    return { subcategories: subCount, docs: docCount };
  };

  // Render Root Domain Card Gradient colors & themes
  const getDomainStyle = (index: number) => {
    return {
      gradient: "from-[#14120f] via-[#1a1815] to-[#14120f]",
      border: "border-[rgba(201,160,80,0.2)] hover:border-[#c9a050]",
      iconBg: "bg-[#c9a050] text-[#0a0a0a] shadow-[#c9a050]/20",
      badgeBg: "bg-[#c9a050]/15 text-[#c9a050] border-[rgba(201,160,80,0.3)]",
      accentText: "text-[#c9a050]",
    };
  };

  return (
    <div className="flex-1 bg-[#0a0a0a] text-white p-4 md:p-8 overflow-y-auto space-y-6 custom-scrollbar">
      {/* Dynamic Animated Canvas Container */}
      <AnimatePresence mode="wait">
        {/* CASE 1: ROOT DOMAINS SELECTION VIEW (When no node is selected, or viewing root page) */}
        {!node ? (
          <motion.div
            key="root_domains_view"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-6 max-w-6xl mx-auto"
          >
            {/* Hero Welcome Banner */}
            <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center sm:text-right">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#c9a050]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#c9a050]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="relative z-10 space-y-3">
                <div className="inline-flex items-center gap-2 bg-[#c9a050]/15 border border-[rgba(201,160,80,0.3)] px-3 py-1 rounded-full text-xs font-bold text-[#c9a050] mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>مرجع تخصصی پایگاه دانش کال‌سنتر</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  حوزه‌های اصلی خدمات و پاسخگویی تلفنی «مباشر»
                </h1>

                <p className="text-xs sm:text-sm text-[#e0e0e0] max-w-2xl leading-relaxed">
                  جهت دسترسی سریع به مدارک، قوانین ثبتی، تکالیف مالیاتی و قراردادهای حقوقی، حوزه مورد نظر را از کارت‌های زیر انتخاب کنید:
                </p>
              </div>
            </div>

            {/* Root Domains Grid Cards */}
            <motion.div
              variants={gridVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2"
            >
              {rootDomains.map((domain, index) => {
                const style = getDomainStyle(index);
                const stats = getSubTreeCount(domain.id);
                const directChildren = allNodes.filter((n) => n.parentId === domain.id);

                return (
                  <motion.div
                    key={domain.id}
                    variants={cardVariants}
                    whileHover={{ scale: 1.025, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => onSelectNode && onSelectNode(domain.id)}
                    className={`bg-[#14120f] border ${style.border} rounded-3xl p-6 shadow-xl transition-all duration-300 cursor-pointer group flex flex-col justify-between relative overflow-hidden`}
                  >
                    <div className="space-y-4">
                      {/* Card Header & Icon */}
                      <div className="flex items-center justify-between">
                        <div className={`p-4 rounded-2xl ${style.iconBg} shadow-lg transition-transform group-hover:scale-110`}>
                          {renderCategoryIcon(domain.icon, "w-8 h-8")}
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${style.badgeBg}`}>
                          {directChildren.length} سرفصل اصلی
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h2 className="text-lg font-bold text-white group-hover:text-[#c9a050] transition-colors">
                          {domain.title}
                        </h2>
                        {domain.subtitle && (
                          <p className="text-xs font-semibold text-[#e0e0e0] mt-1">{domain.subtitle}</p>
                        )}
                        {domain.description && (
                          <p className="text-xs text-[#888888] mt-2.5 line-clamp-3 leading-relaxed">
                            {domain.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Action */}
                    <div className="mt-6 pt-4 border-t border-[rgba(201,160,80,0.2)] flex items-center justify-between">
                      <span className="text-xs text-[#888888] font-medium flex items-center gap-1.5">
                        <FileCheck2 className="w-3.5 h-3.5 text-[#c9a050]" />
                        شامل {stats.docs > 0 ? `${stats.docs} مدرک و راهنما` : "سرفصل‌ها و قوانین کامل"}
                      </span>

                      <div className={`flex items-center gap-1.5 text-xs font-bold ${style.accentText} group-hover:translate-x-[-4px] transition-transform`}>
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f0e0c] border border-[rgba(201,160,80,0.2)] p-3 rounded-2xl shadow-sm">
              {/* Breadcrumb Path Links */}
              <nav className="flex items-center gap-1.5 text-xs text-[#888888] flex-wrap">
                <button
                  onClick={() => onSelectNode && onSelectNode(null)}
                  className="flex items-center gap-1 text-[#e0e0e0] hover:text-[#c9a050] bg-[#14120f] hover:bg-[#1a1815] px-2.5 py-1 rounded-lg border border-[rgba(201,160,80,0.2)] transition font-medium cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-[#c9a050]" />
                  <span>حوزه‌های اصلی</span>
                </button>

                {parentChain.map((crumbNode, idx) => {
                  const isCurrent = idx === parentChain.length - 1;
                  return (
                    <React.Fragment key={crumbNode.id}>
                      <ChevronLeft className="w-3.5 h-3.5 text-[#888888] shrink-0" />
                      <button
                        disabled={isCurrent}
                        onClick={() => onSelectNode && onSelectNode(crumbNode.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg transition ${
                          isCurrent
                            ? "bg-[#c9a050]/20 text-[#c9a050] font-bold border border-[rgba(201,160,80,0.3)]"
                            : "text-[#e0e0e0] hover:text-white bg-[#14120f] hover:bg-[#1a1815] border border-transparent hover:border-[rgba(201,160,80,0.2)] cursor-pointer"
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
                  className="flex items-center justify-center gap-1.5 text-xs bg-[#14120f] hover:bg-[#1a1815] text-[#e0e0e0] hover:text-white px-3 py-1.5 rounded-xl border border-[rgba(201,160,80,0.2)] transition cursor-pointer shrink-0"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#c9a050]" />
                  <span>بازگشت به سطح قبل</span>
                </button>
              )}
            </div>

            {/* Selected Category Main Banner Header */}
            <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] rounded-2xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-[#c9a050]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-3.5 bg-[#c9a050] text-[#0a0a0a] rounded-2xl shadow-lg shadow-[#c9a050]/20 mt-1 shrink-0">
                    {renderCategoryIcon(node.icon, "w-7 h-7")}
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-[#c9a050] tracking-tight flex items-center gap-2">
                      {node.title}
                    </h1>
                    {node.subtitle && <p className="text-xs sm:text-sm font-medium text-[#e0e0e0] mt-1">{node.subtitle}</p>}
                    {node.description && (
                      <p className="text-xs text-[#888888] mt-2 leading-relaxed max-w-3xl">{node.description}</p>
                    )}
                  </div>
                </div>

                {/* AI Trigger */}
                {onOpenAiAssistant && (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 md:pt-0 shrink-0">
                    <button
                      onClick={onOpenAiAssistant}
                      className="flex items-center justify-center gap-2 bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer border border-[#c9a050]"
                    >
                      <Sparkles className="w-4 h-4 text-[#0a0a0a] animate-pulse" />
                      <span>پاسخگویی هوشمند به مشتری</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Meta Badges */}
              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[rgba(201,160,80,0.2)] text-xs text-[#888888] flex-wrap">
                {derivedChildNodes.length > 0 && (
                  <span className="flex items-center gap-1.5 bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-[rgba(201,160,80,0.2)]">
                    <FolderTree className="w-3.5 h-3.5 text-[#c9a050]" />
                    شامل <strong className="text-white font-mono">{derivedChildNodes.length}</strong> زیرمجموعه
                  </span>
                )}
                {requiredDocuments.length > 0 && (
                  <span className="flex items-center gap-1.5 bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-[rgba(201,160,80,0.2)]">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#c9a050]" />
                    <strong className="text-white font-mono">{requiredDocuments.length}</strong> مدرک لازم
                  </span>
                )}
                {node.costsAndDeadlines?.totalDuration && (
                  <span className="flex items-center gap-1.5 bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-[rgba(201,160,80,0.2)]">
                    <Clock className="w-3.5 h-3.5 text-[#c9a050]" />
                    زمان تقریبی: <strong className="text-white">{node.costsAndDeadlines.totalDuration}</strong>
                  </span>
                )}
                {node.costsAndDeadlines?.governmentFee && (
                  <span className="flex items-center gap-1.5 bg-[#0a0a0a] px-3 py-1.5 rounded-lg border border-[rgba(201,160,80,0.2)]">
                    <Coins className="w-3.5 h-3.5 text-[#10b981]" />
                    هزینه دولتی: <strong className="text-white">{node.costsAndDeadlines.governmentFee}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* View Tabs Selector */}
            <div className="flex items-center gap-2 border-b border-[rgba(201,160,80,0.2)] pb-2 overflow-x-auto">
              {derivedChildNodes.length > 0 && (
                <button
                  onClick={() => setActiveTab("subcategories")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "subcategories"
                      ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-extrabold"
                      : "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
                  }`}
                >
                  <FolderTree className="w-4 h-4" />
                  زیرمجموعه‌ها و سرفصل‌ها ({derivedChildNodes.length})
                </button>
              )}

              {requiredDocuments.length > 0 && (
                <button
                  onClick={() => setActiveTab("documents")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "documents"
                      ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-extrabold"
                      : "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
                  }`}
                >
                  <FileCheck2 className="w-4 h-4" />
                  مدارک و اطلاعات مورد نیاز ({requiredDocuments.length})
                </button>
              )}

              {processSteps.length > 0 && (
                <button
                  onClick={() => setActiveTab("process")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "process"
                      ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-extrabold"
                      : "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  مراحل و گام‌های اجرایی ({processSteps.length})
                </button>
              )}

              {faqs.length > 0 && (
                <button
                  onClick={() => setActiveTab("faqs")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shrink-0 ${
                    activeTab === "faqs"
                      ? "bg-[#c9a050] text-[#0a0a0a] shadow-md font-extrabold"
                      : "bg-[#14120f] text-[#888888] hover:text-white border border-[rgba(201,160,80,0.2)]"
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
                  <h2 className="text-sm font-bold text-[#c9a050] flex items-center gap-2">
                    <FolderTree className="w-4 h-4 text-[#c9a050]" />
                    زیرمجموعه‌های سرفصل «{node.title}»
                  </h2>
                  <span className="text-xs text-[#888888]">
                    جهت ورود، روی کارت مورد نظر کلیک کنید:
                  </span>
                </div>

                {derivedChildNodes.length === 0 ? (
                  <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] rounded-2xl p-8 text-center text-xs text-[#888888]">
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

                      return (
                        <motion.div
                          key={child.id}
                          variants={cardVariants}
                          whileHover={{ scale: 1.02, y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => onSelectNode && onSelectNode(child.id)}
                          className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] hover:border-[#c9a050] hover:bg-[#1a1815] p-5 rounded-2xl transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-md relative overflow-hidden"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <div className="p-2.5 bg-[#c9a050]/15 text-[#c9a050] rounded-xl border border-[rgba(201,160,80,0.3)] group-hover:scale-110 transition-transform">
                                {renderCategoryIcon(child.icon, "w-5 h-5")}
                              </div>
                              {childChildren.length > 0 ? (
                                <span className="text-[10px] bg-[#0a0a0a] text-[#e0e0e0] px-2 py-0.5 rounded font-medium border border-[rgba(201,160,80,0.2)]">
                                  {childChildren.length} زیربخش
                                </span>
                              ) : (
                                <span className="text-[10px] bg-[#c9a050]/15 text-[#c9a050] px-2 py-0.5 rounded font-mono border border-[rgba(201,160,80,0.3)]">
                                  {childDocs} مدرک
                                </span>
                              )}
                            </div>

                            <h3 className="text-sm font-bold text-white group-hover:text-[#c9a050] transition-colors">
                              {child.title}
                            </h3>
                            {child.subtitle && (
                              <p className="text-xs text-[#888888] mt-1 line-clamp-2 leading-relaxed">
                                {child.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="mt-4 pt-3 border-t border-[rgba(201,160,80,0.2)] flex items-center justify-between text-xs text-[#c9a050] font-medium">
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#14120f] p-4 rounded-xl border border-[rgba(201,160,80,0.2)]">
                  <div>
                    <h2 className="text-sm font-bold text-[#c9a050] flex items-center gap-2">
                      <FileCheck2 className="w-4 h-4 text-[#c9a050]" />
                      لیست مدارک مورد نیاز برای «{node.title}»
                    </h2>
                    <p className="text-xs text-[#888888] mt-1">
                      مدارک مورد نظر را انتخاب کنید و جهت ارسال سریع به مشتری روی دکمه کپی کلیک کنید.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={selectAllDocs}
                      className="text-xs text-[#e0e0e0] hover:text-[#c9a050] bg-[#0a0a0a] px-2.5 py-1.5 rounded-lg border border-[rgba(201,160,80,0.2)] transition cursor-pointer"
                    >
                      انتخاب همه
                    </button>
                    <button
                      onClick={deselectAllDocs}
                      className="text-xs text-[#e0e0e0] hover:text-white bg-[#0a0a0a] px-2.5 py-1.5 rounded-lg border border-[rgba(201,160,80,0.2)] transition cursor-pointer"
                    >
                      لغو انتخاب
                    </button>
                    <button
                      onClick={handleCopyCustomerChecklist}
                      className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-md ${
                        copiedMessage
                          ? "bg-[#10b981] text-white"
                          : "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a]"
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
                          <span>کپی متن جهت ارسال به مشتری (واتساپ/پیامک)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {requiredDocuments.length === 0 ? (
                  <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] rounded-xl p-8 text-center text-xs text-[#888888]">
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
                          className={`p-4 rounded-xl border transition cursor-pointer flex items-start gap-3.5 ${
                            isSelected
                              ? "bg-[#c9a050]/15 border-[#c9a050] shadow-sm"
                              : "bg-[#14120f] border-[rgba(201,160,80,0.2)] hover:border-[#c9a050]/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="mt-1 w-4 h-4 accent-[#c9a050] rounded cursor-pointer"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-white">
                                {index + 1}. {doc.name}
                              </span>

                              {doc.isMandatory ? (
                                <span className="text-[10px] bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/30 px-2 py-0.5 rounded-full font-medium">
                                  الزامی
                                </span>
                              ) : (
                                <span className="text-[10px] bg-[#0a0a0a] text-[#888888] border border-[rgba(201,160,80,0.2)] px-2 py-0.5 rounded-full font-medium">
                                  اختیاری / تکمیلی
                                </span>
                              )}

                              {doc.recipientRole && (
                                <span className="text-[10px] bg-[#c9a050]/15 text-[#c9a050] border border-[rgba(201,160,80,0.25)] px-2 py-0.5 rounded font-mono">
                                  مربوط به: {doc.recipientRole}
                                </span>
                              )}
                            </div>

                            {doc.description && (
                              <p className="text-xs text-[#e0e0e0] mt-1.5 leading-relaxed">{doc.description}</p>
                            )}

                            {doc.notes && (
                              <div className="mt-2 text-xs bg-[#0a0a0a] border border-[rgba(201,160,80,0.2)] p-2 rounded-lg text-[#c9a050] flex items-start gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-[#c9a050] mt-0.5 shrink-0" />
                                <span>توضیح کارشناس: {doc.notes}</span>
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
                <h2 className="text-sm font-bold text-[#c9a050] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#c9a050]" />
                  فرآیند اجرایی گام‌به‌گام
                </h2>

                {processSteps.length === 0 ? (
                  <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] rounded-xl p-8 text-center text-xs text-[#888888]">
                    گام اجرایی خاصی ثبت نشده است.
                  </div>
                ) : (
                  <div className="relative border-r-2 border-[#c9a050]/30 mr-4 space-y-6 pr-6">
                    {processSteps.map((step) => (
                      <div key={step.id} className="relative group">
                        <div className="absolute -right-[31px] top-0 w-6 h-6 rounded-full bg-[#c9a050] text-[#0a0a0a] font-bold text-xs flex items-center justify-center shadow-md">
                          {step.stepNumber}
                        </div>

                        <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] p-4 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-[#c9a050]">{step.title}</h3>
                            {step.estimatedTime && (
                              <span className="text-[10px] bg-[#0a0a0a] text-[#d8bf93] border border-[rgba(201,160,80,0.2)] px-2 py-0.5 rounded font-mono">
                                {step.estimatedTime}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#e0e0e0] leading-relaxed pt-1">{step.detail}</p>
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
                <h2 className="text-sm font-bold text-[#c9a050] flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#c9a050]" />
                  سوالات متداول مشتریان در تماس‌های تلفنی
                </h2>

                {faqs.length === 0 ? (
                  <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] rounded-xl p-8 text-center text-xs text-[#888888]">
                    سوال متداولی درج نشده است.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {faqs.map((faq, idx) => (
                      <div key={faq.id || idx} className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] p-4 rounded-xl space-y-2">
                        <div className="flex items-start gap-2 text-xs font-bold text-[#c9a050]">
                          <span className="bg-[#c9a050]/20 text-[#c9a050] px-1.5 py-0.5 rounded text-[10px]">سوال</span>
                          <p className="leading-relaxed">{faq.question}</p>
                        </div>
                        <div className="flex items-start gap-2 text-xs text-[#e0e0e0] pt-2 border-t border-[rgba(201,160,80,0.2)]">
                          <span className="bg-[#10b981]/20 text-[#10b981] px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                            پاسخ
                          </span>
                          <p className="leading-relaxed text-[#e0e0e0]">{faq.answer}</p>
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
                <div className="bg-[#14120f] border border-[rgba(201,160,80,0.2)] rounded-xl p-4 mt-6">
                  <h3 className="text-xs font-bold text-white mb-2 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-[#10b981]" /> راهنمای هزینه و زمان‌بندی به مشتری
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-[#e0e0e0]">
                    {node.costsAndDeadlines.governmentFee && (
                      <div>
                        <span className="text-[#888888]">هزینه‌های دولتی و قانونی:</span>{" "}
                        <span className="font-semibold text-[#10b981]">{node.costsAndDeadlines.governmentFee}</span>
                      </div>
                    )}
                    {node.costsAndDeadlines.serviceFee && (
                      <div>
                        <span className="text-[#888888]">حق‌الزحمه خدمات:</span>{" "}
                        <span className="font-semibold text-[#c9a050]">{node.costsAndDeadlines.serviceFee}</span>
                      </div>
                    )}
                    {node.costsAndDeadlines.totalDuration && (
                      <div>
                        <span className="text-[#888888]">مدت زمان کل:</span>{" "}
                        <span className="font-semibold text-[#d8bf93]">{node.costsAndDeadlines.totalDuration}</span>
                      </div>
                    )}
                  </div>
                  {node.costsAndDeadlines.notes && (
                    <p className="text-xs text-[#c9a050] mt-2 bg-[#0a0a0a] p-2 rounded border border-[rgba(201,160,80,0.2)]">
                      💡 {node.costsAndDeadlines.notes}
                    </p>
                  )}
                </div>
              )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

