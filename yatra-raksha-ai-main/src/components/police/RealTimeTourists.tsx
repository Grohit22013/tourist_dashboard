// src/components/police/RealTimeTourists.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Search,
  Phone,
  Navigation,
  Activity,
} from "lucide-react";
import GarudaMap from "./GarudaMap";

/* -------------------- Types -------------------- */
type Tourist = {
  id: string;
  name: string;
  phone?: string;
  lat: number;
  lon: number;
  lastSeen: string; // ISO
  status: "safe" | "needs-help" | "unknown";
  notes?: string;
  sos?: boolean;
  sentMessages?: Array<{ id: string; text?: string; audioPresent?: boolean; timestamp: string }>;
};

/* -------------------- Storage Key & Defaults -------------------- */
const TOURISTS_KEY = "yatra_realtime_tourists_v1";

/*
  Seeded location: Manipal University Jaipur (demo)
  coords chosen to be inside the danger zone example below
  lat: 26.8409, lon: 75.5666
*/
const DEFAULT_TOURISTS: Tourist[] = [
  {
    id: "t-manipal-1",
    name: "Student — Manipal Univ. Jaipur",
    phone: "+91-90000-12345",
    lat: 26.8409,
    lon: 75.5666,
    lastSeen: new Date().toISOString(),
    status: "needs-help",
    notes: "Near Manipal University Jaipur campus (demo)",
    sos: true,
    sentMessages: [],
  },
];

/* Danger zone example (near campus) */
const DANGER_ZONES = [
  {
    id: "dz-1",
    label: "Slippery / Cliff zone (demo)",
    lat: 26.8412,
    lon: 75.5668,
    radiusMeters: 300, // 300 m radius
    severity: "high",
  },
];

/* -------------------- Helpers -------------------- */
const genId = (prefix = "id") => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const loadTouristsFromStorage = (): Tourist[] => {
  try {
    const raw = localStorage.getItem(TOURISTS_KEY);
    if (!raw) return DEFAULT_TOURISTS;
    const parsed = JSON.parse(raw) as Tourist[];
    return parsed.length ? parsed : DEFAULT_TOURISTS;
  } catch (e) {
    console.error("load tourists error", e);
    return DEFAULT_TOURISTS;
  }
};

const saveTouristsToStorage = (arr: Tourist[]) => {
  try {
    localStorage.setItem(TOURISTS_KEY, JSON.stringify(arr));
  } catch (e) {
    console.error("save tourists error", e);
  }
};

