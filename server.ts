import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { CategoryNode, User, AuditLog, Role } from "./src/types";

const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "mobasher_karmon_secret_key_2026_x98z";
const DATA_FILE = path.join(process.cwd(), "data", "store.json");

// Express App Initialization
const app = express();
app.use(express.json());

// Helper for Gemini AI
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Memory Store Structure
interface Store {
  users: User[];
  passwords: Record<string, string>; // userId -> hashedPassword
  nodes: CategoryNode[];
  auditLogs: AuditLog[];
}

let store: Store = {
  users: [],
  passwords: {},
  nodes: [],
  auditLogs: [],
};

// Ensure data directory exists and load store
function loadStore() {
  try {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      store = JSON.parse(content);

      // Ensure admin user exists and password is set to 13781378mM@
      let adminUser = store.users.find((u) => u.username === "admin");
      const salt = bcrypt.genSaltSync(10);
      if (!adminUser) {
        adminUser = {
          id: "usr_admin_01",
          username: "admin",
          fullName: "ادمین ارشد",
          role: "ADMIN",
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        store.users.unshift(adminUser);
      } else {
        adminUser.fullName = "ادمین ارشد";
        adminUser.role = "ADMIN";
        adminUser.isActive = true;
      }
      store.passwords[adminUser.id] = bcrypt.hashSync("13781378mM@", salt);
      saveStore();

      console.log("Loaded existing store with", store.nodes.length, "nodes and", store.users.length, "users.");
    } else {
      seedInitialData();
    }
  } catch (err) {
    console.error("Error loading store file, reseeding data:", err);
    seedInitialData();
  }
}

function saveStore() {
  try {
    const dir = path.join(process.cwd(), "data");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save store:", err);
  }
}

