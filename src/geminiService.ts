import { ChatMessage, ComplaintDraft, IssueCategory, LanguageCode, Priority } from "./types";

type DraftInput = {
  category: IssueCategory;
  title?: string;
  description: string;
  location: string;
  ward: string;
  priority: Priority;
  language: LanguageCode;
};

const apiBaseUrl = (((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) ?? "").replace(/\/$/, "");
const generateEndpoint = `${apiBaseUrl}/api/generate`;

function normalizeText(value: string, maxLength = 6000) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanModelOutput(text: string) {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function parseJson<T>(input: string, fallback: T) {
  const cleaned = cleanModelOutput(input);
  const candidates = [
    cleaned,
    cleaned.match(/\{[\s\S]*\}/)?.[0],
    cleaned.match(/\[[\s\S]*\]/)?.[0],
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate) as T;
    } catch {
      continue;
    }
  }

  return fallback;
}

async function generateWithBackend(prompt: string) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(generateEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error("Generation failed.");
    }

    const data = await response.json();
    return String(data?.text || "").trim();
  } finally {
    window.clearTimeout(timeout);
  }
}

function getLanguageLabel(language: LanguageCode) {
  switch (language) {
    case "hi":
      return "Hindi";
    case "hinglish":
      return "Hinglish";
    case "mr":
      return "Marathi";
    case "te":
      return "Telugu";
    case "kn":
      return "Kannada";
    default:
      return "English";
  }
}

function guessDepartment(category: IssueCategory) {
  switch (category) {
    case IssueCategory.SANITATION:
      return "Solid Waste and Sanitation";
    case IssueCategory.ROADS:
      return "Roads and Works Department";
    case IssueCategory.LIGHTING:
      return "Electrical Maintenance";
    case IssueCategory.WATER:
      return "Water Board";
    case IssueCategory.SAFETY:
      return "Ward Office and Public Safety Cell";
    case IssueCategory.ENCROACHMENT:
      return "Enforcement and Encroachment Removal";
    default:
      return "Ward Office";
  }
}

function formatHistory(history: ChatMessage[]) {
  return history.map((message) => `${message.role}: ${message.text}`).join("\n");
}

function buildFallbackDraft(input: DraftInput): ComplaintDraft {
  const cleanDescription = normalizeText(input.description, 280);
  return {
    title: input.title?.trim() || `${input.category} issue near ${input.location || "the reported area"}`,
    summary: `A ${input.priority.toLowerCase()} priority ${input.category.toLowerCase()} issue has been reported near ${input.location || "the area"} with this note: ${cleanDescription}.`,
    recommendedDepartment: guessDepartment(input.category),
    estimatedResponse: input.priority === "High" ? "Escalate within 24 hours" : "Route within 2 to 5 working days",
    nextSteps: [
      "Attach a clear landmark or building name.",
      "Add a photo if the issue is visible on-site.",
      "Track the complaint and ask neighbors to support it.",
    ],
  };
}

export async function createComplaintDraft(input: DraftInput) {
  const fallback = buildFallbackDraft(input);
  const prompt = [
    "You are CivicSolve, a multilingual civic complaint drafting assistant.",
    `Write the response in ${getLanguageLabel(input.language)}.`,
    "Turn the user's note into a concise municipal complaint summary.",
    "Return valid JSON only with keys: title, summary, recommendedDepartment, estimatedResponse, nextSteps.",
    "nextSteps must be an array of exactly 3 short practical steps.",
    `Category: ${input.category}`,
    `Priority: ${input.priority}`,
    `Ward: ${input.ward || "Not specified"}`,
    `Location: ${input.location || "Not specified"}`,
    `Existing title: ${input.title || "None"}`,
    `Citizen description: ${input.description}`,
  ].join("\n");

  try {
    const response = await generateWithBackend(prompt);
    const parsed = parseJson<ComplaintDraft>(response, fallback);

    return {
      ...fallback,
      ...parsed,
      nextSteps:
        Array.isArray(parsed.nextSteps) && parsed.nextSteps.length > 0
          ? parsed.nextSteps.slice(0, 3)
          : fallback.nextSteps,
    };
  } catch {
    return fallback;
  }
}

export async function chatWithCivicAssistant(history: ChatMessage[], message: string, language: LanguageCode) {
  const fallback = [
    "I can help you report civic issues like potholes, garbage, broken lights, water problems, unsafe spots, and encroachment.",
    "Share the location, nearest landmark, urgency, and whether you have a photo.",
    "I can also help you rewrite the complaint in a clearer format.",
  ].join(" ");

  const prompt = [
    "You are CivicSolve, a civic help assistant inside a public city complaint app.",
    `Respond in ${getLanguageLabel(language)}.`,
    "Give practical help for writing complaints, choosing locations, adding details, and getting neighborhood support.",
    "Keep the tone clear, friendly, and action oriented.",
    `Conversation so far:\n${formatHistory(history) || "(none)"}`,
    `Latest user message: ${message}`,
  ].join("\n\n");

  try {
    return await generateWithBackend(prompt);
  } catch {
    return fallback;
  }
}
