import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Radar,
  MapPin,
  Users,
  AlertCircle,
  Clock,
  Activity,
  ScanLine,
  RefreshCw,
  Zap,
  Phone,
  Crosshair
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogOverlay, // added
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

// Map
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// --------- Mock Data ---------
const mockActiveCases = [
  { id: "SOS-001", type: "Mobile App SOS", tourist: "ROHIT", location: "Hyderabad, TS (Geofenced)", time: "Just now", priority: "critical" },
  { id: "SOS-002", type: "Emergency SOS", tourist: "Raj Patel", location: "Manali Hills, HP", time: "2 min ago", priority: "critical" },
  { id: "SOS-003", type: "Medical Emergency", tourist: "Anna Johnson", location: "Trekking Route, UK", time: "5 min ago", priority: "critical" },
  { id: "GEO-004", type: "Restricted Area Entry", tourist: "Mike Brown", location: "Border Zone, J&K", time: "8 min ago", priority: "high" },
  { id: "OFF-005", type: "Device Offline", tourist: "Lisa Chen", location: "Last: Delhi Airport", time: "15 min ago", priority: "medium" },
];

const mockHotspots = [
  { location: "Kashmir Valley", incidents: 12, riskLevel: "critical", activeUnits: 8 },
  { location: "Manali-Leh Highway", incidents: 8, riskLevel: "high", activeUnits: 5 },
  { location: "Goa Beach Areas", incidents: 15, riskLevel: "medium", activeUnits: 12 },
  { location: "Rajasthan Desert", incidents: 6, riskLevel: "medium", activeUnits: 4 },
];

// --------- SOS Seed (from user request) ---------
const SOS_NAME = "ROHIT";
const SOS_PHONE = "+91 9841053223"; // updated number
const SOS_COORDS = { lat: 17.3616, lng: 78.4747 }; // Hyderabad