function seedInitialData() {
  console.log("Seeding initial Mobasher Karmon data...");
  const salt = bcrypt.genSaltSync(10);
  
  const adminId = "usr_admin_01";
  const op1Id = "usr_op_01";
  const op2Id = "usr_op_02";

  store.users = [
    {
      id: adminId,
      username: "admin",
      fullName: "ادمین ارشد",
      role: "ADMIN",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: op1Id,
      username: "operator1",
      fullName: "مریم رضایی - اپراتور ثبتی",
      role: "MEMBER",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: op2Id,
      username: "operator2",
      fullName: "علی حسینی - اپراتور حقوقی و مالیاتی",
      role: "MEMBER",
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ];

  store.passwords = {
    [adminId]: bcrypt.hashSync("13781378mM@", salt),
    [op1Id]: bcrypt.hashSync("user123", salt),
    [op2Id]: bcrypt.hashSync("user123", salt),
  };

  const now = new Date().toISOString();

  // Root Domains
  const domRegistration: CategoryNode = {
    id: "domain_reg",
    parentId: null,
    title: "خدمات ثبتی و تغییرات",
    subtitle: "ثبت شرکت‌ها، برند، کارت بازرگانی و تغییرات ثبتی",
    description: "مرجع کامل قوانین، مدارک و فرآیندهای مربوط به ثبت انواع شرکت، موسسات، علائم تجاری و کارت بازرگانی",
    icon: "Building2",
    order: 1,
    isPublished: true,
    requiredDocuments: [],
    processSteps: [],
    faqs: [],
    updatedAt: now,
  };

  const domTax: CategoryNode = {
    id: "domain_tax",
    parentId: null,
    title: "خدمات مالی و مالیاتی",
    subtitle: "اظهارنامه‌ها، دفاتر قانونی، ارزش افزوده و سامانه مؤدیان",
    description: "مرجع دقیق مدارک، مبالغ، زمان‌بندی و تکالیف قانون مالیات‌های مستقیم و ارزش افزوده برای مشتریان",
    icon: "Calculator",
    order: 2,
    isPublished: true,
    requiredDocuments: [],
    processSteps: [],
    faqs: [],
    updatedAt: now,
  };

  const domLegal: CategoryNode = {
    id: "domain_legal",
    parentId: null,
    title: "خدمات حقوقی و قراردادها",
    subtitle: "تنظیم قراردادهای تجاری، مشاوره اداره کار و دعاوی تخصصی",
    description: "پروتکل‌ها و مدارک لازم جهت تنظیم انواع قراردادها، داوری و پرونده‌های حقوقی و اداره کار",
    icon: "Scale",
    order: 3,
    isPublished: true,
    requiredDocuments: [],
    processSteps: [],
    faqs: [],
    updatedAt: now,
  };

  // Subtitles under Registration (خدمات ثبتی)
  const subCompanyReg: CategoryNode = {
    id: "sub_company_reg",
    parentId: "domain_reg",
    title: "ثبت انواع شرکت‌ها",
    subtitle: "مسئولیت محدود، سهامی خاص، سهامی عام و موسسه غیرتجاری",
    description: "دسته‌بندی انواع شخصیت‌های حقوقی و مدارک لازم برای تشکیل پرونده ثبتی",
    icon: "FolderGit2",
    order: 1,
    isPublished: true,
    requiredDocuments: [],
    processSteps: [],
    faqs: [],
    updatedAt: now,
  };

  const subLimitedLiability: CategoryNode = {
    id: "sub_llc",
    parentId: "sub_company_reg",
    title: "شرکت با مسئولیت محدود",
    subtitle: "پرتکرارترین نوع شرکت تجاری با حداقل ۲ شریک",
    description: "در شرکت با مسئولیت محدود، مسئولیت هر یک از شرکا فقط به میزان سرمایه آنها در شرکت است. نیازی به واریز پول به بانک در بدو امر ندارد.",
    icon: "ShieldCheck",
    order: 1,
    isPublished: true,
    requiredDocuments: [
      {
        id: "doc_llc_1",
        name: "تصویر شناسنامه و کارت ملی شرکا و مدیران",
        description: "کارت ملی هوشمند یا رسید ثبت‌نام کارت ملی + تمام صفحات شناسنامه",
        isMandatory: true,
        recipientRole: "همه شرکا و هیئت مدیره",
        notes: "اطلاعات هویتی باید دقیقاً منطبق با سامانه ثنا باشد.",
      },
      {
        id: "doc_llc_2",
        name: "گواهی عدم سوءپیشینه کیفری",
        description: "دریافت آنلاین از طریق سامانه عدل ایران (عدلیه) / ثنا در کمتر از ۲۴ ساعت",
        isMandatory: true,
        recipientRole: "اعضای هیئت مدیره و بازرسین (در صورت وجود)",
        notes: "تاریخ گواهی نباید بیشتر از ۱ ماه بگذرد.",
      },
      {
        id: "doc_llc_3",
        name: "تأییدیه آدرس و کدپستی محل شرکت",
        description: "قبض تلفن ثابت، سند یا اجاره‌نامه با کدپستی ۱۰ رقمی معتبر",
        isMandatory: true,
        recipientRole: "متقاضی",
        notes: "کدپستی دقیقاً در سامانه اداره پست بررسی و استعلام می‌شود.",
      },
      {
        id: "doc_llc_4",
        name: "تعیین موضوع فعالیت دقیق شرکت",
        description: "عنوان دقیق خدمات یا بازرگانی (در صورت مجوزی بودن، اخذ مجوز از ارگان مربوطه)",
        isMandatory: true,
        recipientRole: "شرکا",
        notes: "در صورت نیاز به مجوز، کارشناس مباشر استعلامات مربوطه را انجام می‌دهد.",
      },
      {
        id: "doc_llc_5",
        name: "انتخاب ۵ نام پیشنهادی ۳ کلمه‌ای",
        description: "اسامی فارسی، با معنا، غیرتکراری و بدون استفاده از اسامی ممنوعه لاتین یا عمومی",
        isMandatory: true,
        recipientRole: "متقاضی",
      },
    ],
    processSteps: [
      {
        id: "step_llc_1",
        stepNumber: 1,
        title: "مشاوره اولیه و تکمیل فرم سفارش",
        detail: "اخذ مشخصات شرکا، سرمایه اولیه (حداقل ۱ میلیون ریال)، درصد سهم‌الشرکه و اسامی پیشنهادی.",
        estimatedTime: "۱ ساعت",
      },
      {
        id: "step_llc_2",
        stepNumber: 2,
        title: "استعلام نام در اداره ثبت شرکت‌ها",
        detail: "ارسال اسامی پیشنهادی به کارشناس اداره ثبت جهت تأیید نام نهایی.",
        estimatedTime: "۲۴ الی ۴۸ ساعت",
      },
      {
        id: "step_llc_3",
        stepNumber: 3,
        title: "تنظیم اوراق ثبتی (اساسنامه و شرکت‌نامه)",
        detail: "توسط دپارتمان تخصصی مباشر و ارسال جهت امضای الکترونیک یا دستی شرکا.",
        estimatedTime: "۱ روز کاری",
      },
      {
        id: "step_llc_4",
        stepNumber: 4,
        title: "صدور آگهی تأسیس و روزنامه رسمی",
        detail: "پرداخت حق‌الثبت و هزینه‌های روزنامه رسمی و دریافت شناسه ملی ۱۰ رقمی.",
        estimatedTime: "۳ الی ۵ روز کاری",
      },
    ],
    faqs: [
      {
        id: "faq_llc_1",
        question: "آیا برای ثبت شرکت با مسئولیت محدود نیاز به بلوکه کردن پول در بانک است؟",
        answer: "خیر، برخلاف شرکت سهامی خاص، در شرکت با مسئولیت محدود اقرار مدیرعامل به دریافت سرمایه کافی است و نیازی به بلوکه‌سازی یا افتتاح حساب بانکی قبل از ثبت وجود ندارد.",
      },
      {
        id: "faq_llc_2",
        question: "حداقل تعداد شرکا چقدر است؟",
        answer: "حداقل ۲ نفر که می‌توانند اعضای یک خانواده یا افراد مجزا باشند.",
      },
    ],
    costsAndDeadlines: {
      governmentFee: "حدود ۴۵۰,۰۰۰ تومان (روزنامه رسمی و حق‌الثبت)",
      serviceFee: "با تماس با کارشناس مباشر اعلام می‌گردد",
      totalDuration: "۷ الی ۱۰ روز کاری",
      notes: "مدت زمان بسته به سرعت تأیید نام در اداره ثبت شرکت‌ها متغیر است.",
    },
    tags: ["ثبت شرکت", "مسئولیت محدود", "شرکت تجاری", "شناسه ملی"],
    updatedAt: now,
  };

  const subJointStock: CategoryNode = {
    id: "sub_jsc",
    parentId: "sub_company_reg",
    title: "شرکت سهامی خاص",
    subtitle: "مناسب برای شرکت در مناقصات، اخذ تسهیلات بزرگ و اعتبار بالا",
    description: "نیازمند حداقل ۳ سهامدار و ۲ بازرس (اصلی و علی‌البدل). واریز حداقل ۳۵٪ سرمایه اولیه در حساب بانکی به نام شرکت در شرف تأسیس الزامی است.",
    icon: "Award",
    order: 2,
    isPublished: true,
    requiredDocuments: [
      {
        id: "doc_jsc_1",
        name: "مدارک هویتی سهامداران و بازرسین",
        description: "شناسنامه، کارت ملی و ثبت‌نام سامانه ثنا برای تمام ۵ نفر (۳ سهامدار + ۲ بازرس)",
        isMandatory: true,
        recipientRole: "همه اعضا",
      },
      {
        id: "doc_jsc_2",
        name: "گواهی بانکی واریز ۳۵٪ سرمایه",
        description: "افتتاح حساب به نام «شرکت در شرف تأسیس» و واریز حداقل ۳۵٪ سرمایه اعلامی",
        isMandatory: true,
        recipientRole: "مدیرعامل / هیئت مدیره",
        notes: "این پول تا زمان چاپ آگهی تأسیس در حساب بلوکه می‌ماند.",
      },
      {
        id: "doc_jsc_3",
        name: "گواهی عدم سوءپیشینه اعضای هیئت مدیره و بازرسین",
        description: "دریافت آنلاین از سامانه عدل ایران",
        isMandatory: true,
      },
    ],
    processSteps: [
      {
        id: "step_jsc_1",
        stepNumber: 1,
        title: "اخذ گواهی عدم سوءپیشینه و تعیین اعضا",
        detail: "تعیین بازرسین (بازرسین نباید نسبت فامیلی مستقیم با هیئت مدیره داشته باشند).",
        estimatedTime: "۱ روز",
      },
      {
        id: "step_jsc_2",
        stepNumber: 2,
        title: "افتتاح حساب بانکی و واریز ۳۵ درصد",
        detail: "مراجعه به بانک با معرفی‌نامه اداره ثبت.",
        estimatedTime: "۲ روز کاری",
      },
      {
        id: "step_jsc_3",
        stepNumber: 3,
        title: "امضای اوراق و صدور آگهی تاسیس",
        detail: "امضای اظهارنامه و اساسنامه سهامی خاص و درج در روزنامه رسمی.",
        estimatedTime: "۵ الی ۷ روز",
      },
    ],
    faqs: [
      {
        id: "faq_jsc_1",
        question: "آیا بازرسین می‌توانند از اقوام مدیران باشند؟",
        answer: "خیر، بازرس اصلی و علی‌البدل نباید نسبت فامیلی نسبی یا سببی درجه یک با هیئت مدیره داشته باشند.",
      },
    ],
    costsAndDeadlines: {
      governmentFee: "حدود ۶۰۰,۰۰۰ تومان (حق‌الثبت و آگهی)",
      totalDuration: "۱۰ الی ۱۲ روز کاری",
    },
    tags: ["سهامی خاص", "مناقصه", "بازرس", "سرمایه اولیه"],
    updatedAt: now,
  };

  const subBrand: CategoryNode = {
    id: "sub_brand",
    parentId: "domain_reg",
    title: "ثبت برند و علامت تجاری",
    subtitle: "محافظت از نام تجاری و لوگوی کسب‌وکار در مرکز مالکیت معنوی",
    description: "ثبت علامت تجاری به دو صورت حقیقی (به نام شخص) و حقوقی (به نام شرکت) امکان‌پذیر است.",
    icon: "BadgeCheck",
    order: 2,
    isPublished: true,
    requiredDocuments: [
      {
        id: "doc_br_1",
        name: "کارت بازرگانی یا کارت عضویت اتاق بازرگانی (برای برند لاتین)",
        description: "اگر نام برند حاوی حروف لاتین یا غیرفارسی باشد الزامی است. برای برند فارسی نیاز نیست.",
        isMandatory: false,
        notes: "برندهای تماماً فارسی نیازی به کارت بازرگانی ندارند.",
      },
      {
        id: "doc_br_2",
        name: "جواز کسب، پروانه بهره‌برداری یا گواهی فعالیت مرتبط",
        description: "مدرک اثبات فعالیت در طبقه مورد نظر (مثلا جواز کسب فروشگاه، پروانه ساخت یا نماد اعتماد)",
        isMandatory: true,
      },
      {
        id: "doc_br_3",
        name: "نمونه لوگو و فایل گرافیکی با کیفیت بالا",
        description: "ابعاد ۱۰ در ۱۰ سانتی‌متر با رزولوشن ۳۰۰dpi",
        isMandatory: true,
      },
    ],
    processSteps: [
      {
        id: "step_br_1",
        stepNumber: 1,
        title: "استعلام قبل از ثبت برند",
        detail: "بررسی احتمال تشابه یا تکراری بودن نام برند در سامانه مالکیت معنوی جهت جلوگیری از رد اظهارنامه.",
        estimatedTime: "۲ ساعت",
      },
      {
        id: "step_br_2",
        stepNumber: 2,
        title: "تنظیم و ارسال اظهارنامه ثبت برند",
        detail: "بارگذاری مدارک و نمونه لوگو در سامانه مرکز مالکیت معنوی.",
        estimatedTime: "۱ روز",
      },
      {
        id: "step_br_3",
        stepNumber: 3,
        title: "بررسی کارشناسان و آگهی نوبت اول (آگهی تقاضا)",
        detail: "بررسی توسط ۳ کارشناس و رئیس اداره مالکیت معنوی.",
        estimatedTime: "۳۰ الی ۴۵ روز کاری",
      },
      {
        id: "step_br_4",
        stepNumber: 4,
        title: "مهلت ۳۰ روزه اعتراض و صدور سند ۱۰ ساله برند",
        detail: "پس از اتمام مهلت قانون اعتراض، آگهی دوم چاپ و سند رسمی ۱۰ ساله صادر می‌شود.",
        estimatedTime: "۳۵ روز",
      },
    ],
    faqs: [
      {
        id: "faq_br_1",
        question: "اعتبار برند ثبت شده چند سال است؟",
        answer: "سند برند به مدت ۱۰ سال معتبر است و پس از آن قابل تمدید نامحدود برای دوره‌های ۱۰ ساله می‌باشد.",
      },
    ],
    costsAndDeadlines: {
      totalDuration: "۲.۵ الی ۳ ماه",
      notes: "مدت زمان قانونی بررسی اظهارنامه توسط اداره مالکیت معنوی است.",
    },
    tags: ["ثبت برند", "علامت تجاری", "لوگو", "مالکیت معنوی"],
    updatedAt: now,
  };

  // Subtitles under Tax (خدمات مالی و مالیاتی)
  const subTaxDeclaration: CategoryNode = {
    id: "sub_tax_decl",
    parentId: "domain_tax",
    title: "اظهارنامه‌های مالیاتی",
    subtitle: "اظهارنامه عملکرد، ارزش افزوده و صورت معاملات فصلی (ماده ۱۶۹)",
    description: "مرجع مدارک و جرایم مالیاتی مربوط به تکالیف دوره‌ای اشخاص حقیقی و حقوقی",
    icon: "Receipt",
    order: 1,
    isPublished: true,
    requiredDocuments: [],
    processSteps: [],
    faqs: [],
    updatedAt: now,
  };

  const subAnnualTax: CategoryNode = {
    id: "sub_annual_tax",
    parentId: "sub_tax_decl",
    title: "اظهارنامه مالیات بر درآمد عملکرد سالانه",
    subtitle: "موعد ارسال: تیرماه برای اشخاص حقوقی و خردادماه برای اشخاص حقیقی",
    description: "محاسبه درآمد، هزینه‌ها و سود/زیان سال مالی گذشته و ارسال به سامانه سازمان امور مالیاتی کشور.",
    icon: "FileSpreadsheet",
    order: 1,
    isPublished: true,
    requiredDocuments: [
      {
        id: "doc_tax_1",
        name: "ترازنامه و جدول سود و زیان تأیید شده",
        description: "صورت‌های مالی استخراج شده از نرم‌افزار حسابداری معتبر",
        isMandatory: true,
      },
      {
        id: "doc_tax_2",
        name: "دفاتر پلمپ شده روزنامه و کل مربوط به سال مالی قبل",
        description: "مربوط به سال مالی مورد گزارش با ثبت تمام تراکنش‌ها",
        isMandatory: true,
      },
      {
        id: "doc_tax_3",
        name: "گردش حساب‌های بانکی شرکت و فاکتورهای رسمی فروش و خرید",
        description: "فایل ریز تراکنش‌های بانکی جهت انطباق با سامانه مؤدیان",
        isMandatory: true,
      },
      {
        id: "doc_tax_4",
        name: "نام کاربری و کلمه عبور سامانه ثبت نام مالیاتی (ماده ۱۶۹ / درگاه ملی)",
        description: "اطلاعات ورود به سامانه my.tax.gov.ir",
        isMandatory: true,
      },
    ],
    processSteps: [
      {
        id: "step_tax_1",
        stepNumber: 1,
        title: "جمع‌آوری اسناد و بررسی ممانعت از جرایم",
        detail: "انطباق ریز فاکتورها، حقوق و دستمزد و گردش بانک‌ها توسط حسابرس مباشر.",
        estimatedTime: "۲ الی ۳ روز",
      },
      {
        id: "step_tax_2",
        stepNumber: 2,
        title: "پیش‌نویس اظهارنامه و تأیید موکل",
        detail: "ارسال جدول محاسبه مالیات احتمالی به موکل جهت بررسی و تایید.",
        estimatedTime: "۱ روز",
      },
      {
        id: "step_tax_3",
        stepNumber: 3,
        title: "ارسال نهایی به سامانه سازمان امور مالیاتی و اخذ کد رهگیری",
        detail: "صدور قبض مالیاتی و ارسال سند ارسالی نهایی.",
        estimatedTime: "۱ روز",
      },
    ],
    faqs: [
      {
        id: "faq_tax_1",
        question: "جریمه عدم ارسال اظهارنامه مالیاتی چیست؟",
        answer: "طبق ماده ۱۹۲ قانون مالیات‌های مستقیم، عدم تسلیم اظهارنامه موجب جریمه غیرقابل بخشش معادل ۳۰٪ مالیات متعلق برای اشخاص حقوقی و ۱۰٪ برای اشخاص حقیقی می‌شود.",
      },
    ],
    costsAndDeadlines: {
      totalDuration: "۳ الی ۵ روز کاری",
      notes: "بهتر است اسناد حداقل ۲ هفته قبل از اتمام مهلت قانونی تحویل گردد.",
    },
    tags: ["مالیات عملکرد", "اظهارنامه سالانه", "سازمان امور مالیاتی", "دفاتر قانونی"],
    updatedAt: now,
  };

  const subMoadianSystem: CategoryNode = {
    id: "sub_moadian",
    parentId: "domain_tax",
    title: "سامانه مؤدیان و صدور صورتحساب الکترونیکی",
    subtitle: "ارسال مستقیم فاکتورهای رسمی به کارپوشه مالیاتی مشتریان",
    description: "الزام قانونی تمام اشخاص حقوقی و حقیقی صاحب کسب‌وکار برای صدور فاکتور الکترونیکی با کلید عمومی و اختصاصی.",
    icon: "QrCode",
    order: 2,
    isPublished: true,
    requiredDocuments: [
      {
        id: "doc_moad_1",
        name: "گواهی امضای الکترونیک (CSR / کلید عمومی و خصوصی)",
        description: "دریافت از مرکز صدور گواهی الکترونیکی عام (GICA)",
        isMandatory: true,
      },
      {
        id: "doc_moad_2",
        name: "شناسه یکتای حافظه مالیاتی",
        description: "دریافت از کارپوشه مالیاتی در سامانه my.tax.gov.ir",
        isMandatory: true,
      },
      {
        id: "doc_moad_3",
        name: "کد کالا و خدمات (کد آیسیک / شناسه کالا)",
        description: "استخراج کدهای استاندارد عمومی یا اختصاصی از سامانه stuffid",
        isMandatory: true,
      },
    ],
    processSteps: [
      {
        id: "step_moad_1",
        stepNumber: 1,
        title: "اخذ توکن CSR و کلیدهای امنیتی",
        detail: "تولید فایل کلید عمومی و خصوصی توسط نرم‌افزار تخصصی.",
        estimatedTime: "۲ ساعت",
      },
      {
        id: "step_moad_2",
        stepNumber: 2,
        title: "دریافت شناسه یکتا و اتصال نرم‌افزار به کارپوشه",
        detail: "پیکربندی سامانه مؤدیان و تست ارسال فاکتور نمونه.",
        estimatedTime: "۱ روز",
      },
    ],
    faqs: [
      {
        id: "faq_moad_1",
        question: "مهلت صدور و ارسال فاکتور الکترونیکی در سامانه مؤدیان چند روز است؟",
        answer: "طبق آخرین دستورالعمل سازمان امور مالیاتی، مودیان حداکثر ۲۱ روز از تاریخ صدور فاکتور فرصت دارند آن را در سامانه ثبت نمایند.",
      },
    ],
    costsAndDeadlines: {
      totalDuration: "۱ الی ۲ روز کاری",
    },
    tags: ["سامانه مودیان", "صورتحساب الکترونیکی", "کارپوشه", "شناسه کالا"],
    updatedAt: now,
  };

  // Subtitles under Legal (خدمات حقوقی)
  const subContracts: CategoryNode = {
    id: "sub_contracts",
    parentId: "domain_legal",
    title: "تنظیم و حقوق قراردادها",
    subtitle: "قراردادهای پیمانکاری، تجاری، مشارکتی و عدم افشا (NDA)",
    description: "تنظیم تخصصی بندهای حقوقی، فسخ، حل اختلاف، خسارت تاخیر و ضمانت اجراها",
    icon: "FileText",
    order: 1,
    isPublished: true,
    requiredDocuments: [
      {
        id: "doc_cnt_1",
        name: "مشخصات کامل طرفین قرارداد (حقیقی یا حقوقی)",
        description: "شناسنامه/کارت ملی + آگهی آخرین تغییرات و حق امضا برای شرکت‌ها",
        isMandatory: true,
      },
      {
        id: "doc_cnt_2",
        name: "شرح دقیق موضوع قرارداد، تعهدات و زمان‌بندی تحویل",
        description: "فایل مکتوب صورت‌جلسه توافقات اولیه یا پیش‌نویس خامی که بین طرفین مطرح شده",
        isMandatory: true,
      },
      {
        id: "doc_cnt_3",
        name: "شیوه‌نامه پرداخت و تضمین‌ها (چک / سفته / ضمانت‌نامه بانکی)",
        description: "شماره چک‌ها و مشخصات صادرکننده و ظهرنویسان",
        isMandatory: false,
      },
    ],
    processSteps: [
      {
        id: "step_cnt_1",
        stepNumber: 1,
        title: "جلسه نیازسنجی حقوقی با وکیل متخصص",
        detail: "بررسی ریسک‌های قرارداد، منافع موکل و تعیین مرجع حل اختلاف (داوری یا دادگاه).",
        estimatedTime: "۱ ساعت",
      },
      {
        id: "step_cnt_2",
        stepNumber: 2,
        title: "تدوین پیش‌نویس اولیه قرارداد",
        detail: "ارسال فایل نگارش شده برای موکل جهت مطالعه.",
        estimatedTime: "۲ الی ۳ روز کاری",
      },
      {
        id: "step_cnt_3",
        stepNumber: 3,
        title: "اصلاحات نهایی و نهایی‌سازی متن",
        detail: "اعمال تغییرات درخواستی و تحویل نسخه‌های نهایی جهت امضا.",
        estimatedTime: "۱ روز",
      },
    ],
    faqs: [
      {
        id: "faq_cnt_1",
        question: "مزیت درج شرط داوری در قرارداد چیست؟",
        answer: "داوری باعث حل سریع‌تر اختلافات (معمولاً در کمتر از ۳ ماه) بدون نیاز به طی فرآیند طولانی دادگاه‌ها و با هزینه کمتر می‌شود.",
      },
    ],
    costsAndDeadlines: {
      totalDuration: "۲ الی ۴ روز کاری",
    },
    tags: ["تنظیم قرارداد", "وکیل حقوقی", "شرط داوری", "ضمانت اجرا"],
    updatedAt: now,
  };

  store.nodes = [
    domRegistration,
    domTax,
    domLegal,
    subCompanyReg,
    subLimitedLiability,
    subJointStock,
    subBrand,
    subTaxDeclaration,
    subAnnualTax,
    subMoadianSystem,
    subContracts,
  ];

  store.auditLogs = [
    {
      id: "log_init",
      timestamp: now,
      userId: adminId,
      userName: "مدیر ارشد سیستم",
      action: "CREATE_NODE",
      details: "ایجاد اولیه ساختار محتوایی پایگاه دانش کال‌سنتر مباشر",
    },
  ];

  saveStore();
}

loadStore();

// JWT Middleware
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    fullName: string;
    role: Role;
  };
}

