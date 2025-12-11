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
  User,
  Navigation,
  Activity,
  CheckCircle,
  Search,
  Phone,
} from "lucide-react";
// NOTE: import GarudaMap as default (no MarkerType import to avoid runtime import issues)
import GarudaMap from "./GarudaMap";

/* -------------------- Types -------------------- */
type Ranger = {
  id: string;
  name: string;
  code: string;
  phone?: string;
  lat: number;
  lon: number;
  unit?: string;
  status: "available" | "on-duty" | "offline";
  lastSeen: string;
  notes?: string;
};

/* -------------------- Storage Key & Defaults -------------------- */
const RANGERS_KEY = "yatra_raksha_rangers_v1";

const DEFAULT_RANGERS: Ranger[] = [
  {
    id: "r-1",
    name: "Ranger Ajay",
    code: "RGR-JP-01",
    phone: "+91-90000-00001",
    lat: 26.9124,
    lon: 75.7873,
    unit: "Line-1",
    status: "available",
    lastSeen: new Date().toISOString(),
    notes: "Patrolling central Jaipur",
  },
  {
    id: "r-2",
    name: "Ranger Suman",
    code: "RGR-JP-02",
    phone: "+91-90000-00002",
    lat: 26.9145,
    lon: 75.7804,
    unit: "Line-2",
    status: "on-duty",
    lastSeen: new Date().toISOString(),
    notes: "Monitoring tourist zone",
  },
  {
    id: "r-3",
    name: "Ranger Rohit",
    code: "RGR-JP-03",
    phone: "+91-90000-00003",
    lat: 26.9000,
    lon: 75.8000,
    unit: "Line-3",
    status: "available",
    lastSeen: new Date().toISOString(),
    notes: "Standby",
  },
];

const genId = () =>
  (typeof crypto !== "undefined" && "randomUUID" in crypto)
    ? (crypto as any).randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

