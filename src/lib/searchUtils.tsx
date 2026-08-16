import React from "react";
import { CategoryNode, FAQ, RequiredDocument, ProcessStep } from "../types";
import {
  FileText,
  FileCheck,
  ListOrdered,
  HelpCircle,
  Tag,
  DollarSign,
  Info,
} from "lucide-react";

/**
 * Normalizes Persian and Arabic text:
 * - Unifies Arabic and Persian Yeh (ي, ى -> ی)
 * - Unifies Arabic and Persian Kaf (ك -> ک)
 * - Unifies Alef variants (آ, أ, إ -> ا)
 * - Replaces Arabic Heh / Ta Marbuta (ة -> ه)
 * - Normalizes Zero-Width Non-Joiner (نیم‌فاصله \u200c) to space for flexible matching
 * - Converts Arabic & Persian digits to ASCII standard digits
 * - Strips Tashdid, Tanwin, and diacritics
 */
export function normalizePersian(text?: string | null): string {
  if (!text) return "";
  return text
    .toString()
    .toLowerCase()
    // Convert Arabic characters to Persian standard
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/[\u0643]/g, "ک")
    .replace(/[\u0622\u0623\u0625]/g, "ا")
    .replace(/[\u0629]/g, "ه")
    .replace(/[\u0626]/g, "ی")
    // Remove diacritics / Tanwin / Tashdid / Sukun / Kasra / Damma / Fatha
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // Normalize Half-Space (ZWNJ) and underscores to standard space
    .replace(/[\u200C\u200B\u200D_ـ]/g, " ")
    // Convert Persian / Arabic digits to English digits
    .replace(/[۰٠]/g, "0")
    .replace(/[۱١]/g, "1")
    .replace(/[۲٢]/g, "2")
    .replace(/[۳٣]/g, "3")
    .replace(/[۴٤]/g, "4")
    .replace(/[۵٥]/g, "5")
    .replace(/[۶٦]/g, "6")
    .replace(/[۷٧]/g, "7")
    .replace(/[۸٨]/g, "8")
    .replace(/[۹٩]/g, "9")
    // Collapse whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if target text contains the search query with Persian normalization
 */
export function persianTextMatches(target?: string | null, query?: string | null): boolean {
  if (!target || !query) return false;
  const normTarget = normalizePersian(target);
  const normQuery = normalizePersian(query);
  if (!normQuery) return true;

  // Direct substring match
  if (normTarget.includes(normQuery)) return true;

  // Also check if multiple words are all present
  const queryTokens = normQuery.split(" ").filter((t) => t.length > 0);
  if (queryTokens.length > 1) {
    return queryTokens.every((token) => normTarget.includes(token));
  }

  return false;
}

export interface MatchDetail {
  type: "title" | "subtitle" | "description" | "document" | "step" | "faq" | "tag" | "cost";
  label: string;
  icon: React.ReactNode;
  snippet: string;
  targetId?: string; // id of matching FAQ, doc, or step for direct jump/highlight
  targetTab?: "subcategories" | "documents" | "process" | "faqs";
}

export interface NodeSearchMatch {
  selfMatches: boolean;
  score: number; // For relevance ranking
  matchedFields: MatchDetail[];
  bestTab?: "subcategories" | "documents" | "process" | "faqs";
}

/**
 * Extracts a contextual snippet around the matched query in text
 */
export function getSnippetAroundMatch(fullText: string, query: string, maxLength = 80): string {
  if (!fullText) return "";
  const normFull = normalizePersian(fullText);
  const normQuery = normalizePersian(query);
  if (!normQuery) return fullText.slice(0, maxLength);

  const idx = normFull.indexOf(normQuery);
  if (idx === -1) {
    // Check first token if multi-token
    const tokens = normQuery.split(" ").filter(Boolean);
    if (tokens.length > 0) {
      const firstIdx = normFull.indexOf(tokens[0]);
      if (firstIdx !== -1) {
        const start = Math.max(0, firstIdx - 20);
        const end = Math.min(fullText.length, firstIdx + tokens[0].length + 45);
        let snippet = fullText.slice(start, end).trim();
        if (start > 0) snippet = "..." + snippet;
        if (end < fullText.length) snippet = snippet + "...";
        return snippet;
      }
    }
    return fullText.slice(0, maxLength) + (fullText.length > maxLength ? "..." : "");
  }

  const start = Math.max(0, idx - 20);
  const end = Math.min(fullText.length, idx + query.length + 45);
  let snippet = fullText.slice(start, end).trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < fullText.length) snippet = snippet + "...";
  return snippet;
}

/**
 * Performs comprehensive, deep search across all node attributes
 * including FAQs (question + answer), Documents (name + description + notes + role),
 * Process Steps (title + detail + estimated time), Meta, Costs, and Tags.
 */