function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "لطفاً ابتدا وارد حساب کاربری خود شوید." });
    return;
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    // Check if user still exists & active
    const u = store.users.find((user) => user.id === decoded.id);
    if (!u || !u.isActive) {
      res.status(403).json({ error: "حساب کاربری غیرفعال است یا یافت نشد." });
      return;
    }
    req.user = {
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
    };
    next();
  } catch (err) {
    res.status(401).json({ error: "اعتبار نشست شما منقضی شده است. مجدداً وارد شوید." });
  }
}

function adminOnlyMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== "ADMIN") {
    res.status(403).json({ error: "دسترسی غیرمجاز. این عملیات فقط مخصوص ادمین سیستم است." });
    return;
  }
  next();
}

// Audit logger helper
function addAuditLog(userId: string, userName: string, action: AuditLog["action"], details: string) {
  const log: AuditLog = {
    id: "log_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    details,
  };
  store.auditLogs.unshift(log);
  if (store.auditLogs.length > 200) store.auditLogs.pop();
  saveStore();
}

// ------------------- API ROUTES -------------------

// Auth API: Public users list for selection on login screen
app.get("/api/auth/public-users", (req: Request, res: Response) => {
  const activeUsers = store.users
    .filter((u) => u.isActive)
    .map((u) => ({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role,
    }));
  res.json(activeUsers);
});

