import { createServer } from "http";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomInt, randomUUID } from "crypto";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { JSONFilePreset } from "lowdb/node";
import { Server } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import twilio from "twilio";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH"],
  },
});

const port = Number(process.env.PORT || 5000);
const model = String(process.env.GEMINI_MODEL || "gemini-2.5-flash").trim() || "gemini-2.5-flash";
const fallbackModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"];
const jwtSecret = process.env.JWT_SECRET || "civicsolve-local-secret";
const passwordPepper = String(process.env.PASSWORD_PEPPER || "");
const passwordRounds = Math.min(14, Math.max(10, Number(process.env.BCRYPT_ROUNDS || 12)));
const supabaseUrl = String(process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = String(process.env.SUPABASE_ANON_KEY || "").trim();
const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
const supabaseServiceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const supabaseDbConfigured = Boolean(supabaseUrl && supabaseServiceRoleKey);
const dbPath = join(__dirname, "data", "db.json");
const smtpFrom = String(process.env.SMTP_FROM || process.env.SMTP_FORM || "").trim();
const smtpConfigured = Boolean(
  process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    smtpFrom
);
const twilioConfigured = Boolean(
  process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_PHONE
);
const otpDevFallback = String(process.env.OTP_DEV_FALLBACK || "true").trim().toLowerCase() === "true";
const otpFallbackEnabled = otpDevFallback || process.env.NODE_ENV !== "production";
const defaultAdminEmail = String(process.env.ADMIN_LOGIN_EMAIL || "devself200@gmail.com").trim().toLowerCase();
const defaultAdminPassword = String(process.env.ADMIN_LOGIN_PASSWORD || "Thebubble3020");
const adminEmails = new Set(
  [...String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean), defaultAdminEmail]
    .filter(Boolean)
);

const mailTransport = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure:
        String(process.env.SMTP_SECURE || "").trim().toLowerCase() === "true" ||
        Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

const twilioClient = twilioConfigured
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;
const supabase = supabaseConfigured ? createSupabaseClient(supabaseUrl, supabaseAnonKey) : null;
const supabaseAdmin = supabaseDbConfigured
  ? createSupabaseClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
let supabaseDbReady = false;

mkdirSync(dirname(dbPath), { recursive: true });

const defaultData = {
  users: [],
  otpChallenges: [],
  complaints: [
    {
      id: "CS-1042",
      title: "Overflowing garbage point near JSPM main road",
      description: "Garbage has not been cleared for three days and is spilling near the main road approach to campus.",
      category: "Sanitation",
      location: "JSPM Main Road, Wagholi",
      ward: "Wagholi, Pune",
      priority: "High",
      status: "Assigned",
      reportedAt: "2026-04-04T08:30:00.000Z",
      updatedAt: "2026-04-04T10:00:00.000Z",
      updates: [
        { id: "u-1", message: "Complaint submitted with landmark details.", createdAt: "2026-04-04T08:30:00.000Z" },
        { id: "u-2", message: "Sanitation vehicle assigned for morning pickup.", createdAt: "2026-04-04T10:00:00.000Z" },
      ],
      supportCount: 18,
      supporters: [],
      department: "Solid Waste and Sanitation",
      aiSummary: "Overflowing waste is affecting pedestrian movement and needs urgent clearance plus follow-up monitoring.",
      imageDataUrl: "",
      imageName: "bus-stop-garbage.jpg",
      reporterId: "system",
      reporterName: "Civic Team",
      language: "en",
      latitude: 18.5793,
      longitude: 73.9781,
    },
    {
      id: "CS-1031",
      title: "Streetlight out near Wagholi market lane",
      description: "The lane turns dark after 7 pm and residents are avoiding the side entry.",
      category: "Street Lighting",
      location: "Near Wagholi Market, Pune",
      ward: "Wagholi, Pune",
      priority: "Medium",
      status: "In Review",
      reportedAt: "2026-04-03T17:15:00.000Z",
      updatedAt: "2026-04-03T19:30:00.000Z",
      updates: [
        { id: "u-3", message: "Volunteer confirmed issue in the evening.", createdAt: "2026-04-03T17:15:00.000Z" },
        { id: "u-4", message: "Pole number requested by maintenance team.", createdAt: "2026-04-03T19:30:00.000Z" },
      ],
      supportCount: 9,
      supporters: [],
      department: "Electrical Maintenance",
      aiSummary: "This is a repeat dark spot near a school access point and should be routed with exact pole details.",
      imageDataUrl: "",
      imageName: "",
      reporterId: "system",
      reporterName: "Civic Team",
      language: "en",
      latitude: 18.5865,
      longitude: 73.9842,
    },
  ],
};

const db = await JSONFilePreset(dbPath, defaultData);

db.data.users ||= [];
db.data.complaints ||= [];
db.data.otpChallenges ||= [];

for (const user of db.data.users) {
  user.authId ||= "";
  user.phone ||= "";
  user.language = normalizeLanguage(user.language || "en");
  user.emailVerified = Boolean(user.emailVerified);
  user.phoneVerified = Boolean(user.phoneVerified);
  user.lastLoginAt ||= "";
  if (!isBcryptHash(user.passwordHash) && typeof user.password === "string" && user.password.length >= 6) {
    user.passwordHash = await hashPassword(user.password);
    delete user.password;
  }
}

