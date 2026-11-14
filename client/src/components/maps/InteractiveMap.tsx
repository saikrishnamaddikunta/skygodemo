import React, { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMapEvents
} from "react-leaflet";
import { GeoPoint, RouteAlternative } from "@omnitransit/shared";

const MAP_TILE_STYLES: Record<string, { label: string; url: string; attribution: string }> = {
  street: {
    label: "Street HD",
    url:
      import.meta.env.VITE_MAP_TILE_URL ||
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
  },
  osm: {
    label: "OSM Standard",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  dark: {
    label: "Night Grid",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; CARTO'
  }
};

interface InteractiveMapProps {
  center?: GeoPoint;
  zoom?: number;
  origin?: GeoPoint;
  destination?: GeoPoint;
  selectedRoute?: RouteAlternative | null;
  alternatives?: RouteAlternative[];
  stops?: Array<{
    id: string;
    name: string;
    stop_type?: string;
    location: GeoPoint;
    lighting_score?: number;
  }>;
  fleetVehicles?: Array<{
    id: string;
    vehicle_number: string;
    route_name: string;
    transport_mode: string;
    current_location: GeoPoint;
    occupancy: number;
    capacity: number;
  }>;
  floodZones?: Array<{
    id: string;
    zone_name: string;
    risk_level: string;
    boundary: GeoPoint[];
  }>;
  safetyHubs?: Array<{
    id: string;
    name: string;
    location: GeoPoint;
    lightingScore: number;
  }>;
  onMapClick?: (point: GeoPoint) => void;
  heightClass?: string;
}

const MapClickHandler: React.FC<{ onMapClick?: (pt: GeoPoint) => void }> = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick({ latitude: e.latlng.lat, longitude: e.latlng.lng });
      }
    }
  });
  return null;
};