// Auth API: Login
app.post("/api/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: "نام کاربری و رمز عبور الزامی است." });
    return;
  }

  const user = store.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase());
  if (!user) {
    res.status(400).json({ error: "نام کاربری یا رمز عبور اشتباه است." });
    return;
  }

  if (!user.isActive) {
    res.status(403).json({ error: "حساب کاربری شما توسط مدیر سیستم غیرفعال شده است." });
    return;
  }

  const hashedPassword = store.passwords[user.id];
  if (!hashedPassword || !bcrypt.compareSync(password, hashedPassword)) {
    res.status(400).json({ error: "نام کاربری یا رمز عبور اشتباه است." });
    return;
  }

  // Update last login
  user.lastLogin = new Date().toISOString();
  saveStore();

  const token = jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  res.json({
    user,
    token,
  });
});

// Auth API: Me
app.get("/api/auth/me", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

// PHP API Bridge Endpoint for Node preview environment
app.all(["/api.php", "/public/api.php"], (req: Request, res: Response) => {
  const action = req.query.action || req.body?.action || "status";
  
  if (action === "status") {
    res.json({
      status: "ok",
      db_connected: true,
      db_name: "mobasher_db (Node Preview Mode)",
      table_prefix: "",
      nodes_count: store.nodes.length,
      users_count: store.users.length,
    });
    return;
  }

  if (action === "get_nodes") {
    res.json(store.nodes);
    return;
  }

  if (action === "get_users") {
    res.json(store.users);
    return;
  }

  if (action === "sync_all") {
    const { nodes, users } = req.body || {};
    if (Array.isArray(nodes)) {
      store.nodes = nodes;
    }
    if (Array.isArray(users)) {
      store.users = users;
    }
    saveStore();
    res.json({
      status: "success",
      message: "دیتا با موفقیت سینک شد.",
      synced_nodes: store.nodes.length,
      synced_users: store.users.length,
    });
    return;
  }

  res.json({
    status: "ok",
    message: "درخواست api.php در محیط Node.js پردازش گردید.",
    action,
  });
});

// Content Nodes API: Get all nodes
app.get("/api/nodes", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  // If not admin, filter out unpublished nodes
  const isAdmin = req.user?.role === "ADMIN";
  const nodes = isAdmin ? store.nodes : store.nodes.filter((n) => n.isPublished);
  res.json(nodes);
});