for (const complaint of db.data.complaints) {
  complaint.supporters ||= [];
  complaint.supportEvents ||= [];
  complaint.updates = (complaint.updates || []).map((update) =>
    typeof update === "string"
      ? { id: randomUUID(), message: update, createdAt: complaint.updatedAt || complaint.reportedAt || new Date().toISOString() }
      : update
  );
}

await db.write();
await initializeSupabaseDataLayer();

app.use(cors());
app.use(express.json({ limit: "12mb" }));

function getClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  });
}

function getErrorText(error) {
  if (error instanceof Error) return error.message || "";
  return String(error || "");
}

function isMissingModelError(error) {
  const message = getErrorText(error).toLowerCase();
  return message.includes("is not found") || message.includes("not supported for generatecontent");
}

async function generateText(prompt) {
  const ai = getClient();
  const modelsToTry = [...new Set([model, ...fallbackModels])];
  let lastError = null;

  for (const candidate of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model: candidate,
        contents: prompt,
      });
      return { text: response.text ?? "", model: candidate };
    } catch (error) {
      lastError = error;
      if (!isMissingModelError(error)) {
        break;
      }
    }
  }

  throw lastError || new Error("Could not generate content.");
}

function isBcryptHash(value) {
  return typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);
}

function withPepper(password) {
  return `${password}${passwordPepper}`;
}

async function hashPassword(password) {
  return bcrypt.hash(withPepper(password), passwordRounds);
}

async function verifyPassword(password, passwordHash) {
  if (!isBcryptHash(passwordHash)) {
    return { valid: false, shouldRehash: false };
  }

  const peppered = withPepper(password);
  const isMatch = await bcrypt.compare(peppered, passwordHash);
  if (isMatch) {
    const currentRounds = Number(passwordHash.split("$")[2] || 0);
    return { valid: true, shouldRehash: currentRounds < passwordRounds };
  }

  if (!passwordPepper) {
    return { valid: false, shouldRehash: false };
  }

  const wasUnpeppered = await bcrypt.compare(password, passwordHash);
  return { valid: wasUnpeppered, shouldRehash: wasUnpeppered };
}

function normalizeLanguage(language) {
  const value = String(language || "").trim().toLowerCase();
  const allowed = new Set(["en", "hi", "hinglish", "mr", "te", "kn"]);
  return allowed.has(value) ? value : "en";
}