// Leaflet icon fix (default images are not bundled in many setups)
const sosIcon = new L.DivIcon({
  html: `
    <div class="relative">
      <span class="block w-4 h-4 rounded-full bg-red-600 shadow"></span>
      <span class="absolute -inset-2 rounded-full animate-ping bg-red-500/50"></span>
    </div>
  `,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export const PoliceMonitoring: React.FC = () => {
  const [openSosDialog, setOpenSosDialog] = useState(true); // open on first render (simulate: "once i login")
  const [mapKey, setMapKey] = useState(0); // force rerender after modal toggles (avoids Leaflet layout glitches)

  useEffect(() => {
    // Whenever dialog opens/closes, poke the map to recalc size
    setTimeout(() => setMapKey((k) => k + 1), 150);
  }, [openSosDialog]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical":
        return "bg-critical text-critical-foreground";
      case "high":
        return "bg-danger text-danger-foreground";
      case "medium":
        return "bg-warning text-warning-foreground";
      case "low":
        return "bg-safe text-safe-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "text-critical";
      case "high":
        return "text-danger";
      case "medium":
        return "text-warning";
      case "low":
        return "text-safe";
      default:
        return "text-muted-foreground";
    }
  };

  const mapCenter = useMemo(() => [SOS_COORDS.lat, SOS_COORDS.lng] as [number, number], []);

  return (
    <div className="space-y-6">
      {/* ---- SOS Modal (opens on login) ---- */}
      <Dialog open={openSosDialog} onOpenChange={setOpenSosDialog}>
        {/* keep the dialog above Leaflet controls */}
        <DialogOverlay className="z-[9998]" />
        <DialogContent className="max-w-2xl z-[9999]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-critical" />
              SOS Activated — {SOS_NAME}
            </DialogTitle>
            <DialogDescription>
              Immediate assistance required. Tracking has started and the nearest response units are being notified.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Contact:</span>
                <a href={`tel:${SOS_PHONE.replace(/\s/g, "")}`} className="text-primary underline">
                  {SOS_PHONE}
                </a>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Coordinates:</span>
                <code className="bg-muted/60 rounded px-1 py-0.5 text-xs">
                  lat: {SOS_COORDS.lat}, lng: {SOS_COORDS.lng}
                </code>
              </div>

              <Separator className="my-2" />

              <div className="flex flex-wrap gap-2">
                <Badge className="bg-critical text-critical-foreground">CRITICAL</Badge>
                <Badge variant="outline" className="gap-1">
                  <Crosshair className="h-3 w-3" /> Tracking Enabled
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" /> Units Notified
                </Badge>
              </div>

              <div className="pt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">Tourist</div>
                  {SOS_NAME}
                </div>
                <div>
                  <div className="font-medium text-foreground">Source</div>
                  Mobile App SOS
                </div>
                <div className="col-span-2">
                  <div className="font-medium text-foreground">Nearest Landmark</div>
                  Hyderabad, Telangana
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <Button className="bg-danger hover:bg-danger/90 h-9">Dispatch Unit</Button>
                <Button variant="outline" className="h-9">Call {SOS_NAME}</Button>
              </div>
            </div>

            {/* Mini live map inside modal */}
            <div className="md:col-span-3">
              <div className="rounded-lg overflow-hidden border relative z-0">
                <MapContainer
                  key={mapKey}
                  center={mapCenter}
                  zoom={14}
                  scrollWheelZoom={false}
                  style={{ height: 260, width: "100%" }}
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={mapCenter} icon={sosIcon}>
                    <Popup>
                      <div className="text-sm">
                        <div className="font-medium">{SOS_NAME} — SOS</div>
                        <div>lat: {SOS_COORDS.lat}, lng: {SOS_COORDS.lng}</div>
                        <a className="text-primary underline" href={`tel:${SOS_PHONE.replace(/\s/g, "")}`}>
                          {SOS_PHONE}
                        </a>
                      </div>
                    </Popup>
                  </Marker>
                  {/* Visible tracking radius */}
                  <Circle center={mapCenter} radius={400} pathOptions={{ color: "red" }} />
                </MapContainer>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Emergency Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active SOS Alerts</CardTitle>
            <ScanLine className="h-4 w-4 text-critical animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-critical">7</div>
            <p className="text-xs text-muted-foreground">+3 in last hour</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Police Units Deployed</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">89</div>
            <p className="text-xs text-muted-foreground">Across 12 states</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High-Risk Zones</CardTitle>
            <AlertCircle className="h-4 w-4 text-danger" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-danger">15</div>
            <p className="text-xs text-muted-foreground">Under surveillance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-safe" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-safe">3.4min</div>
            <p className="text-xs text-muted-foreground">-45s faster today</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-time India Map */}
        <Card className="lg:row-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Radar className="h-5 w-5" />
              Garuda Live Surveillance Map
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => setMapKey((k) => k + 1)}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg overflow-hidden border relative z-0">
              <MapContainer
                key={mapKey}
                center={mapCenter}
                zoom={12}
                scrollWheelZoom
                style={{ height: 420, width: "100%" }}
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {/* SOS Marker (ROHIT) */}
                <Marker position={mapCenter} icon={sosIcon}>
                  <Popup>
                    <div className="text-sm">
                      <div className="font-medium">{SOS_NAME} — SOS</div>
                      <div>lat: {SOS_COORDS.lat}, lng: {SOS_COORDS.lng}</div>
                      <a className="text-primary underline" href={`tel:${SOS_PHONE.replace(/\s/g, "")}`}>
                        {SOS_PHONE}
                      </a>
                    </div>
                  </Popup>
                </Marker>
                <Circle center={mapCenter} radius={600} pathOptions={{ color: "red" }} />
              </MapContainer>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-critical rounded-full animate-pulse"></div>
                <span className="text-xs">SOS Alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <span className="text-xs">Police Units</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-danger rounded-full"></div>
                <span className="text-xs">High-Risk Zones</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Emergency Cases */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Active Emergency Cases
            </CardTitle>
            <Badge className="bg-critical text-critical-foreground">
              <Activity className="h-3 w-3 mr-1" />
              LIVE
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockActiveCases.map((case_) => (
                <div
                  key={case_.id}
                  className={`p-3 rounded-lg border-l-4 ${
                    case_.priority === "critical"
                      ? "border-l-critical bg-critical/5"
                      : case_.priority === "high"
                      ? "border-l-danger bg-danger/5"
                      : case_.priority === "medium"
                      ? "border-l-warning bg-warning/5"
                      : "border-l-safe bg-safe/5"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">{case_.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {case_.tourist} - {case_.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(case_.priority)} variant="secondary">
                        {case_.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{case_.time}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      View Details
                    </Button>
                    <Button size="sm" className="h-7 text-xs bg-critical hover:bg-critical/90">
                      Dispatch Unit
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Crime Hotspots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Current Hotspots & Deployments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockHotspots.map((hotspot, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-critical/10 rounded-full flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-critical" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{hotspot.location}</p>
                      <p className="text-xs text-muted-foreground">{hotspot.incidents} incidents today</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium text-sm ${getRiskColor(hotspot.riskLevel)}`}>
                      {hotspot.riskLevel.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">{hotspot.activeUnits} units active</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Action Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Emergency Response Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button className="h-16 bg-critical hover:bg-critical/90 flex-col">
              <ScanLine className="h-6 w-6 mb-2" />
              <span className="text-sm">Mass Alert</span>
            </Button>
            <Button className="h-16 bg-danger hover:bg-danger/90 flex-col">
              <Users className="h-6 w-6 mb-2" />
              <span className="text-sm">Deploy Units</span>
            </Button>
            <Button className="h-16 bg-warning hover:bg-warning/90 flex-col">
              <AlertCircle className="h-6 w-6 mb-2" />
              <span className="text-sm">Zone Alert</span>
            </Button>
            <Button className="h-16 bg-primary hover:bg-primary-hover flex-col">
              <Activity className="h-6 w-6 mb-2" />
              <span className="text-sm">Status Report</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PoliceMonitoring;
