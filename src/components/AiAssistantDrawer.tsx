import React, { useState } from "react";
import { api } from "../lib/api";
import { useTheme } from "../context/ThemeContext";
import { Bot, X, Send, Sparkles, Copy, Check, MessageSquare, AlertCircle } from "lucide-react";

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
  const { isDark } = useTheme();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    "برای ثبت برند حقیقی و حقوقی چه مدارکی از مشتری بخوام؟",
    "تفاوت شرکت با مسئولیت محدود و سهامی خاص در واریز پول چیه؟",
    "جریمه عدم ارسال اظهارنامه مالیاتی عملکرد چقدره؟",
    "چه کسانی باید در سامانه مؤدیان فاکتور الکترونیکی صادر کنند؟",
  ];

  const handleAsk = async (promptToUse?: string) => {
    const q = promptToUse || question;
    if (!q.trim() || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await api.askAi(q);
      setAnswer(res.answer);
    } catch (err: any) {
      setError(err.message || "خطا در پاسخگویی هوشمند");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm transition-opacity">
      <div
        className={`w-full max-w-lg h-full flex flex-col shadow-2xl transition-colors border-r ${
          isDark
            ? "bg-[#0f0e0c] border-[rgba(201,160,80,0.25)] text-white"
            : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        {/* Header */}
        <div
          className={`p-4 border-b flex items-center justify-between ${
            isDark
              ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl shadow-md ${
                isDark ? "bg-[#c9a050] text-[#0a0a0a]" : "bg-[#0b216f] text-white"
              }`}
            >
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2
                className={`text-sm sm:text-base font-black ${
                  isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                }`}
              >
                دستیار هوشمند پاسخگویی کال‌سنتر
              </h2>
              <p className={`text-xs ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
                مبتنی بر پایگاه دانش و قوانین ثبتی و مالیاتی مباشر
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark
                ? "text-[#888888] hover:text-white bg-[#14120f] border-[rgba(201,160,80,0.2)]"
                : "text-slate-500 hover:text-slate-900 bg-slate-100 border-slate-200"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* Quick suggestions */}
          <div className="space-y-2">
            <span
              className={`text-xs font-bold flex items-center gap-1.5 ${
                isDark ? "text-[#c9a050]" : "text-[#0b216f]"
              }`}
            >
              <Sparkles className="w-4 h-4" /> پرسش‌های متداول و آماده مشتریان:
            </span>
            <div className="flex flex-col gap-2">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(prompt);
                    handleAsk(prompt);
                  }}
                  className={`text-right text-xs sm:text-sm p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between group shadow-xs ${
                    isDark
                      ? "bg-[#14120f] hover:bg-[#1a1815] text-[#e0e0e0] border-[rgba(201,160,80,0.2)] hover:border-[#c9a050]"
                      : "bg-slate-50 hover:bg-blue-50/70 text-slate-700 border-slate-200 hover:border-blue-300"
                  }`}
                >
                  <span className="line-clamp-1">{prompt}</span>
                  <MessageSquare
                    className={`w-4 h-4 opacity-60 group-hover:opacity-100 shrink-0 ${
                      isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs sm:text-sm text-red-500 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Answer Card */}
          {loading && (
            <div
              className={`p-8 rounded-2xl flex flex-col items-center justify-center space-y-3 border ${
                isDark
                  ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)] text-[#e0e0e0]"
                  : "bg-slate-50 border-slate-200 text-slate-700"
              }`}
            >
              <div
                className={`w-8 h-8 border-3 border-t-transparent rounded-full animate-spin ${
                  isDark ? "border-[#c9a050]" : "border-[#0b216f]"
                }`}
              />
              <p className="text-xs sm:text-sm font-medium animate-pulse">در حال استخراج اطلاعات از پایگاه دانش مباشر...</p>
            </div>
          )}

          {answer && (
            <div
              className={`rounded-2xl p-4 sm:p-5 space-y-3 border shadow-xs ${
                isDark
                  ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.3)] text-[#e0e0e0]"
                  : "bg-slate-50 border-slate-200 text-slate-800"
              }`}
            >
              <div
                className={`flex items-center justify-between pb-3 border-b ${
                  isDark ? "border-[rgba(201,160,80,0.2)]" : "border-slate-200"
                }`}
              >
                <span
                  className={`text-xs sm:text-sm font-bold flex items-center gap-2 ${
                    isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                  }`}
                >
                  <Bot className="w-4 h-4" /> پاسخ کارشناسی:
                </span>

                <button
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition cursor-pointer shadow-xs ${
                    copied
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : isDark
                      ? "bg-[#14120f] hover:bg-[#1a1815] text-[#c9a050] border-[rgba(201,160,80,0.3)]"
                      : "bg-white hover:bg-slate-100 text-[#0b216f] border-slate-300"
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>کپی پاسخ</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs sm:text-sm sm:text-[15px] leading-relaxed whitespace-pre-line font-sans">
                {answer}
              </div>
            </div>
          )}
        </div>

        {/* Question Input Footer */}
        <div
          className={`p-4 border-t space-y-2 ${
            isDark
              ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]"
              : "bg-slate-50 border-slate-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="سوال خود درباره مدارک، زمان‌بندی یا شرایط خدمات را بنویسید..."
              className={`flex-1 rounded-2xl px-4 py-3 text-xs sm:text-sm transition focus:outline-none focus:ring-2 ${
                isDark
                  ? "bg-[#14120f] border border-[rgba(201,160,80,0.25)] text-white placeholder-[#888888] focus:border-[#c9a050] focus:ring-[#c9a050]/20"
                  : "bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0b216f] focus:ring-[#0b216f]/15 shadow-inner"
              }`}
            />
            <button
              onClick={() => handleAsk()}
              disabled={loading || !question.trim()}
              className={`p-3 rounded-2xl font-bold transition shadow cursor-pointer disabled:opacity-40 border ${
                isDark
                  ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] border-[#c9a050]"
                  : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
              }`}
              title="ارسال سوال"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