function getSupabaseErrorMessage(error, fallback) {
  const message = String(error?.message || "").trim().toLowerCase();

  if (message.includes("email not confirmed")) {
    return "Email is not verified. Confirm your email, then sign in.";
  }
  if (message.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (message.includes("user already registered")) {
    return "An account with this email already exists.";
  }
  if (message.includes("password")) {
    return "Password must meet the required strength.";
  }

  return fallback;
}

function mapUserToProfileRow(user) {
  return {
    id: user.id,
    auth_id: user.authId || null,
    name: user.name,
    email: String(user.email || "").trim().toLowerCase(),
    phone: user.phone || "",
    password_hash: user.passwordHash || "",
    language: normalizeLanguage(user.language || "en"),
    created_at: user.createdAt || new Date().toISOString(),
    last_login_at: user.lastLoginAt || null,
    email_verified: Boolean(user.emailVerified),
    phone_verified: Boolean(user.phoneVerified),
  };
}

function mapProfileRowToUser(row) {
  return {
    id: row.id,
    authId: row.auth_id || "",
    name: row.name || "Citizen",
    email: String(row.email || "").trim().toLowerCase(),
    phone: row.phone || "",
    passwordHash: row.password_hash || "",
    language: normalizeLanguage(row.language || "en"),
    createdAt: row.created_at || new Date().toISOString(),
    lastLoginAt: row.last_login_at || "",
    emailVerified: Boolean(row.email_verified),
    phoneVerified: Boolean(row.phone_verified),
  };
}

function mapComplaintToRow(complaint) {
  return {
    id: complaint.id,
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    location: complaint.location,
    ward: complaint.ward,
    priority: complaint.priority,
    status: complaint.status,
    reported_at: complaint.reportedAt,
    updated_at: complaint.updatedAt,
    updates: complaint.updates || [],
    support_count: Number(complaint.supportCount || 0),
    supporters: complaint.supporters || [],
    support_events: complaint.supportEvents || [],
    department: complaint.department || "",
    ai_summary: complaint.aiSummary || "",
    image_data_url: complaint.imageDataUrl || "",
    image_name: complaint.imageName || "",
    reporter_id: complaint.reporterId || "",
    reporter_name: complaint.reporterName || "Citizen",
    language: normalizeLanguage(complaint.language || "en"),
    latitude: typeof complaint.latitude === "number" ? complaint.latitude : null,
    longitude: typeof complaint.longitude === "number" ? complaint.longitude : null,
  };
}

function mapComplaintRowToLocal(row) {
  return {
    id: row.id,
    title: row.title || "",
    description: row.description || "",
    category: row.category || "Sanitation",
    location: row.location || "",
    ward: row.ward || "",
    priority: row.priority || "Medium",
    status: row.status || "Submitted",
    reportedAt: row.reported_at || new Date().toISOString(),
    updatedAt: row.updated_at || row.reported_at || new Date().toISOString(),
    updates: Array.isArray(row.updates) ? row.updates : [],
    supportCount: Number(row.support_count || 0),
    supporters: Array.isArray(row.supporters) ? row.supporters : [],
    supportEvents: Array.isArray(row.support_events) ? row.support_events : [],
    department: row.department || "",
    aiSummary: row.ai_summary || "",
    imageDataUrl: row.image_data_url || "",
    imageName: row.image_name || "",
    reporterId: row.reporter_id || "",
    reporterName: row.reporter_name || "Citizen",
    language: normalizeLanguage(row.language || "en"),
    latitude: typeof row.latitude === "number" ? row.latitude : undefined,
    longitude: typeof row.longitude === "number" ? row.longitude : undefined,
  };
}

function mapOtpToRow(challenge) {
  return {
    id: challenge.id,
    user_id: challenge.userId,
    channel: challenge.channel,
    target: challenge.target,
    code_hash: challenge.codeHash,
    created_at: challenge.createdAt,
    expires_at: challenge.expiresAt,
    used_at: challenge.usedAt || null,
  };
}

function mapOtpRowToLocal(row) {
  return {
    id: row.id,
    userId: row.user_id,
    channel: row.channel,
    target: row.target || "",
    codeHash: row.code_hash || "",
    createdAt: row.created_at || new Date().toISOString(),
    expiresAt: row.expires_at || new Date().toISOString(),
    usedAt: row.used_at || "",
  };
}

async function syncSupabaseTable({ table, rows, idColumn = "id" }) {
  if (!supabaseAdmin) return;
  const { data: existingRows, error: readError } = await supabaseAdmin.from(table).select(idColumn);
  if (readError) throw new Error(readError.message || `Could not read ${table}.`);

  if (rows.length > 0) {
    const { error: upsertError } = await supabaseAdmin.from(table).upsert(rows, { onConflict: idColumn });
    if (upsertError) throw new Error(upsertError.message || `Could not upsert ${table}.`);
  }

  const nextIds = new Set(rows.map((row) => row[idColumn]).filter(Boolean));
  const staleIds = (existingRows || []).map((row) => row[idColumn]).filter((id) => !nextIds.has(id));
  if (staleIds.length > 0) {
    const { error: deleteError } = await supabaseAdmin.from(table).delete().in(idColumn, staleIds);
    if (deleteError) throw new Error(deleteError.message || `Could not prune ${table}.`);
  }
}

async function pushLocalDataToSupabase() {
  if (!supabaseAdmin || !supabaseDbReady) return;
  await syncSupabaseTable({
    table: "profiles",
    rows: db.data.users.map(mapUserToProfileRow),
  });
  await syncSupabaseTable({
    table: "complaints",
    rows: db.data.complaints.map(mapComplaintToRow),
  });
  await syncSupabaseTable({
    table: "otp_challenges",
    rows: db.data.otpChallenges.map(mapOtpToRow),
  });
}

async function hydrateLocalDataFromSupabase() {
  if (!supabaseAdmin || !supabaseDbReady) return { users: [], complaints: [], otpChallenges: [] };

  const [{ data: users, error: usersError }, { data: complaints, error: complaintsError }, { data: otp, error: otpError }] =
    await Promise.all([
      supabaseAdmin.from("profiles").select("*"),
      supabaseAdmin.from("complaints").select("*"),
      supabaseAdmin.from("otp_challenges").select("*"),
    ]);

  if (usersError) throw new Error(usersError.message || "Could not load profiles.");
  if (complaintsError) throw new Error(complaintsError.message || "Could not load complaints.");
  if (otpError) throw new Error(otpError.message || "Could not load otp_challenges.");

  return {
    users: (users || []).map(mapProfileRowToUser),
    complaints: (complaints || []).map(mapComplaintRowToLocal),
    otpChallenges: (otp || []).map(mapOtpRowToLocal),
  };
}

async function persistData() {
  await db.write();
  if (!supabaseDbReady) return;

  try {
    await pushLocalDataToSupabase();
  } catch (error) {
    supabaseDbReady = false;
    console.warn("Supabase DB sync disabled due to error:", error instanceof Error ? error.message : error);
  }
}

async function initializeSupabaseDataLayer() {
  if (!supabaseAdmin) return;

  try {
    const [{ error: usersError }, { error: complaintsError }, { error: otpError }] = await Promise.all([
      supabaseAdmin.from("profiles").select("id").limit(1),
      supabaseAdmin.from("complaints").select("id").limit(1),
      supabaseAdmin.from("otp_challenges").select("id").limit(1),
    ]);

    if (usersError || complaintsError || otpError) {
      throw new Error(usersError?.message || complaintsError?.message || otpError?.message || "Supabase tables are not ready.");
    }

    supabaseDbReady = true;
    const remote = await hydrateLocalDataFromSupabase();
    const remoteHasData = remote.users.length > 0 || remote.complaints.length > 0 || remote.otpChallenges.length > 0;

    if (remoteHasData) {
      db.data.users = remote.users;
      db.data.complaints = remote.complaints;
      db.data.otpChallenges = remote.otpChallenges;
      await db.write();
      console.log("Supabase DB connected. Local cache hydrated from remote tables.");
      return;
    }

    await pushLocalDataToSupabase();
    console.log("Supabase DB connected. Seeded remote tables from local data.");
  } catch (error) {
    supabaseDbReady = false;
    console.warn("Supabase DB not ready. Continuing with local JSON store:", error instanceof Error ? error.message : error);
  }
}

async function upsertLocalUserFromAuth(authUser, overrides = {}, options = {}) {
  const email = String(authUser?.email || "").trim().toLowerCase();
  if (!email) {
    throw new Error("Supabase user email is missing.");
  }

  const metadata = typeof authUser?.user_metadata === "object" && authUser.user_metadata ? authUser.user_metadata : {};
  const nextName = String(overrides.name || metadata.name || email.split("@")[0] || "Citizen").trim();
  const nextPhone = normalizePhone(overrides.phone || metadata.phone || "");
  const nextLanguage = normalizeLanguage(overrides.language || metadata.language || "en");
  const now = new Date().toISOString();
  const touchLogin = Boolean(options.touchLogin);
  let changed = false;

  let user = db.data.users.find((entry) => entry.authId === authUser.id);
  if (!user) user = db.data.users.find((entry) => entry.email === email);

  if (!user) {
    user = {
      id: randomUUID(),
      authId: authUser.id,
      name: nextName || "Citizen",
      email,
      phone: nextPhone,
      passwordHash: "",
      language: nextLanguage,
      createdAt: now,
      lastLoginAt: touchLogin ? now : "",
      emailVerified: Boolean(authUser.email_confirmed_at),
      phoneVerified: Boolean(authUser.phone_confirmed_at),
    };
    db.data.users.push(user);
    changed = true;
  } else {
    if (user.authId !== authUser.id) {
      user.authId = authUser.id;
      changed = true;
    }
    if (user.email !== email) {
      user.email = email;
      changed = true;
    }
    const resolvedName = user.name || nextName || "Citizen";
    if (user.name !== resolvedName) {
      user.name = resolvedName;
      changed = true;
    }
    if (!user.phone && nextPhone) {
      user.phone = nextPhone;
      changed = true;
    }
    const resolvedLanguage = normalizeLanguage(user.language || nextLanguage);
    if (user.language !== resolvedLanguage) {
      user.language = resolvedLanguage;
      changed = true;
    }
    if (touchLogin) {
      user.lastLoginAt = now;
      changed = true;
    }
    const emailVerified = Boolean(authUser.email_confirmed_at || user.emailVerified);
    if (user.emailVerified !== emailVerified) {
      user.emailVerified = emailVerified;
      changed = true;
    }
    const phoneVerified = Boolean(authUser.phone_confirmed_at || user.phoneVerified);
    if (user.phoneVerified !== phoneVerified) {
      user.phoneVerified = phoneVerified;
      changed = true;
    }
  }

  if (changed) await persistData();
  return user;
}

function normalizePhone(phone) {
  return String(phone || "").replace(/[^\d+]/g, "").trim();
}

function isAdminUser(user) {
  return adminEmails.has(String(user?.email || "").trim().toLowerCase());
}

function isDefaultAdminLogin(identifier, password) {
  return (
    String(identifier || "").trim().toLowerCase() === defaultAdminEmail &&
    String(password || "") === defaultAdminPassword
  );
}

function getMonthKey(date) {
  const value = new Date(date);
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function getContributionSeries(user) {
  const months = [];
  const cursor = new Date();
  cursor.setUTCDate(1);
  cursor.setUTCHours(0, 0, 0, 0);

  for (let index = 5; index >= 0; index -= 1) {
    const point = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() - index, 1));
    const key = getMonthKey(point.toISOString());
    months.push({
      key,
      label: point.toLocaleString("en-IN", { month: "short" }),
      reports: 0,
      supports: 0,
    });
  }

  const points = Object.fromEntries(months.map((item) => [item.key, item]));
  for (const complaint of db.data.complaints) {
    if (complaint.reporterId === user.id) {
      const key = getMonthKey(complaint.reportedAt);
      if (points[key]) points[key].reports += 1;
    }

    for (const event of complaint.supportEvents || []) {
      if (event.userId === user.id && event.kind === "support") {
        const key = getMonthKey(event.createdAt);
        if (points[key]) points[key].supports += 1;
      }
    }
  }

  return months;
}

