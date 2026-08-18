import React, { useState } from "react";
import {
  X,
  Bell,
  HelpCircle,
  CheckCircle,
  Trash2,
  Send,
  Loader2,
  Calendar,
  User as UserIcon,
  FolderTree,
  AlertCircle,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { FAQ, CategoryNode } from "../../types";
import { api } from "../../lib/api";

interface PendingFaqNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingFaqs?: FAQ[];
  onFaqAnswered?: () => void;
  onSelectNode?: (nodeId: string) => void;
  onAnswered?: () => void;
  onDeleted?: () => void;
  onViewNode?: (nodeId: string) => void;
}

export const PendingFaqNotificationModal: React.FC<PendingFaqNotificationModalProps> = ({
  isOpen,
  onClose,
  pendingFaqs = [],
  onFaqAnswered,
  onSelectNode,
  onAnswered,
  onDeleted,
  onViewNode,
}) => {
  const safePendingFaqs = Array.isArray(pendingFaqs) ? pendingFaqs : [];
  const handleAnswerCallback = onFaqAnswered || onAnswered;
  const handleNodeSelect = onSelectNode || onViewNode;
  const handleDeleteCallback = onDeleted || onFaqAnswered || onAnswered;

  const [selectedFaqId, setSelectedFaqId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [editedQuestion, setEditedQuestion] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const activeFaq = safePendingFaqs.find((f) => f.id === selectedFaqId) || safePendingFaqs[0];

  React.useEffect(() => {
    if (activeFaq) {
      setEditedQuestion(activeFaq.question);
      setAnswerText(activeFaq.answer || "");
      setErrorMessage("");
      setSuccessMessage("");
      setConfirmDeleteId(null);
    }
  }, [activeFaq?.id]);

  if (!isOpen || safePendingFaqs.length === 0) return null;

  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFaq) return;
    if (!answerText.trim()) {
      setErrorMessage("لطفاً پاسخ رسمی را تایپ کنید.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await api.answerFaq(activeFaq.id, answerText.trim(), editedQuestion.trim(), activeFaq.nodeId);
      setSuccessMessage("پاسخ با موفقیت ذخیره و در سامانه منتشر شد.");
      if (handleAnswerCallback) {
        handleAnswerCallback();
      }
      setTimeout(() => {
        setSuccessMessage("");
        // Select next or close if empty
        if (safePendingFaqs.length <= 1) {
          onClose();
        }
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || "خطا در ثبت پاسخ سوال.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (faqId: string) => {
    setIsDeleting(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await api.deleteFaq(faqId);
      setSuccessMessage("سوال با موفقیت حذف/رد شد.");
      setConfirmDeleteId(null);
      if (handleDeleteCallback) {
        handleDeleteCallback();
      }
      setTimeout(() => {
        setSuccessMessage("");
        if (safePendingFaqs.length <= 1) {
          onClose();
        }
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || "خطا در حذف سوال.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#14120f] border-2 border-amber-400 dark:border-[#c9a050] rounded-3xl shadow-2xl overflow-hidden my-8 transition-colors">
        {/* Header Banner */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-500 text-slate-950 dark:bg-[#c9a050] dark:text-[#0a0a0a]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-white/25">
              <Bell className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">
                  اعلان سوال جدید از طرف اپراتور کال‌سنتر
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 text-white dark:bg-black text-xs font-bold">
                  {safePendingFaqs.length} مورد در انتظار پاسخ
                </span>
              </div>
              <p className="text-xs font-medium opacity-90">
                اپراتورهای کال‌سنتر سوالات جدیدی ثبت کرده‌اند که نیاز به پاسخ رسمی شما دارد.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-black/10 rounded-xl transition cursor-pointer text-slate-950"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Layout: Left list (if multiple) & Right answer panel */}
        <div className="grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-slate-200 dark:divide-[rgba(201,160,80,0.2)]">
          {/* List of Pending Questions */}
          {safePendingFaqs.length > 1 && (
            <div className="md:col-span-4 p-4 bg-slate-50 dark:bg-[#181613] max-h-[420px] overflow-y-auto space-y-2">
              <div className="text-xs font-bold text-slate-500 dark:text-[#888888] mb-2 px-1">
                لیست سوالات منتظر پاسخ:
              </div>
              {safePendingFaqs.map((faq) => {
                const isSelected = (activeFaq && activeFaq.id === faq.id) || (!activeFaq && false);
                return (
                  <div
                    key={faq.id}
                    onClick={() => setSelectedFaqId(faq.id)}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? "bg-white dark:bg-[#201d18] border-amber-500 dark:border-[#c9a050] shadow-xs font-bold text-slate-900 dark:text-white"
                        : "bg-white/60 dark:bg-[#14120f]/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-[#1e1b16]"
                    }`}
                  >
                    <div className="line-clamp-2 mb-1">{faq.question}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
                      <span>{faq.nodeTitle || "سرفصل"}</span>
                      <span>{faq.submittedBy?.fullName || "اپراتور"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Active Question Answering Box */}
          <div className={`${safePendingFaqs.length > 1 ? "md:col-span-8" : "md:col-span-12"} p-6 space-y-5`}>
            {activeFaq ? (
              <form onSubmit={handleAnswerSubmit} className="space-y-4">
                {successMessage && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-200 text-xs font-bold">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 flex items-center gap-2.5 text-red-800 dark:text-red-200 text-xs font-bold">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* Submitter and Node Metadata */}
                <div className="p-3.5 rounded-2xl bg-blue-50/70 dark:bg-[#1a1815] border border-blue-100 dark:border-[rgba(201,160,80,0.25)] flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <FolderTree className="w-3.5 h-3.5 text-[#0b216f] dark:text-[#c9a050]" />
                      <strong className="text-slate-900 dark:text-white">سرفصل:</strong> {activeFaq.nodeTitle}
                    </span>
                    <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
                      <UserIcon className="w-3.5 h-3.5 text-[#0b216f] dark:text-[#c9a050]" />
                      <strong className="text-slate-900 dark:text-white">ثبت‌کننده:</strong>{" "}
                      {activeFaq.submittedBy?.fullName || "اپراتور کال‌سنتر"}
                    </span>
                  </div>
                  {handleNodeSelect && activeFaq.nodeId && (
                    <button
                      type="button"
                      onClick={() => {
                        handleNodeSelect(activeFaq.nodeId!);
                        onClose();
                      }}
                      className="flex items-center gap-1 text-[11px] text-[#0b216f] dark:text-[#c9a050] hover:underline font-bold"
                    >
                      <span>مشاهده در پایگاه دانش</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Similarity note if existed */}
                {activeFaq.similarityNote && (
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-900 dark:text-amber-200">
                    <strong>یادداشت اپراتور درباره تمایز:</strong> {activeFaq.similarityNote}
                  </div>
                )}

                {/* Editable Question */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    متن سوال (امکان ویرایش جهت نگارش بهتر):
                  </label>
                  <input
                    type="text"
                    value={editedQuestion}
                    onChange={(e) => setEditedQuestion(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-[rgba(201,160,80,0.3)] bg-white dark:bg-[#1a1815] text-slate-900 dark:text-white text-xs sm:text-sm font-bold focus:ring-2 focus:ring-[#0b216f] dark:focus:ring-[#c9a050] focus:outline-hidden"
                  />
                </div>

                {/* Answer Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    پاسخ رسمی ادمین (این پاسخ بلافاصله در دسترس اپراتورها قرار می‌گیرد):
                  </label>
                  <textarea
                    rows={4}
                    value={answerText}
                    onChange={(e) => setAnswerText(e.target.value)}
                    placeholder="پاسخ کامل، دقیق و قابل استناد را تایپ نمایید..."
                    className="w-full px-4 py-3 rounded-2xl border border-slate-300 dark:border-[rgba(201,160,80,0.3)] bg-white dark:bg-[#1a1815] text-slate-900 dark:text-white text-xs sm:text-sm leading-relaxed focus:ring-2 focus:ring-[#0b216f] dark:focus:ring-[#c9a050] focus:outline-hidden"
                  />
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-[rgba(201,160,80,0.2)]">
                  {confirmDeleteId === activeFaq.id ? (
                    <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs">
                      <span className="text-red-700 dark:text-red-300 font-bold">
                        آیا از حذف/رد این سوال مطمئن هستید؟
                      </span>
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(activeFaq.id)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-xs transition cursor-pointer flex items-center gap-1"
                      >
                        {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        بله، حذف کن
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-2.5 py-1 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                      >
                        انصراف
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(activeFaq.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-bold transition cursor-pointer border border-transparent hover:border-red-200 dark:hover:border-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                      حذف / رد سوال
                    </button>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#201d18] text-xs font-medium transition cursor-pointer"
                    >
                      بستن اعلان
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || isDeleting}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
                    >
                      {isSubmitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                      تأیید و انتشار پاسخ
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="text-center py-12 text-slate-400">سوالی در این بخش وجود ندارد.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
