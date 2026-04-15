import { io, type Socket } from "socket.io-client";
import { AdminOverview, AuthSession, ComplaintRecord, CivicInsight, LanguageCode, OtpChannel, OtpDelivery, ProfileSummary } from "./types";

const apiBaseUrl = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/$/, "");
const socketBaseUrl =
  (((import.meta as any).env?.VITE_SOCKET_URL as string | undefined) ?? apiBaseUrl) ||
  "http://localhost:5000";

let complaintSocket: Socket | null = null;

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Request failed.");
  }

  return data as T;
}

export const api = {
  health: () =>
    request<{
      ok: boolean;
      complaints: number;
      users: number;
      emailOtpConfigured?: boolean;
      phoneOtpConfigured?: boolean;
      otpDevFallback?: boolean;
    }>("/api/health"),
  fetchInsights: () => request<{ insights: CivicInsight[] }>("/api/insights"),
  fetchComplaints: () => request<{ complaints: ComplaintRecord[] }>("/api/complaints"),
  register: (payload: { name: string; email: string; phone: string; password: string; language: LanguageCode }) =>
    request<AuthSession>("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload: { identifier: string; password: string }) =>
    request<AuthSession>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  requestForgotPasswordOtp: (email: string) =>
    request<OtpDelivery>("/api/auth/forgot-password/request", { method: "POST", body: JSON.stringify({ email }) }),
  resetForgotPassword: (payload: { email: string; code: string; newPassword: string }) =>
    request<{ ok: boolean; message: string }>("/api/auth/forgot-password/reset", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  me: (token: string) => request<{ user: AuthSession["user"] }>("/api/auth/me", {}, token),
  updateProfile: (payload: { language?: LanguageCode; name?: string; phone?: string }, token: string) =>
    request<{ user: AuthSession["user"] }>("/api/auth/me", { method: "PATCH", body: JSON.stringify(payload) }, token),
  requestOtp: (channel: OtpChannel, token: string) =>
    request<OtpDelivery>("/api/auth/otp/request", { method: "POST", body: JSON.stringify({ channel }) }, token),
  verifyOtp: (channel: OtpChannel, code: string, token: string) =>
    request<{ user: AuthSession["user"] }>("/api/auth/otp/verify", { method: "POST", body: JSON.stringify({ channel, code }) }, token),
  fetchProfile: (token: string) => request<ProfileSummary>("/api/profile", {}, token),
  createComplaint: (payload: Record<string, unknown>, token: string) =>
    request<{ complaint: ComplaintRecord }>("/api/complaints", { method: "POST", body: JSON.stringify(payload) }, token),
  supportComplaint: (id: string, token: string) =>
    request<{ complaint: ComplaintRecord }>(`/api/complaints/${id}/support`, { method: "POST" }, token),
  fetchAdminOverview: (token: string) => request<AdminOverview>("/api/admin/overview", {}, token),
  updateComplaintStatus: (id: string, status: ComplaintRecord["status"], token: string) =>
    request<{ complaint: ComplaintRecord }>(
      `/api/admin/complaints/${id}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
      token
    ),
};

export function getComplaintSocket() {
  if (!complaintSocket) {
    complaintSocket = io(socketBaseUrl, {
      transports: ["websocket", "polling"],
    });
  }

  return complaintSocket;
}
