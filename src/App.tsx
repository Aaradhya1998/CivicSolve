import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  FileText,
  Globe2,
  Languages,
  LoaderCircle,
  LocateFixed,
  LogIn,
  LogOut,
  Map,
  Moon,
  Sun,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { api, getComplaintSocket } from "./api";
import { createComplaintDraft } from "./geminiService";
import { copy, languageOptions } from "./i18n";
import { AuthSession, ComplaintDraft, ComplaintRecord, ComplaintStatus, IssueCategory, LanguageCode, OtpChannel, ProfileSummary, ReportForm, Tab } from "./types";
import { AuthFields, AuthModal, AuthMode } from "./components/AuthModal";
import { ComplaintCard } from "./components/ComplaintCard";
import { ComplaintMap } from "./components/ComplaintMap";
import { ProfilePanel } from "./components/ProfilePanel";

const sessionKey = "civicsolve_session_v1";
const languageKey = "civicsolve_language_v1";
const themeKey = "civicsolve_theme_v1";
type Theme = "light" | "dark";
const tabs: Array<{ id: Tab; label: keyof typeof copy.en; icon: LucideIcon }> = [
  { id: Tab.HOME, label: "home", icon: Globe2 },
  { id: Tab.REPORT, label: "report", icon: FileText },
  { id: Tab.MAP, label: "map", icon: Map },
  { id: Tab.TRACK, label: "track", icon: Activity },
  { id: Tab.COMMUNITY, label: "community", icon: Users },
  { id: Tab.PROFILE, label: "profile", icon: UserRound },
];
const filters: Array<ComplaintStatus | "All"> = ["All", "Submitted", "In Review", "Assigned", "Resolved"];
const emptyForm = (): ReportForm => ({
  category: IssueCategory.SANITATION,
  title: "",
  description: "",
  location: "",
  ward: "Wagholi, Pune",
  priority: "Medium",
  file: null,
});
const sortComplaints = (items: ComplaintRecord[]) => [...items].sort((a, b) => b.reportedAt.localeCompare(a.reportedAt));
const emptyOtpState = () => ({ code: "", loading: false, hint: "", devOtp: "", expiresAt: "" });

function readSession() {
  try {
    const raw = localStorage.getItem(sessionKey);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read attachment."));
    reader.readAsDataURL(file);
  });
}

