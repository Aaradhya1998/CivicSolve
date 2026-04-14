import { LoaderCircle, Mail, Phone, ShieldCheck } from "lucide-react";
import { languageOptions } from "../i18n";
import { LanguageCode, OtpChannel, ProfileSummary } from "../types";

type OtpState = {
  code: string;
  loading: boolean;
  hint: string;
  devOtp: string;
  expiresAt: string;
};

type ProfilePanelProps = {
  profile: ProfileSummary | null;
  loading: boolean;
  saving: boolean;
  strings: Record<string, string>;
  verificationAvailability: Record<OtpChannel, boolean>;
  accountForm: {
    name: string;
    phone: string;
    language: LanguageCode;
  };
  otpState: Record<OtpChannel, OtpState>;
  onFieldChange: (field: "name" | "phone" | "language", value: string) => void;
  onSave: () => void;
  onOtpCodeChange: (channel: OtpChannel, value: string) => void;
  onOtpRequest: (channel: OtpChannel) => void;
  onOtpVerify: (channel: OtpChannel) => void;
};

function formatDate(value?: string) {
  if (!value) return "Not available";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function statusPill(verified: boolean, strings: Record<string, string>) {
  return verified
    ? `bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300|${strings.verified || "Verified"}`
    : `bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300|${strings.notVerified || "Not verified"}`;
}

export function ProfilePanel({
  profile,
  loading,
  saving,
  strings,
  verificationAvailability,
  accountForm,
  otpState,
  onFieldChange,
  onSave,
  onOtpCodeChange,
  onOtpRequest,
  onOtpVerify,
}: ProfilePanelProps) {
  if (loading) {
    return (
      <div className="glass rounded-[2rem] border border-white/60 p-10 text-center dark:border-white/10">
        <LoaderCircle size={22} className="mx-auto animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="glass rounded-[2rem] border border-white/60 p-8 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
        {strings.profileEmpty || "Your complaints and contributions will appear here after you start reporting or supporting issues."}
      </div>
    );
  }

  const stats = [
    { label: strings.complaintsFiled || "Complaints filed", value: profile.stats.complaintsFiled },
    { label: strings.resolvedComplaints || "Resolved complaints", value: profile.stats.resolvedComplaints },
    { label: strings.supportsGiven || "Supports given", value: profile.stats.supportsGiven },
    { label: strings.supportReceived || "Support received", value: profile.stats.supportReceived },
  ];
  const maxContribution = Math.max(
    1,
    ...profile.contributions.map((point) => point.reports + point.supports)
  );

  const verificationItems = ([
    { channel: "email", icon: Mail, value: profile.user.email, verified: profile.user.emailVerified, title: strings.emailOtp || "Email OTP" },
    { channel: "phone", icon: Phone, value: profile.user.phone || accountForm.phone, verified: profile.user.phoneVerified, title: strings.phoneOtp || "Phone OTP" },
  ] as const).filter((item) => verificationAvailability[item.channel] && !item.verified);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {strings.accountDetails || "Account details"}
          </p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{strings.name || "Name"}</span>
              <input
                value={accountForm.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{strings.phone || "Phone number"}</span>
              <input
                value={accountForm.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{strings.email || "Email"}</span>
              <input
                value={profile.user.email}
                readOnly
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{strings.language || "Language"}</span>
              <select
                value={accountForm.language}
                onChange={(event) => onFieldChange("language", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {languageOptions.map((option) => (
                  <option key={option.code} value={option.code} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{strings.memberSince || "Member since"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(profile.user.createdAt)}</p>
            </div>
            <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-white/5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Last login</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{formatDate(profile.user.lastLoginAt)}</p>
            </div>
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
          >
            {saving ? <LoaderCircle size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {strings.saveProfile || "Save profile"}
          </button>
        </section>

        <section className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {strings.security || "Security"}
          </p>
          {verificationItems.length ? (
            <div className="mt-5 space-y-4">
              {verificationItems.map((item) => {
                const Icon = item.icon;
                const [, pillLabel] = statusPill(item.verified, strings).split("|");
                const otp = otpState[item.channel];
                return (
                  <div key={item.channel} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700 dark:bg-white/10 dark:text-slate-200">
                          <Icon size={18} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{item.title}</p>
                          <p className="text-sm text-slate-500 dark:text-slate-300">{item.value || "Not added yet"}</p>
                        </div>
                      </div>
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{pillLabel}</span>
                    </div>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <button
                        onClick={() => onOtpRequest(item.channel)}
                        disabled={otp.loading || !item.value}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white"
                      >
                        {otp.loading ? "Sending..." : strings.requestOtp || "Request OTP"}
                      </button>
                      <input
                        value={otp.code}
                        onChange={(event) => onOtpCodeChange(item.channel, event.target.value)}
                        placeholder={strings.otpCode || "OTP code"}
                        className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
                      />
                      <button
                        onClick={() => onOtpVerify(item.channel)}
                        disabled={otp.loading || !otp.code.trim()}
                        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white dark:bg-white dark:text-slate-900"
                      >
                        {otp.loading ? "Verifying..." : strings.verifyOtp || "Verify OTP"}
                      </button>
                    </div>
                    {otp.hint ? <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Sent to {otp.hint}</p> : null}
                    {otp.devOtp ? (
                      <p className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-300">
                        {strings.demoOtp || "Demo OTP"}: {otp.devOtp}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              All available contact methods are verified.
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="glass rounded-[2rem] border border-white/60 p-5 dark:border-white/10">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {strings.contributionChart || "Contribution chart"}
          </p>
          <div className="mt-6 flex h-64 items-end gap-4">
            {profile.contributions.map((point) => {
              const reportsHeight = `${(point.reports / maxContribution) * 100}%`;
              const supportsHeight = `${(point.supports / maxContribution) * 100}%`;
              return (
                <div key={point.label} className="flex flex-1 flex-col items-center gap-3">
                  <div className="flex h-48 w-full max-w-[60px] items-end gap-1">
                    <div className="w-1/2 rounded-t-2xl bg-orange-400" style={{ height: reportsHeight }} />
                    <div className="w-1/2 rounded-t-2xl bg-sky-500" style={{ height: supportsHeight }} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-200">{point.label}</p>
                    <p className="text-[11px] text-slate-400">
                      {point.reports}R / {point.supports}S
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500 dark:text-slate-300">
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-orange-400" />Reports</span>
            <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-sky-500" />Supports</span>
          </div>
        </section>

        <section className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            {strings.pastComplaints || "Past complaints"}
          </p>
          <div className="mt-5 space-y-4">
            {profile.complaints.length ? (
              profile.complaints.map((complaint) => (
                <div key={complaint.id} className="rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">{complaint.id}</span>
                    <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-200">{complaint.status}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{complaint.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{complaint.location}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatDate(complaint.reportedAt)}</span>
                    <span>{complaint.supportCount} supports</span>
                    <span>{complaint.category}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {strings.profileEmpty || "Your complaints and contributions will appear here after you start reporting or supporting issues."}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