const modeColors: Record<string, string> = {
  metro: "#a855f7",
  bus: "#3b82f6",
  ebike: "#10b981",
  walking: "#f59e0b",
  cycling: "#14b8a6",
  train: "#ec4899"
};

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  center = { latitude: 12.961, longitude: 77.615 },
  zoom = 12,
  origin,
  destination,
  selectedRoute,
  alternatives = [],
  stops = [],
  fleetVehicles = [],
  floodZones = [],
  safetyHubs = [],
  onMapClick,
  heightClass = "h-[420px]"
}) => {
  const [tileStyle, setTileStyle] = useState<"street" | "osm" | "dark">("street");
  const [osrmRoadLine, setOsrmRoadLine] = useState<[number, number][]>([]);

  useEffect(() => {
    if (!origin || !destination) {
      setOsrmRoadLine([]);
      return;
    }
    const osrmBase =
      import.meta.env.VITE_OSRM_API_URL || "https://router.project-osrm.org/route/v1";
    const url = `${osrmBase}/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const coords = data?.routes?.[0]?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length > 1) {
          setOsrmRoadLine(coords.map((c: [number, number]) => [c[1], c[0]]));
        } else {
          setOsrmRoadLine([
            [origin.latitude, origin.longitude],
            [destination.latitude, destination.longitude]
          ]);
        }
      })
      .catch(() => {
        setOsrmRoadLine([
          [origin.latitude, origin.longitude],
          [destination.latitude, destination.longitude]
        ]);
      });
  }, [origin?.latitude, origin?.longitude, destination?.latitude, destination?.longitude]);

  const currentTile = MAP_TILE_STYLES[tileStyle] || MAP_TILE_STYLES.street;

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-800`}>
      {/* Map Layer Switcher */}
      <div className="absolute top-3 right-3 z-[400] bg-slate-950/90 border border-slate-800 rounded-xl p-1 flex items-center gap-1 text-[11px] backdrop-blur-md">
        {(["street", "osm", "dark"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTileStyle(key)}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
              tileStyle === key
                ? "bg-emerald-600 text-white"
                : "text-slate-300 hover:bg-slate-800"
            }`}
          >
            {MAP_TILE_STYLES[key].label}
          </button>
        ))}
      </div>

      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          key={tileStyle}
          attribution={currentTile.attribution}
          url={currentTile.url}
        />

        <MapClickHandler onMapClick={onMapClick} />

        {/* Live OSRM Road Geometry Preview when no multi-segment route is selected yet */}
        {!selectedRoute && osrmRoadLine.length > 1 && (
          <Polyline
            positions={osrmRoadLine}
            pathOptions={{
              color: "#10b981",
              weight: 5,
              opacity: 0.85
            }}
          />
        )}

        {/* Flood Zones Overlay */}
        {floodZones.map((fz) => (
          <Polygon
            key={fz.id}
            positions={fz.boundary.map((b) => [b.latitude, b.longitude])}
            pathOptions={{
              color: fz.risk_level === "CRITICAL" || fz.risk_level === "HIGH" ? "#ef4444" : "#f59e0b",
              fillColor: fz.risk_level === "CRITICAL" || fz.risk_level === "HIGH" ? "#ef4444" : "#f59e0b",
              fillOpacity: 0.25,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-xs text-slate-900">
                <strong>Flood Zone: {fz.zone_name}</strong>
                <div>Risk Level: {fz.risk_level}</div>
              </div>
            </Popup>
          </Polygon>
        ))}

        {/* Background Alternative Route Polylines */}
        {alternatives
          .filter((alt) => !selectedRoute || alt.id !== selectedRoute.id)
          .map((alt) =>
            alt.segments.map((seg) => (
              <Polyline
                key={seg.id}
                positions={seg.geometry.map((g) => [g.latitude, g.longitude])}
                pathOptions={{
                  color: "#64748b",
                  weight: 3,
                  opacity: 0.4,
                  dashArray: "6 6"
                }}
              />
            ))
          )}

        {/* Selected Route Polyline Segments */}
        {selectedRoute &&
          selectedRoute.segments.map((seg) => (
            <Polyline
              key={seg.id}
              positions={seg.geometry.map((g) => [g.latitude, g.longitude])}
              pathOptions={{
                color: modeColors[seg.transportMode] || "#10b981",
                weight: 6,
                opacity: 0.95
              }}
            >
              <Popup>
                <div className="text-xs text-slate-900">
                  <strong>{seg.routeLineName || seg.transportMode.toUpperCase()}</strong>
                  <div>
                    {seg.fromStopName} → {seg.toStopName}
                  </div>
                  <div>
                    {seg.durationMinutes} mins • ₹{seg.costInr} • Safety: {seg.safetyScore}/100
                  </div>
                </div>
              </Popup>
            </Polyline>
          ))}

        {/* Transit Stops */}
        {stops.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.location.latitude, s.location.longitude]}
            radius={6}
            pathOptions={{
              color: "#38bdf8",
              fillColor: "#0284c7",
              fillOpacity: 0.9
            }}
          >
            <Popup>
              <div className="text-xs text-slate-900">
                <strong>{s.name}</strong>
                <div>Type: {s.stop_type}</div>
                {s.lighting_score && <div>Lighting Score: {s.lighting_score}/100</div>}
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Safety Heatmap Circles */}
        {safetyHubs.map((hub) => (
          <CircleMarker
            key={`safe-${hub.id}`}
            center={[hub.location.latitude, hub.location.longitude]}
            radius={18}
            pathOptions={{
              color: hub.lightingScore >= 85 ? "#10b981" : "#f59e0b",
              fillColor: hub.lightingScore >= 85 ? "#10b981" : "#f59e0b",
              fillOpacity: 0.22,
              weight: 1
            }}
          >
            <Popup>
              <div className="text-xs text-slate-900">
                <strong>{hub.name}</strong>
                <div>Lighting Score: {hub.lightingScore}/100</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Active Fleet Vehicles */}
        {fleetVehicles.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.current_location.latitude, v.current_location.longitude]}
            radius={8}
            pathOptions={{
              color: "#ffffff",
              fillColor: v.transport_mode === "metro" ? "#a855f7" : "#3b82f6",
              fillOpacity: 1,
              weight: 2
            }}
          >
            <Popup>
              <div className="text-xs text-slate-900">
                <strong>{v.vehicle_number}</strong>
                <div>{v.route_name}</div>
                <div>
                  Occupancy: {v.occupancy}/{v.capacity}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {/* Origin Marker */}
        {origin && (
          <CircleMarker
            center={[origin.latitude, origin.longitude]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#10b981",
              fillOpacity: 1,
              weight: 3
            }}
          >
            <Popup>
              <div className="text-xs text-slate-900 font-semibold">Origin Location</div>
            </Popup>
          </CircleMarker>
        )}

        {/* Destination Marker */}
        {destination && (
          <CircleMarker
            center={[destination.latitude, destination.longitude]}
            radius={9}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#f43f5e",
              fillOpacity: 1,
              weight: 3
            }}
          >
            <Popup>
              <div className="text-xs text-slate-900 font-semibold">Destination Location</div>
            </Popup>
          </CircleMarker>
        )}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 border border-slate-800 rounded-xl px-3 py-2 text-[11px] text-slate-300 flex flex-wrap items-center gap-3 backdrop-blur-md">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Origin / E-Bike
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" /> Metro
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Bus
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Walk
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Destination / Flood Risk
        </span>
      </div>
    </div>
  );
};
