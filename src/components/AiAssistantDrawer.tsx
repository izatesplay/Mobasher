import React, { useState } from "react";
import { api } from "../lib/api";
import { Bot, X, Send, Sparkles, Copy, Check, MessageSquare, AlertCircle } from "lucide-react";

interface AiAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AiAssistantDrawer: React.FC<AiAssistantDrawerProps> = ({ isOpen, onClose }) => {
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
      <div className="w-full max-w-lg bg-slate-900 border-r border-slate-800 text-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-300">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md">
              <Bot className="w-5 h-5 text-cyan-200" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-sky-300">دستیار هوشمند پاسخگویی کال‌سنتر</h2>
              <p className="text-[11px] text-slate-400">مبتنی بر قوانین و پایگاه دانش مباشر (Gemini AI)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {/* Quick suggestions */}
          <div className="space-y-2">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" /> پرسش‌های متداول و آماده:
            </span>
            <div className="flex flex-col gap-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuestion(prompt);
                    handleAsk(prompt);
                  }}
                  className="text-right text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-200 p-2.5 rounded-xl border border-slate-700/60 transition cursor-pointer flex items-center justify-between group"
                >
                  <span className="line-clamp-1">{prompt}</span>
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* AI Answer Card */}
          {loading && (
            <div className="p-6 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400 animate-pulse">در حال تحلیل پایگاه دانش مباشر...</p>
            </div>
          )}

          {answer && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 relative shadow-inner">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <Bot className="w-4 h-4 text-cyan-400" /> پاسخ راهنمای کال‌سنتر:
                </span>

                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded-lg border border-slate-700 transition cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>کپی شد</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>کپی متن</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-xs text-slate-200 leading-relaxed whitespace-pre-line font-sans">
                {answer}
              </div>
            </div>
          )}
        </div>

        {/* Question Input Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="سوال خود درباره مدارک، زمان‌بندی یا شرایط خدمات را بنویسید..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            <button
              onClick={() => handleAsk()}
              disabled={loading || !question.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold p-2.5 rounded-xl transition shadow cursor-pointer"
            >
              <Send className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
