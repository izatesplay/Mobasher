import React, { useState, useMemo, useEffect } from "react";
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
} from "lucide-react";

interface NodeContentViewerProps {
  node: CategoryNode | null;
  allNodes?: CategoryNode[];
  breadcrumbs?: string[];
  childNodes?: CategoryNode[];
  onSelectNode?: (id: string) => void;
  onOpenAiAssistant?: () => void;
}

export const NodeContentViewer: React.FC<NodeContentViewerProps> = ({
  node,
  allNodes = [],
  breadcrumbs,
  childNodes,
  onSelectNode,
  onOpenAiAssistant,
}) => {
  // Compute breadcrumbs if not provided
  const derivedBreadcrumbs = useMemo(() => {
    if (breadcrumbs) return breadcrumbs;
    if (!node || !allNodes.length) return node ? [node.title] : [];
    const crumbs: string[] = [node.title];
    let curr = node;
    while (curr.parentId) {
      const parent = allNodes.find((n) => n.id === curr.parentId);
      if (!parent) break;
      crumbs.unshift(parent.title);
      curr = parent;
    }
    return crumbs;
  }, [node, allNodes, breadcrumbs]);

  // Compute childNodes if not provided
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
  const [activeTab, setActiveTab] = useState<"documents" | "process" | "faqs" | "subcategories">("documents");

  // Reset/update selections when node changes
  useEffect(() => {
    if (!node) return;
    const initial: Record<string, boolean> = {};
    (node.requiredDocuments || []).forEach((doc) => {
      initial[doc.id] = doc.isMandatory;
    });
    setSelectedDocIds(initial);

    const docsCount = node.requiredDocuments?.length || 0;
    const childrenCount = derivedChildNodes.length;

    if (docsCount > 0) {
      setActiveTab("documents");
    } else if (childrenCount > 0) {
      setActiveTab("subcategories");
    } else {
      setActiveTab("process");
    }
  }, [node?.id, derivedChildNodes.length]);

  if (!node) {
    return (
      <div className="flex-1 bg-slate-950 text-slate-100 p-8 flex flex-col items-center justify-center space-y-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl text-amber-400">
          <FolderTree className="w-12 h-12" />
        </div>
        <h2 className="text-lg font-bold text-amber-400">هیچ سرفصلی انتخاب نشده است</h2>
        <p className="text-xs text-slate-400 max-w-md text-center leading-relaxed">
          لطفاً از منوی سمت راست یک حوزه یا خدمت را جهت مشاهده مدارک، فرآیندها و سوالات متداول انتخاب کنید.
        </p>
      </div>
    );
  }

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
      text += `⏱️ **زمان تقربی تحویل/انجام**: ${node.costsAndDeadlines.totalDuration}\n`;
    }

    text += `\nدر صورت وجود هرگونه سوال، کارشناسان مباشر پاسخگوی شما خواهند بود.\nبا تشکر`;

    navigator.clipboard.writeText(text);
    setCopiedMessage(true);
    setTimeout(() => setCopiedMessage(false), 2500);
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-4 md:p-8 overflow-y-auto space-y-6 custom-scrollbar">
      {/* Breadcrumbs Navigation */}
      <nav className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 flex-wrap">
        <span className="text-amber-400 font-semibold flex items-center gap-1">
          <FolderTree className="w-3.5 h-3.5" /> مسیر جاری:
        </span>
        {derivedBreadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <ChevronLeft className="w-3.5 h-3.5 text-slate-600" />}
            <span
              className={
                idx === derivedBreadcrumbs.length - 1
                  ? "text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                  : "text-slate-300"
              }
            >
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </nav>

      {/* Main Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/20 mt-1">
              {renderCategoryIcon(node.icon, "w-7 h-7")}
            </div>
            <div>
              <h1 className="text-2xl font-black text-amber-400 tracking-tight flex items-center gap-2">
                {node.title}
              </h1>
              {node.subtitle && <p className="text-sm font-medium text-slate-300 mt-1">{node.subtitle}</p>}
              {node.description && (
                <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-3xl">{node.description}</p>
              )}
            </div>
          </div>

          {/* Quick AI Trigger & Action */}
          {onOpenAiAssistant && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 md:pt-0">
              <button
                onClick={onOpenAiAssistant}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition shadow-md cursor-pointer border border-blue-400/30"
              >
                <Sparkles className="w-4 h-4 text-cyan-300 animate-pulse" />
                <span>پاسخگویی هوشمند به مشتری</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Meta Badges */}
        <div className="flex items-center gap-4 mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <FileCheck2 className="w-3.5 h-3.5 text-amber-400" />
            <strong className="text-slate-200 font-mono">{requiredDocuments.length}</strong> مدارک لازم
          </span>
          {node.costsAndDeadlines?.totalDuration && (
            <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              زمان تقریبی: <strong className="text-slate-200">{node.costsAndDeadlines.totalDuration}</strong>
            </span>
          )}
          {node.costsAndDeadlines?.governmentFee && (
            <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Coins className="w-3.5 h-3.5 text-emerald-400" />
              هزینه دولتی: <strong className="text-slate-200">{node.costsAndDeadlines.governmentFee}</strong>
            </span>
          )}
          {node.costsAndDeadlines?.serviceFee && (
            <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              حق‌الزحمه: <strong className="text-slate-200">{node.costsAndDeadlines.serviceFee}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {requiredDocuments.length > 0 && (
          <button
            onClick={() => setActiveTab("documents")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "documents"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            مدارک و اطلاعات مورد نیاز ({requiredDocuments.length})
          </button>
        )}

        {derivedChildNodes.length > 0 && (
          <button
            onClick={() => setActiveTab("subcategories")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "subcategories"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <FolderTree className="w-4 h-4" />
            زیرمجموعه‌های این بخش ({derivedChildNodes.length})
          </button>
        )}

        {processSteps.length > 0 && (
          <button
            onClick={() => setActiveTab("process")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "process"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <Clock className="w-4 h-4" />
            مراحل و گام‌های اجرایی ({processSteps.length})
          </button>
        )}

        {faqs.length > 0 && (
          <button
            onClick={() => setActiveTab("faqs")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeTab === "faqs"
                ? "bg-amber-500 text-slate-950 shadow"
                : "bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            سوالات متداول مشتریان ({faqs.length})
          </button>
        )}
      </div>

      {/* TAB CONTENT 1: REQUIRED DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-amber-400" />
                لیست مدارک مورد نیاز برای «{node.title}»
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                مدارک مورد نظر را انتخاب کنید و جهت ارسال سریع به مشتری روی دکمه کپی کلیک کنید.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={selectAllDocs}
                className="text-xs text-slate-300 hover:text-amber-300 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
              >
                انتخاب همه
              </button>
              <button
                onClick={deselectAllDocs}
                className="text-xs text-slate-300 hover:text-slate-100 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
              >
                لغو انتخاب
              </button>
              <button
                onClick={handleCopyCustomerChecklist}
                className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl transition cursor-pointer shadow-md ${
                  copiedMessage
                    ? "bg-emerald-600 text-white"
                    : "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 hover:from-amber-400 hover:to-amber-500"
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
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
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
                        ? "bg-amber-500/10 border-amber-500/40 shadow-sm"
                        : "bg-slate-900/80 border-slate-800/80 hover:border-slate-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      className="mt-1 w-4 h-4 accent-amber-500 rounded cursor-pointer"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-200">
                          {index + 1}. {doc.name}
                        </span>

                        {doc.isMandatory ? (
                          <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-full font-medium">
                            الزامی
                          </span>
                        ) : (
                          <span className="text-[10px] bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded-full font-medium">
                            اختیاری / تکمیلی
                          </span>
                        )}

                        {doc.recipientRole && (
                          <span className="text-[10px] bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 px-2 py-0.5 rounded font-mono">
                            مربوط به: {doc.recipientRole}
                          </span>
                        )}
                      </div>

                      {doc.description && (
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{doc.description}</p>
                      )}

                      {doc.notes && (
                        <div className="mt-2 text-xs bg-slate-950/80 border border-slate-800 p-2 rounded-lg text-amber-300 flex items-start gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
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

      {/* TAB CONTENT 2: SUBCATEGORIES GRID */}
      {activeTab === "subcategories" && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <FolderTree className="w-4 h-4 text-amber-400" />
            سابتایتل‌ها و بخش‌های زیرمجموعه «{node.title}»
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {derivedChildNodes.map((child) => (
              <div
                key={child.id}
                onClick={() => onSelectNode && onSelectNode(child.id)}
                className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 p-4 rounded-2xl transition cursor-pointer group flex flex-col justify-between shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-105 transition">
                      {renderCategoryIcon(child.icon, "w-5 h-5")}
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                      {child.requiredDocuments?.length || 0} مدرک
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-amber-400 transition">
                    {child.title}
                  </h3>
                  {child.subtitle && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{child.subtitle}</p>}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-amber-400 font-medium">
                  <span>مشاهده جزئیات و مدارک</span>
                  <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: PROCESS STEPS */}
      {activeTab === "process" && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            فرآیند اجرایی گام‌به‌گام
          </h2>

          {processSteps.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
              گام اجرایی خاصی ثبت نشده است.
            </div>
          ) : (
            <div className="relative border-r-2 border-amber-500/30 mr-4 space-y-6 pr-6">
              {processSteps.map((step) => (
                <div key={step.id} className="relative group">
                  {/* Step Number Dot */}
                  <div className="absolute -right-[31px] top-0 w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shadow-md">
                    {step.stepNumber}
                  </div>

                  <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-amber-300">{step.title}</h3>
                      {step.estimatedTime && (
                        <span className="text-[10px] bg-slate-800 text-cyan-300 px-2 py-0.5 rounded font-mono">
                          {step.estimatedTime}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">{step.detail}</p>
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
          <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            سوالات متداول مشتریان در تماس‌های تلفنی
          </h2>

          {faqs.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
              سوال متداولی درج نشده است.
            </div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq, idx) => (
                <div key={faq.id || idx} className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-2">
                  <div className="flex items-start gap-2 text-xs font-bold text-amber-400">
                    <span className="bg-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">سوال</span>
                    <p className="leading-relaxed">{faq.question}</p>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-200 pt-2 border-t border-slate-800/80">
                    <span className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                      پاسخ
                    </span>
                    <p className="leading-relaxed text-slate-300">{faq.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COSTS AND DEADLINES SUMMARY BOX */}
      {node.costsAndDeadlines && (node.costsAndDeadlines.governmentFee || node.costsAndDeadlines.serviceFee || node.costsAndDeadlines.totalDuration || node.costsAndDeadlines.notes) && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-6">
          <h3 className="text-xs font-bold text-slate-300 mb-2 flex items-center gap-2">
            <Coins className="w-4 h-4 text-emerald-400" /> راهنمای هزینه و زمان‌بندی به مشتری
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs text-slate-300">
            {node.costsAndDeadlines.governmentFee && (
              <div>
                <span className="text-slate-500">هزینه‌های دولتی و قانونی:</span>{" "}
                <span className="font-semibold text-emerald-300">{node.costsAndDeadlines.governmentFee}</span>
              </div>
            )}
            {node.costsAndDeadlines.serviceFee && (
              <div>
                <span className="text-slate-500">حق‌الزحمه خدمات:</span>{" "}
                <span className="font-semibold text-amber-300">{node.costsAndDeadlines.serviceFee}</span>
              </div>
            )}
            {node.costsAndDeadlines.totalDuration && (
              <div>
                <span className="text-slate-500">مدت زمان کل:</span>{" "}
                <span className="font-semibold text-cyan-300">{node.costsAndDeadlines.totalDuration}</span>
              </div>
            )}
          </div>
          {node.costsAndDeadlines.notes && (
            <p className="text-xs text-amber-300/80 mt-2 bg-slate-950 p-2 rounded border border-slate-800/80">
              💡 {node.costsAndDeadlines.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
