import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons (Leaflet+bundlers issue)
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconRetinaUrl from "leaflet/dist/images/marker-icon-2x.png";
import shadowUrl from "leaflet/dist/images/marker-shadow.png";

// @ts-expect-error – override private internal
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  color?: string; // hex
  popupHtml?: string;
};

export function LiveMap({
  markers,
  height = 480,
  center,
  zoom = 12,
}: {
  markers: MapMarker[];
  height?: number;
  center?: [number, number];
  zoom?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  const fallbackCenter = useMemo<[number, number]>(() => {
    if (center) return center;
    if (markers.length) return [markers[0].lat, markers[0].lng];
    return [28.6139, 77.209]; // Delhi default
  }, [center, markers]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(fallbackCenter, zoom);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = layerRef.current;
    const map = mapRef.current;
    if (!layer || !map) return;
    layer.clearLayers();

    const bounds: [number, number][] = [];
    markers.forEach((m) => {
      const color = m.color ?? "#2563eb";
      const icon = L.divIcon({
        className: "live-pin",
        html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 0 0 2px ${color}66, 0 2px 8px rgba(0,0,0,.3);"></div>`,
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      const marker = L.marker([m.lat, m.lng], { icon, title: m.label });
      if (m.popupHtml || m.label) marker.bindPopup(m.popupHtml ?? `<strong>${m.label}</strong>`);
      marker.addTo(layer);
      bounds.push([m.lat, m.lng]);
    });

    if (bounds.length > 1) {
      map.fitBounds(L.latLngBounds(bounds), { padding: [40, 40], maxZoom: 15 });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], Math.max(map.getZoom(), 14));
    }
  }, [markers]);

  return <div ref={containerRef} style={{ height, width: "100%" }} className="rounded-2xl overflow-hidden border" />;
}
