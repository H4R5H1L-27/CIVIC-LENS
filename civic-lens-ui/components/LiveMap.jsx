"use client";
import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet missing-icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Heatmap layer component
function HeatmapLayer({ reports }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Dynamic import for leaflet.heat (client-side only)
    import("leaflet.heat").then(() => {
      // Remove old layer if exists
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }

      const heatData = reports
        .filter(r => r.lat && r.lng && r.lat !== 0)
        .map(r => {
          const severity = r.assessment?.severity || "Low";
          const intensity = severity === "Critical" ? 1.0 :
            severity === "High" ? 0.7 :
              severity === "Medium" ? 0.4 : 0.2;
          return [r.lat, r.lng, intensity];
        });

      if (heatData.length > 0) {
        heatLayerRef.current = L.heatLayer(heatData, {
          radius: 35,
          blur: 25,
          maxZoom: 13,
          max: 1.0,
          gradient: {
            0.2: '#2563eb',  // blue (low)
            0.4: '#eab308',  // yellow (medium)
            0.6: '#f97316',  // orange (high)
            0.8: '#ef4444',  // red (critical)
            1.0: '#dc2626',  // deep red
          }
        }).addTo(map);
      }
    }).catch(err => {
      console.warn("Heatmap plugin not available:", err);
    });

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(heatLayerRef.current);
      }
    };
  }, [reports, map]);

  return null;
}

// Auto-fit bounds component (runs once)
function FitBounds({ reports }) {
  const map = useMap();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    const validReports = reports.filter(r => r.lat && r.lng && r.lat !== 0);
    if (validReports.length > 0) {
      hasInitialized.current = true;
      // Defer to avoid _leaflet_pos race with zoom animations
      setTimeout(() => {
        try {
          const bounds = L.latLngBounds(validReports.map(r => [r.lat, r.lng]));
          map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12, animate: false });
        } catch (e) {
          console.warn("FitBounds deferred:", e);
        }
      }, 300);
    }
  }, [reports, map]);

  return null;
}

export default function LiveMap({ reports }) {
  const defaultCenter = [20.5937, 78.9629]; // Center of India

  const createPulseIcon = (severity, crowdVerified) => {
    let baseColor = "bg-yellow-500";
    let pingColor = "bg-yellow-400";
    let ring = "";

    if (severity === "Critical") {
      baseColor = "bg-red-600";
      pingColor = "bg-red-500";
    } else if (severity === "High") {
      baseColor = "bg-orange-500";
      pingColor = "bg-orange-400";
    }

    // Add green ring for crowd-verified
    if (crowdVerified) {
      ring = `<span class="absolute inline-flex h-10 w-10 rounded-full border-2 border-green-400 opacity-60"></span>`;
    }

    return L.divIcon({
      className: "bg-transparent border-none",
      html: `
        <div class="relative flex h-8 w-8 items-center justify-center">
          ${ring}
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${pingColor} opacity-75"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 ${baseColor} border-2 border-black"></span>
        </div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  return (
    <div className="h-[400px] w-full border-4 border-gray-700 bg-black z-0 relative">
      <MapContainer
        center={defaultCenter}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", zIndex: 10, backgroundColor: "#0a0a0a" }}
      >
        {/* Dark Map Tiles - CartoDB Dark Matter */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* Heatmap Layer */}
        <HeatmapLayer reports={reports} />

        {/* Auto-fit bounds */}
        <FitBounds reports={reports} />

        {/* Markers */}
        {reports.map((report) => {
          if (!report.lat || !report.lng || report.lat === 0) return null;

          return (
            <Marker
              key={report.id}
              position={[report.lat, report.lng]}
              icon={createPulseIcon(report.assessment?.severity || "Warning", report.crowd_verified)}
            >
              <Popup className="custom-popup">
                <div className="font-mono bg-black text-white p-2 w-64 border-2 border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest ${report.assessment?.severity === 'Critical' ? 'bg-red-600 text-white animate-pulse' :
                      report.assessment?.severity === 'High' ? 'bg-orange-500 text-black' : 'bg-yellow-500 text-black'
                      }`}>
                      {report.assessment?.severity || 'UNKNOWN'}
                    </span>
                    <div className="flex items-center gap-1">
                      {report.crowd_verified && (
                        <span className="bg-green-600 text-white text-[8px] px-1.5 py-0.5 font-black uppercase">✓ CROWD</span>
                      )}
                      <span className="text-[10px] text-gray-500">{String(report.id).substring(0, 10)}</span>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed text-gray-300 border-l-2 border-gray-600 pl-2">
                    {report.assessment?.summary || "No summary available."}
                  </p>
                  <div className="mt-2 flex justify-between items-center">
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 ${report.status === "RESOLVED" ? "bg-green-800 text-green-300" :
                      report.status === "DISPATCHED" ? "bg-blue-800 text-blue-300" :
                        report.status === "VERIFIED" ? "bg-yellow-800 text-yellow-300" :
                          "bg-gray-800 text-gray-400"
                      }`}>{report.status || "NEW"}</span>
                    {report.crowd_count > 1 && (
                      <span className="text-[9px] text-gray-500">{report.crowd_count} reports nearby</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