function getProfileSummary(user) {
  const complaints = [...db.data.complaints]
    .filter((complaint) => complaint.reporterId === user.id)
    .sort((left, right) => right.reportedAt.localeCompare(left.reportedAt));
  const supportsGiven = db.data.complaints.filter(
    (complaint) => complaint.reporterId !== user.id && (complaint.supporters || []).includes(user.id)
  ).length;
  const supportReceived = complaints.reduce(
    (sum, complaint) => sum + Math.max(0, (complaint.supporters || []).filter((supporterId) => supporterId !== user.id).length),
    0
  );

  return {
    user: getPublicUser(user),
    complaints,
    stats: {
      complaintsFiled: complaints.length,
      resolvedComplaints: complaints.filter((complaint) => complaint.status === "Resolved").length,
      supportsGiven,
      supportReceived,
    },
    contributions: getContributionSeries(user),
  };
}

function getOtpTarget(user, channel) {
  return channel === "phone" ? normalizePhone(user.phone) : String(user.email || "").trim().toLowerCase();
}

function maskTarget(channel, value) {
  if (!value) return channel === "phone" ? "No phone added" : "No email added";
  if (channel === "phone") {
    const tail = value.slice(-2);
    return `${"*".repeat(Math.max(0, value.length - 2))}${tail}`;
  }

  const [name, domain] = value.split("@");
  if (!domain) return value;
  return `${name.slice(0, 2)}***@${domain}`;
}