/* Haversine distance in km */
const calcDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
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
export const RealTimeTourists: React.FC = () => {
  // tourists state + persistence
  const [tourists, setTourists] = useState<Tourist[]>(() => loadTouristsFromStorage());
  useEffect(() => {
    saveTouristsToStorage(tourists);
  }, [tourists]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Tourist["status"]>("all");

  // add form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Tourist["status"]>("unknown");

  // map defaults to Manipal campus
  const [mapCenter, setMapCenter] = useState<[number, number]>([26.8409, 75.5666]);
  const [mapZoom, setMapZoom] = useState(15);

  // simulate movement (optional)
  const [simulateMovement, setSimulateMovement] = useState(false);
  const simIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (simulateMovement) {
      simIntervalRef.current = window.setInterval(() => {
        setTourists((prev) =>
          prev.map((t) => {
            if (t.sos) return t;
            const jitterLat = t.lat + (Math.random() - 0.5) * 0.0006;
            const jitterLon = t.lon + (Math.random() - 0.5) * 0.0006;
            return { ...t, lat: Number(jitterLat.toFixed(6)), lon: Number(jitterLon.toFixed(6)), lastSeen: new Date().toISOString() };
          })
        );
      }, 3000) as unknown as number;
    } else {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    }
    return () => {
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, [simulateMovement]);

  /* Add tourist (manual) */
  const handleAddTourist = () => {
    const latN = Number(lat);
    const lonN = Number(lon);
    if (!name.trim() || Number.isNaN(latN) || Number.isNaN(lonN)) {
      alert("Please provide a name and valid numeric latitude/longitude.");
      return;
    }
    const t: Tourist = {
      id: genId("t"),
      name: name.trim(),
      phone: phone.trim() || undefined,
      lat: latN,
      lon: lonN,
      lastSeen: new Date().toISOString(),
      status,
      notes: notes.trim() || undefined,
      sos: false,
      sentMessages: [],
    };
    setTourists((prev) => [t, ...prev]);
    setName("");
    setPhone("");
    setLat("");
    setLon("");
    setNotes("");
    setStatus("unknown");
    setMapCenter([t.lat, t.lon]);
    setMapZoom(15);
  };

  /* Use navigator geolocation to fill lat/lon */
  const fillMyLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(Number(pos.coords.latitude).toFixed(6)));
        setLon(String(Number(pos.coords.longitude).toFixed(6)));
      },
      (err) => {
        alert("Unable to get location: " + err.message);
      }
    );
  };

  const removeTourist = (id: string) => {
    if (!confirm("Remove this tourist record?")) return;
    setTourists((prev) => prev.filter((t) => t.id !== id));
  };

  const centerToTourist = (t: Tourist) => {
    setMapCenter([t.lat, t.lon]);
    setMapZoom(15);
    setSelectedTourist(t.id);
  };

  const updateLocationFromGeo = (id: string) => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latv = pos.coords.latitude;
        const lonv = pos.coords.longitude;
        setTourists((prev) => prev.map((t) => (t.id === id ? { ...t, lat: latv, lon: lonv, lastSeen: new Date().toISOString() } : t)));
        setMapCenter([latv, lonv]);
        setMapZoom(15);
      },
      (err) => {
        alert("Unable to get location: " + err.message);
      }
    );
  };

  const markSeenNow = (id: string) => {
    setTourists((prev) => prev.map((t) => (t.id === id ? { ...t, lastSeen: new Date().toISOString() } : t)));
  };

  /* Filtered list */
  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return tourists.filter((tour) => {
      if (statusFilter !== "all" && tour.status !== statusFilter) return false;
      if (!t) return true;
      return (
        tour.name.toLowerCase().includes(t) ||
        (tour.phone || "").toLowerCase().includes(t) ||
        (tour.notes || "").toLowerCase().includes(t)
      );
    });
  }, [tourists, searchTerm, statusFilter]);

  /* Map markers array */
  const markers: any[] = tourists.map((t) => ({
    id: `tour-${t.id}`,
    position: [t.lat, t.lon],
    popup: `${t.name} • ${t.phone ?? "—"} (${t.status})`,
    type: t.sos ? "alert" : "tourist",
  }));

  const lastSeenLabel = (iso: string) => {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  /* Selected tourist detail */
  const [selectedTourist, setSelectedTourist] = useState<string | null>(() => {
    const stored = loadTouristsFromStorage();
    return stored && stored.length ? stored[0].id : null;
  });
  useEffect(() => {
    if (!selectedTourist && tourists.length) setSelectedTourist(tourists[0].id);
  }, [tourists, selectedTourist]);

  /* Danger proximity computations */
  const isNearDanger = (t: Tourist) => {
    for (const dz of DANGER_ZONES) {
      const dkm = calcDistanceKm(t.lat, t.lon, dz.lat, dz.lon);
      if (dkm * 1000 <= dz.radiusMeters) return { near: true, zone: dz, distanceMeters: dkm * 1000 };
    }
    return { near: false, zone: null, distanceMeters: Infinity };
  };

  /* Notify action (simulated) */
  const notifyTourist = (id: string, message = "Please move away from the danger zone immediately.") => {
    setTourists((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              sentMessages: [
                ...(t.sentMessages ?? []),
                { id: genId("msg"), text: message, audioPresent: false, timestamp: new Date().toISOString() },
              ],
            }
          : t
      )
    );

    alert("Notify action recorded (local). For production, wire this to a notification service (SMS/push).");
  };

  const selectedDetail = useMemo(() => {
    if (!selectedTourist) return null;
    return tourists.find((t) => t.id === selectedTourist) ?? null;
  }, [selectedTourist, tourists]);

  const selectedProximity = selectedDetail ? isNearDanger(selectedDetail) : null;

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
        .danger-banner { background: linear-gradient(90deg,#fee2e2,#fecaca); border: 1px solid #fca5a5; padding: 10px; border-radius: 8px; }
      `}</style>

      <header className="w-full app-header shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold text-slate-800 tourism-accent">Yatra Raksha</span>
              <span className="text-xs muted">Real-time Map — All Tourists (Manipal Univ. Jaipur demo)</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm("Clear all tourist records?")) setTourists([]);
              }}
            >
              Clear
            </Button>
            <Button size="sm" variant="outline" onClick={() => setTourists(DEFAULT_TOURISTS)}>
              Reset Demo
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* LEFT: list + filters */}
          <aside className="col-span-1 left-pane">
            <div className="space-y-4 rounded-lg card-surface p-4 bg-white no-scrollbar">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tourism-accent">Tourists</h2>
                <div className="text-sm muted">{tourists.length} total</div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search name, phone, notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>
                    All
                  </Button>
                  <Button size="sm" variant={statusFilter === "safe" ? "default" : "outline"} onClick={() => setStatusFilter("safe")}>
                    Safe
                  </Button>
                  <Button size="sm" variant={statusFilter === "needs-help" ? "default" : "outline"} onClick={() => setStatusFilter("needs-help")}>
                    Needs Help
                  </Button>
                  <Button size="sm" variant={statusFilter === "unknown" ? "default" : "outline"} onClick={() => setStatusFilter("unknown")}>
                    Unknown
                  </Button>
                </div>

                <div className="space-y-2">
                  {filtered.length === 0 && <div className="text-sm muted">No tourists found.</div>}
                  {filtered.map((t) => {
                    const prox = isNearDanger(t);
                    return (
                      <Card key={t.id} className="border shadow-sm">
                        <CardHeader>
                          <CardTitle className="text-sm cursor-pointer" onClick={() => { setSelectedTourist(t.id); centerToTourist(t); }}>
                            {t.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-1">
                          <p className="text-slate-600">{t.notes}</p>
                          <p className="text-slate-400">Lat: {t.lat.toFixed(5)}, Lon: {t.lon.toFixed(5)}</p>
                          <p className="text-xs muted">Last seen: {lastSeenLabel(t.lastSeen)}</p>

                          {prox.near && <div className="text-xs text-rose-600 font-medium">⚠ Near danger zone: {prox.zone?.label} ({Math.round(prox.distanceMeters)} m)</div>}

                          <div className="flex gap-2 mt-2">
                            <Button size="sm" onClick={() => { centerToTourist(t); setSelectedTourist(t.id); }}>
                              View on Map
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => updateLocationFromGeo(t.id)}>
                              Update
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => removeTourist(t.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="default" onClick={() => notifyTourist(t.id)}>
                              Notify
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT: map + forms + table */}
          <section className="md:col-span-2 right-pane">
            <div className="rounded-lg card-surface bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm muted">Live Map</div>
                  <Badge className="bg-emerald-100">All Tourists</Badge>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-sm muted">Simulate movement</label>
                  <Button size="sm" variant={simulateMovement ? "default" : "outline"} onClick={() => setSimulateMovement((s) => !s)}>
                    {simulateMovement ? "On" : "Off"}
                  </Button>
                </div>
              </div>

              {/* Danger banner (appears when selected tourist is near a danger zone) */}
              {selectedDetail && selectedProximity && selectedProximity.near && (
                <div className="danger-banner mb-2 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-rose-700">⚠ Immediate danger — {selectedDetail.name} is within {Math.round(selectedProximity.distanceMeters)} m of {selectedProximity.zone?.label}</div>
                    <div className="text-sm text-rose-700 mt-1">Location: {selectedDetail.notes ?? `${selectedDetail.lat.toFixed(5)}, ${selectedDetail.lon.toFixed(5)}`}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="default" onClick={() => notifyTourist(selectedDetail.id)}>Notify Now</Button>
                    <Button size="sm" variant="outline" onClick={() => setSelectedTourist(null)}>Dismiss</Button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border overflow-hidden">
                <div style={{ height: 420, position: "relative" }}>
                  <GarudaMap
                    center={mapCenter}
                    zoom={mapZoom}
                    height={420}
                    markers={[
                      ...markers,
                      ...DANGER_ZONES.map((dz) => ({ id: dz.id, position: [dz.lat, dz.lon], popup: `${dz.label} (radius ${dz.radiusMeters}m)`, type: "danger" })),
                    ]}
                  />
                </div>

                <div className="p-3 bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      <span className="text-xs">Tourists</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-rose-400 rounded-full" />
                      <span className="text-xs">SOS / Alerts</span>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <div className="w-3 h-3 bg-amber-400 rounded-full" />
                      <span className="text-xs">Danger zone</span>
                    </div>
                  </div>

                  <div className="text-xs">Tip: click a tourist in the left list to center map. Use "Notify" to record a warning (local).</div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Add / Register Tourist</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="px-2 py-2 border rounded">
                      <option value="unknown">Unknown</option>
                      <option value="safe">Safe</option>
                      <option value="needs-help">Needs Help</option>
                    </select>

                    <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
                    <Input placeholder="Longitude" value={lon} onChange={(e) => setLon(e.target.value)} />
                    <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>

                  <div className="flex gap-2 items-center">
                    <Button onClick={handleAddTourist} size="sm">
                      <Plus className="mr-2 h-4 w-4" /> Add Tourist
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setName(""); setPhone(""); setLat(""); setLon(""); setNotes(""); setStatus("unknown"); }}>
                      Clear
                    </Button>
                    <Button variant="ghost" size="sm" onClick={fillMyLocation}>
                      Use my location
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Tourists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tourist</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Coords</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Seen</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tourists.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-xs text-muted-foreground py-6 text-center">
                              No tourists registered.
                            </TableCell>
                          </TableRow>
                        )}
                        {tourists.map((t) => {
                          const prox = isNearDanger(t);
                          return (
                            <TableRow key={t.id} className={t.sos ? "bg-rose-50" : ""}>
                              <TableCell className="font-medium">
                                <div>{t.name}</div>
                                <div className="text-xs muted">{t.notes}</div>
                                {prox.near && <div className="text-xs text-rose-600">⚠ Near danger ({Math.round(prox.distanceMeters)}m)</div>}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{t.phone || "—"}</span>
                                </div>
                              </TableCell>
                              <TableCell>{t.lat.toFixed(5)}, {t.lon.toFixed(5)}</TableCell>
                              <TableCell>
                                <Badge className={t.status === "needs-help" ? "bg-rose-100" : "bg-emerald-100"}>
                                  {t.status === "safe" ? "Safe" : t.status === "needs-help" ? "Needs Help" : "Unknown"}
                                </Badge>
                                {t.sos && <div className="text-xs text-rose-600">SOS</div>}
                              </TableCell>
                              <TableCell className="text-xs">{new Date(t.lastSeen).toLocaleString()}</TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => centerToTourist(t)}>
                                    <MapPin className="h-4 w-4" />
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => updateLocationFromGeo(t.id)}>
                                    <Navigation className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => markSeenNow(t.id)}>
                                    <Activity className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => removeTourist(t.id)}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="default" onClick={() => notifyTourist(t.id)}>
                                    Notify
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Selected tourist detail */}
              {selectedDetail && (
                <Card>
                  <CardHeader>
                    <CardTitle>Selected — {selectedDetail.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm space-y-2">
                      <div>
                        <strong>Contact:</strong> {selectedDetail.phone ?? "—"}
                      </div>
                      <div>
                        <strong>Coordinates:</strong> {selectedDetail.lat.toFixed(6)}, {selectedDetail.lon.toFixed(6)}
                      </div>
                      <div>
                        <strong>Status:</strong> {selectedDetail.status}
                      </div>
                      <div>
                        <strong>Last seen:</strong> {lastSeenLabel(selectedDetail.lastSeen)}
                      </div>
                      <div>
                        {selectedProximity && selectedProximity.near ? (
                          <div className="text-rose-600 font-medium">
                            ⚠ This tourist is within {Math.round(selectedProximity.distanceMeters)} m of {selectedProximity.zone?.label} — Suggest immediate notification
                          </div>
                        ) : (
                          <div className="text-xs muted">Not currently near any marked danger zone.</div>
                        )}
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button onClick={() => notifyTourist(selectedDetail.id)}>Notify now</Button>
                        <Button variant="outline" onClick={() => setSelectedTourist(null)}>Close</Button>
                      </div>

                      {selectedDetail.sentMessages && selectedDetail.sentMessages.length > 0 && (
                        <div className="text-xs mt-3">
                          <div className="font-medium">Sent notifications</div>
                          <ul className="list-disc pl-5">
                            {selectedDetail.sentMessages.map((m) => (
                              <li key={m.id}>
                                {m.text ?? "(audio)"} — <span className="text-muted text-xs">{new Date(m.timestamp).toLocaleString()}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default RealTimeTourists;
