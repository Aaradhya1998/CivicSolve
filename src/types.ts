export enum Tab {
  HOME = "home",
  REPORT = "report",
  MAP = "map",
  TRACK = "track",
  COMMUNITY = "community",
  ASSISTANT = "assistant",
  ADMIN = "admin",
  PROFILE = "profile",
}

export enum IssueCategory {
  SANITATION = "Sanitation",
  ROADS = "Roads",
  LIGHTING = "Street Lighting",
  WATER = "Water Supply",
  SAFETY = "Public Safety",
  ENCROACHMENT = "Encroachment",
}

export type Priority = "Low" | "Medium" | "High";

export type ComplaintStatus = "Submitted" | "In Review" | "Assigned" | "Resolved";

export type LanguageCode =
  | "en"
  | "hi"
  | "hinglish"
  | "mr"
  | "te"
  | "kn";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  language: LanguageCode;
  createdAt: string;
  lastLoginAt?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  isAdmin?: boolean;
};

export type AuthSession = {
  token: string;
  user: AuthUser;
  requiresEmailVerification?: boolean;
  message?: string;
};

export type OtpChannel = "email" | "phone";

export type OtpDelivery = {
  ok: boolean;
  channel: OtpChannel;
  expiresAt: string;
  deliveryHint: string;
  demoMode: boolean;
  devOtp?: string;
};

export type ComplaintDraft = {
  title: string;
  summary: string;
  recommendedDepartment: string;
  estimatedResponse: string;
  nextSteps: string[];
};

export type ComplaintUpdate = {
  id: string;
  message: string;
  createdAt: string;
};

export type ComplaintRecord = {
  id: string;
  title: string;
  description: string;
  category: IssueCategory;
  location: string;
  ward: string;
  priority: Priority;
  status: ComplaintStatus;
  reportedAt: string;
  updatedAt: string;
  updates: ComplaintUpdate[];
  supportCount: number;
  department: string;
  aiSummary?: string;
  imageDataUrl?: string;
  imageName?: string;
  reporterId: string;
  reporterName: string;
  language: LanguageCode;
  latitude?: number;
  longitude?: number;
};

export type CivicInsight = {
  title: string;
  value: string;
  description: string;
};

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};

export type CommunityAction = {
  id: string;
  title: string;
  description: string;
  location: string;
  schedule: string;
  volunteers: number;
  impact: string;
};

export type ReportForm = {
  category: IssueCategory;
  title: string;
  description: string;
  location: string;
  ward: string;
  priority: Priority;
  file: File | null;
  latitude?: number;
  longitude?: number;
};

export type ContributionPoint = {
  label: string;
  reports: number;
  supports: number;
};

export type ProfileStats = {
  complaintsFiled: number;
  resolvedComplaints: number;
  supportsGiven: number;
  supportReceived: number;
};

export type ProfileSummary = {
  user: AuthUser;
  complaints: ComplaintRecord[];
  stats: ProfileStats;
  contributions: ContributionPoint[];
};

export type AdminOverview = {
  totals: {
    complaints: number;
    resolved: number;
    open: number;
    withPhoto: number;
    mapped: number;
  };
  byStatus: Array<{ label: ComplaintStatus; count: number }>;
  byCategory: Array<{ label: string; count: number }>;
  complaints: ComplaintRecord[];
};