async function sendOtp(channel, target, code, expiresAt, options = {}) {
  const deliveryHint = maskTarget(channel, target);
  const purpose = String(options.purpose || "verification").trim().toLowerCase();
  const isPasswordReset = purpose === "password_reset";
  const emailSubject = isPasswordReset
    ? process.env.PASSWORD_RESET_EMAIL_SUBJECT || "Your CivicSolve password reset code"
    : process.env.OTP_EMAIL_SUBJECT || "Your CivicSolve verification code";
  const emailText = isPasswordReset
    ? `Your CivicSolve password reset code is ${code}. It expires at ${expiresAt}.`
    : `Your CivicSolve verification code is ${code}. It expires at ${expiresAt}.`;
  const emailHeading = isPasswordReset ? "CivicSolve Password Reset" : "CivicSolve Verification";

  if (channel === "email" && mailTransport) {
    try {
      await mailTransport.sendMail({
        from: smtpFrom,
        to: target,
        subject: emailSubject,
        text: emailText,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.5"><h2>${emailHeading}</h2><p>Your code is <strong>${code}</strong>.</p><p>This code expires at ${expiresAt}.</p></div>`,
      });

      return {
        ok: true,
        channel,
        expiresAt,
        deliveryHint,
        demoMode: false,
      };
    } catch (error) {
      if (!otpFallbackEnabled) {
        throw new Error(error instanceof Error ? error.message : "Email OTP delivery failed.");
      }
    }
  }

  if (channel === "phone" && twilioClient) {
    try {
      await twilioClient.messages.create({
        to: target,
        from: process.env.TWILIO_FROM_PHONE,
        body: `CivicSolve OTP: ${code}. Valid for 10 minutes.`,
      });

      return {
        ok: true,
        channel,
        expiresAt,
        deliveryHint,
        demoMode: false,
      };
    } catch (error) {
      if (!otpFallbackEnabled) {
        throw new Error(error instanceof Error ? error.message : "Phone OTP delivery failed.");
      }
    }
  }

  if (otpFallbackEnabled) {
    return {
      ok: true,
      channel,
      expiresAt,
      deliveryHint,
      demoMode: true,
      devOtp: code,
    };
  }

  throw new Error(
    channel === "email"
      ? "Email OTP delivery is not configured. Add SMTP settings to .env."
      : "Phone OTP delivery is not configured. Add Twilio settings to .env."
  );
}

async function issueOtpChallenge(user, channel, purpose = "verification") {
  const target = getOtpTarget(user, channel);
  const code = String(randomInt(100000, 999999));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  db.data.otpChallenges = db.data.otpChallenges.filter(
    (challenge) => challenge.userId !== user.id || challenge.channel !== channel
  );

  const codeHash = await bcrypt.hash(code, 10);
  db.data.otpChallenges.push({
    id: randomUUID(),
    userId: user.id,
    channel,
    target,
    codeHash,
    createdAt: now.toISOString(),
    expiresAt,
    usedAt: "",
  });

  return sendOtp(channel, target, code, expiresAt, { purpose });
}

function getPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    language: user.language,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || "",
    emailVerified: Boolean(user.emailVerified),
    phoneVerified: Boolean(user.phoneVerified),
    isAdmin: isAdminUser(user),
  };
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
    },
    jwtSecret,
    { expiresIn: "30d" }
  );
}

function getInsights(complaints) {
  const openIssues = complaints.filter((complaint) => complaint.status !== "Resolved").length;
  const supportCount = complaints.reduce((sum, complaint) => sum + complaint.supportCount, 0);
  const topWard =
    Object.entries(
      complaints.reduce((accumulator, complaint) => {
        accumulator[complaint.ward] = (accumulator[complaint.ward] || 0) + 1;
        return accumulator;
      }, {})
    ).sort((left, right) => right[1] - left[1])[0]?.[0] || "Ward 12";

  return [
    {
      title: "Open Issues",
      value: String(openIssues),
      description: "Public complaints currently visible on the shared city feed.",
    },
    {
      title: "Top Reporting Ward",
      value: topWard,
      description: "Most active ward based on the current public complaint database.",
    },
    {
      title: "Community Support",
      value: String(supportCount),
      description: "Total support clicks across tracked complaints.",
    },
  ];
}

async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "Authentication required." });
  }

  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data?.user) {
        const payload = jwt.verify(token, jwtSecret);
        const localUser = db.data.users.find((entry) => entry.id === payload.sub);
        if (!localUser) return res.status(401).json({ error: "Invalid session." });
        req.user = localUser;
        next();
        return;
      }

      req.user = await upsertLocalUserFromAuth(data.user);
      next();
    } catch {
      return res.status(401).json({ error: "Invalid session." });
    }
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = db.data.users.find((entry) => entry.id === payload.sub);
    if (!user) return res.status(401).json({ error: "Invalid session." });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid session." });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !isAdminUser(req.user)) {
    return res.status(403).json({ error: "Admin access required." });
  }
  next();
}