/* -------------------- Component (export name: FIRGeneration) -------------------- */
export const FIRGeneration: React.FC = () => {
  const [rangers, setRangers] = useState<Ranger[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RANGERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Ranger[];
        // ensure older data gets default set if empty
        if (!Array.isArray(parsed) || parsed.length === 0) setRangers(DEFAULT_RANGERS);
        else setRangers(parsed);
      } else {
        setRangers(DEFAULT_RANGERS);
      }
    } catch (err) {
      console.error("load rangers error:", err);
      setRangers(DEFAULT_RANGERS);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(RANGERS_KEY, JSON.stringify(rangers));
    } catch (err) {
      console.error("save rangers error:", err);
    }
  }, [rangers]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Ranger["status"]>("all");

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [phone, setPhone] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [unit, setUnit] = useState("Line-1");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<Ranger["status"]>("available");

  const [mapCenter, setMapCenter] = useState<[number, number]>([26.9124, 75.7873]);
  const [mapZoom, setMapZoom] = useState(12);

  const filtered = useMemo(() => {
    const t = searchTerm.trim().toLowerCase();
    return rangers.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!t) return true;
      return (
        r.name.toLowerCase().includes(t) ||
        r.code.toLowerCase().includes(t) ||
        (r.unit || "").toLowerCase().includes(t)
      );
    });
  }, [rangers, searchTerm, statusFilter]);

  // IMPORTANT: declare markers as a plain JS array (no runtime type import)
  const markers = rangers.map((r) => ({
    id: `ranger-${r.id}`,
    position: [r.lat, r.lon],
    popup: `${r.name} • ${r.code} (${r.unit ?? "—"})`,
    type: "ranger",
  }));

  const addRanger = () => {
    const nlat = Number(lat);
    const nlon = Number(lon);
    if (!name.trim() || !code.trim() || Number.isNaN(nlat) || Number.isNaN(nlon)) {
      alert("Please provide name, code and valid numeric coordinates.");
      return;
    }
    const r: Ranger = {
      id: genId(),
      name: name.trim(),
      code: code.trim(),
      phone: phone.trim() || undefined,
      lat: nlat,
      lon: nlon,
      unit: unit || undefined,
      status,
      lastSeen: new Date().toISOString(),
      notes: notes.trim() || undefined,
    };
    setRangers((p) => [r, ...p]);
    setName("");
    setCode("");
    setPhone("");
    setLat("");
    setLon("");
    setUnit("Line-1");
    setNotes("");
    setStatus("available");
    setMapCenter([r.lat, r.lon]);
    setMapZoom(14);
  };

  const removeRanger = (id: string) => {
    if (!confirm("Remove this ranger?")) return;
    setRangers((p) => p.filter((r) => r.id !== id));
  };

  const toggleStatus = (id: string) => {
    setRangers((p) =>
      p.map((r) =>
        r.id === id
          ? {
              ...r,
              status: r.status === "available" ? "on-duty" : r.status === "on-duty" ? "offline" : "available",
              lastSeen: new Date().toISOString(),
            }
          : r
      )
    );
  };

  const centerToRanger = (r: Ranger) => {
    setMapCenter([r.lat, r.lon]);
    setMapZoom(15);
  };

  const updateLocationFromGeo = (id: string) => {
    if (!navigator.geolocation) {
      alert("Geolocation not supported in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latv = pos.coords.latitude;
        const lonv = pos.coords.longitude;
        setRangers((p) => p.map((r) => (r.id === id ? { ...r, lat: latv, lon: lonv, lastSeen: new Date().toISOString() } : r)));
        setMapCenter([latv, lonv]);
        setMapZoom(15);
      },
      (err) => {
        alert("Unable to fetch location: " + err.message);
      }
    );
  };

  const markSeenNow = (id: string) => {
    setRangers((p) => p.map((r) => (r.id === id ? { ...r, lastSeen: new Date().toISOString() } : r)));
  };

  const statusLabel = (s: Ranger["status"]) => {
    if (s === "available") return "Available";
    if (s === "on-duty") return "On Duty";
    return "Offline";
  };

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
              <span className="text-xs muted">Ranger Management — Jaipur Lines</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button size="sm" variant="ghost">Overview</Button>
            <Button size="sm" variant="ghost">Rangers</Button>
            <Button size="sm" variant="outline" onClick={() => { if (confirm("Reset to default Jaipur rangers?")) setRangers(DEFAULT_RANGERS); }}>
              Reset
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* LEFT */}
          <aside className="col-span-1 left-pane">
            <div className="space-y-4 rounded-lg card-surface p-4 bg-white no-scrollbar">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold tourism-accent">Rangers (Jaipur)</h2>
                <div className="text-sm muted">{rangers.length} total</div>
              </div>

              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by name, code, or unit..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant={statusFilter === "all" ? "default" : "outline"} onClick={() => setStatusFilter("all")}>All</Button>
                  <Button size="sm" variant={statusFilter === "available" ? "default" : "outline"} onClick={() => setStatusFilter("available")}>Available</Button>
                  <Button size="sm" variant={statusFilter === "on-duty" ? "default" : "outline"} onClick={() => setStatusFilter("on-duty")}>On Duty</Button>
                  <Button size="sm" variant={statusFilter === "offline" ? "default" : "outline"} onClick={() => setStatusFilter("offline")}>Offline</Button>
                </div>

                <div className="space-y-2">
                  {filtered.length === 0 && <div className="text-sm muted">No rangers found.</div>}
                  {filtered.map((r) => (
                    <Card key={r.id} className="border shadow-sm">
                      <CardHeader>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-3">
                            <User className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="text-sm font-medium">{r.name}</div>
                              <div className="text-xs muted">{r.code} • {r.unit}</div>
                            </div>
                          </div>
                          <Badge className="bg-emerald-100">{statusLabel(r.status)}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="text-xs space-y-1">
                        <p className="text-slate-600">{r.notes}</p>
                        <p className="text-slate-400">Lat: {r.lat.toFixed(5)}, Lon: {r.lon.toFixed(5)}</p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" onClick={() => centerToRanger(r)}>View</Button>
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(r.id)}>Toggle Status</Button>
                          <Button size="sm" variant="ghost" onClick={() => removeRanger(r.id)}>Remove</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* RIGHT */}
          <section className="md:col-span-2 right-pane">
            <div className="rounded-lg card-surface bg-white p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-sm muted">Ranger Locations</div>
                  <Badge className="bg-emerald-100">Jaipur</Badge>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div style={{ height: 420, position: "relative" }}>
                  <GarudaMap
                    center={mapCenter}
                    zoom={mapZoom}
                    height={420}
                    markers={markers}
                  />
                </div>

                <div className="p-3 bg-muted/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full" />
                      <span className="text-xs">Rangers</span>
                    </div>
                  </div>

                  <div className="text-xs">
                    Tip: click a ranger in the left list to center map. Use "Use my location" when adding a new ranger.
                  </div>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Add / Register Ranger</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
                    <Input placeholder="Code (RGR-JP-XX)" value={code} onChange={(e) => setCode(e.target.value)} />
                    <Input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                    <Input placeholder="Latitude" value={lat} onChange={(e) => setLat(e.target.value)} />
                    <Input placeholder="Longitude" value={lon} onChange={(e) => setLon(e.target.value)} />
                    <Input placeholder="Unit (Line-1)" value={unit} onChange={(e) => setUnit(e.target.value)} />
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="px-2 py-2 border rounded">
                      <option value="available">Available</option>
                      <option value="on-duty">On Duty</option>
                      <option value="offline">Offline</option>
                    </select>
                    <Input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    <div />
                  </div>

                  <div className="flex gap-2 items-center">
                    <Button onClick={addRanger} size="sm"><Plus className="mr-2 h-4 w-4" /> Add Ranger</Button>
                    <Button variant="outline" size="sm" onClick={() => { setName(""); setCode(""); setPhone(""); setLat(""); setLon(""); setUnit("Line-1"); setNotes(""); setStatus("available"); }}>Clear</Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      if (!navigator.geolocation) { alert("Geolocation not supported"); return; }
                      navigator.geolocation.getCurrentPosition((pos) => {
                        const latv = pos.coords.latitude;
                        const lonv = pos.coords.longitude;
                        setLat(String(Number(latv).toFixed(6)));
                        setLon(String(Number(lonv).toFixed(6)));
                        setMapCenter([latv, lonv]);
                        setMapZoom(14);
                      }, (err) => {
                        alert("Unable to get location: " + err.message);
                      });
                    }}>
                      Use my location
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>All Rangers — Jaipur Lines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ranger</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Unit</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Seen</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rangers.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={7} className="text-xs text-muted-foreground py-6 text-center">No rangers registered.</TableCell>
                          </TableRow>
                        )}
                        {rangers.map((r) => (
                          <TableRow key={r.id} className={r.status === "offline" ? "opacity-60" : ""}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div>{r.name}</div>
                                  <div className="text-xs muted">{r.notes}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{r.code}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{r.phone || "—"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{r.unit}</TableCell>
                            <TableCell>
                              <Badge className="bg-emerald-100">{statusLabel(r.status)}</Badge>
                            </TableCell>
                            <TableCell className="text-xs">{new Date(r.lastSeen).toLocaleString()}</TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => centerToRanger(r)}><MapPin className="h-4 w-4" /></Button>
                                <Button variant="outline" size="sm" onClick={() => updateLocationFromGeo(r.id)}><Navigation className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => markSeenNow(r.id)}><Activity className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="sm" onClick={() => removeRanger(r.id)}><Trash2 className="h-4 w-4" /></Button>
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

export default FIRGeneration;
