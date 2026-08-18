import React, { useState, useEffect } from "react";
import { CategoryNode, User, AuditLog, RequiredDocument, ProcessStep, FAQ } from "../../types";
import { api } from "../../lib/api";
import {
  FolderPlus,
  Plus,
  Edit2,
  Trash2,
  Users,
  Shield,
  Layers,
  FileCheck2,
  Clock,
  HelpCircle,
  Save,
  X,
  UserPlus,
  KeyRound,
  CheckCircle,
  XCircle,
  History,
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  Coins,
  Database,
  RefreshCw,
  Bell,
  MessageSquarePlus,
  Send,
  Loader2,
  Check,
} from "lucide-react";
import { renderCategoryIcon } from "../SidebarTree";
import { PendingFaqNotificationModal } from "./PendingFaqNotificationModal";

interface AdminDashboardProps {
  nodes: CategoryNode[];
  onRefreshNodes: () => void;
  currentUser: User;
  onSelectNode?: (nodeId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ nodes, onRefreshNodes, currentUser, onSelectNode }) => {
  const [activeTab, setActiveTab] = useState<"content" | "faqs" | "users" | "audit">("content");

  // Content Node State
  const [selectedNode, setSelectedNode] = useState<CategoryNode | null>(null);
  const [isEditingNode, setIsEditingNode] = useState(false);
  const [nodeFormData, setNodeFormData] = useState<Partial<CategoryNode>>({});
  const [nodeMsg, setNodeMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // User Management State
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: "",
    password: "",
    fullName: "",
    role: "MEMBER",
  });
  const [userMsg, setUserMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Pending FAQs State & Auto Notification
  const [pendingFaqs, setPendingFaqs] = useState<FAQ[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
  const [inlineAnswerId, setInlineAnswerId] = useState<string | null>(null);
  const [inlineAnswerText, setInlineAnswerText] = useState("");
  const [inlineEditedQuestion, setInlineEditedQuestion] = useState("");
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [faqActionMsg, setFaqActionMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Custom Confirmation Modal State (replaces window.confirm)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [phpStatusMsg, setPhpStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSyncingPhp, setIsSyncingPhp] = useState(false);

  const handleTestPhpBridge = async () => {
    try {
      const res = await api.checkPhpStatus();
      if (res && res.status === "ok") {
        setPhpStatusMsg({
          type: "success",
          text: `ارتباط با اسکریپت MySQL (api.php) برقرار است (${res.node_count || 0} سرفصل، ${res.user_count || 0} کاربر).`,
        });
      } else {
        setPhpStatusMsg({
          type: "error",
          text: res?.message || "خطا در ارتباط با سرور PHP / MySQL",
        });
      }
    } catch (err: any) {
      setPhpStatusMsg({
        type: "error",
        text: err.message || "ارتباط با سرور برقرار نشد.",
      });
    }
  };

  const handleSyncToPhp = async () => {
    setIsSyncingPhp(true);
    try {
      const res = await api.syncAllToPhp(nodes);
      if (res && res.status === "ok") {
        setPhpStatusMsg({
          type: "success",
          text: `تمامی سرفصل‌ها با پایگاه داده MySQL با موفقیت همگام شدند (${res.imported_count || nodes.length} رکورد).`,
        });
      } else {
        setPhpStatusMsg({
          type: "error",
          text: res?.message || "خطا در همگام‌سازی",
        });
      }
    } catch (err: any) {
      setPhpStatusMsg({
        type: "error",
        text: err.message || "خطا در همگام‌سازی",
      });
    } finally {
      setIsSyncingPhp(false);
    }
  };

  const fetchPendingFaqs = async (shouldAutoOpenModal = false) => {
    try {
      const faqs = await api.getPendingFaqs();
      const safeFaqs = Array.isArray(faqs) ? faqs : [];
      setPendingFaqs(safeFaqs);
      if (shouldAutoOpenModal && safeFaqs.length > 0) {
        setIsPendingModalOpen(true);
      }
    } catch (err) {
      console.warn("Failed to load pending faqs:", err);
      setPendingFaqs([]);
    }
  };

  // Poll for pending FAQs every 12 seconds so new operator questions trigger prompt
  useEffect(() => {
    fetchPendingFaqs(true);
    const interval = setInterval(() => {
      fetchPendingFaqs(false);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === "faqs") {
      fetchPendingFaqs(false);
    } else if (activeTab === "users") {
      fetchUsers();
    } else if (activeTab === "audit") {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const u = await api.getUsers();
      setUsers(u);
    } catch (err: any) {
      setUserMsg({ type: "error", text: err.message });
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAuditLogs = async () => {
    setLoadingLogs(true);
    try {
      const logs = await api.getAuditLogs();
      setAuditLogs(logs);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Node Editor Handlers
  const handleStartCreateNode = (parentId: string | null = null) => {
    setSelectedNode(null);
    setNodeFormData({
      parentId,
      title: "",
      subtitle: "",
      description: "",
      icon: parentId ? "Folder" : "Building2",
      order: nodes.filter((n) => n.parentId === parentId).length + 1,
      isPublished: true,
      requiredDocuments: [],
      processSteps: [],
      faqs: [],
      costsAndDeadlines: {
        governmentFee: "",
        serviceFee: "",
        totalDuration: "",
        notes: "",
      },
      tags: [],
    });
    setIsEditingNode(true);
    setNodeMsg(null);
  };

  const handleStartEditNode = (node: CategoryNode) => {
    setSelectedNode(node);
    setNodeFormData({
      ...node,
      requiredDocuments: [...node.requiredDocuments],
      processSteps: [...node.processSteps],
      faqs: [...node.faqs],
      costsAndDeadlines: {
        governmentFee: node.costsAndDeadlines?.governmentFee || "",
        serviceFee: node.costsAndDeadlines?.serviceFee || "",
        totalDuration: node.costsAndDeadlines?.totalDuration || "",
        notes: node.costsAndDeadlines?.notes || "",
      },
    });
    setIsEditingNode(true);
    setNodeMsg(null);
  };

  const handleUpdateCostsInForm = (field: string, value: string) => {
    setNodeFormData((prev) => ({
      ...prev,
      costsAndDeadlines: {
        governmentFee: prev.costsAndDeadlines?.governmentFee || "",
        serviceFee: prev.costsAndDeadlines?.serviceFee || "",
        totalDuration: prev.costsAndDeadlines?.totalDuration || "",
        notes: prev.costsAndDeadlines?.notes || "",
        [field]: value,
      },
    }));
  };

  const handleSaveNode = async () => {
    if (!nodeFormData.title || !nodeFormData.title.trim()) {
      setNodeMsg({ type: "error", text: "عنوان نمی‌تواند خالی باشد." });
      return;
    }

    try {
      if (selectedNode) {
        await api.updateNode(selectedNode.id, nodeFormData);
        setNodeMsg({ type: "success", text: "تغییرات با موفقیت ذخیره شد." });
      } else {
        await api.createNode(nodeFormData);
        setNodeMsg({ type: "success", text: "بخش جدید با موفقیت ایجاد شد." });
      }
      onRefreshNodes();
      setTimeout(() => setNodeMsg(null), 3000);
    } catch (err: any) {
      setNodeMsg({ type: "error", text: err.message });
    }
  };

  const handleDeleteNode = (id: string, title: string) => {
    setConfirmModal({
      isOpen: true,
      title: "حذف بخش و زیرمجموعه‌ها",
      message: `آیا از حذف بخش «${title}» و تمام سرفصل‌های زیرمجموعه آن اطمینان دارید؟ این عمل غیرقابل بازگشت است.`,
      onConfirm: async () => {
        try {
          await api.deleteNode(id);
          if (selectedNode?.id === id) {
            setIsEditingNode(false);
            setSelectedNode(null);
          }
          onRefreshNodes();
          setNodeMsg({ type: "success", text: "بخش مورد نظر با موفقیت حذف شد." });
          setTimeout(() => setNodeMsg(null), 3000);
        } catch (err: any) {
          setNodeMsg({ type: "error", text: err.message });
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Document array helpers in form
  const handleAddDocToForm = () => {
    const docs = nodeFormData.requiredDocuments || [];
    setNodeFormData({
      ...nodeFormData,
      requiredDocuments: [
        ...docs,
        {
          id: "doc_" + Date.now(),
          name: "",
          description: "",
          isMandatory: true,
          recipientRole: "",
          notes: "",
        },
      ],
    });
  };

  const handleUpdateDocInForm = (idx: number, field: keyof RequiredDocument, value: any) => {
    const docs = [...(nodeFormData.requiredDocuments || [])];
    docs[idx] = { ...docs[idx], [field]: value };
    setNodeFormData({ ...nodeFormData, requiredDocuments: docs });
  };

  const handleRemoveDocFromForm = (idx: number) => {
    const docs = [...(nodeFormData.requiredDocuments || [])];
    docs.splice(idx, 1);
    setNodeFormData({ ...nodeFormData, requiredDocuments: docs });
  };

  // Process steps helpers
  const handleAddStepToForm = () => {
    const steps = nodeFormData.processSteps || [];
    setNodeFormData({
      ...nodeFormData,
      processSteps: [
        ...steps,
        {
          id: "step_" + Date.now(),
          stepNumber: steps.length + 1,
          title: "",
          detail: "",
          estimatedTime: "",
        },
      ],
    });
  };

  const handleUpdateStepInForm = (idx: number, field: keyof ProcessStep, value: any) => {
    const steps = [...(nodeFormData.processSteps || [])];
    steps[idx] = { ...steps[idx], [field]: value };
    setNodeFormData({ ...nodeFormData, processSteps: steps });
  };

  const handleRemoveStepFromForm = (idx: number) => {
    const steps = [...(nodeFormData.processSteps || [])];
    steps.splice(idx, 1);
    // re-number steps
    steps.forEach((s, i) => (s.stepNumber = i + 1));
    setNodeFormData({ ...nodeFormData, processSteps: steps });
  };

  // FAQ helpers
  const handleAddFaqToForm = () => {
    const faqs = nodeFormData.faqs || [];
    setNodeFormData({
      ...nodeFormData,
      faqs: [
        ...faqs,
        {
          id: "faq_" + Date.now(),
          question: "",
          answer: "",
        },
      ],
    });
  };

  const handleUpdateFaqInForm = (idx: number, field: keyof FAQ, value: any) => {
    const faqs = [...(nodeFormData.faqs || [])];
    faqs[idx] = { ...faqs[idx], [field]: value };
    setNodeFormData({ ...nodeFormData, faqs: faqs });
  };

  const handleRemoveFaqFromForm = (idx: number) => {
    const faqs = [...(nodeFormData.faqs || [])];
    faqs.splice(idx, 1);
    setNodeFormData({ ...nodeFormData, faqs: faqs });
  };

  // User Management Handlers
  const handleSaveUser = async () => {
    setUserMsg(null);
    try {
      if (editingUser) {
        await api.updateUser(editingUser.id, {
          fullName: userFormData.fullName,
          role: userFormData.role,
          password: userFormData.password || undefined,
        });
        setUserMsg({ type: "success", text: "کاربر با موفقیت به‌روزرسانی شد." });
      } else {
        await api.createUser(userFormData);
        setUserMsg({ type: "success", text: "عضو جدید با موفقیت ایجاد شد." });
      }
      setUserModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setUserMsg({ type: "error", text: err.message });
    }
  };

  const handleToggleUserActive = async (user: User) => {
    try {
      await api.updateUser(user.id, { isActive: !user.isActive });
      fetchUsers();
    } catch (err: any) {
      setUserMsg({ type: "error", text: err.message });
    }
  };

  const handleDeleteUser = (user: User) => {
    setConfirmModal({
      isOpen: true,
      title: "حذف کاربر",
      message: `آیا از حذف کاربر «${user.fullName}» مطمئن هستید؟`,
      onConfirm: async () => {
        try {
          await api.deleteUser(user.id);
          fetchUsers();
          setUserMsg({ type: "success", text: "کاربر با موفقیت حذف گردید." });
          setTimeout(() => setUserMsg(null), 3000);
        } catch (err: any) {
          setUserMsg({ type: "error", text: err.message });
        } finally {
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  return (
    <div className="flex-1 bg-slate-950 text-slate-100 p-4 md:p-8 overflow-y-auto custom-scrollbar">
      {/* Top Admin Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl mb-4">
        <div>
          <h1 className="text-lg font-bold text-sky-300 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" />
            پنل ادمین و مدیریت ارشد «مباشر»
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            مدیریت کامل ساختار درختی محتوا، مدارک مورد نیاز و اعضای پاسخگوی کال‌سنتر
          </p>
        </div>

        {/* Admin Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800 flex-wrap">
          <button
            onClick={() => setActiveTab("content")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer ${
              activeTab === "content" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4" />
            مدیریت ساختار محتوا
          </button>
          <button
            onClick={() => setActiveTab("faqs")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer relative ${
              activeTab === "faqs" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <HelpCircle className="w-4 h-4 text-amber-400" />
            سوالات جدید کال‌سنتر
            {pendingFaqs.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black animate-pulse">
                {pendingFaqs.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer ${
              activeTab === "users" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-4 h-4" />
            مدیریت اعضای کال‌سنتر
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg transition cursor-pointer ${
              activeTab === "audit" ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <History className="w-4 h-4" />
            سوابق تغییرات
          </button>
        </div>
      </div>

      {/* NEW PENDING FAQS URGENT ALERT BANNER */}
      {pendingFaqs.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-900 border-2 border-amber-500/80 p-4 rounded-2xl mb-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500 text-slate-950">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-amber-300">
                  {pendingFaqs.length} سوال جدید ثبت‌شده توسط اپراتورهای کال‌سنتر در انتظار پاسخ شماست!
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-0.5">
                آخرین سوال: «{pendingFaqs[0].question}» در بخش «{pendingFaqs[0].nodeTitle}»
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPendingModalOpen(true)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-black shadow-lg transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              باز کردن پاپ‌آپ پاسخ‌دهی فوری
            </button>
            <button
              onClick={() => setActiveTab("faqs")}
              className="px-3 py-2 rounded-xl border border-amber-500/50 hover:bg-amber-900/40 text-amber-200 text-xs font-bold transition cursor-pointer"
            >
              مشاهده در تب
            </button>
          </div>
        </div>
      )}

      {/* PHP & MySQL cPanel Bridge Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 rounded-xl mb-6 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Database className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="font-bold text-slate-200">بکند cPanel / MySQL (api.php):</span>
          <span className="text-[11px] text-slate-400 hidden md:inline">
            آماده آپلود و اتصال به phpMyAdmin هاست
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTestPhpBridge}
            className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 font-medium transition cursor-pointer"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            تست اتصال MySQL
          </button>

          <button
            onClick={handleSyncToPhp}
            disabled={isSyncingPhp}
            className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPhp ? "animate-spin" : ""}`} />
            همگام‌سازی کامل با MySQL (api.php)
          </button>
        </div>
      </div>

      {phpStatusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold mb-4 flex items-center justify-between ${
            phpStatusMsg.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
              : "bg-red-950/80 border-red-800 text-red-300"
          }`}
        >
          <span>{phpStatusMsg.text}</span>
          <button onClick={() => setPhpStatusMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {nodeMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-bold mb-4 flex items-center justify-between ${
            nodeMsg.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
              : "bg-red-950/80 border-red-800 text-red-300"
          }`}
        >
          <span>{nodeMsg.text}</span>
          <button onClick={() => setNodeMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: CONTENT HIERARCHY & EDITOR */}
      {activeTab === "content" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Tree Explorer for Admin */}
          <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-400" /> ساختار درختی (حوزه‌ها و سابتایتل‌ها)
              </span>
              <button
                onClick={() => handleStartCreateNode(null)}
                className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition shadow cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                حوزه اصلی جدید
              </button>
            </div>

            {/* Tree list */}
            <div className="space-y-1 max-h-[600px] overflow-y-auto custom-scrollbar pl-1">
              {nodes.map((node) => {
                // Render top level domains and their subchildren recursively
                if (node.parentId !== null) return null;

                const renderNodeTree = (n: CategoryNode, depth = 0) => {
                  const children = nodes.filter((child) => child.parentId === n.id);
                  const isSelected = selectedNode?.id === n.id;

                  return (
                    <div key={n.id} className="my-1">
                      <div
                        className={`flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer group ${
                          isSelected
                            ? "bg-amber-500 text-slate-950 font-bold shadow"
                            : "bg-slate-950/60 hover:bg-slate-800 text-slate-300"
                        }`}
                        style={{ marginRight: `${depth * 16}px` }}
                      >
                        <div
                          onClick={() => handleStartEditNode(n)}
                          className="flex items-center gap-2 flex-1 min-w-0"
                        >
                          <span className={isSelected ? "text-slate-950" : "text-amber-400"}>
                            {renderCategoryIcon(n.icon, "w-4 h-4")}
                          </span>
                          <span className="truncate">{n.title}</span>
                          {n.requiredDocuments.length > 0 && (
                            <span className="text-[10px] bg-slate-800/80 text-amber-300 px-1.5 py-0.2 rounded font-mono">
                              {n.requiredDocuments.length} مدرک
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartCreateNode(n.id);
                            }}
                            className="p-1 hover:bg-amber-600/30 rounded text-slate-300 hover:text-white"
                            title="افزودن سابتایتل زیرمجموعه"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteNode(n.id, n.title);
                            }}
                            className="p-1 hover:bg-red-500/30 rounded text-red-400 hover:text-red-200"
                            title="حذف این بخش"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {children.length > 0 && (
                        <div className="pr-2 border-r border-slate-800 mr-2">
                          {children.map((c) => renderNodeTree(c, depth + 1))}
                        </div>
                      )}
                    </div>
                  );
                };

                return renderNodeTree(node, 0);
              })}
            </div>
          </div>

          {/* Right Column: Node Form Editor */}
          <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            {!isEditingNode ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <Layers className="w-12 h-12 text-slate-700 mx-auto" />
                <p className="text-xs font-medium">
                  لطفاً یک بخش را از درخت سمت راست انتخاب کنید یا دکمه «حوزه اصلی جدید» را بزنید.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                    <Edit2 className="w-4 h-4" />
                    {selectedNode ? `ویرایش بخش «${selectedNode.title}»` : "ساخت حوزه/سابتایتل جدید"}
                  </h2>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingNode(false)}
                      className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 transition cursor-pointer"
                    >
                      انصراف
                    </button>
                    <button
                      onClick={handleSaveNode}
                      className="flex items-center gap-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-1.5 rounded-lg transition shadow cursor-pointer"
                    >
                      <Save className="w-4 h-4" />
                      ذخیره تغییرات
                    </button>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">عنوان بخش/سابتایتل *</label>
                    <input
                      type="text"
                      value={nodeFormData.title || ""}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, title: e.target.value })}
                      placeholder="مثلاً: شرکت با مسئولیت محدود"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">والد (درخت سلسلهمراتبی)</label>
                    <select
                      value={nodeFormData.parentId || ""}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, parentId: e.target.value || null })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">بدون والد (حوزه اصلی سطح اول)</option>
                      {nodes
                        .filter((n) => n.id !== selectedNode?.id)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1 font-medium">زیرعنوان (خلاصه کوتاه‌تر)</label>
                    <input
                      type="text"
                      value={nodeFormData.subtitle || ""}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, subtitle: e.target.value })}
                      placeholder="مثلاً: شرایط ثبت و حداقل ۲ شریک"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1 font-medium">توضیحات کامل جهت اپراتور</label>
                    <textarea
                      rows={2}
                      value={nodeFormData.description || ""}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, description: e.target.value })}
                      placeholder="توضیحات تشریحی مربوط به قوانین، شرایط و ملاحظات..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">آیکون</label>
                    <select
                      value={nodeFormData.icon || "Folder"}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, icon: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Folder">پوشه عمومی (Folder)</option>
                      <option value="Building2">ثبت شرکت (Building2)</option>
                      <option value="Calculator">مالیاتی (Calculator)</option>
                      <option value="Scale">حقوقی (Scale)</option>
                      <option value="Award">سهامی (Award)</option>
                      <option value="ShieldCheck">تأییدیه (ShieldCheck)</option>
                      <option value="FolderGit2">دسته‌بندی (FolderGit2)</option>
                      <option value="BadgeCheck">برند (BadgeCheck)</option>
                      <option value="Receipt">فاکتور/اظهارنامه (Receipt)</option>
                      <option value="FileSpreadsheet">صورت مالی (FileSpreadsheet)</option>
                      <option value="QrCode">سامانه مؤدیان (QrCode)</option>
                      <option value="FileText">قرارداد (FileText)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">وضعیت انتشار</label>
                    <select
                      value={nodeFormData.isPublished ? "true" : "false"}
                      onChange={(e) => setNodeFormData({ ...nodeFormData, isPublished: e.target.value === "true" })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="true">منتشر شده (قابل مشاهده برای اپراتورها)</option>
                      <option value="false">پیش‌نویس / مخفی</option>
                    </select>
                  </div>
                </div>

                {/* SECTION: COSTS & DEADLINES EDITOR */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-emerald-400" /> زمان تقریبی و هزینه‌ها (دولتی و حق‌الزحمه خدمات)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">زمان تقریبی انجام</label>
                      <input
                        type="text"
                        value={nodeFormData.costsAndDeadlines?.totalDuration || ""}
                        onChange={(e) => handleUpdateCostsInForm("totalDuration", e.target.value)}
                        placeholder="مثلاً: ۷ الی ۱۰ روز کاری"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">هزینه‌های دولتی و قانونی</label>
                      <input
                        type="text"
                        value={nodeFormData.costsAndDeadlines?.governmentFee || ""}
                        onChange={(e) => handleUpdateCostsInForm("governmentFee", e.target.value)}
                        placeholder="مثلاً: حدود ۴۵۰,۰۰۰ تومان"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-400 mb-1 font-medium">حق‌الزحمه خدمات</label>
                      <input
                        type="text"
                        value={nodeFormData.costsAndDeadlines?.serviceFee || ""}
                        onChange={(e) => handleUpdateCostsInForm("serviceFee", e.target.value)}
                        placeholder="مثلاً: اعلام پس از مشاوره / ۲,۵۰۰,۰۰۰ تومان"
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-slate-400 mb-1 font-medium">نکات و ملاحظات زمان‌بندی و هزینه‌ها (راهنما برای اپراتور)</label>
                      <input
                        type="text"
                        value={nodeFormData.costsAndDeadlines?.notes || ""}
                        onChange={(e) => handleUpdateCostsInForm("notes", e.target.value)}
                        placeholder="مثلاً: مدت زمان بسته به سرعت تأیید نام در اداره ثبت شرکت‌ها متغیر است."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION: REQUIRED DOCUMENTS EDITOR */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4" /> لیست مدارک لازم برای این بخش (
                      {nodeFormData.requiredDocuments?.length || 0})
                    </span>

                    <button
                      type="button"
                      onClick={handleAddDocToForm}
                      className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> افزودن مدرک
                    </button>
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pl-1">
                    {nodeFormData.requiredDocuments?.map((doc, idx) => (
                      <div
                        key={doc.id || idx}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={doc.name}
                            onChange={(e) => handleUpdateDocInForm(idx, "name", e.target.value)}
                            placeholder="نام مدرک (مثلا: کارت ملی هوشمند)"
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                          />

                          <label className="flex items-center gap-1 text-slate-400 cursor-pointer text-[11px]">
                            <input
                              type="checkbox"
                              checked={doc.isMandatory}
                              onChange={(e) => handleUpdateDocInForm(idx, "isMandatory", e.target.checked)}
                              className="accent-amber-500"
                            />
                            الزامی
                          </label>

                          <button
                            type="button"
                            onClick={() => handleRemoveDocFromForm(idx)}
                            className="text-red-400 hover:text-red-300 p-1 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={doc.description || ""}
                            onChange={(e) => handleUpdateDocInForm(idx, "description", e.target.value)}
                            placeholder="توضیح کوتاه مدرک..."
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                          />

                          <input
                            type="text"
                            value={doc.recipientRole || ""}
                            onChange={(e) => handleUpdateDocInForm(idx, "recipientRole", e.target.value)}
                            placeholder="مربوط به کدام فرد؟ (مثلا: همه شرکا / بازرس اصلی)"
                            className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION: PROCESS STEPS EDITOR */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-4 h-4" /> گام‌های اجرایی ({nodeFormData.processSteps?.length || 0})
                    </span>

                    <button
                      type="button"
                      onClick={handleAddStepToForm}
                      className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> افزودن گام
                    </button>
                  </div>

                  <div className="space-y-3">
                    {nodeFormData.processSteps?.map((step, idx) => (
                      <div
                        key={step.id || idx}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="bg-amber-500 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px]">
                            گام {step.stepNumber}
                          </span>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => handleUpdateStepInForm(idx, "title", e.target.value)}
                            placeholder="عنوان گام..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-white placeholder-slate-600"
                          />
                          <input
                            type="text"
                            value={step.estimatedTime || ""}
                            onChange={(e) => handleUpdateStepInForm(idx, "estimatedTime", e.target.value)}
                            placeholder="مدت زمان (مثلا ۲ روز)"
                            className="w-28 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 placeholder-slate-600"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveStepFromForm(idx)}
                            className="text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={step.detail}
                          onChange={(e) => handleUpdateStepInForm(idx, "detail", e.target.value)}
                          placeholder="جزئیات این مرحله..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 placeholder-slate-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SECTION: FAQS EDITOR */}
                <div className="pt-4 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" /> سوالات متداول ({nodeFormData.faqs?.length || 0})
                    </span>

                    <button
                      type="button"
                      onClick={handleAddFaqToForm}
                      className="flex items-center gap-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 px-2.5 py-1 rounded-lg transition cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> افزودن سوال
                    </button>
                  </div>

                  <div className="space-y-3">
                    {nodeFormData.faqs?.map((faq, idx) => (
                      <div
                        key={faq.id || idx}
                        className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs space-y-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => handleUpdateFaqInForm(idx, "question", e.target.value)}
                            placeholder="سوال متداول مشتری..."
                            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-amber-300 placeholder-slate-600 font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveFaqFromForm(idx)}
                            className="text-red-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => handleUpdateFaqInForm(idx, "answer", e.target.value)}
                          placeholder="پاسخ کوتاه و صریح..."
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 placeholder-slate-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CALL CENTER USERS MANAGEMENT */}
      {activeTab === "users" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                <Users className="w-5 h-5" />
                مدیریت اعضای کال‌سنتر و رمزهای عبور
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                تعریف کاربران، تعیین رمزهای اختصاصی و کنترل دسترسی به محتوای محرمانه
              </p>
            </div>

            <button
              onClick={() => {
                setEditingUser(null);
                setUserFormData({ username: "", password: "", fullName: "", role: "MEMBER" });
                setUserModalOpen(true);
              }}
              className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl transition shadow cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              تعریف عضو جدید کال‌سنتر
            </button>
          </div>

          {userMsg && (
            <div
              className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-between ${
                userMsg.type === "success"
                  ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                  : "bg-red-950/80 border-red-800 text-red-300"
              }`}
            >
              <span>{userMsg.text}</span>
              <button onClick={() => setUserMsg(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* User List Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right text-slate-300">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="p-3">نام و نام خانوادگی</th>
                  <th className="p-3">نام کاربری</th>
                  <th className="p-3">نقش کاربری</th>
                  <th className="p-3">وضعیت حساب</th>
                  <th className="p-3">تاریخ ثبت‌نام</th>
                  <th className="p-3">آخرین ورود</th>
                  <th className="p-3 text-center">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850 transition">
                    <td className="p-3 font-bold text-slate-100">{u.fullName}</td>
                    <td className="p-3 font-mono text-cyan-300">{u.username}</td>
                    <td className="p-3">
                      {u.role === "ADMIN" ? (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                          ادمین ارشد
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded">عضو کال‌سنتر</span>
                      )}
                    </td>
                    <td className="p-3">
                      {u.isActive ? (
                        <span className="text-emerald-400 flex items-center gap-1 font-medium">
                          <CheckCircle className="w-3.5 h-3.5" /> فعال
                        </span>
                      ) : (
                        <span className="text-red-400 flex items-center gap-1 font-medium">
                          <XCircle className="w-3.5 h-3.5" /> غیرفعال
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString("fa-IR")}
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString("fa-IR") : "هنوز وارد نشده"}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setUserFormData({
                              username: u.username,
                              password: "",
                              fullName: u.fullName,
                              role: u.role,
                            });
                            setUserModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-amber-300 hover:bg-slate-800 rounded transition"
                          title="ویرایش مشخصات / تغییر رمز"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleToggleUserActive(u)}
                          className={`p-1.5 rounded transition ${
                            u.isActive
                              ? "text-slate-400 hover:text-red-400 hover:bg-slate-800"
                              : "text-emerald-400 hover:bg-slate-800"
                          }`}
                          title={u.isActive ? "غیرفعال‌سازی" : "فعال‌سازی"}
                        >
                          {u.isActive ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>

                        {u.id !== currentUser.id && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition"
                            title="حذف کاربر"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: PENDING & RECENT FAQS FROM CALL CENTER */}
      {activeTab === "faqs" && (
        <div className="space-y-6">
          {/* Header Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400">سوالات جدید در انتظار پاسخ</div>
              <div className="text-2xl font-black text-amber-400 mt-1 flex items-center gap-2">
                <HelpCircle className="w-6 h-6" />
                {pendingFaqs.length} مورد
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400">کل سرفصل‌های پایگاه دانش</div>
              <div className="text-2xl font-black text-sky-400 mt-1 flex items-center gap-2">
                <Layers className="w-6 h-6" />
                {nodes.length} سرفصل
              </div>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
              <div className="text-xs text-slate-400">کل سوالات پاسخ‌داده‌شده</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 flex items-center gap-2">
                <CheckCircle className="w-6 h-6" />
                {nodes.reduce((acc, n) => acc + (n.faqs?.filter((f) => f.answer).length || 0), 0)} سوال
              </div>
            </div>
          </div>

          {faqActionMsg && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                faqActionMsg.type === "success"
                  ? "bg-emerald-950/40 border-emerald-800/50 text-emerald-300"
                  : "bg-red-950/40 border-red-800/50 text-red-300"
              }`}
            >
              {faqActionMsg.type === "success" ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400" />
              )}
              <span>{faqActionMsg.text}</span>
            </div>
          )}

          {/* Pending Questions Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-amber-400" />
                  سوالات جدید ثبت‌شده توسط کال‌سنتر (نیاز به پاسخ ادمین)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  پاسخ‌های ثبت‌شده بلافاصله در بخش سوالات متداول سرفصل مربوطه منتشر می‌شود.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchPendingFaqs(false)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  بروزرسانی لیست
                </button>
                {pendingFaqs.length > 0 && (
                  <button
                    onClick={() => setIsPendingModalOpen(true)}
                    className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    پاپ‌آپ پاسخ‌دهی سریع
                  </button>
                )}
              </div>
            </div>

            {pendingFaqs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs bg-slate-950/50 rounded-xl border border-slate-800">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                هیچ سوال جدیدی در انتظار پاسخ نیست. تمامی سوالات پاسخ داده شده‌اند.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingFaqs.map((faq) => {
                  const isExpanded = inlineAnswerId === faq.id;
                  return (
                    <div
                      key={faq.id}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700 p-5 rounded-2xl space-y-3 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                            در انتظار پاسخ
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 text-xs font-bold">
                            سرفصل: {faq.nodeTitle}
                          </span>
                          <span className="text-xs text-slate-400">
                            توسط: <strong className="text-white">{faq.submittedBy?.fullName || "اپراتور"}</strong>
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {faq.submittedAt ? new Date(faq.submittedAt).toLocaleString("fa-IR") : ""}
                        </span>
                      </div>

                      {/* Question Text */}
                      <div className="text-sm font-bold text-white bg-slate-900/90 p-3.5 rounded-xl border border-slate-800/80">
                        {faq.question}
                      </div>

                      {/* Similarity warning badge if captured */}
                      {faq.similarityNote && (
                        <div className="text-xs bg-amber-950/30 border border-amber-900/50 text-amber-200 p-2.5 rounded-xl">
                          <strong>یادداشت تمایز اپراتور:</strong> {faq.similarityNote}
                        </div>
                      )}

                      {/* Inline Answering Editor */}
                      {isExpanded ? (
                        <div className="p-4 rounded-xl bg-slate-900 border border-amber-500/40 space-y-3 mt-3 animate-fadeIn">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              ویرایش نگارش سوال (اختیاری):
                            </label>
                            <input
                              type="text"
                              value={inlineEditedQuestion}
                              onChange={(e) => setInlineEditedQuestion(e.target.value)}
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">
                              پاسخ رسمی ادمین:
                            </label>
                            <textarea
                              rows={3}
                              value={inlineAnswerText}
                              onChange={(e) => setInlineAnswerText(e.target.value)}
                              placeholder="پاسخ کامل را تایپ نمایید..."
                              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setInlineAnswerId(null)}
                              className="px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              disabled={isSubmittingAnswer}
                              onClick={async () => {
                                if (!inlineAnswerText.trim()) {
                                  alert("لطفاً متن پاسخ را تایپ کنید.");
                                  return;
                                }
                                setIsSubmittingAnswer(true);
                                try {
                                  await api.answerFaq(faq.id, inlineAnswerText.trim(), inlineEditedQuestion.trim(), faq.nodeId);
                                  setFaqActionMsg({ type: "success", text: "پاسخ با موفقیت ثبت و در سامانه منتشر شد." });
                                  setInlineAnswerId(null);
                                  fetchPendingFaqs(false);
                                  onRefreshNodes();
                                } catch (err: any) {
                                  setFaqActionMsg({ type: "error", text: err.message || "خطا در ثبت پاسخ" });
                                } finally {
                                  setIsSubmittingAnswer(false);
                                }
                              }}
                              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-1.5 rounded-lg shadow cursor-pointer"
                            >
                              {isSubmittingAnswer ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                              ثبت و انتشار پاسخ
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between pt-2 border-t border-slate-850">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setInlineAnswerId(faq.id);
                                setInlineAnswerText("");
                                setInlineEditedQuestion(faq.question);
                              }}
                              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-1.5 rounded-xl text-xs shadow transition cursor-pointer"
                            >
                              <Send className="w-3.5 h-3.5" />
                              پاسخ‌دهی به این سوال
                            </button>
                            {onSelectNode && faq.nodeId && (
                              <button
                                onClick={() => onSelectNode(faq.nodeId!)}
                                className="px-3 py-1.5 rounded-xl border border-slate-800 text-slate-400 hover:text-white text-xs transition"
                              >
                                مشاهده سرفصل
                              </button>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                title: "حذف سوال",
                                message: `آیا از حذف سوال «${faq.question}» مطمئن هستید؟`,
                                onConfirm: async () => {
                                  try {
                                    await api.deleteFaq(faq.id);
                                    fetchPendingFaqs(false);
                                    onRefreshNodes();
                                    setFaqActionMsg({ type: "success", text: "سوال با موفقیت حذف گردید." });
                                  } catch (err: any) {
                                    setFaqActionMsg({ type: "error", text: err.message });
                                  } finally {
                                    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                                  }
                                },
                              });
                            }}
                            className="text-red-400 hover:bg-red-500/20 p-1.5 rounded-lg text-xs transition"
                            title="حذف سوال"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT LOGS */}
      {activeTab === "audit" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold text-sky-300 flex items-center gap-2 pb-3 border-b border-slate-800">
            <History className="w-5 h-5 text-indigo-400" />
            سوابق ثبت و تغییرات سیستمی (Audit Trail)
          </h2>

          <div className="space-y-2">
            {(Array.isArray(auditLogs) ? auditLogs : []).length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">هیچ سوابق تغییراتی هنوز ثبت نشده است.</p>
            ) : (
              (Array.isArray(auditLogs) ? auditLogs : []).map((log) => (
                <div
                  key={log.id}
                  className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sky-300">{log.userName}</span>
                      <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400 font-mono">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleString("fa-IR")}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* USER FORM MODAL */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-amber-400">
                {editingUser ? `ویرایش کاربر (${editingUser.username})` : "تعریف کاربر جدید کال‌سنتر"}
              </h3>
              <button onClick={() => setUserModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">نام و نام خانوادگی *</label>
                <input
                  type="text"
                  value={userFormData.fullName}
                  onChange={(e) => setUserFormData({ ...userFormData, fullName: e.target.value })}
                  placeholder="مثال: مریم رضایی"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">نام کاربری (انگلیسی) *</label>
                  <input
                    type="text"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    placeholder="مثال: operator3"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-slate-400 mb-1 font-medium">
                  {editingUser ? "رمز عبور جدید (در صورت نیاز به تغییر خالی بگذارید)" : "رمز عبور اختصاصی *"}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="حداقل ۵ کاراکتر..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">نقش دسترسی</label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="MEMBER">عضو کال‌سنتر (فقط خواندنی)</option>
                  <option value="ADMIN">ادمین ارشد (دسترسی کامل مدیریت)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setUserModalOpen(false)}
                className="text-xs text-slate-400 hover:text-white px-3 py-2 rounded-lg bg-slate-800"
              >
                انصراف
              </button>
              <button
                onClick={handleSaveUser}
                className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg shadow"
              >
                ذخیره کاربر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DELETE MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <span>{confirmModal.title}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-xs text-slate-400 hover:text-white px-3.5 py-2 rounded-xl bg-slate-800 transition"
              >
                انصراف
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-2 rounded-xl shadow transition"
              >
                بله، حذف شود
              </button>
            </div>
          </div>
        </div>
      )}
      {/* PENDING FAQS POPUP NOTIFICATION MODAL FOR ADMIN */}
      <PendingFaqNotificationModal
        isOpen={isPendingModalOpen}
        onClose={() => setIsPendingModalOpen(false)}
        pendingFaqs={pendingFaqs}
        onAnswered={() => {
          fetchPendingFaqs(false);
          onRefreshNodes();
        }}
        onDeleted={() => {
          fetchPendingFaqs(false);
          onRefreshNodes();
        }}
        onViewNode={(nodeId) => {
          if (onSelectNode) {
            onSelectNode(nodeId);
          }
        }}
      />
    </div>
  );
};