function broadcastComplaint(type, complaint) {
  io.emit("complaint:event", { type, complaint });
}

io.on("connection", (socket) => {
  socket.emit("complaint:snapshot", db.data.complaints);
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GEMINI_API_KEY),
    model,
    complaints: db.data.complaints.length,
    users: db.data.users.length,
    supabaseConfigured,
    supabaseDbConfigured,
    supabaseDbReady,
    emailOtpConfigured: smtpConfigured,
    phoneOtpConfigured: twilioConfigured,
    otpDevFallback: otpFallbackEnabled,
  });
});

app.post("/api/auth/register", async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const phone = normalizePhone(req.body?.phone || "");
  const password = String(req.body?.password || "");
  const language = normalizeLanguage(req.body?.language || "en");

  if (!name || !email || !phone || password.length < 6) {
    return res.status(400).json({ error: "Name, email, phone, and a password with at least 6 characters are required." });
  }

  if (db.data.users.some((user) => normalizePhone(user.phone) === phone)) {
    return res.status(409).json({ error: "An account with this phone number already exists." });
  }

  if (supabase) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          language,
        },
      },
    });

    if (error || !data?.user) {
      return res.status(400).json({
        error: getSupabaseErrorMessage(error, "Could not create account."),
      });
    }

    const user = await upsertLocalUserFromAuth(data.user, { name, phone, language }, { touchLogin: true });
    return res.status(201).json({
      token: data.session?.access_token || "",
      user: getPublicUser(user),
      requiresEmailVerification: !data.session?.access_token,
      message: data.session?.access_token ? "" : "Confirm your email, then sign in.",
    });
  }

  if (db.data.users.some((user) => user.email === email)) {
    return res.status(409).json({ error: "An account with this email already exists." });
  }

  const passwordHash = await hashPassword(password);
  const user = {
    id: randomUUID(),
    authId: "",
    name,
    email,
    phone,
    passwordHash,
    language,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
    emailVerified: false,
    phoneVerified: false,
  };
  db.data.users.push(user);
  await persistData();
  return res.status(201).json({ token: createToken(user), user: getPublicUser(user) });
});

app.post("/api/auth/login", async (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  const normalizedIdentifier = normalizePhone(identifier);
  const now = new Date().toISOString();

  if (isDefaultAdminLogin(identifier, password)) {
    let adminUser = db.data.users.find((entry) => entry.email === defaultAdminEmail);

    if (!adminUser) {
      adminUser = {
        id: randomUUID(),
        authId: "",
        name: "Platform Admin",
        email: defaultAdminEmail,
        phone: "",
        passwordHash: "",
        language: "en",
        createdAt: now,
        lastLoginAt: now,
        emailVerified: true,
        phoneVerified: false,
      };
      db.data.users.push(adminUser);
    } else {
      adminUser.lastLoginAt = now;
      adminUser.emailVerified = true;
      adminUser.language = normalizeLanguage(adminUser.language || "en");
      if (!adminUser.name) adminUser.name = "Platform Admin";
    }

    await persistData();
    return res.json({
      token: createToken(adminUser),
      user: getPublicUser(adminUser),
      message: "Signed in as admin.",
    });
  }

  if (supabase) {
    let email = identifier;
    if (!identifier.includes("@")) {
      const match = db.data.users.find((entry) => normalizePhone(entry.phone) === normalizedIdentifier);
      email = String(match?.email || "").trim().toLowerCase();
    }

    if (!email) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data?.user || !data?.session?.access_token) {
      const legacyUser = db.data.users.find((entry) => entry.email === identifier || normalizePhone(entry.phone) === normalizedIdentifier);
      if (legacyUser) {
        const { valid, shouldRehash } = await verifyPassword(password, legacyUser.passwordHash);
        if (valid) {
          if (shouldRehash) legacyUser.passwordHash = await hashPassword(password);
          legacyUser.lastLoginAt = new Date().toISOString();
          await persistData();
          return res.json({
            token: createToken(legacyUser),
            user: getPublicUser(legacyUser),
            message: "Signed in using legacy local auth. Re-register with Supabase to fully migrate.",
          });
        }
      }

      return res.status(401).json({ error: getSupabaseErrorMessage(error, "Invalid email or password.") });
    }

    const user = await upsertLocalUserFromAuth(data.user, {}, { touchLogin: true });
    return res.json({
      token: data.session.access_token,
      user: getPublicUser(user),
    });
  }

  const user = db.data.users.find((entry) => entry.email === identifier || normalizePhone(entry.phone) === normalizedIdentifier);
  if (!user) return res.status(401).json({ error: "Invalid email or password." });

  const { valid, shouldRehash } = await verifyPassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password." });
  if (shouldRehash) user.passwordHash = await hashPassword(password);
  user.lastLoginAt = new Date().toISOString();
  await persistData();
  return res.json({ token: createToken(user), user: getPublicUser(user) });
});

