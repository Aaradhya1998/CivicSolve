import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import { ComplaintRecord } from "../types";

type ComplaintMapProps = {
  complaints: ComplaintRecord[];
};

const defaultCenter: [number, number] = [18.5793, 73.9781];

function markerColor(status: ComplaintRecord["status"]) {
  if (status === "Resolved") return "#10b981";
  if (status === "Assigned") return "#2563eb";
  if (status === "In Review") return "#f59e0b";
  return "#f97316";
}

export function ComplaintMap({ complaints }: ComplaintMapProps) {
  const mapped = complaints.filter(
    (complaint): complaint is ComplaintRecord & { latitude: number; longitude: number } =>
      typeof complaint.latitude === "number" && typeof complaint.longitude === "number"
  );

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[1.75rem] border border-white/60 shadow-[0_24px_80px_rgba(15,23,42,0.12)] dark:border-white/10">
        <MapContainer center={defaultCenter} zoom={14} scrollWheelZoom className="h-[420px] w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <CircleMarker
            center={defaultCenter}
            pathOptions={{ color: "#f97316", fillColor: "#f97316", fillOpacity: 0.88 }}
            radius={10}
          >
            <Popup>
              <div className="space-y-1 text-sm text-slate-800">
                <p className="font-semibold">JSPM University</p>
                <p>Wagholi, Pune</p>
              </div>
            </Popup>
          </CircleMarker>
          {mapped.map((complaint) => (
            <CircleMarker
              key={complaint.id}
              center={[complaint.latitude, complaint.longitude]}
              pathOptions={{ color: markerColor(complaint.status), fillColor: markerColor(complaint.status), fillOpacity: 0.88 }}
              radius={10}
            >
              <Popup>
                <div className="space-y-2 text-sm text-slate-800">
                  <div>
                    <p className="font-semibold">{complaint.title}</p>
                    <p className="text-xs text-slate-500">{complaint.category}</p>
                  </div>
                  <p>{complaint.location}</p>
                  <p>Status: {complaint.status}</p>
                  <p>Support: {complaint.supportCount}</p>
                  <a
                    href={`https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      {!mapped.length ? (
        <div className="rounded-[1.2rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
          Showing JSPM University, Wagholi, Pune as the local map center. Add geolocation to complaints to place live markers.
        </div>
      ) : null}
    </div>
  );
}
