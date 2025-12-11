

import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MarkerType {
  id: string;
  position: [number, number];
  popup: string;
  type?: "alert" | "resqr";
  radius?: number;
}

export interface GarudaMapProps {
  center: [number, number];
  zoom: number;
  height?: number;
  markers: MarkerType[];
}

const alertIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const resqrIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});


const GarudaMap: React.FC<GarudaMapProps> = ({ center, zoom, height = 300, markers }) => {
  return (
    <MapContainer center={center} zoom={zoom} style={{ height: `${height}px`, width: "100%" }}>
      <TileLayer
        attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {markers.map((m) => (
        <React.Fragment key={m.id}>
          <Marker position={m.position} icon={m.type === "alert" ? alertIcon : resqrIcon}>
            <Popup>{m.popup}</Popup>
          </Marker>

          {/* Optional: Show radius circle for alert */}
          {m.type === "alert" && m.radius && (
            <Circle center={m.position} radius={m.radius} pathOptions={{ color: "red", fillOpacity: 0.1 }} />
          )}
        </React.Fragment>
      ))}
    </MapContainer>
  );
};

export default GarudaMap;