app.post("/api/auth/forgot-password/request", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const masked = maskTarget("email", email);

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email is required." });
  }

  const user = db.data.users.find((entry) => entry.email === email);
  if (!user) {
    return res.json({
      ok: true,
      channel: "email",
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      deliveryHint: masked,
      demoMode: false,
    });
  }

  try {
    const delivery = await issueOtpChallenge(user, "email", "password_reset");
    await persistData();
    return res.json(delivery);
  } catch (error) {
    db.data.otpChallenges = db.data.otpChallenges.filter(
      (entry) => !(entry.userId === user.id && entry.channel === "email" && !entry.usedAt)
    );
    await persistData();
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Could not send reset OTP.",
    });
  }
});

app.post("/api/auth/forgot-password/reset", async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();
  const nextPassword = String(req.body?.newPassword || "").trim();

  if (!email || !email.includes("@") || !code || nextPassword.length < 6) {
    return res.status(400).json({ error: "Email, OTP code, and new password (min 6 chars) are required." });
  }

  const user = db.data.users.find((entry) => entry.email === email);
  if (!user) {
    return res.status(400).json({ error: "Invalid or expired reset code." });
  }

  const challenge = [...db.data.otpChallenges]
    .reverse()
    .find(
      (entry) =>
        entry.userId === user.id &&
        entry.channel === "email" &&
        !entry.usedAt &&
        new Date(entry.expiresAt).getTime() > Date.now()
    );

  if (!challenge) {
    return res.status(400).json({ error: "No active reset OTP found. Request a new code." });
  }

  const isValid = await bcrypt.compare(code, challenge.codeHash);
  if (!isValid) {
    return res.status(400).json({ error: "Invalid reset OTP code." });
  }

  challenge.usedAt = new Date().toISOString();
  user.passwordHash = await hashPassword(nextPassword);
  user.lastLoginAt = new Date().toISOString();
  user.emailVerified = true;
  await persistData();

  return res.json({ ok: true, message: "Password reset successful. Sign in with your new password." });
});

app.get("/api/auth/me", authMiddleware, (req, res) => {
  res.json({ user: getPublicUser(req.user) });
});

app.patch("/api/auth/me", authMiddleware, async (req, res) => {
  const nextName = String(req.body?.name || req.user.name).trim();
  const nextPhone = req.body?.phone === undefined ? req.user.phone : normalizePhone(req.body?.phone || "");
  const nextLanguage = req.body?.language === undefined ? req.user.language : normalizeLanguage(req.body?.language || "en");

  if (!nextName || !nextLanguage) {
    return res.status(400).json({ error: "Name and language are required." });
  }

  if (
    nextPhone &&
    db.data.users.some((user) => user.id !== req.user.id && normalizePhone(user.phone) === nextPhone)
  ) {
    return res.status(409).json({ error: "This phone number is already linked to another account." });
  }

  if (nextPhone !== req.user.phone) {
    req.user.phoneVerified = false;
  }

  req.user.name = nextName;
  req.user.phone = nextPhone;
  req.user.language = nextLanguage;
  await persistData();

  return res.json({ user: getPublicUser(req.user) });
});

app.get("/api/profile", authMiddleware, (req, res) => {
  res.json(getProfileSummary(req.user));
});

app.post("/api/auth/otp/request", authMiddleware, async (req, res) => {
  const channel = String(req.body?.channel || "").trim().toLowerCase();
  if (channel !== "email" && channel !== "phone") {
    return res.status(400).json({ error: "OTP channel must be email or phone." });
  }

  const target = getOtpTarget(req.user, channel);
  if (!target) {
    return res.status(400).json({ error: `Add a ${channel} to your account before requesting an OTP.` });
  }

  try {
    const challenge = await issueOtpChallenge(req.user, channel);
    await persistData();
    return res.json(challenge);
  } catch (error) {
    db.data.otpChallenges = db.data.otpChallenges.filter(
      (entry) => !(entry.userId === req.user.id && entry.channel === channel && !entry.usedAt)
    );
    await persistData();
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Could not send OTP.",
    });
  }
});

app.post("/api/auth/otp/verify", authMiddleware, async (req, res) => {
  const channel = String(req.body?.channel || "").trim().toLowerCase();
  const code = String(req.body?.code || "").trim();

  if ((channel !== "email" && channel !== "phone") || !code) {
    return res.status(400).json({ error: "Channel and OTP code are required." });
  }

  const challenge = [...db.data.otpChallenges]
    .reverse()
    .find(
      (entry) =>
        entry.userId === req.user.id &&
        entry.channel === channel &&
        !entry.usedAt &&
        new Date(entry.expiresAt).getTime() > Date.now()
    );

  if (!challenge) {
    return res.status(400).json({ error: "No active OTP found. Request a new code." });
  }

  const isValid = await bcrypt.compare(code, challenge.codeHash);
  if (!isValid) {
    return res.status(400).json({ error: "Invalid OTP code." });
  }

  challenge.usedAt = new Date().toISOString();
  if (channel === "email") req.user.emailVerified = true;
  if (channel === "phone") req.user.phoneVerified = true;
  await persistData();

  return res.json({ user: getPublicUser(req.user) });
});

app.get("/api/insights", (_req, res) => {
  res.json({ insights: getInsights(db.data.complaints) });
});

app.get("/api/complaints", (_req, res) => {
  const complaints = [...db.data.complaints].sort((left, right) => right.reportedAt.localeCompare(left.reportedAt));
  res.json({ complaints });
});

