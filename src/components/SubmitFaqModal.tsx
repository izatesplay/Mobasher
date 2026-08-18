import React, { useState, useEffect } from "react";
import {
  X,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Send,
  Loader2,
  Info,
  Sparkles,
  Search,
  Check,
} from "lucide-react";
import { CategoryNode, SimilarFaqItem, SimilarityCheckResult } from "../types";
import { api } from "../lib/api";

interface SubmitFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNode?: CategoryNode | null;
  allNodes?: CategoryNode[];
  nodeId?: string;
  nodeTitle?: string;
  allFaqs?: { id?: string; question: string; answer?: string; nodeTitle?: string }[];
  onSubmitted?: () => void;
}

export const SubmitFaqModal: React.FC<SubmitFaqModalProps> = ({
  isOpen,
  onClose,
  currentNode,
  allNodes = [],
  nodeId,
  nodeTitle,
  onSubmitted,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [note, setNote] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [similarityResult, setSimilarityResult] = useState<SimilarityCheckResult | null>(null);
  const [confirmedDifferent, setConfirmedDifferent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const safeNodes = Array.isArray(allNodes) ? allNodes : [];

  // Initialize node selection
  useEffect(() => {
    if (currentNode?.id) {
      setSelectedNodeId(currentNode.id);
    } else if (nodeId) {
      setSelectedNodeId(nodeId);
    } else if (safeNodes.length > 0 && !selectedNodeId) {
      setSelectedNodeId(safeNodes[0].id);
    }
  }, [currentNode, nodeId, safeNodes, selectedNodeId]);

  // Debounced similarity check when question changes
  useEffect(() => {
    if (!question || question.trim().length < 4) {
      setSimilarityResult(null);
      setConfirmedDifferent(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsChecking(true);
      try {
        const result = await api.checkFaqSimilarity(question);
        setSimilarityResult(result);
        if (!result.isSimilar) {
          setConfirmedDifferent(false);
        }
      } catch (err) {
        console.error("Similarity check error:", err);
      } finally {
        setIsChecking(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [question]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!question.trim()) {
      setErrorMessage("لطفاً متن سوال را وارد نمایید.");
      return;
    }

    if (!selectedNodeId) {
      setErrorMessage("لطفاً سرفصل یا خدمت مربوطه را مشخص کنید.");
      return;
    }

    if (similarityResult?.isSimilar && !confirmedDifferent) {
      setErrorMessage("این سوال با سوالات موجود در سامانه بیش از ۷۰٪ تشابه دارد. لطفاً در صورت تفاوت، تیک تأیید تمایز را فعال نمایید.");
      return;
    }

    setIsSubmitting(true);
    try {
      const topSimilar = similarityResult?.similarFaqs?.[0];
      const res = await api.submitFaq({
        nodeId: selectedNodeId,
        question: question.trim(),
        note: note.trim(),
        confirmedDifferent: similarityResult?.isSimilar ? confirmedDifferent : undefined,
        similarQuestion: topSimilar ? topSimilar.question : undefined,
        similarityPercent: topSimilar ? topSimilar.similarityPercent : undefined,
      });

      setSuccessMessage(res.message || "سوال با موفقیت ثبت و جهت بررسی ادمین ارسال شد.");
      if (onSubmitted) {
        onSubmitted();
      }
      setTimeout(() => {
        handleResetAndClose();
      }, 1800);
    } catch (err: any) {
      setErrorMessage(err.message || "خطا در ثبت سوال متداول.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setQuestion("");
    setNote("");
    setSimilarityResult(null);
    setConfirmedDifferent(false);
    setErrorMessage("");
    setSuccessMessage("");
    onClose();
  };

  const topMatch: SimilarFaqItem | undefined = similarityResult?.similarFaqs?.[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#14120f] border border-slate-200 dark:border-[rgba(201,160,80,0.3)] rounded-3xl shadow-2xl overflow-hidden my-8 transition-colors">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200 dark:border-[rgba(201,160,80,0.2)] bg-slate-50/70 dark:bg-[#181613]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-[#0b216f] dark:bg-[#c9a050]/20 dark:text-[#c9a050] border border-blue-200 dark:border-[rgba(201,160,80,0.3)]">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                ثبت سوال متداول جدید (اپراتور کال‌سنتر)
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#888888] mt-0.5">
                سوال ثبت‌شده پس از بررسی و پاسخ‌دهی توسط ادمین در پایگاه دانش منتشر می‌شود.
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:text-gray-400 dark:hover:text-white rounded-xl hover:bg-slate-200/50 dark:hover:bg-[#25221d] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center gap-3 text-red-800 dark:text-red-200 text-sm font-medium">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Service / Node Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
              سرفصل یا خدمت مربوطه:
            </label>
            <select
              value={selectedNodeId}
              onChange={(e) => setSelectedNodeId(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-[rgba(201,160,80,0.3)] bg-white dark:bg-[#1a1815] text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0b216f] dark:focus:ring-[#c9a050] transition-colors"
            >
              {safeNodes.length > 0 ? (
                safeNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.title} {n.subtitle ? `(${n.subtitle})` : ""}
                  </option>
                ))
              ) : (
                <option value={selectedNodeId || "general"}>
                  {currentNode?.title || nodeTitle || "سرفصل فعلی"}
                </option>
              )}
            </select>
          </div>

          {/* Question Text Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-200">
                متن سوال مطرح شده توسط مشتری / اپراتور:
              </label>
              {isChecking && (
                <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-[#c9a050]">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  در حال بررسی تشابه هوشمند...
                </span>
              )}
            </div>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="مثال: آیا برای ثبت شرکت سهامی خاص حضور همه اعضای هیئت مدیره در دفترخانه الزامی است؟"
              rows={3}
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-[rgba(201,160,80,0.3)] bg-white dark:bg-[#1a1815] text-slate-900 dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0b216f] dark:focus:ring-[#c9a050] transition-colors leading-relaxed"
            />
          </div>

          {/* SIMILARITY WARNING & CONFIRMATION BOX (Triggered on >= 70% match) */}
          {similarityResult && similarityResult.isSimilar && topMatch && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-[#201a10] border-2 border-amber-400/80 dark:border-amber-600/70 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300">
                      تشابه بالا شناسایی شد ({topMatch.similarityPercent}٪ تشابه با سوالات موجود)
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold">
                      بخش: {topMatch.nodeTitle}
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 dark:text-amber-200/90 leading-relaxed">
                    سوال مشابهی قبلاً در سامانه ثبت شده است. شاید پاسخ زیر مشکل شما را فوراً حل کند:
                  </p>
                </div>
              </div>

              {/* Box showing the existing similar question & answer */}
              <div className="p-3.5 rounded-xl bg-white/90 dark:bg-[#14120f] border border-amber-300 dark:border-amber-700/50 space-y-2 text-xs">
                <div className="font-bold text-slate-900 dark:text-[#c9a050] flex items-start gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/40 text-[#0b216f] dark:text-blue-300 text-[10px] shrink-0">
                    سوال موجود:
                  </span>
                  <span>{topMatch.question}</span>
                </div>
                {topMatch.answer ? (
                  <div className="font-normal text-slate-700 dark:text-slate-300 flex items-start gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-[10px] shrink-0">
                      پاسخ ثبت‌شده:
                    </span>
                    <span className="leading-relaxed">{topMatch.answer}</span>
                  </div>
                ) : (
                  <div className="text-amber-600 dark:text-amber-400 italic pt-1">
                    (این سوال هنوز در انتظار پاسخ رسمی ادمین است)
                  </div>
                )}
              </div>

              {/* Confirmation Checkbox Requirement */}
              <div className="pt-2 border-t border-amber-300/80 dark:border-amber-700/50">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={confirmedDifferent}
                    onChange={(e) => setConfirmedDifferent(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-amber-400 text-[#0b216f] dark:text-[#c9a050] focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-200 leading-snug">
                    تأیید می‌کنم که این سوال با مورد مشابه بالا تفاوت دارد و جنبه جدیدی از موضوع را بررسی می‌کند.
                  </span>
                </label>
              </div>

              {/* Optional Explanation Note */}
              {confirmedDifferent && (
                <div className="pt-2">
                  <label className="block text-[11px] font-bold text-amber-900 dark:text-amber-300 mb-1">
                    توضیح تمایز برای ادمین (اختیاری):
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="مثال: این سوال مختص اشخاص حقوقی اتباع خارجی است نه داخلی"
                    className="w-full px-3 py-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-white dark:bg-[#14120f] text-xs text-slate-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-[rgba(201,160,80,0.2)]">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-[rgba(201,160,80,0.3)] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#201d18] text-sm font-medium transition cursor-pointer"
            >
              انصراف
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (similarityResult?.isSimilar && !confirmedDifferent)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm shadow-md transition cursor-pointer ${
                similarityResult?.isSimilar && !confirmedDifferent
                  ? "bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                  : "bg-[#0b216f] hover:bg-[#081850] dark:bg-[#c9a050] dark:hover:bg-[#b08b40] text-white dark:text-[#0a0a0a]"
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  ارسال سوال به ادمین
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
