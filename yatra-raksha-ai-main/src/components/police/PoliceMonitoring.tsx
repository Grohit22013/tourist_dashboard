import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/context/WebSocketContext";
import GarudaMap, { MarkerType } from "./GarudaMap";

import { MapPin, Phone, Menu, X } from "lucide-react";
import getLocationName from "@/functions/Location";

/* ------------------------ Distance Utility ------------------------ */
const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/* -------------------- Storage Utilities -------------------- */
const ALERTS_STORAGE_KEY = "yatra_raksha_alerts";
const RESQRS_STORAGE_KEY = "yatra_raksha_resqrs";

const saveAlertsToStorage = (alerts: any[]) => {
  try {
    localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
  } catch (err) {
    console.error("Failed to save alerts:", err);
  }
};

const loadAlertsFromStorage = (): any[] => {
  try {
    const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (err) {
    console.error("Failed to load alerts:", err);
    return [];
  }
};

const saveResqrsToStorage = (resqrs: Record<string, any>) => {
  try {
    localStorage.setItem(RESQRS_STORAGE_KEY, JSON.stringify(resqrs));
  } catch (err) {
    console.error("Failed to save resqrs:", err);
  }
};

const loadResqrsFromStorage = (): Record<string, any> => {
  try {
    const stored = localStorage.getItem(RESQRS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (err) {
    console.error("Failed to load resqrs:", err);
    return {};
  }
};

/* -------------------- Translation Config (free fallback) --------------------
   Using MyMemory (https://mymemory.translated.net/) — free public API.
   Pros: No API key required. Cons: rate-limited, less accurate than paid services.
   If you want better quality later, we can swap to Google/DeepL with an API key.
*/
const TRANSLATION_PROVIDER = "mymemory"; // only provider implemented here

/* ------------------------ Component ------------------------ */
export const PoliceMonitoring: React.FC = () => {
  const ws = useWebSocket();

  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

  const [resqrs, setResqrs] = useState<
    Record<
      string,
      {
        lat: number;
        lon: number;
        rname: string;
        rid: string;
        status: string;
        assigned_operations: string[];
      }
    >
  >({});

  /* keep originals to revert after translation */
  const [origState, setOrigState] = useState<{
    alerts: any[] | null;
    resqrs: Record<string, any> | null;
    selectedAlert: any | null;
  }>({ alerts: null, resqrs: null, selectedAlert: null });

  /* ---- persisted load ---- */
  useEffect(() => {
    const persistedAlerts = loadAlertsFromStorage();
    const persistedResqrs = loadResqrsFromStorage();

    setActiveAlerts(persistedAlerts);
    setResqrs(persistedResqrs);

    // store originals on mount (for revert)
    setOrigState({ alerts: persistedAlerts, resqrs: persistedResqrs, selectedAlert: null });
  }, []);

  useEffect(() => {
    saveAlertsToStorage(activeAlerts);
  }, [activeAlerts]);

  useEffect(() => {
    saveResqrsToStorage(resqrs);
  }, [resqrs]);

  /* ------------------------ WebSocket Listener ------------------------ */
  useEffect(() => {
    if (!ws) return;

    ws.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);

        /* ---- SOS ALERT ---- */
        if (data.type === "SOS") {
          const lat = Number(data.lat);
          const lon = Number(data.lon);
          if (!lat || !lon) return;

          const location = await getLocationName(lat, lon);

          const newAlert = {
            id: crypto.randomUUID(),
            name: data.name || "Unknown",
            phone: data.phone || "",
            lat,
            lon,
            locationName: location?.display_name || "Unknown",
            ticket_status: "inlist",
          };

          setActiveAlerts((prev) => [...prev, newAlert]);
          setOrigState((s) => ({ ...s, alerts: [...(s.alerts ?? []), newAlert] }));
        }

        /* ---- RESCUE TEAM STREAM ---- */
        else if (data.type === "resqrs") {
          setResqrs((prev) => {
            const next = {
              ...prev,
              [data.id]: {
                lat: Number(data.lat),
                lon: Number(data.lon),
                rname: data.rname,
                rid: data.rid,
                status: data.status,
                assigned_operations: data.assigned_operations || [],
              },
            };
            setOrigState((s) => ({ ...s, resqrs: { ...(s.resqrs ?? {}), [data.id]: next[data.id] } }));
            return next;
          });
        }
      } catch (err) {
        console.error("WS error:", err);
      }
    };
  }, [ws]);

  /* ---------------- Compute Sorted Rangers + Assignment ---------------- */
  const getSortedRangers = () => {
    if (!selectedAlert) return [];

    const { lat: alertLat, lon: alertLon } = selectedAlert;

    let list = Object.values(resqrs).map((r) => ({
      ...r,
      distance: calcDistance(alertLat, alertLon, r.lat, r.lon),
    }));

    list.sort((a, b) => a.distance - b.distance);

    if (list.length > 0) {
      const first = list[0];
      const second = list[1];

      const canAssign =
        first.status === "available" &&
        first.assigned_operations.length < 3;

      const forceAssign =
        second &&
        first.assigned_operations.length < 3 &&
        first.distance < second.distance * 0.5;

      if (canAssign || forceAssign) {
        first.status = "in-op";

        if (!first.assigned_operations.includes(selectedAlert.id)) {
          first.assigned_operations.push(selectedAlert.id);
        }
      }
    }

    return list;
  };

  /* ---------------- Map Markers ---------------- */
  const resqrsMarkers: MarkerType[] = Object.entries(resqrs).map(([id, r]) => ({
    id,
    position: [r.lat, r.lon],
    popup: `${r.rname} (${r.rid})`,
    type: "resqr",
  }));

  /* ---- Clear all data ---- */
  const handleClearData = () => {
    localStorage.removeItem(ALERTS_STORAGE_KEY);
    localStorage.removeItem(RESQRS_STORAGE_KEY);
    setActiveAlerts([]);
    setResqrs({});
    setSelectedAlert(null);
    setOrigState({ alerts: null, resqrs: null, selectedAlert: null });
  };

  /* ---------------- UI State ---------------- */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"alerts" | "map">("alerts");

  /* ---------------- Translation State ---------------- */
  const [targetLang, setTargetLang] = useState<string>("hi"); // default Hindi
  const [translatingPage, setTranslatingPage] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  /* ---------------- Translation helpers (MyMemory free API) ----------------
     MyMemory endpoint example:
       GET https://api.mymemory.translated.net/get?q=Hello%20world!&langpair=en|it
     Notes:
       - It's free and doesn't require a key, but it's rate-limited and quality varies.
       - We assume source is 'en' or best-effort; MyMemory doesn't provide a robust auto-detect in the public API.
  --------------------------------------------------------------------------*/

  const translateSingleMyMemory = async (text: string, target: string) => {
    if (!text) return "";
    if (!target || target === "auto") {
      // auto not supported by this simple free fallback
      throw new Error("Auto-detect not supported by this free translation provider. Choose a specific language.");
    }

    // MyMemory requires langpair like en|hi. We'll pass 'en|target' — if original isn't English, results can still work sometimes.
    const q = encodeURIComponent(text);
    const langpair = `en|${encodeURIComponent(target)}`;
    const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=${langpair}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      throw new Error(`Translation provider error ${resp.status}: ${txt}`);
    }
    const js = await resp.json();
    // js.responseData.translatedText often contains the translated text.
    const translated = js?.responseData?.translatedText ?? "";
    return translated;
  };

  // Translate full page: alerts array, resqrs mapping, selectedAlert
  const translateFullPage = async (lang: string) => {
    setTranslateError(null);
    setTranslatingPage(true);

    // Save originals if not already saved
    setOrigState((s) => {
      if (!s.alerts || !s.resqrs) {
        return { alerts: s.alerts ?? activeAlerts, resqrs: s.resqrs ?? resqrs, selectedAlert: s.selectedAlert ?? selectedAlert };
      }
      return s;
    });

    try {
      // Basic validation
      if (lang === "auto") {
        setTranslateError("Auto-detect not supported by the free provider. Choose a specific language.");
        setTranslatingPage(false);
        return;
      }

      // Translate alerts (names + locationName)
      const alertsPromises = activeAlerts.map(async (a) => {
        const [nameT, locT] = await Promise.all([
          translateSingleMyMemory(String(a.name || ""), lang).catch(() => a.name),
          translateSingleMyMemory(String(a.locationName || ""), lang).catch(() => a.locationName),
        ]);
        return { ...a, name: nameT || a.name, locationName: locT || a.locationName };
      });

      // Translate resqrs (rname and status)
      const resqIds = Object.keys(resqrs);
      const resqPromises = resqIds.map(async (id) => {
        const r = resqrs[id];
        const [rnameT, statusT] = await Promise.all([
          translateSingleMyMemory(String(r.rname || ""), lang).catch(() => r.rname),
          translateSingleMyMemory(String(r.status || ""), lang).catch(() => r.status),
        ]);
        return [id, { ...r, rname: rnameT || r.rname, status: statusT || r.status }];
      });

      // Translate selected alert details as well (if selected)
      let selectedTranslated = null;
      if (selectedAlert) {
        const [sname, sloc, sstat] = await Promise.all([
          translateSingleMyMemory(String(selectedAlert.name || ""), lang).catch(() => selectedAlert.name),
          translateSingleMyMemory(String(selectedAlert.locationName || ""), lang).catch(() => selectedAlert.locationName),
          translateSingleMyMemory(String(selectedAlert.ticket_status || "inlist"), lang).catch(() => selectedAlert.ticket_status),
        ]);
        selectedTranslated = {
          ...selectedAlert,
          name: sname || selectedAlert.name,
          locationName: sloc || selectedAlert.locationName,
          ticket_status: sstat || selectedAlert.ticket_status,
        };
      }

      // await all
      const alertsTranslated = await Promise.all(alertsPromises);
      const resqArr = await Promise.all(resqPromises);
      const resqMapped: Record<string, any> = {};
      resqArr.forEach(([id, val]: any) => (resqMapped[id] = val));

      // set states
      setActiveAlerts(alertsTranslated);
      setResqrs(resqMapped);
      if (selectedTranslated) setSelectedAlert(selectedTranslated);
    } catch (err: any) {
      console.error("translateFull error:", err);
      setTranslateError(String(err?.message ?? err));
    } finally {
      setTranslatingPage(false);
    }
  };

  // revert to original (if origState saved)
  const revertTranslation = () => {
    if (origState.alerts) setActiveAlerts(origState.alerts);
    if (origState.resqrs) setResqrs(origState.resqrs);
    if (origState.selectedAlert) setSelectedAlert(origState.selectedAlert);
    setTranslateError(null);
    setTranslatingPage(false);
  };

  /* left/right pane heights so each scrolls separately */
  const topOffset = 88; // header + padding; adjust if header height changes
  const paneMaxHeight = `calc(100vh - ${topOffset}px)`;

  /* ------------------------ JSX ------------------------ */
  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .app-header { background: linear-gradient(90deg, rgba(255,255,255,0.96), rgba(246,249,255,0.96)); }
        .card-surface { box-shadow: 0 6px 18px rgba(15,23,42,0.04); border-radius: 12px; }
        .scroll-hint { height: 10px; background: linear-gradient(180deg, rgba(15,23,42,0), rgba(15,23,42,0.03)); border-radius: 0 0 8px 8px; }
        .alerts-aside { position: sticky; top: 16px; align-self: start; z-index: 10; }
        .right-pane { position: sticky; top: 16px; align-self: start; z-index: 5; }
      `}</style>

      <header className="w-full app-header shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              aria-label="Toggle menu"
              onClick={() => setSidebarOpen((s) => !s)}
              className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-sky-300"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
            </button>

            <div className="flex flex-col leading-tight">
              <span className="text-lg font-semibold text-slate-800">Yatra Raksha</span>
              <span className="text-xs text-slate-500">Police Monitoring • Live</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button size="sm" variant="ghost">Dashboard</Button>
            <Button size="sm" variant="ghost">Operations</Button>
            <Button size="sm" variant="outline" onClick={handleClearData}>Reset</Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-3 py-1 rounded-md text-xs font-medium ${activeTab === "alerts" ? "bg-sky-600 text-white" : "bg-white border"}`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`px-3 py-1 rounded-md text-xs font-medium ${activeTab === "map" ? "bg-sky-600 text-white" : "bg-white border"}`}
            >
              Map
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* LEFT: alerts (independent scroll) */}
          <aside className="col-span-1 alerts-aside" style={{ maxHeight: paneMaxHeight }}>
            <div className="space-y-4 overflow-auto no-scrollbar rounded-lg card-surface px-3 py-3" style={{ maxHeight: paneMaxHeight }}>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold text-slate-800">🛟 Active Alerts</h2>
                {activeAlerts.length > 0 && (
                  <Button size="sm" variant="outline" onClick={handleClearData} className="text-xs">Clear</Button>
                )}
              </div>

              <div className="space-y-3">
                {activeAlerts.length === 0 && <p className="text-sm text-slate-500">No active alerts yet.</p>}

                {activeAlerts.map((a) => (
                  <Card key={a.id} className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm text-slate-800">{a.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="text-xs space-y-1">
                      <p className="text-slate-600">{a.locationName}</p>
                      <p className="text-slate-400">Lat: {a.lat}, Lon: {a.lon}</p>

                      <Button size="sm" className="mt-2 w-full" onClick={() => { setSelectedAlert(a); setActiveTab("map"); }}>
                        View
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT: map + details (independent scroll) */}
          <section className="md:col-span-2 right-pane" style={{ maxHeight: paneMaxHeight }}>
            <div className="mb-4 flex items-center justify-between">
              

              <div className="flex items-center gap-3">
                <div className="text-sm text-slate-500">Teams: {Object.keys(resqrs).length}</div>

                {/* Translate page controls */}
                <div className="flex items-center gap-2 ml-3">
                  <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="px-2 py-1 border rounded text-sm">
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                    <option value="bn">Bengali</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="kn">Kannada</option>
                    <option value="gu">Gujarati</option>
                    <option value="ur">Urdu</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="ar">Arabic</option>
                    <option value="auto">Auto-detect (NOT supported in free fallback)</option>
                  </select>

                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => translateFullPage(targetLang)}
                    disabled={translatingPage}
                  >
                    {translatingPage ? "Translating..." : "Translate Page"}
                  </Button>

                  <Button size="sm" variant="outline" onClick={revertTranslation} disabled={translatingPage}>
                    Revert
                  </Button>
                </div>
              </div>
            </div>

            {translateError && <div className="mx-4 mb-2 text-sm text-red-600">{translateError}</div>}

            <div className="rounded-lg border overflow-auto bg-white shadow-sm card-surface" style={{ maxHeight: `calc(${paneMaxHeight} - 64px)` }}>
              {!selectedAlert ? (
                <div className="text-center text-sm text-slate-500 mt-10 p-8">Select an alert from the left</div>
              ) : (
                <div className="p-4 space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex gap-2 items-center text-slate-800">
                        <MapPin className="w-4 h-4 text-sky-600" /> {selectedAlert.locationName}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Alert Info */}
                      <div className="text-sm space-y-1 text-slate-700">
                        <p><strong>Name:</strong> {selectedAlert.name}</p>
                        <p className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <a href={`tel:${selectedAlert.phone}`} className="text-sky-600 underline">{selectedAlert.phone}</a>
                        </p>
                        <p><strong>Coordinates:</strong> {selectedAlert.lat}, {selectedAlert.lon}</p>
                        <p><strong>Status:</strong> <span className="text-slate-600">{selectedAlert.ticket_status ?? "inlist"}</span></p>
                      </div>

                      {/* Map */}
                      <div className="rounded-lg border overflow-hidden">
                        <div className={`${activeTab === "map" ? "block" : "hidden"} md:block`}>
                          <div style={{ height: 420, position: "relative" }}>
                            <GarudaMap
                              center={[selectedAlert.lat, selectedAlert.lon]}
                              zoom={14}
                              height={420}
                              markers={[
                                { id: "alertMarker", position: [selectedAlert.lat, selectedAlert.lon], popup: selectedAlert.locationName, type: "alert" },
                                ...resqrsMarkers,
                              ]}
                              // if your GarudaMap accepts interaction props, keep them; otherwise it will ignore them
                              dragging={true}
                              scrollWheelZoom={true}
                              doubleClickZoom={true}
                              touchZoom={true}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Ranger Sorted List */}
                      <div className="mt-4 space-y-3">
                        <h3 className="font-semibold text-slate-800">Nearest Rescue Teams</h3>

                        <div>
                          {getSortedRangers().map((r, i) => (
                            <div key={r.rid} className={`p-3 rounded-lg border flex justify-between items-center mb-2 ${r.status === "in-op" ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}>
                              <div>
                                <p className="text-slate-800"><strong>{r.rname}</strong> <span className="text-slate-500">({r.rid})</span></p>
                                <p className="text-sm text-slate-600">Distance: {r.distance.toFixed(2)} km</p>
                                <p className="text-sm text-slate-600">Status: {r.status}</p>
                                <p className="text-sm text-slate-600">Assigned Alerts: {r.assigned_operations.length}/3</p>
                              </div>

                              {i === 0 && <span className="px-2 py-1 bg-sky-600 text-white text-xs rounded">Closest</span>}
                            </div>
                          ))}
                        </div>

                        <div className="scroll-hint" />
                      </div>
                    </CardContent>
                  </Card>

                  {/* spacer so right pane has breathing room while scrolling */}
                  <div style={{ height: 48 }} />
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PoliceMonitoring;
