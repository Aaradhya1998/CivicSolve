import { Eye, EyeOff, LoaderCircle, LogIn, Mail, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { languageOptions } from "../i18n";
import { LanguageCode } from "../types";

export type AuthMode = "login" | "register" | "forgot";

export type AuthFields = {
  name: string;
  email: string;
  phone: string;
  password: string;
  resetCode: string;
  language: LanguageCode;
};

type AuthModalProps = {
  open: boolean;
  mode: AuthMode;
  loading: boolean;
  error: string;
  values: AuthFields;
  strings: Record<string, string>;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onFieldChange: (field: keyof AuthFields, value: string) => void;
  onSubmit: () => void;
  onForgotOtpRequest: () => void;
  forgotHint?: string;
  forgotDevOtp?: string;
};

export function AuthModal({
  open,
  mode,
  loading,
  error,
  values,
  strings,
  onClose,
  onModeChange,
  onFieldChange,
  onSubmit,
  onForgotOtpRequest,
  forgotHint = "",
  forgotDevOtp = "",
}: AuthModalProps) {
  if (!open) return null;

  const isRegister = mode === "register";
  const isForgot = mode === "forgot";
  const [showPassword, setShowPassword] = useState(false);
  const passwordLabel = isForgot ? "New password" : strings.password || "Password";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-10 backdrop-blur-sm">
      <div className="glass w-full max-w-md rounded-[2rem] border border-white/60 p-6 shadow-[0_32px_90px_rgba(15,23,42,0.2)] dark:border-white/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-500">CivicSolve</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
              {isRegister
                ? strings.createAccount || "Create account"
                : isForgot
                  ? "Reset password"
                  : strings.welcomeBack || "Welcome back"}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
              {isForgot
                ? "Enter your email, request OTP, then set a new password."
                : "Public complaints stay visible to everyone, but only signed-in users can post and support them."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {isRegister && !isForgot ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {strings.name || "Name"}
              </span>
              <input
                value={values.name}
                onChange={(event) => onFieldChange("name", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder={strings.name || "Name"}
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
              {isRegister || isForgot ? strings.email || "Email" : strings.emailOrPhone || "Email or phone"}
            </span>
            <input
              value={values.email}
              onChange={(event) => onFieldChange("email", event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              placeholder={isRegister || isForgot ? strings.email || "Email" : strings.emailOrPhone || "Email or phone"}
              type={isRegister || isForgot ? "email" : "text"}
            />
          </label>

          {isRegister && !isForgot ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {strings.phone || "Phone number"}
              </span>
              <input
                value={values.phone}
                onChange={(event) => onFieldChange("phone", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder={strings.phone || "Phone number"}
                type="tel"
              />
            </label>
          ) : null}

          {isForgot ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">OTP code</span>
              <input
                value={values.resetCode}
                onChange={(event) => onFieldChange("resetCode", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder="Enter OTP from email"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">{passwordLabel}</span>
            <div className="relative">
              <input
                value={values.password}
                onChange={(event) => onFieldChange("password", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                placeholder={passwordLabel}
                type={showPassword ? "text" : "password"}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          {isRegister ? (
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">
                {strings.language || "Language"}
              </span>
              <select
                value={values.language}
                onChange={(event) => onFieldChange("language", event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-orange-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                {languageOptions.map((option) => (
                  <option key={option.code} value={option.code} style={{ color: "#0f172a", backgroundColor: "#ffffff" }}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}

        {isForgot && forgotHint ? (
          <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
            OTP sent to {forgotHint}.
            {forgotDevOtp ? ` Demo OTP: ${forgotDevOtp}` : ""}
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {isForgot ? (
            <button
              onClick={onForgotOtpRequest}
              disabled={loading}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-70 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              {loading ? <LoaderCircle size={16} className="animate-spin" /> : <Mail size={16} />}
              Send OTP
            </button>
          ) : null}
          <button
            onClick={onSubmit}
            disabled={loading}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70 dark:bg-white dark:text-slate-900"
          >
            {loading ? <LoaderCircle size={16} className="animate-spin" /> : isRegister ? <UserPlus size={16} /> : <LogIn size={16} />}
            {isRegister ? strings.register || "Register" : isForgot ? "Reset Password" : strings.signIn || "Sign In"}
          </button>
          <button
            onClick={() => onModeChange(isRegister ? "login" : "register")}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            {isRegister ? strings.signIn || "Sign In" : strings.createAccount || "Create account"}
          </button>
        </div>
        {!isForgot ? (
          <button
            onClick={() => onModeChange("forgot")}
            className="mt-3 text-left text-sm font-semibold text-orange-600 transition hover:text-orange-500 dark:text-orange-300"
          >
            Forgot password?
          </button>
        ) : (
          <button
            onClick={() => onModeChange("login")}
            className="mt-3 text-left text-sm font-semibold text-orange-600 transition hover:text-orange-500 dark:text-orange-300"
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}
