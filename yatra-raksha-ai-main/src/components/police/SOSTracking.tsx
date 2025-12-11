'use client';

import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Trash2,
  Plus,
  Navigation,
  Activity,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";
import GarudaMap, { MarkerType } from "./GarudaMap";

/* =========================
   SOSTracking Page (Standalone)
   - Tourism-themed Risk Places manager page
   - Add / Manage Risk Places (manual or via map click if GarudaMap supports it)
   - Map shows risk markers
   - Left and right panes scroll independently
   - LocalStorage persistence
   - No SOS / translation features
   ========================= */

/* -------------------- Types -------------------- */
type RiskPlace = {
  id: string;
  name: string;
  type: string;
  lat: number;
  lon: number;
  addedBy: string;
  addedAt: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  notes?: string;
  mitigated?: boolean;
};

/* -------------------- Storage Key -------------------- */
const RISK_PLACES_KEY = "yatra_raksha_risk_places_v1";

/* -------------------- Helper: Haversine (optional) -------------------- */
const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* -------------------- Component -------------------- */
export const SOSTracking: React.FC = () => {
  /* Left pane state (search/filter for risk places) */
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<"all" | RiskPlace["severity"]>("all");

  /* Risk places */
  const [riskPlaces, setRiskPlaces] = useState<RiskPlace[]>([]);

  /* Add form */
  const [rpName, setRpName] = useState("");
  const [rpType, setRpType] = useState("Landslide Zone");
  const [rpLat, setRpLat] = useState("");
  const [rpLon, setRpLon] = useState("");
  const [rpSeverity, setRpSeverity] = useState<RiskPlace["severity"]>("high");
  const [rpAddedBy, setRpAddedBy] = useState("Ranger-01");
  const [rpNotes, setRpNotes] = useState("");

  /* UI / Map settings */
  const [useMapClick, setUseMapClick] = useState(false); // toggle to capture map click coordinates (requires GarudaMap support)
  const [mapCenter, setMapCenter] = useState<[number, number]>([26.8467, 80.9462]); // default center (example)
  const [mapZoom, setMapZoom] = useState(6);

  /* Load persisted risk places */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RISK_PLACES_KEY);
      if (raw) setRiskPlaces(JSON.parse(raw));
    } catch (err) {
      console.error("Failed to load risk places:", err);
      setRiskPlaces([]);
    }
  }, []);

  /* Save on change */
  useEffect(() => {
    try {
      localStorage.setItem(RISK_PLACES_KEY, JSON.stringify(riskPlaces));
    } catch (err) {
      console.error("Failed to save risk places:", err);
    }
  }, [riskPlaces]);

  /* Add Risk Place (manual) */
  const handleAddRiskPlace = () => {
    const lat = Number(rpLat);
    const lon = Number(rpLon);
    if (!rpName.trim() || !rpType.trim() || Number.isNaN(lat) || Number.isNaN(lon)) {
      alert("Please enter valid name, type and numeric latitude/longitude.");
      return;
    }
    const rp: RiskPlace = {
      id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name: rpName.trim(),
      type: rpType.trim(),
      lat,
      lon,
      addedBy: rpAddedBy || "Unknown",
      addedAt: new Date().toISOString(),
      severity: rpSeverity,
      notes: rpNotes.trim() || undefined,
      mitigated: false,
    };
    setRiskPlaces((p) => [rp, ...p]);
    // clear form
    setRpName("");
    setRpType("Landslide Zone");
    setRpLat("");
    setRpLon("");
    setRpNotes("");
    setRpSeverity("high");
  };

  /* Add risk place from a coordinate programmatically */
  const addRiskPlaceFromCoords = (lat: number, lon: number, name?: string) => {
    const rp: RiskPlace = {
      id: (typeof crypto !== "undefined" && "randomUUID" in crypto) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      name: name || `Risk Place ${new Date().toLocaleString()}`,
      type: "Reported Hazard",
      lat,
      lon,
      addedBy: "Authority",
      addedAt: new Date().toISOString(),
      severity: "critical",
      notes: "Added from map",
      mitigated: false,
    };
    setRiskPlaces((p) => [rp, ...p]);
  };

  /* Remove / toggle mitigated */
  const handleRemove = (id: string) => {
    if (!confirm("Remove this risk place?")) return;
    setRiskPlaces((p) => p.filter((r) => r.id !== id));
  };

  const toggleMitigated = (id: string) => {
    setRiskPlaces((p) => p.map((r) => (r.id === id ? { ...r, mitigated: !r.mitigated } : r)));
  };

  /* Filtered list for left pane */
  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return riskPlaces.filter((r) => {
      if (filterSeverity !== "all" && r.severity !== filterSeverity) return false;
      if (!t) return true;
      return (
        r.name.toLowerCase().includes(t) ||
        r.type.toLowerCase().includes(t) ||
        (r.notes || "").toLowerCase().includes(t) ||
        r.addedBy.toLowerCase().includes(t)
      );
    });
  }, [riskPlaces, searchTerm, filterSeverity]);

  /* Marker list for GarudaMap */
  const markers: MarkerType[] = riskPlaces.map((r) => ({
    id: `risk-${r.id}`,
    position: [r.lat, r.lon],
    popup: `${r.name} — ${r.type} (${r.severity})`,
    type: "risk",
  }));

  /* Map click handler glue — if GarudaMap supports onMapClick, wire it:
     <GarudaMap onMapClick={(lat, lon) => { if (useMapClick) { setRpLat(String(lat)); setRpLon(String(lon)); } }} />
     We provide the function below; uncomment usage in the GarudaMap props if your map component exposes it.
  */
  const onMapClickCapture = (lat: number, lon: number) => {
    if (useMapClick) {
      setRpLat(String(Number(lat).toFixed(6)));
      setRpLon(String(Number(lon).toFixed(6)));
    }
  };

  /* center map to a risk place */
  const centerToRisk = (r: RiskPlace) => {
    setMapCenter([r.lat, r.lon]);
    setMapZoom(13);
  };

  /* -------------------- JSX -------------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .app-header { background: linear-gradient(90deg, rgba(255,255,255,0.96), rgba(246,249,255,0.96)); }
        .card-surface { box-shadow: 0 8px 28px rgba(2,6,23,0.04); border-radius: 12px; }
        .tourism-accent { color: #0ea5a4; }
        .muted { color: #6b7280; }
        .left-pane { height: calc(100vh - 120px); overflow-y: auto; }
        .right-pane { height: calc(100vh - 120px); overflow-y: auto; }
      `}</style>

      <header className="w-full app-header shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold text-slate-800 tourism-accent">Yatra Raksha</span>
              <span className="text-xs muted">Tourism Safety — Risk Places Manager</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button size="sm" variant="ghost">Overview</Button>
            <Button size="sm" variant="ghost">Risk Map</Button>
            <Button size="sm" variant="outline" onClick={() => { if (confirm("Clear all risk places?")) setRiskPlaces([]); }}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* LEFT: Risk Places list + filters (independent scroll) */}
          <aside className="col-span-1 left-pane">
            <div className="space-y-4 rounded-lg card-surface p-4 bg-white no-scrollbar">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tourism-accent">Risk Places</h2>
                <div className="text-sm muted">{riskPlaces.length} places</div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name, type, notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant={filterSeverity === "all" ? "default" : "outline"} onClick={() => setFilterSeverity("all")}>All</Button>
                  <Button size="sm" variant={filterSeverity === "critical" ? "default" : "outline"} onClick={() => setFilterSeverity("critical")}>Critical</Button>
                  <Button size="sm" variant={filterSeverity === "high" ? "default" : "outline"} onClick={() => setFilterSeverity("high")}>High</Button>
                  <Button size="sm" variant={filterSeverity === "medium" ? "default" : "outline"} onClick={() => setFilterSeverity("medium")}>Medium</Button>
                  <Button size="sm" variant={filterSeverity === "low" ? "default" : "outline"} onClick={() => setFilterSeverity("low")}>Low</Button>
                </div>

                <div className="space-y-2">
                  {filtered.length === 0 && <div className="text-sm muted">No risk places found.</div>}
                  {filtered.map((r) => (
                    <Card key={r.id} className="border shadow-sm">
                      <CardHeader>
                        <CardTitle className="text-sm">{r.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1">
                        <p className="text-slate-600">{r.type} • <span className="font-medium">{r.severity}</span></p>
                        <p className="text-slate-400">Lat: {r.lat.toFixed(5)}, Lon: {r.lon.toFixed(5)}</p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => centerToRisk(r)}>View on Map</Button>
                          <Button size="sm" variant="outline" onClick={() => toggleMitigated(r.id)}>{r.mitigated ? "Unmark" : "Mark Mitigated"}</Button>
                          <Button size="sm" variant="ghost" onClick={() => handleRemove(r.id)}>Remove</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT: Map + Add Form + Table (independent scroll) */}
          <section className="md:col-span-2 right-pane">
            <div className="rounded-lg card-surface bg-white p-4 space-y-4">
              {/* top controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm muted">Risk Map</div>
                  <Badge className="bg-emerald-100">Tourism Mode</Badge>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm muted">Map input</label>
                  <Button size="sm" variant={useMapClick ? "default" : "outline"} onClick={() => setUseMapClick((s) => !s)}>
                    {useMapClick ? "Map click enabled" : "Manual coords"}
                  </Button>
                </div>
              </div>

              {/* Map area */}
              <div className="rounded-lg border overflow-hidden">
                <div style={{ height: 420, position: "relative" }}>
                  <GarudaMap
                    center={mapCenter}
                    zoom={mapZoom}
                    height={420}
                    markers={markers}
                    // If GarudaMap supports onMapClick, you can wire it to capture coordinates:
                    // onMapClick={(lat:number, lon:number) => onMapClickCapture(lat, lon)}
                  />
                </div>

                <div className="p-3 bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-400 rounded-full" />
                      <span className="text-xs">Risk Places</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      <span className="text-xs">Units</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-safe rounded-full" />
                      <span className="text-xs">Safe Zones</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    Tip: enable "Map click" and click on the map to auto-fill coordinates (if GarudaMap supports onMapClick).
                  </div>
                </div>
              </div>

              {/* Add risk place form */}
              <Card>
                <CardHeader>
                  <CardTitle>Add New Risk Place</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <Input placeholder="Place name" value={rpName} onChange={(e) => setRpName(e.target.value)} />
                    <Input placeholder="Type (e.g. Landslide Zone)" value={rpType} onChange={(e) => setRpType(e.target.value)} />
                    <select value={rpSeverity} onChange={(e) => setRpSeverity(e.target.value as any)} className="px-2 py-2 border rounded">
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <Input placeholder="Latitude" value={rpLat} onChange={(e) => setRpLat(e.target.value)} />
                    <Input placeholder="Longitude" value={rpLon} onChange={(e) => setRpLon(e.target.value)} />
                    <Input placeholder="Added by (ranger id)" value={rpAddedBy} onChange={(e) => setRpAddedBy(e.target.value)} />
                  </div>

                  <div className="flex gap-2 items-center">
                    <Input placeholder="Notes (optional)" value={rpNotes} onChange={(e) => setRpNotes(e.target.value)} />
                    <Button onClick={handleAddRiskPlace} size="sm"><Plus className="mr-2 h-4 w-4" /> Add</Button>
                    <Button variant="outline" size="sm" onClick={() => { setRpLat(""); setRpLon(""); setRpName(""); setRpNotes(""); }}>Clear</Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (!navigator.geolocation) { alert("Geolocation not available"); return; }
                      navigator.geolocation.getCurrentPosition((pos) => {
                        const lat = pos.coords.latitude;
                        const lon = pos.coords.longitude;
                        setMapCenter([lat, lon]);
                        setMapZoom(13);
                        setRpLat(String(Number(lat).toFixed(6)));
                        setRpLon(String(Number(lon).toFixed(6)));
                      }, (err) => {
                        alert("Unable to get location: " + err.message);
                      });
                    }}>Use my location</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Risk places table */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Places Table</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Place</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Coords</TableHead>
                          <TableHead>Severity</TableHead>
                          <TableHead>Added By</TableHead>
                          <TableHead>Added At</TableHead>
                          <TableHead>Mitigated</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {riskPlaces.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={8} className="text-xs text-muted-foreground py-6 text-center">
                              No risk places yet. Add one above.
                            </TableCell>
                          </TableRow>
                        )}
                        {riskPlaces.map((rp) => (
                          <TableRow key={rp.id} className={rp.mitigated ? "opacity-60" : ""}>
                            <TableCell className="font-medium">{rp.name}</TableCell>
                            <TableCell>{rp.type}</TableCell>
                            <TableCell>{rp.lat.toFixed(5)}, {rp.lon.toFixed(5)}</TableCell>
                            <TableCell>{rp.severity}</TableCell>
                            <TableCell>{rp.addedBy}</TableCell>
                            <TableCell className="text-xs">{new Date(rp.addedAt).toLocaleString()}</TableCell>
                            <TableCell>{rp.mitigated ? "Yes" : "No"}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => centerToRisk(rp)}><MapPin className="h-4 w-4" /></Button>
                                <Button variant="outline" size="sm" onClick={() => toggleMitigated(rp.id)}><CheckCircle className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => handleRemove(rp.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default SOSTracking;