app.post("/api/complaints", authMiddleware, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const description = String(req.body?.description || "").trim();
  const category = String(req.body?.category || "").trim();
  const location = String(req.body?.location || "").trim();
  const ward = String(req.body?.ward || "").trim() || "Wagholi, Pune";
  const priority = String(req.body?.priority || "Medium").trim();
  const department = String(req.body?.department || "Ward Office").trim();
  const aiSummary = String(req.body?.aiSummary || "").trim();
  const imageDataUrl = String(req.body?.imageDataUrl || "").trim();
  const imageName = String(req.body?.imageName || "").trim();
  const language = String(req.body?.language || req.user.language || "en").trim().toLowerCase();
  const normalizedLanguage = normalizeLanguage(language);
  const latitude = typeof req.body?.latitude === "number" ? req.body.latitude : undefined;
  const longitude = typeof req.body?.longitude === "number" ? req.body.longitude : undefined;

  if (!description || !location || !category) {
    return res.status(400).json({ error: "Category, location, and description are required." });
  }

  const now = new Date().toISOString();
  const complaint = {
    id: `CS-${Math.floor(1000 + Math.random() * 9000)}`,
    title: title || `${category} issue near ${location}`,
    description,
    category,
    location,
    ward,
    priority,
    status: "Submitted",
    reportedAt: now,
    updatedAt: now,
    updates: [
      {
        id: randomUUID(),
        message: "Complaint created and published to the public feed.",
        createdAt: now,
      },
    ],
    supportCount: 1,
    supporters: [req.user.id],
    supportEvents: [{ userId: req.user.id, createdAt: now, kind: "reporter" }],
    department,
    aiSummary,
    imageDataUrl,
    imageName,
    reporterId: req.user.id,
    reporterName: req.user.name,
    language: normalizedLanguage,
    latitude,
    longitude,
  };

  db.data.complaints.unshift(complaint);
  await persistData();
  broadcastComplaint("created", complaint);

  return res.status(201).json({ complaint });
});

app.post("/api/complaints/:id/support", authMiddleware, async (req, res) => {
  const complaint = db.data.complaints.find((entry) => entry.id === req.params.id);

  if (!complaint) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  complaint.supporters ||= [];
  if (!complaint.supporters.includes(req.user.id)) {
    complaint.supporters.push(req.user.id);
    complaint.supportEvents ||= [];
    complaint.supportEvents.push({ userId: req.user.id, createdAt: new Date().toISOString(), kind: "support" });
    complaint.supportCount = complaint.supporters.length;
    complaint.updatedAt = new Date().toISOString();
    complaint.updates.unshift({
      id: randomUUID(),
      message: `${req.user.name} added support to this complaint.`,
      createdAt: complaint.updatedAt,
    });
    await persistData();
    broadcastComplaint("supported", complaint);
  }

  return res.json({ complaint });
});

app.get("/api/admin/overview", authMiddleware, requireAdmin, (_req, res) => {
  const complaints = [...db.data.complaints].sort((left, right) => right.reportedAt.localeCompare(left.reportedAt));
  const resolved = complaints.filter((item) => item.status === "Resolved").length;
  const withPhoto = complaints.filter((item) => Boolean(item.imageDataUrl)).length;
  const mapped = complaints.filter(
    (item) => typeof item.latitude === "number" && typeof item.longitude === "number"
  ).length;
  const byStatus = (["Submitted", "In Review", "Assigned", "Resolved"]).map((label) => ({
    label,
    count: complaints.filter((item) => item.status === label).length,
  }));
  const categoryCounts = complaints.reduce((accumulator, item) => {
    accumulator[item.category] = (accumulator[item.category] || 0) + 1;
    return accumulator;
  }, {});
  const byCategory = Object.entries(categoryCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);

  return res.json({
    totals: {
      complaints: complaints.length,
      resolved,
      open: complaints.length - resolved,
      withPhoto,
      mapped,
    },
    byStatus,
    byCategory,
    complaints,
  });
});

app.patch("/api/admin/complaints/:id/status", authMiddleware, requireAdmin, async (req, res) => {
  const complaint = db.data.complaints.find((entry) => entry.id === req.params.id);
  const nextStatus = String(req.body?.status || "").trim();
  const allowedStatuses = new Set(["Submitted", "In Review", "Assigned", "Resolved"]);

  if (!complaint) {
    return res.status(404).json({ error: "Complaint not found." });
  }

  if (!allowedStatuses.has(nextStatus)) {
    return res.status(400).json({ error: "Invalid complaint status." });
  }

  if (complaint.status !== nextStatus) {
    complaint.status = nextStatus;
    complaint.updatedAt = new Date().toISOString();
    complaint.updates.unshift({
      id: randomUUID(),
      message: `Status updated to ${nextStatus} by admin.`,
      createdAt: complaint.updatedAt,
    });
    await persistData();
    broadcastComplaint("status-updated", complaint);
  }

  return res.json({ complaint });
});

app.post("/api/generate", async (req, res) => {
  try {
    const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const response = await generateText(prompt);

    return res.json({ text: response.text ?? "", model: response.model });
  } catch (error) {
    console.error(error);
    const status = process.env.GEMINI_API_KEY ? 500 : 503;

    return res.status(status).json({
      error: process.env.GEMINI_API_KEY
        ? "Something went wrong"
        : "GEMINI_API_KEY is not configured on the backend.",
    });
  }
});

server.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
