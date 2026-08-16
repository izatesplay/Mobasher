import React from "react";
import { User } from "../types";
import { useTheme } from "../context/ThemeContext";
import { Shield, UserCheck, LogOut, Bot, Settings, Menu, Sun, Moon } from "lucide-react";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  activeView: "viewer" | "admin";
  onToggleView: (view: "viewer" | "admin") => void;
  onOpenAiAssistant: () => void;
  onToggleMobileMenu?: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  activeView,
  onToggleView,
  onOpenAiAssistant,
  onToggleMobileMenu,
  onGoHome,
}) => {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header
      className={`sticky top-0 z-30 transition-colors duration-200 border-b shadow-sm ${
        isDark
          ? "bg-[#0f0e0c] border-[rgba(201,160,80,0.2)] text-white shadow-black/40"
          : "bg-white border-slate-200 text-slate-800 shadow-slate-200/50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Right Side (RTL Start): Brand & Logo + Mobile Menu Toggle */}
        <div className="flex items-center space-x-3 space-x-reverse">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className={`lg:hidden p-2 rounded-xl border transition cursor-pointer ${
                isDark
                  ? "text-[#e0e0e0] hover:text-white bg-[#14120f] hover:bg-[#1a1815] border-[rgba(201,160,80,0.2)]"
                  : "text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border-slate-200"
              }`}
              title="منوی خدمات"
            >
              <Menu className={`w-5 h-5 ${isDark ? "text-[#c9a050]" : "text-[#0b216f]"}`} />
            </button>
          )}

          <div
            onClick={onGoHome}
            className="flex items-center gap-3 cursor-pointer group"
            title="صفحه اصلی حوزه‌های خدمات"
          >
            <div
              className={`p-1.5 rounded-xl border shadow-sm flex items-center justify-center shrink-0 transition-colors ${
                isDark
                  ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.25)] group-hover:border-[#c9a050]"
                  : "bg-slate-50 border-slate-200 group-hover:border-[#0b216f]"
              }`}
            >
              <img src="/logo.svg" alt="لوگوی مباشر" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1
                  className={`font-black text-lg sm:text-xl tracking-tight transition-colors ${
                    isDark
                      ? "text-[#c9a050] group-hover:text-[#d8bf93]"
                      : "text-[#0b216f] group-hover:text-blue-900"
                  }`}
                >
                  مباشر
                </h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold hidden sm:inline-block border ${
                    isDark
                      ? "bg-[#c9a050]/15 text-[#c9a050] border-[rgba(201,160,80,0.3)]"
                      : "bg-blue-50 text-[#0b216f] border-blue-200"
                  }`}
                >
                  مرجع کال‌سنتر
                </span>
              </div>
              <p
                className={`text-xs font-normal hidden md:block ${
                  isDark ? "text-[#888888]" : "text-slate-500"
                }`}
              >
                پایگاه دانش و مرجع داخلی خدمات ثبتی، حقوقی و مالیاتی
              </p>
            </div>
          </div>
        </div>

        {/* Center / Action Controls: Light/Dark Mode Switch + AI Assistant + Admin View */}
        <div className="flex items-center space-x-2.5 space-x-reverse">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer shadow-xs ${
              isDark
                ? "bg-[#14120f] hover:bg-[#1a1815] text-amber-300 border-[rgba(201,160,80,0.3)] hover:border-[#c9a050]"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200 hover:border-slate-300"
            }`}
            title={isDark ? "تغییر به حالت روشن (بک‌گراند سفید)" : "تغییر به حالت تاریک (دارک مود)"}
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
                <span className="hidden sm:inline">حالت روشن</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-700" />
                <span className="hidden sm:inline">حالت تاریک</span>
              </>
            )}
          </button>

          {/* AI Assistant Quick Trigger */}
          <button
            onClick={onOpenAiAssistant}
            className={`flex items-center gap-2 text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer border ${
              isDark
                ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] border-[#c9a050]"
                : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
            }`}
            title="دستیار هوشمند پاسخگویی کال‌سنتر"
          >
            <Bot className={`w-4 h-4 ${isDark ? "text-[#0a0a0a]" : "text-cyan-300"} animate-pulse`} />
            <span className="hidden md:inline">دستیار هوشمند AI</span>
          </button>

          {/* Admin / Callcenter switcher */}
          {user.role === "ADMIN" && (
            <div
              className={`p-1 rounded-xl border flex items-center gap-1 ${
                isDark ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.2)]" : "bg-slate-100 border-slate-200"
              }`}
            >
              <button
                onClick={() => onToggleView("viewer")}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeView === "viewer"
                    ? isDark
                      ? "bg-[#c9a050] text-[#0a0a0a] shadow-xs"
                      : "bg-[#0b216f] text-white shadow-xs"
                    : isDark
                    ? "text-[#888888] hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                نمای کال‌سنتر
              </button>
              <button
                onClick={() => onToggleView("admin")}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition cursor-pointer ${
                  activeView === "admin"
                    ? isDark
                      ? "bg-[#c9a050] text-[#0a0a0a] shadow-xs"
                      : "bg-[#0b216f] text-white shadow-xs"
                    : isDark
                    ? "text-[#888888] hover:text-white"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                پنل ادمین
              </button>
            </div>
          )}
        </div>

        {/* Left Side: User Profile & Logout */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="hidden sm:flex flex-col items-end">
            <span className={`text-sm font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
              {user.fullName}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              {user.role === "ADMIN" ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-bold border ${
                    isDark
                      ? "bg-[#c9a050]/20 text-[#c9a050] border-[rgba(201,160,80,0.3)]"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}
                >
                  <Shield className="w-3 h-3" /> ادمین ارشد
                </span>
              ) : (
                <span
                  className={`text-xs px-2 py-0.5 rounded-md flex items-center gap-1 font-medium border ${
                    isDark
                      ? "bg-[#14120f] text-[#e0e0e0] border-[rgba(201,160,80,0.2)]"
                      : "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <UserCheck className="w-3 h-3 text-[#0b216f]" /> اپراتور پاسخگو
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onLogout}
            className={`p-2.5 rounded-xl border transition cursor-pointer ${
              isDark
                ? "text-[#888888] hover:text-red-400 hover:bg-[#14120f] border-transparent hover:border-red-900/30"
                : "text-slate-500 hover:text-red-600 hover:bg-red-50 border-slate-200 hover:border-red-200"
            }`}
            title="خروج از سامانه"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
