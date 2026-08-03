import React from "react";
import { User } from "../types";
import { Shield, UserCheck, LogOut, Bot, Settings, Menu } from "lucide-react";

interface HeaderProps {
  user: User;
  onLogout: () => void;
  activeView: "viewer" | "admin";
  onToggleView: (view: "viewer" | "admin") => void;
  onOpenAiAssistant: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  activeView,
  onToggleView,
  onOpenAiAssistant,
  onToggleMobileMenu,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo + Mobile Menu Toggle */}
        <div className="flex items-center space-x-3 space-x-reverse">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
              title="منوی خدمات"
            >
              <Menu className="w-5 h-5 text-amber-400" />
            </button>
          )}

          <div className="bg-slate-950 p-1.5 rounded-xl border border-slate-800 shadow-md flex items-center justify-center shrink-0">
            <img src="/logo.svg" alt="لوگوی مباشر" className="w-8 h-8 object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-base sm:text-lg text-amber-400 tracking-tight">مباشر</h1>
              <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium hidden sm:inline-block">
                مرجع کال‌سنتر
              </span>
            </div>
            <p className="text-xs text-slate-400 font-light hidden md:block">
              پایگاه دانش و مرجع داخلی خدمات ثبتی، حقوقی و مالیاتی
            </p>
          </div>
        </div>

        {/* Center Actions / Quick AI */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-sm transition cursor-pointer border border-blue-400/30"
            title="دستیار هوشمند پاسخگویی کال‌سنتر"
          >
            <Bot className="w-4 h-4 text-cyan-200 animate-pulse" />
            <span className="hidden md:inline">دستیار هوشمند AI</span>
          </button>

          {user.role === "ADMIN" && (
            <div className="bg-slate-800 p-1 rounded-lg border border-slate-700 flex items-center gap-1">
              <button
                onClick={() => onToggleView("viewer")}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeView === "viewer"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                نمای کال‌سنتر
              </button>
              <button
                onClick={() => onToggleView("admin")}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeView === "admin"
                    ? "bg-amber-500 text-slate-950 font-bold shadow"
                    : "text-slate-300 hover:text-white"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                پنل مدیریت (ادمین)
              </button>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center space-x-3 space-x-reverse">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-semibold text-slate-200">{user.fullName}</span>
            <div className="flex items-center gap-1 mt-0.5">
              {user.role === "ADMIN" ? (
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800/60 px-1.5 py-0.2 rounded flex items-center gap-1 font-mono">
                  <Shield className="w-2.5 h-2.5" /> ادمین ارشد
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded flex items-center gap-1">
                  <UserCheck className="w-2.5 h-2.5 text-cyan-400" /> اپراتور پاسخگو
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
            title="خروج از سامانه"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
