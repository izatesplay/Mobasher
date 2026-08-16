import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import html2pdf from "html2pdf.js";
import { CategoryNode, RequiredDocument } from "../types";
import {
  FileDown,
  Printer,
  X,
  Copy,
  Check,
  Globe,
  Instagram,
  Phone,
  Smartphone,
  Edit3,
  Calendar,
  FileText,
  UserCheck,
  Sparkles,
} from "lucide-react";

interface LetterheadPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  node: CategoryNode;
  selectedDocs: RequiredDocument[];
}

export const LetterheadPdfModal: React.FC<LetterheadPdfModalProps> = ({
  isOpen,
  onClose,
  node,
  selectedDocs,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  // Editable Letterhead Fields
  const [customerName, setCustomerName] = useState("متقاضی محترم");
  const [letterNumber, setLetterNumber] = useState(
    `MB-${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [issueDate, setIssueDate] = useState(
    new Intl.DateTimeFormat("fa-IR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  );
  const [expertNote, setExpertNote] = useState(
    "لطفاً مدارک فوق را در اسکن باکیفیت و خوانا از طریق پیام‌رسان‌ها یا تحویل حضوری ارسال فرمائید."
  );

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  // Reliable Clipboard Copy Helper
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (err) {
      console.warn("navigator.clipboard failed, attempting fallback execCommand", err);
    }

    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error("Fallback copy failed", err);
      return false;
    }
  };

  const handleCopyText = async () => {
    let text = `با سلام و احترام از طرف مجموعه «مباشر»🌸\n\n`;
    text += `📋 **لیست مدارک مورد نیاز جهت ${node.title}**\n`;
    text += `نام متقاضی: ${customerName}\n`;
    text += `شماره نامه: ${letterNumber} | تاریخ: ${issueDate}\n\n`;

    selectedDocs.forEach((doc, idx) => {
      text += `${idx + 1}. **${doc.name}**`;
      if (doc.recipientRole) text += ` (${doc.recipientRole})`;
      text += ` [${doc.isMandatory ? "الزامی" : "اختیاری"}]\n`;
      if (doc.description) text += `   🔹 ${doc.description}\n`;
      if (doc.notes) text += `   ⚠️ نکته: ${doc.notes}\n`;
      text += `\n`;
    });

    if (node.costsAndDeadlines?.totalDuration) {
      text += `⏱️ **زمان تقریبی انجام**: ${node.costsAndDeadlines.totalDuration}\n`;
    }
    if (node.costsAndDeadlines?.governmentFee) {
      text += `💰 **هزینه دولتی و قانونی**: ${node.costsAndDeadlines.governmentFee}\n`;
    }

    text += `\n${expertNote}\n\nمجموعه «مباشر» - پلتفرم خدمات و مشاوره تخصصی`;

    const success = await copyToClipboard(text);
    if (success) {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  // Generate and Download PDF using html2pdf
  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsGeneratingPdf(true);

    try {
      const element = printRef.current;
      const opt = {
        margin: 0,
        filename: `لیست_مدارک_مباشر_${node.title.replace(/\s+/g, "_")}.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          onclone: (clonedDoc: Document) => {
            // Strip any CSS rules containing oklch from cloned document's stylesheets
            const styleElements = clonedDoc.querySelectorAll("style");
            styleElements.forEach((style) => {
              if (style.innerHTML && style.innerHTML.includes("oklch")) {
                style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/gi, "#000000");
              }
            });

            // Strip inline styles containing oklch
            const allElements = clonedDoc.querySelectorAll("*");
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const styleAttr = htmlEl.getAttribute("style");
              if (styleAttr && styleAttr.includes("oklch")) {
                htmlEl.setAttribute(
                  "style",
                  styleAttr.replace(/oklch\([^)]+\)/gi, "#000000")
                );
              }
            });
          },
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to browser print if html2pdf fails
      handlePrint();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Direct Browser Print
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="fa">
        <head>
          <title>لیست مدارک - ${node.title}</title>
          <meta charset="utf-8" />
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              font-family: system-ui, -apple-system, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body>
          <div style="width: 210mm; min-height: 297mm; padding: 10mm; box-sizing: border-box;">
            ${printContent.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-[#12110e] border border-[rgba(201,160,80,0.3)] rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden"
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-[rgba(201,160,80,0.2)] bg-[#1a1815]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#c9a050] text-[#0a0a0a] rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#c9a050]">
                صدور و چاپ پیش‌نمایش لیست مدارک در سربرگ رسمی «مباشر»
              </h2>
              <p className="text-[11px] text-[#888888]">
                محتوای زیر دقیقا در سربرگ استاندارد شرکتی جهت ارسال به مشتری قرار می‌گیرد.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#888888] hover:text-white hover:bg-[#25221c] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Controls + Live Printable Letterhead Canvas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Form Quick Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-[#191713] p-3.5 rounded-xl border border-[rgba(201,160,80,0.2)] text-xs">
            <div>
              <label className="block text-[#888888] mb-1 font-medium">نام مشتری / متقاضی:</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full bg-[#0d0c0a] border border-[rgba(201,160,80,0.25)] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#c9a050]"
              />
            </div>
            <div>
              <label className="block text-[#888888] mb-1 font-medium">شماره نامه / پیگیری:</label>
              <input
                type="text"
                value={letterNumber}
                onChange={(e) => setLetterNumber(e.target.value)}
                className="w-full bg-[#0d0c0a] border border-[rgba(201,160,80,0.25)] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#c9a050] font-mono text-left"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-[#888888] mb-1 font-medium">تاریخ صدور:</label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full bg-[#0d0c0a] border border-[rgba(201,160,80,0.25)] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#c9a050] font-mono text-center"
              />
            </div>
            <div>
              <label className="block text-[#888888] mb-1 font-medium">توضیح کارشناس پیگیری:</label>
              <input
                type="text"
                value={expertNote}
                onChange={(e) => setExpertNote(e.target.value)}
                className="w-full bg-[#0d0c0a] border border-[rgba(201,160,80,0.25)] rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-[#c9a050]"
              />
            </div>
          </div>

          {/* Action Buttons Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#171512] p-3 rounded-xl border border-[rgba(201,160,80,0.2)]">
            <div className="text-xs text-[#c9a050] font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#c9a050]" />
              <span>تعداد مدارک انتخاب شده: {selectedDocs.length} مورد</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1.5 bg-[#25221c] hover:bg-[#302c24] text-white px-3 py-2 rounded-xl border border-[rgba(201,160,80,0.3)] text-xs font-bold transition cursor-pointer"
              >
                {isCopied ? (
                  <>
                    <Check className="w-4 h-4 text-[#10b981]" />
                    <span className="text-[#10b981]">کپی شد!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#c9a050]" />
                    <span>کپی متن پیام</span>
                  </>
                )}
              </button>

              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 bg-[#25221c] hover:bg-[#302c24] text-[#c9a050] px-3 py-2 rounded-xl border border-[rgba(201,160,80,0.3)] text-xs font-bold transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#c9a050]" />
                <span>چاپ مستقیم / پرینت</span>
              </button>

              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-1.5 bg-[#c9a050] hover:bg-[#d8bf93] text-[#0a0a0a] px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {isGeneratingPdf ? (
                  <div className="w-4 h-4 border-2 border-[#0a0a0a] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 text-[#0a0a0a]" />
                )}
                <span>دانلود خروجی PDF با سربرگ</span>
              </button>
            </div>
          </div>

          {/* PRINTABLE LETTERHEAD CANVAS - Exact visual replica of Mobasher Letterhead */}
          <div className="bg-[#2a2721] p-4 sm:p-8 rounded-2xl overflow-x-auto flex justify-center">
            <div
              ref={printRef}
              id="letterhead-pdf-content"
              dir="rtl"
              className="w-[210mm] min-h-[297mm] p-6 sm:p-8 flex flex-col justify-between relative shadow-2xl rounded-xl box-border font-sans"
              style={{
                boxSizing: "border-box",
                backgroundColor: "#ffffff",
                color: "#0b216f",
              }}
            >
              {/* Outer Navy Border Frame */}
              <div
                className="absolute inset-4 rounded-[22px] pointer-events-none z-0"
                style={{ border: "2px solid #0b216f" }}
              />

              {/* Main Page Top Header & Content */}
              <div className="relative z-10 px-4 pt-3 flex-1 flex flex-col justify-between">
                <div>
                  {/* TOP HEADER SECTION */}
                  <div
                    className="flex items-start justify-between pb-4 mb-4"
                    style={{ borderBottom: "1px solid rgba(11, 33, 111, 0.2)" }}
                  >
                    {/* Right Side: Logo + Brand Title */}
                    <div className="flex items-center gap-3">
                      {/* Logo Inline SVG for guaranteed html2canvas vector rendering */}
                      <div className="w-16 h-14 shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 500 420" className="w-full h-full object-contain">
                          <defs>
                            <linearGradient id="pdfMobasherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#0b2395" />
                              <stop offset="40%" stopColor="#123bad" />
                              <stop offset="75%" stopColor="#00809d" />
                              <stop offset="100%" stopColor="#00aa9f" />
                            </linearGradient>
                          </defs>
                          <g transform="translate(10, 10)">
                            <circle cx="210" cy="55" r="23" fill="url(#pdfMobasherGradient)" />
                            <circle cx="270" cy="55" r="23" fill="url(#pdfMobasherGradient)" />
                            <circle cx="330" cy="55" r="23" fill="url(#pdfMobasherGradient)" />
                            <circle cx="210" cy="365" r="23" fill="url(#pdfMobasherGradient)" />
                            <path
                              d="M 45 275 C 38 220, 70 165, 155 165 L 415 165 C 455 165, 475 145, 475 115 C 475 98, 460 88, 445 88 C 425 88, 400 115, 368 115 L 155 115 C 88 115, 40 160, 40 230 L 40 270 C 40 310, 70 325, 105 325 C 145 325, 195 240, 240 175 C 270 125, 315 125, 360 125 C 430 125, 475 175, 475 250 C 475 320, 415 338, 365 328 C 315 318, 260 225, 215 225 C 190 225, 170 250, 150 280 C 120 330, 80 375, 40 375 C 20 375, 10 350, 10 320 C 10 280, 30 265, 50 265 C 65 265, 75 275, 75 288 C 75 300, 65 310, 52 310 C 46 310, 42 305, 42 295 Z"
                              fill="url(#pdfMobasherGradient)"
                            />
                          </g>
                        </svg>
                      </div>

                      {/* Divider line */}
                      <div className="w-[1.5px] h-11" style={{ backgroundColor: "#0b216f" }} />

                      {/* Title & Tagline */}
                      <div>
                        <div className="text-base sm:text-lg font-black whitespace-nowrap" style={{ color: "#0b216f", letterSpacing: "0px" }}>
                          پلتفرم کسب و کار
                        </div>
                        <div className="text-[11px] font-bold flex items-center gap-1.5 mt-0.5 whitespace-nowrap" style={{ color: "#00a896", letterSpacing: "0px" }}>
                          <span style={{ color: "#00a896" }}>●</span> مشاوره
                          <span style={{ color: "#00a896" }}>●</span> آموزش
                          <span style={{ color: "#00a896" }}>●</span> خدمات
                        </div>
                      </div>
                    </div>

                    {/* Left Side: Decorative Dots Grid + Date & Letter Info */}
                    <div className="flex flex-col items-end">
                      {/* Decorative Matrix Dots */}
                      <div className="grid grid-cols-4 gap-1.5 mb-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "transparent" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: "#00a896" }} />
                      </div>

                      {/* Metadata Table */}
                      <div className="text-[11px] space-y-0.5 font-bold text-left" dir="rtl" style={{ color: "#0b216f" }}>
                        <div>
                          <span className="font-normal" style={{ color: "#64748b" }}>تاریخ: </span>
                          <span className="font-mono" style={{ color: "#0b216f" }}>{issueDate}</span>
                        </div>
                        <div>
                          <span className="font-normal" style={{ color: "#64748b" }}>شماره: </span>
                          <span className="font-mono" style={{ color: "#0b216f" }}>{letterNumber}</span>
                        </div>
                        <div>
                          <span className="font-normal" style={{ color: "#64748b" }}>پیوست: </span>
                          <span>دارد (چک‌لیست مدارک)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DOCUMENT TITLE & SUBJECT BANNER */}
                  <div
                    className="rounded-xl p-3.5 mb-4 text-center"
                    style={{
                      backgroundColor: "rgba(11, 33, 111, 0.05)",
                      border: "1px solid rgba(11, 33, 111, 0.2)",
                    }}
                  >
                    <h1 className="text-sm sm:text-base font-black" style={{ color: "#0b216f" }}>
                      لیست مدارک و مستندات قانونی مورد نیاز
                    </h1>
                    <p className="text-xs font-bold mt-1" style={{ color: "#00a896" }}>
                      سرفصل: {node.title}
                    </p>
                  </div>

                  {/* RECIPIENT GREETING & INTRO */}
                  <div className="text-xs space-y-1.5 mb-4 leading-relaxed" style={{ color: "#1e293b" }}>
                    <p className="font-bold" style={{ color: "#0b216f" }}>
                      مخاطب محترم: <span className="pb-0.5 px-2" style={{ color: "#0f172a", borderBottom: "1px dashed rgba(11, 33, 111, 0.3)" }}>{customerName}</span>
                    </p>
                    <p className="text-[11px]" style={{ color: "#475569" }}>
                      با سلام و احترام؛ پیرو درخواست ثبت‌شده در پلتفرم «مباشر»، خواهشمند است نسبت به آماده‌سازی و ارسال مدارک مندرج در جدول زیر اقدام فرمایند:
                    </p>
                  </div>

                  {/* DOCUMENTS TABLE */}
                  <div
                    className="rounded-xl overflow-hidden mb-4"
                    style={{ border: "1px solid rgba(11, 33, 111, 0.3)" }}
                  >
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="font-bold text-[11px]" style={{ backgroundColor: "#0b216f", color: "#ffffff" }}>
                          <th className="py-2.5 px-2 text-center w-10">ردیف</th>
                          <th className="py-2.5 px-3">عنوان مدرک</th>
                          <th className="py-2.5 px-3">مربوط به / تحویل‌دهنده</th>
                          <th className="py-2.5 px-2 text-center w-20">نوع</th>
                          <th className="py-2.5 px-3">توضیحات و راهنما</th>
                        </tr>
                      </thead>
                      <tbody className="text-[11px]" style={{ color: "#1e293b" }}>
                        {selectedDocs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-4 text-center" style={{ color: "#64748b" }}>
                              مدرکی انتخاب نشده است.
                            </td>
                          </tr>
                        ) : (
                          selectedDocs.map((doc, idx) => (
                            <tr
                              key={doc.id}
                              style={{
                                backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
                                borderBottom: "1px solid #e2e8f0",
                              }}
                            >
                              <td className="py-2 px-2 text-center font-bold" style={{ color: "#0b216f" }}>{idx + 1}</td>
                              <td className="py-2 px-3 font-bold" style={{ color: "#0f172a" }}>{doc.name}</td>
                              <td className="py-2 px-3" style={{ color: "#334155" }}>{doc.recipientRole || "عمومی / متقاضی"}</td>
                              <td className="py-2 px-2 text-center">
                                {doc.isMandatory ? (
                                  <span
                                    className="px-2 py-0.5 rounded font-bold text-[10px]"
                                    style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", color: "#b91c1c" }}
                                  >
                                    الزامی
                                  </span>
                                ) : (
                                  <span
                                    className="px-2 py-0.5 rounded text-[10px]"
                                    style={{ backgroundColor: "#e2e8f0", color: "#334155" }}
                                  >
                                    اختیاری
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-[10.5px]" style={{ color: "#475569" }}>
                                {doc.description && <div>{doc.description}</div>}
                                {doc.notes && <div className="font-medium" style={{ color: "#b45309" }}>نکته: {doc.notes}</div>}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* FINANCIAL & TIMELINE SUMMARY BOX */}
                  {node.costsAndDeadlines && (
                    <div
                      className="rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 text-[11px] text-center"
                      style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0" }}
                    >
                      <div>
                        <span className="block text-[10px]" style={{ color: "#64748b" }}>هزینه قانونی / دولتی:</span>
                        <strong style={{ color: "#0b216f" }}>{node.costsAndDeadlines.governmentFee || "طبق فیش دولتی"}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px]" style={{ color: "#64748b" }}>حق‌الزحمه خدمات:</span>
                        <strong style={{ color: "#00a896" }}>{node.costsAndDeadlines.serviceFee || "استعلام از کارشناس"}</strong>
                      </div>
                      <div>
                        <span className="block text-[10px]" style={{ color: "#64748b" }}>زمان تقریبی:</span>
                        <strong style={{ color: "#0b216f" }}>{node.costsAndDeadlines.totalDuration || "بر اساس فرآیند"}</strong>
                      </div>
                    </div>
                  )}

                  {/* EXPERT NOTE BOX */}
                  {expertNote && (
                    <div
                      className="p-2.5 rounded-xl text-[11px] mb-6"
                      style={{
                        backgroundColor: "rgba(0, 168, 150, 0.1)",
                        border: "1px solid rgba(0, 168, 150, 0.3)",
                        color: "#0b216f",
                      }}
                    >
                      <strong className="font-bold">یادداشت کارشناس: </strong>
                      <span>{expertNote}</span>
                    </div>
                  )}
                </div>

                {/* SIGNATURE & STAMP SECTION */}
                <div
                  className="pt-4 mb-8 flex items-center justify-between text-xs font-bold"
                  style={{ color: "#1e293b", borderTop: "1px solid #e2e8f0" }}
                >
                  <div className="text-center space-y-6">
                    <div>مهر و امضای کارشناس پیگیری</div>
                    <div className="text-[10px] font-normal" style={{ color: "#94a3b8" }}>پلتفرم «مباشر»</div>
                  </div>
                  <div className="text-center space-y-6">
                    <div>مهر و امضای مدیریت مرکز پاسخگویی</div>
                    <div className="text-[10px] font-normal" style={{ color: "#94a3b8" }}>mymobasher.com</div>
                  </div>
                </div>
              </div>

              {/* BOTTOM FOOTER BAR */}
              <div
                className="relative z-10 rounded-2xl p-3.5 mt-2 flex items-center justify-between text-[10.5px] font-bold"
                style={{ backgroundColor: "#0b216f", color: "#ffffff" }}
              >
                {/* Left Side Footer */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" style={{ color: "#00a896" }} />
                    <span dir="ltr">www.mymobasher.com</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" style={{ color: "#00a896" }} />
                    <span dir="ltr">۰۹۱۲۰۰۴۱۲۷۹ / ۰۹۱۲۰۰۴۱۲۸۹</span>
                  </div>
                </div>

                {/* Right Side Footer */}
                <div className="space-y-1 text-left" dir="rtl">
                  <div className="flex items-center justify-end gap-1.5">
                    <span dir="ltr">mymobasher</span>
                    <Instagram className="w-3.5 h-3.5" style={{ color: "#00a896" }} />
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <span dir="ltr">۰۲۱-۹۱۰۹۵۱۹۰</span>
                    <Phone className="w-3.5 h-3.5" style={{ color: "#00a896" }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