export function getNodeSearchMatch(node: CategoryNode, query: string): NodeSearchMatch {
  const q = query.trim();
  if (!q) {
    return { selfMatches: true, score: 0, matchedFields: [] };
  }

  let selfMatches = false;
  let score = 0;
  const matchedFields: MatchDetail[] = [];

  // 1. Title Match (Highest priority)
  if (persianTextMatches(node.title, q)) {
    selfMatches = true;
    score += 100;
    matchedFields.push({
      type: "title",
      label: "عنوان خدمت",
      icon: <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
      snippet: node.title,
    });
  }

  // 2. Subtitle Match
  if (node.subtitle && persianTextMatches(node.subtitle, q)) {
    selfMatches = true;
    score += 60;
    matchedFields.push({
      type: "subtitle",
      label: "عنوان فرعی",
      icon: <Info className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
      snippet: node.subtitle,
    });
  }

  // 3. Description Match
  if (node.description && persianTextMatches(node.description, q)) {
    selfMatches = true;
    score += 40;
    matchedFields.push({
      type: "description",
      label: "توضیحات و قوانین",
      icon: <FileText className="w-3.5 h-3.5 text-sky-500 shrink-0" />,
      snippet: getSnippetAroundMatch(node.description, q),
    });
  }

  // 4. FAQs Match (Question + Full Answer)
  if (node.faqs && Array.isArray(node.faqs)) {
    node.faqs.forEach((faq) => {
      const inQ = persianTextMatches(faq.question, q);
      const inA = persianTextMatches(faq.answer, q);
      if (inQ || inA) {
        selfMatches = true;
        score += inQ ? 70 : 50;
        const snippetText = inQ
          ? faq.question
          : `پاسخ: ${getSnippetAroundMatch(faq.answer, q, 70)}`;
        matchedFields.push({
          type: "faq",
          label: "سوال متداول",
          icon: <HelpCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />,
          snippet: snippetText,
          targetId: faq.id,
          targetTab: "faqs",
        });
      }
    });
  }

  // 5. Required Documents Match
  if (node.requiredDocuments && Array.isArray(node.requiredDocuments)) {
    node.requiredDocuments.forEach((doc) => {
      const inName = persianTextMatches(doc.name, q);
      const inDesc = doc.description && persianTextMatches(doc.description, q);
      const inNotes = doc.notes && persianTextMatches(doc.notes, q);
      const inRole = doc.recipientRole && persianTextMatches(doc.recipientRole, q);

      if (inName || inDesc || inNotes || inRole) {
        selfMatches = true;
        score += inName ? 65 : 45;
        let text = doc.name;
        if (doc.recipientRole) text += ` (${doc.recipientRole})`;
        if (inNotes && doc.notes) text += ` - نکته: ${doc.notes}`;
        else if (inDesc && doc.description) text += ` - ${doc.description}`;

        matchedFields.push({
          type: "document",
          label: "مدرک لازم",
          icon: <FileCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />,
          snippet: text,
          targetId: doc.id,
          targetTab: "documents",
        });
      }
    });
  }

  // 6. Process Steps Match
  if (node.processSteps && Array.isArray(node.processSteps)) {
    node.processSteps.forEach((step) => {
      const inTitle = persianTextMatches(step.title, q);
      const inDetail = step.detail && persianTextMatches(step.detail, q);
      const inTime = step.estimatedTime && persianTextMatches(step.estimatedTime, q);

      if (inTitle || inDetail || inTime) {
        selfMatches = true;
        score += inTitle ? 55 : 35;
        matchedFields.push({
          type: "step",
          label: `مرحله ${step.stepNumber}: ${step.title}`,
          icon: <ListOrdered className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
          snippet: step.detail || step.title,
          targetId: step.id,
          targetTab: "process",
        });
      }
    });
  }

  // 7. Costs and Deadlines Match
  if (node.costsAndDeadlines) {
    const cd = node.costsAndDeadlines;
    const combined = [cd.governmentFee, cd.serviceFee, cd.totalDuration, cd.notes]
      .filter(Boolean)
      .join(" ");
    if (persianTextMatches(combined, q)) {
      selfMatches = true;
      score += 30;
      matchedFields.push({
        type: "cost",
        label: "هزینه / مدت زمان",
        icon: <DollarSign className="w-3.5 h-3.5 text-green-500 shrink-0" />,
        snippet: getSnippetAroundMatch(combined, q),
      });
    }
  }

  // 8. Tags Match
  if (node.tags && Array.isArray(node.tags)) {
    node.tags.forEach((tag) => {
      if (persianTextMatches(tag, q)) {
        selfMatches = true;
        score += 25;
        matchedFields.push({
          type: "tag",
          label: "برچسب",
          icon: <Tag className="w-3.5 h-3.5 text-purple-500 shrink-0" />,
          snippet: `#${tag}`,
        });
      }
    });
  }

  // Determine best recommended tab to open when clicking this result
  let bestTab: "subcategories" | "documents" | "process" | "faqs" | undefined;
  const faqMatch = matchedFields.find((m) => m.targetTab === "faqs");
  const docMatch = matchedFields.find((m) => m.targetTab === "documents");
  const stepMatch = matchedFields.find((m) => m.targetTab === "process");

  if (faqMatch) bestTab = "faqs";
  else if (docMatch) bestTab = "documents";
  else if (stepMatch) bestTab = "process";

  return { selfMatches, score, matchedFields, bestTab };
}

/**
 * Component for highlighting matching search text cleanly with Persian support
 */
export const HighlightText: React.FC<{
  text?: string;
  query: string;
  className?: string;
  highlightClass?: string;
}> = ({
  text,
  query,
  className = "",
  highlightClass = "bg-amber-300 text-amber-950 px-1 py-0.5 rounded font-bold shadow-xs",
}) => {
  if (!text) return null;
  const q = query.trim();
  if (!q) return <span className={className}>{text}</span>;

  try {
    // Break query into tokens for highlighting
    const tokens = q
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return <span className={className}>{text}</span>;

    const pattern = tokens
      .map((tok) => tok.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"))
      .join("|");
    const regex = new RegExp(`(${pattern})`, "gi");
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, i) => {
          const isMatch = tokens.some(
            (tok) => normalizePersian(tok) === normalizePersian(part) || tok.toLowerCase() === part.toLowerCase()
          );
          return isMatch ? (
            <mark key={i} className={highlightClass}>
              {part}
            </mark>
          ) : (
            part
          );
        })}
      </span>
    );
  } catch (e) {
    return <span className={className}>{text}</span>;
  }
};
