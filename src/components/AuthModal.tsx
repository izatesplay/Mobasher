import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { User } from "../types";
import { useTheme } from "../context/ThemeContext";
import {
  Lock,
  User as UserIcon,
  LogIn,
  AlertCircle,
  Shield,
  UserCheck,
  ChevronLeft,
  Users,
  Eye,
  EyeOff,
  Search,
  ArrowRight,
  KeyRound,
  Sun,
  Moon,
  Clock,
} from "lucide-react";
import { getAndClearSessionNotice } from "../lib/sessionManager";

interface PublicUser {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "MEMBER";
}

interface AuthModalProps {
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess }) => {
  const { isDark, toggleTheme } = useTheme();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualUsername, setManualUsername] = useState("");

  // Check for inactivity expiration notice on mount
  useEffect(() => {
    const notice = getAndClearSessionNotice();
    if (notice) {
      setSessionNotice(notice);
    }
  }, []);

  // Load public users list
  useEffect(() => {
    let isMounted = true;
    async function fetchUsers() {
      try {
        setLoadingUsers(true);
        const data = await api.getPublicUsers();
        if (isMounted) {
          setUsers(data);
        }
      } catch (err) {
        console.error("Failed to fetch public users:", err);
      } finally {
        if (isMounted) setLoadingUsers(false);
      }
    }
    fetchUsers();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelectUser = (user: PublicUser) => {
    setSelectedUser(user);
    setPassword("");
    setError(null);
    setShowPassword(false);
  };

  const handleBackToUsers = () => {
    setSelectedUser(null);
    setPassword("");
    setError(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUsername = selectedUser ? selectedUser.username : manualUsername;
    if (!targetUsername || !password || loginLoading) return;

    setLoginLoading(true);
    setError(null);

    try {
      const res = await api.login(targetUsername, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || "رمز عبور اشتباه است. لطفاً مجدداً تلاش کنید.");
    } finally {
      setLoginLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      u.username.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md transition-colors ${
        isDark ? "bg-black/85" : "bg-slate-900/40"
      }`}
    >
      <div
        className={`w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden border transition-all ${
          isDark
            ? "bg-[#0f0e0c] border-[rgba(201,160,80,0.25)] text-white shadow-black/60"
            : "bg-white border-slate-200 text-slate-900 shadow-slate-300/60"
        }`}
      >
        {/* Theme switcher top right */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isDark
                ? "bg-[#14120f] text-amber-300 border-[rgba(201,160,80,0.3)]"
                : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
            }`}
            title="تغییر تم"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>

        {/* Ambient Glow */}
        <div
          className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
            isDark ? "bg-[#c9a050]/10" : "bg-blue-100"
          }`}
        />

        {/* Brand Header with Logo */}
        <div className="text-center space-y-3 relative z-10">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg p-2.5 border ${
              isDark
                ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.3)] shadow-[#c9a050]/10"
                : "bg-slate-50 border-slate-200 shadow-slate-200"
            }`}
          >
            <img src="/logo.svg" alt="لوگوی مباشر" className="w-full h-full object-contain" />
          </div>

          <div>
            <h1
              className={`text-2xl font-black tracking-tight ${
                isDark ? "text-[#c9a050]" : "text-[#0b216f]"
              }`}
            >
              مباشر
            </h1>
            <p className={`text-xs mt-1 font-normal ${isDark ? "text-[#888888]" : "text-slate-500"}`}>
              سامانه مرجع اختصاصی محتوا و مدارک کال‌سنتر (ثبتی، مالیاتی، حقوقی)
            </p>
          </div>
        </div>

        {/* Session Inactivity Notice */}
        {sessionNotice && (
          <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 rounded-2xl text-xs sm:text-sm text-amber-600 dark:text-amber-300 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-500 mt-0.5 shrink-0 animate-pulse" />
            <span>{sessionNotice}</span>
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select User Screen */}
        {!selectedUser && !manualMode && (
          <div className="space-y-4 relative z-10">
            <div
              className={`flex items-center justify-between border-b pb-3 ${
                isDark ? "border-[rgba(201,160,80,0.2)]" : "border-slate-200"
              }`}
            >
              <div
                className={`flex items-center gap-2 text-xs sm:text-sm font-bold ${
                  isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>لطفاً نام خود را جهت ورود انتخاب کنید:</span>
              </div>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                  isDark
                    ? "bg-[#14120f] text-[#888888] border border-[rgba(201,160,80,0.2)]"
                    : "bg-slate-100 text-slate-600 border border-slate-200"
                }`}
              >
                {users.length} کاربر
              </span>
            </div>

            {/* Filter Input if multiple users */}
            {users.length > 3 && (
              <div className="relative">
                <Search
                  className={`w-4 h-4 absolute right-3.5 top-3 ${
                    isDark ? "text-[#888888]" : "text-slate-400"
                  }`}
                />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="جستجوی نام همکار..."
                  className={`w-full rounded-2xl pr-10 pl-3 py-2.5 text-xs sm:text-sm transition focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-[#14120f] border border-[rgba(201,160,80,0.2)] text-white placeholder-[#888888] focus:border-[#c9a050] focus:ring-[#c9a050]/20"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0b216f] focus:ring-[#0b216f]/15"
                  }`}
                />
              </div>
            )}

            {/* Users Grid / Cards */}
            {loadingUsers ? (
              <div className="py-8 text-center space-y-2">
                <div
                  className={`w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto ${
                    isDark ? "border-[#c9a050]" : "border-[#0b216f]"
                  }`}
                />
                <p className="text-xs text-slate-500">در حال دریافت لیست اعضای سیستم...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div
                className={`text-center py-6 text-xs sm:text-sm rounded-2xl border p-4 ${
                  isDark
                    ? "bg-[#14120f] border-[rgba(201,160,80,0.2)] text-[#888888]"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                هیچ کاربری با این مشخصات یافت نشد.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`group flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-right shadow-xs ${
                      isDark
                        ? "bg-[#14120f] hover:bg-[#1a1815] border-[rgba(201,160,80,0.2)] hover:border-[#c9a050]"
                        : "bg-white hover:bg-blue-50/70 border-slate-200 hover:border-blue-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs transition group-hover:scale-105 ${
                          isDark
                            ? "bg-[#0a0a0a] border border-[rgba(201,160,80,0.3)] text-[#c9a050]"
                            : "bg-blue-50 border border-blue-200 text-[#0b216f]"
                        }`}
                      >
                        {user.fullName.charAt(0)}
                      </div>

                      {/* Info */}
                      <div>
                        <div
                          className={`font-bold text-xs sm:text-sm transition ${
                            isDark
                              ? "text-white group-hover:text-[#c9a050]"
                              : "text-slate-900 group-hover:text-[#0b216f]"
                          }`}
                        >
                          {user.fullName}
                        </div>
                        <div
                          className={`text-xs font-mono mt-0.5 ${
                            isDark ? "text-[#888888]" : "text-slate-500"
                          }`}
                        >
                          @{user.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.role === "ADMIN" ? (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md flex items-center gap-1 font-bold border ${
                            isDark
                              ? "bg-[#c9a050]/20 text-[#c9a050] border-[rgba(201,160,80,0.3)]"
                              : "bg-amber-100 text-amber-900 border-amber-300"
                          }`}
                        >
                          <Shield className="w-3 h-3" /> ادمین
                        </span>
                      ) : (
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md flex items-center gap-1 font-medium border ${
                            isDark
                              ? "bg-[#0a0a0a] text-[#888888] border-[rgba(201,160,80,0.2)]"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          <UserCheck className="w-3 h-3" /> اپراتور
                        </span>
                      )}

                      <ChevronLeft className="w-4 h-4 opacity-40 group-hover:opacity-100 transition transform group-hover:-translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Manual Username Toggle Option */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setManualMode(true)}
                className={`text-xs underline transition cursor-pointer font-medium ${
                  isDark ? "text-[#888888] hover:text-[#c9a050]" : "text-slate-500 hover:text-[#0b216f]"
                }`}
              >
                یا ورود با تایپ نام کاربری دستی ✏️
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Selected User Password Entry */}
        {selectedUser && !manualMode && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
            {/* Selected Person Card Header */}
            <div
              className={`p-4 rounded-2xl border flex items-center justify-between ${
                isDark
                  ? "bg-[#0a0a0a] border-[rgba(201,160,80,0.3)]"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl font-black text-lg flex items-center justify-center shadow-md ${
                    isDark ? "bg-[#c9a050] text-[#0a0a0a]" : "bg-[#0b216f] text-white"
                  }`}
                >
                  {selectedUser.fullName.charAt(0)}
                </div>
                <div>
                  <div
                    className={`text-sm font-bold ${
                      isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                    }`}
                  >
                    {selectedUser.fullName}
                  </div>
                  <div
                    className={`text-xs font-mono mt-0.5 ${
                      isDark ? "text-[#888888]" : "text-slate-500"
                    }`}
                  >
                    کاربر: @{selectedUser.username}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToUsers}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                  isDark
                    ? "bg-[#14120f] hover:bg-[#1a1815] text-[#e0e0e0] border-[rgba(201,160,80,0.2)]"
                    : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>تغییر نام</span>
              </button>
            </div>

            {/* Password Input */}
            <div>
              <label
                className={`block text-xs sm:text-sm mb-1.5 font-bold ${
                  isDark ? "text-[#e0e0e0]" : "text-slate-700"
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> رمز عبور خود را وارد کنید:
                </span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  required
                  className={`w-full rounded-2xl pr-4 pl-11 py-3 text-sm font-mono transition focus:outline-none focus:ring-2 ${
                    isDark
                      ? "bg-[#0a0a0a] border border-[rgba(201,160,80,0.3)] text-white placeholder-[#888888] focus:border-[#c9a050] focus:ring-[#c9a050]/20"
                      : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0b216f] focus:ring-[#0b216f]/15"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute left-3.5 top-3.5 transition ${
                    isDark ? "text-[#888888] hover:text-white" : "text-slate-400 hover:text-slate-700"
                  }`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginLoading || !password}
              className={`w-full font-black py-3.5 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 text-sm cursor-pointer disabled:opacity-50 border ${
                isDark
                  ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] border-[#c9a050]"
                  : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
              }`}
            >
              {loginLoading ? (
                <div
                  className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                    isDark ? "border-[#0a0a0a]" : "border-white"
                  }`}
                />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ورود به سامانه مباشر</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3 (Manual Mode) */}
        {manualMode && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10">
            <div
              className={`flex items-center justify-between border-b pb-2 ${
                isDark ? "border-[rgba(201,160,80,0.2)]" : "border-slate-200"
              }`}
            >
              <span
                className={`text-xs sm:text-sm font-bold ${
                  isDark ? "text-[#c9a050]" : "text-[#0b216f]"
                }`}
              >
                ورود دستی با نام کاربری
              </span>
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className={`text-xs font-medium ${
                  isDark ? "text-[#888888] hover:text-white" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                بازگشت به لیست همکاران ↩
              </button>
            </div>

            <div>
              <label
                className={`block text-xs sm:text-sm mb-1.5 font-bold ${
                  isDark ? "text-[#e0e0e0]" : "text-slate-700"
                }`}
              >
                نام کاربری
              </label>
              <input
                type="text"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                placeholder="مثلاً: admin یا operator1"
                required
                className={`w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-mono transition focus:outline-none focus:ring-2 ${
                  isDark
                    ? "bg-[#0a0a0a] border border-[rgba(201,160,80,0.3)] text-white placeholder-[#888888] focus:border-[#c9a050] focus:ring-[#c9a050]/20"
                    : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0b216f] focus:ring-[#0b216f]/15"
                }`}
              />
            </div>

            <div>
              <label
                className={`block text-xs sm:text-sm mb-1.5 font-bold ${
                  isDark ? "text-[#e0e0e0]" : "text-slate-700"
                }`}
              >
                رمز عبور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور..."
                required
                className={`w-full rounded-2xl px-4 py-2.5 text-xs sm:text-sm transition focus:outline-none focus:ring-2 ${
                  isDark
                    ? "bg-[#0a0a0a] border border-[rgba(201,160,80,0.3)] text-white placeholder-[#888888] focus:border-[#c9a050] focus:ring-[#c9a050]/20"
                    : "bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-[#0b216f] focus:ring-[#0b216f]/15"
                }`}
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className={`w-full font-black py-3 rounded-2xl transition shadow-md text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer border ${
                isDark
                  ? "bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] border-[#c9a050]"
                  : "bg-[#0b216f] hover:bg-blue-900 text-white border-[#0b216f]"
              }`}
            >
              {loginLoading ? (
                <div
                  className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                    isDark ? "border-[#0a0a0a]" : "border-white"
                  }`}
                />
              ) : (
                <span>ورود به سامانه</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