// Helper function to build breadcrumbs
function getBreadcrumbs(nodeId: string): string[] {
  const breadcrumbs: string[] = [];
  let current: CategoryNode | undefined = store.nodes.find((n) => n.id === nodeId);
  while (current) {
    breadcrumbs.unshift(current.title);
    if (!current.parentId) break;
    current = store.nodes.find((n) => n.id === current!.parentId);
  }
  return breadcrumbs;
}

// Content Nodes API: Get single node with breadcrumbs
app.get("/api/nodes/:id", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const node = store.nodes.find((n) => n.id === req.params.id);
  if (!node) {
    res.status(404).json({ error: "مورد یافت نشد." });
    return;
  }
  const breadcrumbs = getBreadcrumbs(node.id);
  res.json({ node, breadcrumbs });
});

// Search API
app.get("/api/search", authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const query = String(req.query.q || "").trim().toLowerCase();
  if (!query) {
    res.json([]);
    return;
  }

  const isAdmin = req.user?.role === "ADMIN";
  const availableNodes = isAdmin ? store.nodes : store.nodes.filter((n) => n.isPublished);

  const results: any[] = [];

  for (const node of availableNodes) {
    let matchedField: string | null = null;
    let snippet = "";

    if (node.title.toLowerCase().includes(query)) {
      matchedField = "عنوان";
      snippet = node.title;
    } else if (node.subtitle && node.subtitle.toLowerCase().includes(query)) {
      matchedField = "زیرعنوان";
      snippet = node.subtitle;
    } else if (node.description && node.description.toLowerCase().includes(query)) {
      matchedField = "توضیحات";
      snippet = node.description;
    } else {
      // Check required documents
      const docMatch = node.requiredDocuments.find(
        (d) => d.name.toLowerCase().includes(query) || (d.description && d.description.toLowerCase().includes(query))
      );
      if (docMatch) {
        matchedField = "مدارک لازم";
        snippet = docMatch.name + (docMatch.description ? ` (${docMatch.description})` : "");
      } else {
        // Check FAQs
        const faqMatch = node.faqs.find(
          (f) => f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query)
        );
        if (faqMatch) {
          matchedField = "سوالات متداول";
          snippet = faqMatch.question;
        } else if (node.tags && node.tags.some((t) => t.toLowerCase().includes(query))) {
          matchedField = "برچسب";
          snippet = node.tags.filter((t) => t.toLowerCase().includes(query)).join(", ");
        }
      }
    }

    if (matchedField) {
      results.push({
        node,
        breadcrumbs: getBreadcrumbs(node.id),
        matchedField,
        snippet,
      });
    }
  }

  res.json(results);
});