export function App() {
  const [tab, setTab] = useState(Tab.HOME);
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(themeKey) as Theme) || "light");
  const [language, setLanguage] = useState<LanguageCode>(() => (localStorage.getItem(languageKey) as LanguageCode) || "en");
  const [session, setSession] = useState<AuthSession | null>(() => readSession());
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [deliveryAvailability, setDeliveryAvailability] = useState<Record<OtpChannel, boolean>>({
    email: false,
    phone: false,
  });
  const [form, setForm] = useState<ReportForm>(emptyForm());
  const [draft, setDraft] = useState<ComplaintDraft | null>(null);
  const [note, setNote] = useState("");
  const [locating, setLocating] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supportingId, setSupportingId] = useState("");
  const [filter, setFilter] = useState<ComplaintStatus | "All">("All");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authFields, setAuthFields] = useState<AuthFields>({ name: "", email: "", phone: "", password: "", language });
  const [accountForm, setAccountForm] = useState({ name: "", phone: "", language: "en" as LanguageCode });
  const [otpState, setOtpState] = useState<Record<OtpChannel, ReturnType<typeof emptyOtpState>>>({
    email: emptyOtpState(),
    phone: emptyOtpState(),
  });

  const lang = session?.user.language || language;
  const strings = copy[lang] || copy.en;
  const t = (key: keyof typeof copy.en, fallback: string) => strings[key] || copy.en[key] || fallback;
  const visible = filter === "All" ? complaints : complaints.filter((item) => item.status === filter);
  const wardBoard = Object.entries(complaints.reduce<Record<string, number>>((acc, item) => ((acc[item.ward] = (acc[item.ward] || 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const categoryBoard = Object.entries(complaints.reduce<Record<string, number>>((acc, item) => ((acc[item.category] = (acc[item.category] || 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const stats = [
    { label: t("openIssues", "Open issues"), value: complaints.filter((item) => item.status !== "Resolved").length },
    { label: t("reportsLogged", "Reports logged"), value: complaints.length },
    { label: t("supportCount", "Community support"), value: complaints.reduce((sum, item) => sum + item.supportCount, 0) },
  ];

  const syncSession = (next: AuthSession | null) => {
    setSession(next);
    if (next) {
      localStorage.setItem(sessionKey, JSON.stringify(next));
      setLanguage(next.user.language);
      setAccountForm({
        name: next.user.name,
        phone: next.user.phone || "",
        language: next.user.language,
      });
    } else {
      localStorage.removeItem(sessionKey);
      setProfile(null);
      setAccountForm({ name: "", phone: "", language: language });
      setOtpState({ email: emptyOtpState(), phone: emptyOtpState() });
    }
  };

  const upsertComplaint = (next: ComplaintRecord) => setComplaints((current) => sortComplaints([next, ...current.filter((item) => item.id !== next.id)]));
  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthError("");
    setAuthFields((current) => ({ ...current, language: lang, phone: current.phone || session?.user.phone || "" }));
    setAuthOpen(true);
  };

  async function refreshProfile(token = session?.token) {
    if (!token) return;
    setProfileLoading(true);
    try {
      const summary = await api.fetchProfile(token);
      setProfile(summary);
      setAccountForm({
        name: summary.user.name,
        phone: summary.user.phone || "",
        language: summary.user.language,
      });
      setSession((current) => {
        if (!current || current.token !== token) return current;
        const next = { token, user: summary.user };
        localStorage.setItem(sessionKey, JSON.stringify(next));
        return next;
      });
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not load profile.");
    } finally {
      setProfileLoading(false);
    }
  }

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(themeKey, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(languageKey, language);
    setAuthFields((current) => ({ ...current, language }));
    setAccountForm((current) => ({ ...current, language: session?.user.language || language }));
  }, [language]);

  useEffect(() => {
    const backendHint = "Backend is offline. Start it with `npm run backend` or run both with `npm run dev:all`.";
    api
      .fetchComplaints()
      .then(({ complaints: next }) => setComplaints(sortComplaints(next)))
      .catch(() => setNote(backendHint));
    api.health().then((health) => setDeliveryAvailability({
      email: Boolean(health.emailOtpConfigured || health.otpDevFallback),
      phone: Boolean(health.phoneOtpConfigured || health.otpDevFallback),
    })).catch(() => setNote(backendHint));
    const saved = readSession();
    if (saved?.token) {
      api.me(saved.token).then(({ user }) => syncSession({ token: saved.token, user })).catch(() => syncSession(null));
    }
  }, []);

  useEffect(() => {
    if (!session?.token) return;
    refreshProfile(session.token);
  }, [session?.token]);

  useEffect(() => {
    const socket = getComplaintSocket();
    const onSnapshot = (snapshot: ComplaintRecord[]) => setComplaints(sortComplaints(snapshot));
    const onEvent = ({ complaint }: { complaint: ComplaintRecord }) => upsertComplaint(complaint);
    socket.on("complaint:snapshot", onSnapshot);
    socket.on("complaint:event", onEvent);
    return () => {
      socket.off("complaint:snapshot", onSnapshot);
      socket.off("complaint:event", onEvent);
    };
  }, []);

  useEffect(() => {
    setDraft(null);
  }, [form.category, form.title, form.description, form.location]);

  async function changeLanguage(next: LanguageCode) {
    setLanguage(next);
    if (!session) return;
    try {
      const { user } = await api.updateProfile({ language: next }, session.token);
      syncSession({ token: session.token, user });
      setProfile((current) => current ? { ...current, user } : current);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not update language.");
    }
  }

  async function submitAuth() {
    setAuthLoading(true);
    setAuthError("");
    try {
      const next =
        authMode === "register"
          ? await api.register(authFields)
          : await api.login({ identifier: authFields.email, password: authFields.password });
      if (!next.token) {
        setAuthMode("login");
        setAuthOpen(false);
        setNote(next.message || "Account created. Confirm your email, then sign in.");
        setAuthFields((current) => ({ ...current, password: "" }));
        return;
      }
      syncSession(next);
      setAuthOpen(false);
      setNote(`Signed in as ${next.user.name}.`);
      setAuthFields({ name: "", email: "", phone: "", password: "", language: next.user.language });
      setTab(Tab.PROFILE);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function saveProfile() {
    if (!session) return;
    setProfileSaving(true);
    try {
      const { user } = await api.updateProfile(accountForm, session.token);
      syncSession({ token: session.token, user });
      setProfile((current) => current ? { ...current, user } : current);
      setNote("Account details updated.");
      await refreshProfile(session.token);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not update account.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function requestOtp(channel: OtpChannel) {
    if (!session) return;
    setOtpState((current) => ({ ...current, [channel]: { ...current[channel], loading: true } }));
    try {
      const delivery = await api.requestOtp(channel, session.token);
      setOtpState((current) => ({
        ...current,
        [channel]: {
          ...current[channel],
          loading: false,
          hint: delivery.deliveryHint,
          devOtp: delivery.devOtp || "",
          expiresAt: delivery.expiresAt,
          code: current[channel].code,
        },
      }));
      setNote(`${t("otpSent", "OTP sent")} to ${delivery.deliveryHint}.`);
    } catch (error) {
      setOtpState((current) => ({ ...current, [channel]: { ...current[channel], loading: false } }));
      setNote(error instanceof Error ? error.message : "Could not request OTP.");
    }
  }

  async function verifyOtp(channel: OtpChannel) {
    if (!session) return;
    const code = otpState[channel].code.trim();
    if (!code) return;
    setOtpState((current) => ({ ...current, [channel]: { ...current[channel], loading: true } }));
    try {
      const { user } = await api.verifyOtp(channel, code, session.token);
      syncSession({ token: session.token, user });
      setProfile((current) => current ? { ...current, user } : current);
      setOtpState((current) => ({ ...current, [channel]: emptyOtpState() }));
      setNote(`${channel === "email" ? "Email" : "Phone"} verified.`);
      await refreshProfile(session.token);
    } catch (error) {
      setOtpState((current) => ({ ...current, [channel]: { ...current[channel], loading: false } }));
      setNote(error instanceof Error ? error.message : "Could not verify OTP.");
    }
  }

  function useLocation() {
    if (!navigator.geolocation) {
      setNote("Geolocation is not supported on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const latitude = Number(position.coords.latitude.toFixed(6));
      const longitude = Number(position.coords.longitude.toFixed(6));
      let location = `${latitude}, ${longitude}`;
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
        const data = await response.json();
        location = data?.display_name || location;
      } catch {}
      setForm((current) => ({ ...current, latitude, longitude, location: current.location || location }));
      setLocating(false);
      setNote(t("currentLocationReady", "Current location captured."));
    }, () => {
      setLocating(false);
      setNote("We could not access your current location.");
    }, { enableHighAccuracy: true, timeout: 15000 });
  }

  async function polishComplaint() {
    if (!form.description.trim() || !form.location.trim()) {
      setNote("Add a location and description first.");
      return;
    }
    setPolishing(true);
    try {
      setDraft(await createComplaintDraft({ ...form, language: lang }));
    } finally {
      setPolishing(false);
    }
  }

  async function submitComplaint() {
    if (!session) {
      setNote(t("needLogin", "Please sign in to create or support a complaint."));
      openAuth("register");
      return;
    }
    if (!form.description.trim() || !form.location.trim()) {
      setNote("Location and description are required.");
      return;
    }
    setSubmitting(true);
    try {
      const aiDraft = draft || (await createComplaintDraft({ ...form, language: lang }));
      const imageDataUrl = form.file ? await readFileAsDataUrl(form.file) : "";
      const { complaint } = await api.createComplaint({
        title: aiDraft.title || form.title,
        description: form.description,
        category: form.category,
        location: form.location,
        ward: form.ward,
        priority: form.priority,
        department: aiDraft.recommendedDepartment,
        aiSummary: aiDraft.summary,
        imageDataUrl,
        imageName: form.file?.name || "",
        language: lang,
        latitude: form.latitude,
        longitude: form.longitude,
      }, session.token);
      upsertComplaint(complaint);
      setForm(emptyForm());
      setDraft(null);
      setTab(Tab.TRACK);
      setNote("Complaint added to the public database.");
      await refreshProfile(session.token);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not submit complaint.");
    } finally {
      setSubmitting(false);
    }
  }

  async function supportComplaint(id: string) {
    if (!session) {
      setNote(t("needLogin", "Please sign in to create or support a complaint."));
      openAuth("login");
      return;
    }
    setSupportingId(id);
    try {
      const { complaint } = await api.supportComplaint(id, session.token);
      upsertComplaint(complaint);
      await refreshProfile(session.token);
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Could not support complaint.");
    } finally {
      setSupportingId("");
    }
  }

  return (
    <div className={`min-h-screen transition-colors ${theme === "dark" ? "bg-[#08111f] text-slate-100" : "bg-[#f5f7fb] text-slate-900"}`}>
      <div className="bg-mesh min-h-screen">
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#f8fafc]/90 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-[#08111f]/85">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-500">{t("appName", "CivicSolve")}</p>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white">{t("heroTitle", "Report what is broken. Track movement. Rally the block.")}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                <Languages size={16} />
                <select
                  value={lang}
                  onChange={(event) => changeLanguage(event.target.value as LanguageCode)}
                  className="bg-transparent text-slate-900 outline-none dark:text-slate-100"
                >
                  {languageOptions.map((option) => (
                    <option key={option.code} value={option.code} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">
                {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
                {theme === "light" ? "Dark" : "Light"}
              </button>
              {session ? <>
                <button onClick={() => setTab(Tab.PROFILE)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"><UserRound size={16} />{session.user.name}</button>
                <button onClick={() => syncSession(null)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"><LogOut size={16} />{t("logout", "Logout")}</button>
              </> : <button onClick={() => openAuth("login")} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"><LogIn size={16} />{t("signIn", "Sign In")}</button>}
            </div>
          </div>
          <div className="mx-auto flex max-w-7xl flex-wrap gap-2 px-6 pb-4">
            {tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${tab === item.id ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 dark:bg-white/5 dark:text-slate-200"}`}><item.icon size={16} />{t(item.label, item.label)}</button>)}
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
          {note ? <div className="rounded-[1.5rem] border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">{note}</div> : null}

          {tab === Tab.HOME ? <>
            <section className="glass rounded-[2rem] border border-white/60 p-8 shadow-[0_32px_100px_rgba(15,23,42,0.08)] dark:border-white/10">
              <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <p className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">Realtime civic network</p>
                  <h2 className="mt-5 text-4xl font-bold text-slate-900 dark:text-white">{t("heroTitle", "Report what is broken. Track movement. Rally the block.")}</h2>
                  <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">{t("heroBody", "A realtime civic reporting app with public complaints, a live map, account login, and neighborhood-level visibility.")}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={() => setTab(Tab.REPORT)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">{t("newReport", "New Report")}<ArrowRight size={16} /></button>
                    <button onClick={() => setTab(Tab.MAP)} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">{t("publicMap", "Realtime Public Map")}</button>
                  </div>
                </div>
                <div className="grid gap-4">{stats.map((item) => <div key={item.label} className="rounded-[1.6rem] border border-slate-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-white/5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">{item.label}</p><p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{item.value}</p></div>)}</div>
              </div>
            </section>
            <section className="grid gap-5 xl:grid-cols-3">{complaints.slice(0, 3).map((complaint) => <ComplaintCard key={complaint.id} complaint={complaint} compact supporting={supportingId === complaint.id} onSupport={supportComplaint} />)}</section>
          </> : null}

          {tab === Tab.REPORT ? <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">{t("newReport", "New Report")}</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{t("reportTitle", "Report a civic issue clearly")}</h2>
              <div className="mt-6 grid gap-3 md:grid-cols-3">{(Object.values(IssueCategory) as IssueCategory[]).map((category) => <button key={category} onClick={() => setForm((current) => ({ ...current, category }))} className={`rounded-3xl border px-4 py-4 text-left text-sm font-semibold ${form.category === category ? "border-transparent bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border-slate-200 bg-white text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"}`}>{category}</button>)}</div>
              <div className="mt-6">
                <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder={t("issueTitle", "Issue title")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder={t("location", "Location or landmark")} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
                <button onClick={useLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">{locating ? <LoaderCircle size={16} className="animate-spin" /> : <LocateFixed size={16} />}{t("useMyLocation", "Use my current location")}</button>
              </div>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder={t("description", "Description")} className="mt-4 min-h-[180px] w-full rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white" />
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"><input type="file" accept="image/*" className="hidden" onChange={(event) => setForm((current) => ({ ...current, file: event.target.files?.[0] || null }))} />{form.file?.name || t("attachPhoto", "Attach photo")}</label>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={polishComplaint} disabled={polishing || submitting} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100">{polishing ? <LoaderCircle size={16} className="animate-spin" /> : "AI"} {t("polishAi", "Polish with AI")}</button>
                <button onClick={submitComplaint} disabled={submitting} className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900">{submitting ? <LoaderCircle size={16} className="animate-spin" /> : <ArrowRight size={16} />}{t("submitReport", "Submit Report")}</button>
              </div>
            </div>
            <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">{t("aiDraft", "AI complaint draft")}</p>
              {draft ? <div className="mt-4 space-y-4"><h3 className="text-2xl font-bold text-slate-900 dark:text-white">{draft.title}</h3><p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{draft.summary}</p><div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-white/5"><p className="text-sm font-semibold text-slate-900 dark:text-white">{draft.recommendedDepartment}</p><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{draft.estimatedResponse}</p></div><div className="space-y-2">{draft.nextSteps.map((step) => <div key={step} className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200">{step}</div>)}</div></div> : <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">Use AI to rewrite the complaint in your selected language and route it to the right department.</p>}
            </div>
          </section> : null}

          {tab === Tab.MAP ? <section className="space-y-6">
            <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">{t("publicMap", "Realtime Public Map")}</p><h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Live complaint locations across the public feed</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">Markers update in realtime, and each marker includes a Google Maps link for quick navigation.</p></div>
            <ComplaintMap complaints={complaints} />
          </section> : null}

          {tab === Tab.TRACK ? <section className="space-y-6">
            <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">{t("trackerTitle", "Public complaint tracker")}</p><div className="mt-4 flex flex-wrap gap-2">{filters.map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-4 py-2 text-sm font-semibold ${filter === item ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "bg-white text-slate-600 dark:bg-white/5 dark:text-slate-200"}`}>{item}</button>)}</div></div>
            <div className="space-y-5">{visible.map((complaint) => <ComplaintCard key={complaint.id} complaint={complaint} supporting={supportingId === complaint.id} onSupport={supportComplaint} />)}</div>
          </section> : null}

          {tab === Tab.COMMUNITY ? <section className="grid gap-6 xl:grid-cols-3">
            <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-400">{t("communityTitle", "Community action")}</p><h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">Public database, shared momentum</h2><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">Every complaint is visible to everyone. Account holders can add support and keep repeated local issues visible.</p></div>
            <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">Top wards</p><div className="mt-4 space-y-3">{wardBoard.map(([ward, count]) => <div key={ward} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200"><span>{ward}</span><span className="font-bold">{count}</span></div>)}</div></div>
            <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-400">Top categories</p><div className="mt-4 space-y-3">{categoryBoard.map(([category, count]) => <div key={category} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700 dark:bg-white/5 dark:text-slate-200"><span>{category}</span><span className="font-bold">{count}</span></div>)}</div></div>
          </section> : null}

          {tab === Tab.PROFILE ? (
            session ? (
              <ProfilePanel
                profile={profile}
                loading={profileLoading}
                saving={profileSaving}
                strings={strings}
                verificationAvailability={deliveryAvailability}
                accountForm={accountForm}
                otpState={otpState}
                onFieldChange={(field, value) => setAccountForm((current) => ({ ...current, [field]: value }))}
                onSave={saveProfile}
                onOtpCodeChange={(channel, value) => setOtpState((current) => ({ ...current, [channel]: { ...current[channel], code: value } }))}
                onOtpRequest={requestOtp}
                onOtpVerify={verifyOtp}
              />
            ) : (
              <section className="glass rounded-[2rem] border border-white/60 p-8 text-center dark:border-white/10">
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t("profile", "Profile")}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">Sign in to see your account details, verification status, past complaints, and community contribution chart.</p>
                <button onClick={() => openAuth("login")} className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"><LogIn size={16} />{t("signIn", "Sign In")}</button>
              </section>
            )
          ) : null}
        </main>
      </div>

      <AuthModal open={authOpen} mode={authMode} loading={authLoading} error={authError} values={authFields} strings={strings} onClose={() => setAuthOpen(false)} onModeChange={setAuthMode} onFieldChange={(field, value) => setAuthFields((current) => ({ ...current, [field]: value }))} onSubmit={submitAuth} />
    </div>
  );
}
