import { useMemo, useState } from "react";
import { CheckCheck, Image as ImageIcon, LoaderCircle, MapPin } from "lucide-react";
import { AdminOverview, ComplaintRecord } from "../types";
import { ComplaintMap } from "./ComplaintMap";

type AdminPanelProps = {
  data: AdminOverview | null;
  loading: boolean;
  updatingId: string;
  onStatusChange: (id: string, status: ComplaintRecord["status"]) => void;
};

const statuses: ComplaintRecord["status"][] = ["Submitted", "In Review", "Assigned", "Resolved"];

export function AdminPanel({ data, loading, updatingId, onStatusChange }: AdminPanelProps) {
  const [statusFilter, setStatusFilter] = useState<ComplaintRecord["status"] | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  if (loading) {
    return (
      <div className="glass rounded-[2rem] border border-white/60 p-10 text-center dark:border-white/10">
        <LoaderCircle size={22} className="mx-auto animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="glass rounded-[2rem] border border-white/60 p-8 text-sm text-slate-600 dark:border-white/10 dark:text-slate-300">
        Admin data is not available.
      </div>
    );
  }

  const maxStatus = Math.max(1, ...data.byStatus.map((item) => item.count));
  const maxCategory = Math.max(1, ...data.byCategory.map((item) => item.count));
  const categoryOptions = useMemo(() => ["All", ...data.byCategory.map((item) => item.label)], [data.byCategory]);
  const filteredComplaints = useMemo(
    () =>
      data.complaints.filter(
        (item) =>
          (statusFilter === "All" || item.status === statusFilter) &&
          (categoryFilter === "All" || item.category === categoryFilter)
      ),
    [categoryFilter, data.complaints, statusFilter]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-5">
        <MetricCard label="Total complaints" value={data.totals.complaints} />
        <MetricCard label="Resolved" value={data.totals.resolved} />
        <MetricCard label="Open" value={data.totals.open} />
        <MetricCard label="With photos" value={data.totals.withPhoto} />
        <MetricCard label="Mapped issues" value={data.totals.mapped} />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Status distribution</p>
          <div className="mt-5 space-y-4">
            {data.byStatus.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-3 rounded-full bg-sky-500"
                    style={{ width: `${(item.count / maxStatus) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Category distribution</p>
          <div className="mt-5 space-y-4">
            {data.byCategory.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-600 dark:text-slate-300">
                  <span>{item.label}</span>
                  <span className="font-semibold">{item.count}</span>
                </div>
                <div className="h-3 rounded-full bg-slate-100 dark:bg-white/10">
                  <div
                    className="h-3 rounded-full bg-orange-500"
                    style={{ width: `${(item.count / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Complaint map for admins</p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            View issue coordinates and location clustering before assigning or resolving.
          </p>
        </div>
        <ComplaintMap complaints={data.complaints} />
      </section>

      <section className="space-y-4">
        <div className="glass rounded-[2rem] border border-white/60 p-6 dark:border-white/10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Admin filters</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ComplaintRecord["status"] | "All")}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                <option value="All">All</option>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {!filteredComplaints.length ? (
          <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            No complaints match the selected filters.
          </div>
        ) : null}

        {filteredComplaints.map((complaint) => {
          const mapsUrl =
            typeof complaint.latitude === "number" && typeof complaint.longitude === "number"
              ? `https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`
              : "";
          return (
            <article key={complaint.id} className="glass rounded-[2rem] border border-white/60 p-5 dark:border-white/10">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{complaint.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{complaint.id} | {complaint.reporterName}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {complaint.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{complaint.location}</p>
              {complaint.status !== "Resolved" ? (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
                  Pending public accountability: belongs to {complaint.ward} ward under {complaint.department} municipal responsibility until resolved.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {statuses.map((status) => (
                  <button
                    key={status}
                    onClick={() => onStatusChange(complaint.id, status)}
                    disabled={updatingId === complaint.id || complaint.status === status}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {mapsUrl ? (
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900"
                  >
                    <MapPin size={14} />
                    Open map
                  </a>
                ) : null}
                {complaint.imageDataUrl ? (
                  <a
                    href={complaint.imageDataUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
                  >
                    <ImageIcon size={14} />
                    View photo
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-300">
                    <ImageIcon size={14} />
                    No photo
                  </span>
                )}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass rounded-[2rem] border border-white/60 p-5 dark:border-white/10">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-3 inline-flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
        <CheckCheck size={22} />
        {value}
      </p>
    </div>
  );
}