// Admin Nodes API: Create Node
app.post("/api/nodes", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { title, subtitle, description, parentId, icon, order, requiredDocuments, processSteps, faqs, costsAndDeadlines, tags, isPublished } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "عنوان الزامی است." });
    return;
  }

  // Validate parentId if provided
  if (parentId) {
    const parentExists = store.nodes.some((n) => n.id === parentId);
    if (!parentExists) {
      res.status(400).json({ error: "والد انتخاب شده وجود ندارد." });
      return;
    }
  }

  const newNode: CategoryNode = {
    id: "node_" + Date.now() + "_" + Math.floor(Math.random() * 1000),
    parentId: parentId || null,
    title: title.trim(),
    subtitle: subtitle || "",
    description: description || "",
    icon: icon || "Folder",
    order: Number(order) || (store.nodes.filter((n) => n.parentId === (parentId || null)).length + 1),
    isPublished: isPublished !== undefined ? Boolean(isPublished) : true,
    requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : [],
    processSteps: Array.isArray(processSteps) ? processSteps : [],
    faqs: Array.isArray(faqs) ? faqs : [],
    costsAndDeadlines: costsAndDeadlines || {},
    tags: Array.isArray(tags) ? tags : [],
    updatedAt: new Date().toISOString(),
  };

  store.nodes.push(newNode);
  saveStore();

  addAuditLog(req.user!.id, req.user!.fullName, "CREATE_NODE", `ایجاد بخش/سابتایتل جدید با عنوان "${newNode.title}"`);

  res.json(newNode);
});

