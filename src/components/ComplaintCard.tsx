import { Clock3, ExternalLink, Heart, MapPin, UserRound } from "lucide-react";
import { ComplaintRecord } from "../types";

type ComplaintCardProps = {
  complaint: ComplaintRecord;
  onSupport: (id: string) => void;
  supporting: boolean;
  compact?: boolean;
};

function statusTone(status: ComplaintRecord["status"]) {
  if (status === "Resolved") return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300";
  if (status === "Assigned") return "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300";
  if (status === "In Review") return "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300";
  return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ComplaintCard({ complaint, onSupport, supporting, compact = false }: ComplaintCardProps) {
  const mapsUrl =
    typeof complaint.latitude === "number" && typeof complaint.longitude === "number"
      ? `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`
      : "";

  return (
    <article className="glass rounded-[2rem] border border-white/60 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.08)] dark:border-white/10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone(complaint.status)}`}>{complaint.status}</span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
              {complaint.id}
            </span>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-500/10 dark:text-orange-200">
              {complaint.priority}
            </span>
          </div>
          <h3 className="mt-3 text-xl font-bold text-slate-900 dark:text-white">{complaint.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{complaint.aiSummary || complaint.description}</p>
          {complaint.status !== "Resolved" ? (
            <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              Pending public accountability: belongs to {complaint.ward} ward under {complaint.department} municipal responsibility until resolved.
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-2">
              <MapPin size={14} />
              {complaint.location}
            </span>
            <span className="inline-flex items-center gap-2">
              <Clock3 size={14} />
              {formatDate(complaint.reportedAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <UserRound size={14} />
              {complaint.reporterName}
            </span>
          </div>
        </div>

        <div className="flex flex-row gap-2 lg:flex-col lg:items-end">
          <button
            onClick={() => onSupport(complaint.id)}
            disabled={supporting}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:scale-[1.01] disabled:opacity-70 dark:bg-white dark:text-slate-900"
          >
            <Heart size={16} />
            Support {complaint.supportCount}
          </button>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white"
            >
              <ExternalLink size={16} />
              Maps
            </a>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-[1.5rem] bg-slate-50 p-4 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Routing</p>
          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{complaint.department}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{complaint.category} in {complaint.ward}</p>
        </div>

        <div className="rounded-[1.5rem] bg-white p-4 dark:bg-white/5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Updates</p>
          <div className="mt-3 space-y-3">
            {complaint.updates.slice(0, compact ? 1 : 3).map((update) => (
              <div key={update.id} className="rounded-2xl bg-slate-50 px-3 py-2 text-sm text-slate-600 dark:bg-black/20 dark:text-slate-300">
                {update.message}
              </div>
            ))}
          </div>
        </div>
      </div>

      {complaint.imageDataUrl ? (
        <img
          src={complaint.imageDataUrl}
          alt={complaint.title}
          className="mt-5 h-52 w-full rounded-[1.5rem] object-cover"
        />
      ) : null}
    </article>
  );
}
