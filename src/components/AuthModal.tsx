import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { User } from "../types";
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
} from "lucide-react";

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
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<PublicUser | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [manualMode, setManualMode] = useState(false);
  const [manualUsername, setManualUsername] = useState("");

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-slate-100 space-y-6 relative overflow-hidden">
        {/* Glowing Ambient Light */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header with Uploaded Logo */}
        <div className="text-center space-y-3 relative z-10">
          <div className="w-16 h-16 bg-slate-950 border border-slate-800 rounded-2xl mx-auto flex items-center justify-center shadow-xl shadow-indigo-500/10 p-2.5">
            <img src="/logo.svg" alt="لوگوی مباشر" className="w-full h-full object-contain" />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-sky-300 tracking-tight">مباشر</h1>
            <p className="text-xs text-slate-400 mt-1">
              سامانه مرجع اختصاصی محتوا و مدارک کال‌سنتر (ثبتی، مالیاتی، حقوقی)
            </p>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 bg-red-950/80 border border-red-800/80 rounded-xl text-xs text-red-300 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Select User Screen */}
        {!selectedUser && !manualMode && (
          <div className="space-y-4 relative z-10">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Users className="w-4 h-4 text-amber-400" />
                <span>لطفاً نام خود را جهت ورود انتخاب کنید:</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                {users.length} کاربر فعال
              </span>
            </div>

            {/* Filter Input if multiple users */}
            {users.length > 3 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="جستجوی نام همکار..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {/* Users Grid / Cards */}
            {loadingUsers ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-slate-500">در حال دریافت لیست اعضای سیستم...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 bg-slate-950/50 rounded-xl border border-slate-800 p-4">
                هیچ کاربری با این مشخصات یافت نشد.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5 max-h-64 overflow-y-auto pr-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className="group flex items-center justify-between bg-slate-950/80 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 p-3.5 rounded-2xl transition-all cursor-pointer text-right shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 flex items-center justify-center font-bold text-sm text-amber-400 group-hover:scale-105 transition shadow">
                        {user.fullName.charAt(0)}
                      </div>

                      {/* Info */}
                      <div>
                        <div className="font-bold text-xs text-slate-100 group-hover:text-amber-300 transition">
                          {user.fullName}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          @{user.username}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {user.role === "ADMIN" ? (
                        <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md flex items-center gap-1 font-semibold">
                          <Shield className="w-3 h-3 text-amber-400" /> ادمین
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-cyan-400" /> اپراتور
                        </span>
                      )}

                      <ChevronLeft className="w-4 h-4 text-slate-600 group-hover:text-amber-400 transition transform group-hover:-translate-x-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Manual Username Toggle Option */}
            <div className="pt-2 text-center">
              <button
                onClick={() => setManualMode(true)}
                className="text-[11px] text-slate-400 hover:text-amber-400 underline transition cursor-pointer"
              >
                یا ورود با تایپ نام کاربری دستی ✏️
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Selected User Password Entry */}
        {selectedUser && !manualMode && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10 animate-fadeIn">
            {/* Selected Person Card Header */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-amber-500/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 font-black text-lg flex items-center justify-center shadow-md">
                  {selectedUser.fullName.charAt(0)}
                </div>
                <div>
                  <div className="text-xs font-bold text-amber-300">{selectedUser.fullName}</div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    کاربر: @{selectedUser.username}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleBackToUsers}
                className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 rounded-xl border border-slate-700 transition cursor-pointer"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>تغییر نام</span>
              </button>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs text-slate-300 mb-1.5 font-medium">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" /> رمز عبور خود را وارد کنید:
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pr-3.5 pl-10 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-3.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginLoading || !password}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 text-xs cursor-pointer"
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>ورود به سامانه مباشر</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3 (Optional Manual Mode) */}
        {manualMode && (
          <form onSubmit={handleLoginSubmit} className="space-y-4 relative z-10 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-300">ورود دستی با نام کاربری</span>
              <button
                type="button"
                onClick={() => setManualMode(false)}
                className="text-[11px] text-slate-400 hover:text-slate-200"
              >
                بازگشت به لیست افراد ↩
              </button>
            </div>

            <div>
              <label className="block text-slate-300 text-xs mb-1.5 font-medium flex items-center gap-1">
                <UserIcon className="w-3.5 h-3.5 text-amber-400" /> نام کاربری
              </label>
              <input
                type="text"
                value={manualUsername}
                onChange={(e) => setManualUsername(e.target.value)}
                placeholder="مثلا: admin یا operator1"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 text-xs mb-1.5 font-medium flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> رمز عبور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="رمز عبور..."
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black py-3 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
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