// Admin Nodes API: Update Node
app.put("/api/nodes/:id", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const index = store.nodes.findIndex((n) => n.id === req.params.id);
  if (index === -1) {
    res.status(404).json({ error: "بخش مورد نظر یافت نشد." });
    return;
  }

  const existing = store.nodes[index];
  const { title, subtitle, description, parentId, icon, order, requiredDocuments, processSteps, faqs, costsAndDeadlines, tags, isPublished } = req.body;

  if (title !== undefined && (!title || !title.trim())) {
    res.status(400).json({ error: "عنوان نباید خالی باشد." });
    return;
  }

  // Prevent self-parenting or circular parenting
  if (parentId !== undefined && parentId !== null) {
    if (parentId === existing.id) {
      res.status(400).json({ error: "یک بخش نمی‌تواند والد خودش باشد." });
      return;
    }
  }

  const updatedNode: CategoryNode = {
    ...existing,
    title: title !== undefined ? title.trim() : existing.title,
    subtitle: subtitle !== undefined ? subtitle : existing.subtitle,
    description: description !== undefined ? description : existing.description,
    parentId: parentId !== undefined ? parentId : existing.parentId,
    icon: icon !== undefined ? icon : existing.icon,
    order: order !== undefined ? Number(order) : existing.order,
    requiredDocuments: requiredDocuments !== undefined ? requiredDocuments : existing.requiredDocuments,
    processSteps: processSteps !== undefined ? processSteps : existing.processSteps,
    faqs: faqs !== undefined ? faqs : existing.faqs,
    costsAndDeadlines: costsAndDeadlines !== undefined ? costsAndDeadlines : existing.costsAndDeadlines,
    tags: tags !== undefined ? tags : existing.tags,
    isPublished: isPublished !== undefined ? Boolean(isPublished) : existing.isPublished,
    updatedAt: new Date().toISOString(),
  };

  store.nodes[index] = updatedNode;
  saveStore();

  addAuditLog(req.user!.id, req.user!.fullName, "UPDATE_NODE", `ویرایش بخش "${updatedNode.title}"`);

  res.json(updatedNode);
});

// Admin Nodes API: Delete Node (and recursive children)
app.delete("/api/nodes/:id", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const targetNode = store.nodes.find((n) => n.id === targetId);
  if (!targetNode) {
    res.status(404).json({ error: "بخش مورد نظر یافت نشد." });
    return;
  }

  // Helper to collect all child IDs recursively
  function collectChildIds(id: string): string[] {
    const directChildren = store.nodes.filter((n) => n.parentId === id);
    let ids: string[] = directChildren.map((c) => c.id);
    for (const child of directChildren) {
      ids = ids.concat(collectChildIds(child.id));
    }
    return ids;
  }

  const toDeleteIds = new Set([targetId, ...collectChildIds(targetId)]);
  store.nodes = store.nodes.filter((n) => !toDeleteIds.has(n.id));
  saveStore();

  addAuditLog(
    req.user!.id,
    req.user!.fullName,
    "DELETE_NODE",
    `حذف بخش "${targetNode.title}" و ${toDeleteIds.size - 1} زیرمجموعه آن`
  );

  res.json({ message: "بخش و زیرمجموعه‌های آن با موفقیت حذف شدند.", deletedCount: toDeleteIds.size });
});

// ------------------- USER MANAGEMENT (ADMIN ONLY) -------------------

// List Users
app.get("/api/users", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(store.users);
});

