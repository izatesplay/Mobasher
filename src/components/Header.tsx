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
  return (
    <header className="bg-[#0f0e0c] border-b border-[rgba(201,160,80,0.2)] text-white sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Logo + Mobile Menu Toggle */}
        <div className="flex items-center space-x-3 space-x-reverse">
          {onToggleMobileMenu && (
            <button
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 text-[#e0e0e0] hover:text-white bg-[#14120f] hover:bg-[#1a1815] rounded-lg border border-[rgba(201,160,80,0.2)] transition cursor-pointer"
              title="منوی خدمات"
            >
              <Menu className="w-5 h-5 text-[#c9a050]" />
            </button>
          )}

          <div
            onClick={onGoHome}
            className="flex items-center gap-3 cursor-pointer group"
            title="صفحه اصلی حوزه‌های خدمات"
          >
            <div className="bg-[#0a0a0a] p-1.5 rounded-xl border border-[rgba(201,160,80,0.2)] shadow-md flex items-center justify-center shrink-0 group-hover:border-[#c9a050] transition-colors">
              <img src="/logo.svg" alt="لوگوی مباشر" className="w-8 h-8 object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-[#c9a050] group-hover:text-[#d8bf93] tracking-tight transition-colors">
                  مباشر
                </h1>
                <span className="text-[10px] bg-[#c9a050]/15 text-[#c9a050] border border-[rgba(201,160,80,0.3)] px-2 py-0.5 rounded-full font-medium hidden sm:inline-block">
                  مرجع کال‌سنتر
                </span>
              </div>
              <p className="text-xs text-[#888888] font-light hidden md:block">
                پایگاه دانش و مرجع داخلی خدمات ثبتی، حقوقی و مالیاتی
              </p>
            </div>
          </div>
        </div>

        {/* Center Actions / Quick AI */}
        <div className="flex items-center space-x-2 space-x-reverse">
          <button
            onClick={onOpenAiAssistant}
            className="flex items-center gap-2 bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] text-xs font-bold px-3.5 py-2 rounded-lg shadow-md transition-all cursor-pointer border border-[#c9a050]"
            title="دستیار هوشمند پاسخگویی کال‌سنتر"
          >
            <Bot className="w-4 h-4 text-[#0a0a0a] animate-pulse" />
            <span className="hidden md:inline">دستیار هوشمند AI</span>
          </button>

          {user.role === "ADMIN" && (
            <div className="bg-[#0a0a0a] p-1 rounded-lg border border-[rgba(201,160,80,0.2)] flex items-center gap-1">
              <button
                onClick={() => onToggleView("viewer")}
                className={`text-xs font-medium px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeView === "viewer"
                    ? "bg-[#c9a050] text-[#0a0a0a] font-bold shadow"
                    : "text-[#888888] hover:text-white"
                }`}
              >
                نمای کال‌سنتر
              </button>
              <button
                onClick={() => onToggleView("admin")}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition cursor-pointer ${
                  activeView === "admin"
                    ? "bg-[#c9a050] text-[#0a0a0a] font-bold shadow"
                    : "text-[#888888] hover:text-white"
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
            <span className="text-xs font-semibold text-[#ffffff]">{user.fullName}</span>
            <div className="flex items-center gap-1 mt-0.5">
              {user.role === "ADMIN" ? (
                <span className="text-[10px] bg-[#c9a050]/20 text-[#c9a050] border border-[rgba(201,160,80,0.3)] px-1.5 py-0.2 rounded flex items-center gap-1 font-mono font-bold">
                  <Shield className="w-2.5 h-2.5 text-[#c9a050]" /> ادمین ارشد
                </span>
              ) : (
                <span className="text-[10px] bg-[#14120f] text-[#e0e0e0] border border-[rgba(201,160,80,0.2)] px-1.5 py-0.2 rounded flex items-center gap-1">
                  <UserCheck className="w-2.5 h-2.5 text-[#c9a050]" /> اپراتور پاسخگو
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onLogout}
            className="p-2 text-[#888888] hover:text-[#ef4444] hover:bg-[#14120f] rounded-lg border border-transparent hover:border-[rgba(201,160,80,0.2)] transition cursor-pointer"
            title="خروج از سامانه"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