// Create User
app.post("/api/users", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { username, password, fullName, role } = req.body;

  if (!username || !password || !fullName) {
    res.status(400).json({ error: "نام کاربری، رمز عبور و نام و نام خانوادگی الزامی هستند." });
    return;
  }

  if (password.length < 5) {
    res.status(400).json({ error: "رمز عبور باید حداقل ۵ کاراکتر باشد." });
    return;
  }

  const existing = store.users.find((u) => u.username.toLowerCase() === String(username).toLowerCase().trim());
  if (existing) {
    res.status(400).json({ error: "این نام کاربری قبلاً ثبت شده است." });
    return;
  }

  const newUserId = "usr_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
  const newUser: User = {
    id: newUserId,
    username: String(username).toLowerCase().trim(),
    fullName: String(fullName).trim(),
    role: role === "ADMIN" ? "ADMIN" : "MEMBER",
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  const salt = bcrypt.genSaltSync(10);
  store.passwords[newUserId] = bcrypt.hashSync(password, salt);
  store.users.push(newUser);
  saveStore();

  addAuditLog(req.user!.id, req.user!.fullName, "CREATE_USER", `تعریف عضو جدید کال‌سنتر با نام "${newUser.fullName}" (${newUser.username})`);

  res.json(newUser);
});

// Update User (e.g. change active status, role, or reset password)
app.put("/api/users/:id", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const user = store.users.find((u) => u.id === req.params.id);
  if (!user) {
    res.status(404).json({ error: "کاربر یافت نشد." });
    return;
  }

  const { fullName, role, isActive, password } = req.body;

  if (fullName !== undefined) user.fullName = String(fullName).trim();
  if (role !== undefined) user.role = role === "ADMIN" ? "ADMIN" : "MEMBER";
  if (isActive !== undefined) user.isActive = Boolean(isActive);

  if (password) {
    if (String(password).length < 5) {
      res.status(400).json({ error: "رمز عبور جدید باید حداقل ۵ کاراکتر باشد." });
      return;
    }
    const salt = bcrypt.genSaltSync(10);
    store.passwords[user.id] = bcrypt.hashSync(password, salt);
    addAuditLog(req.user!.id, req.user!.fullName, "RESET_PASSWORD", `تغییر رمز عبور کاربر "${user.username}"`);
  }

  saveStore();
  addAuditLog(req.user!.id, req.user!.fullName, "UPDATE_USER", `ویرایش مشخصات کاربر "${user.username}"`);

  res.json(user);
});

// Delete User
app.delete("/api/users/:id", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const targetId = req.params.id;
  const user = store.users.find((u) => u.id === targetId);
  if (!user) {
    res.status(404).json({ error: "کاربر یافت نشد." });
    return;
  }

  if (user.id === req.user!.id) {
    res.status(400).json({ error: "شما نمی‌توانید حساب کاربری جاری خود را حذف کنید." });
    return;
  }

  store.users = store.users.filter((u) => u.id !== targetId);
  delete store.passwords[targetId];
  saveStore();

  addAuditLog(req.user!.id, req.user!.fullName, "DELETE_USER", `حذف کاربر "${user.username}"`);

  res.json({ message: "کاربر با موفقیت حذف شد." });
});

// Audit Logs API
app.get("/api/audit-logs", authMiddleware, adminOnlyMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(store.auditLogs);
});

// ------------------- GEMINI AI CALL CENTER ASSISTANT -------------------
app.post("/api/ai/ask", authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      res.status(400).json({ error: "سوال ارسال نشده است." });
      return;
    }

    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json({
        error: "کلید GEMINI_API_KEY تنظیم نشده است. لطفاً از پنل تنظیمات اضافه فرمایید.",
      });
      return;
    }

    // Build context summary from active knowledge base nodes
    const contextSummary = store.nodes
      .filter((n) => n.isPublished)
      .map((n) => {
        const docs = n.requiredDocuments.map((d) => `- ${d.name} (${d.description || ""})`).join("\n");
        const faqs = n.faqs.map((f) => `س: ${f.question} / ج: ${f.answer}`).join("\n");
        return `### بخش: ${n.title} (${n.subtitle || ""})\nتوضیحات: ${n.description || ""}\nمدارک لازم:\n${docs}\nسوالات متداول:\n${faqs}`;
      })
      .join("\n\n-------------------\n\n");

    const systemInstruction = `شما دستیار هوشمند و تخصصی اپراتورهای کال‌سنتر "مباشر" هستید.
مباشر ارائه دهنده خدمات ثبتی (ثبت شرکت، برند و کارت بازرگانی)، خدمات مالیاتی (اظهارنامه‌ها، ارزش افزوده، سامانه مودیان) و خدمات حقوقی (تنظیم قراردادها و مشاوره) است.

پایگاه دانش فعلی سیستم:
${contextSummary}

دستورالعمل‌ها:
۱. پاسخ را به زبان فارسی روان، محترمانه، گام‌به‌گام و خلاصه برای اپراتور تلفنی بنویسید.
۲. مشخص کنید اپراتور دقیقاً چه مدارکی را باید به مشتری اعلام کند یا چه راهنمایی ارائه دهد.
۳. اگر پاسخی در پایگاه دانش نبود، بر اساس دانش عمومی حقوقی/ثبتی/مالیاتی ایران راهنمایی کرده و اشاره کنید که با سرپرست دپارتمان چک شود.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: question,
      config: {
        systemInstruction,
        temperature: 0.3,
      },
    });

    res.json({ answer: response.text });
  } catch (err: any) {
    console.error("Gemini AI error:", err);
    res.status(500).json({ error: "خطا در ارتباط با دستیار هوشمند: " + (err.message || "خطای ناشناخته") });
  }
});

// Vite Dev Server / Static Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
