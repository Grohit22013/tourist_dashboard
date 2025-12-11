'use client';

import React, { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/context/WebSocketContext";
import GarudaMap, { MarkerType } from "./GarudaMap";

import { MapPin, Phone, Menu, X, Mic, StopCircle, Send, Play } from "lucide-react";
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

/* -------------------- Translator Config (Switched to MyMemory public API) -------------------- */
/*
  Using MyMemory public translation endpoint for lightweight translations:
  GET https://api.mymemory.translated.net/get?q={text}&langpair={source}|{target}
  Note: MyMemory has usage limits and quality isn't enterprise grade — replace with your paid provider for production.
*/
const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";

/* -------------------- Helpers -------------------- */
const genRandom = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

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

  /* Recording / transcription refs and state */
  const recognitionRef = useRef<Record<string, any>>({});
  const mediaRecorderRef = useRef<Record<string, MediaRecorder | null>>({});
  const mediaChunksRef = useRef<Record<string, Blob[]>>({});
  const mediaStreamsRef = useRef<Record<string, MediaStream | null>>({});

  const [recordingFor, setRecordingFor] = useState<string | null>(null);
  const [transcripts, setTranscripts] = useState<Record<string, string>>({});
  const [audioBlobs, setAudioBlobs] = useState<Record<string, Blob | null>>({});
  const [isSpeechAPIAvailable, setIsSpeechAPIAvailable] = useState<boolean>(false);

  /* ---- persisted load ---- */
  useEffect(() => {
    const persistedAlerts = loadAlertsFromStorage();
    const persistedResqrs = loadResqrsFromStorage();

    // ensure sentMessages array exists
    const normalized = persistedAlerts.map((a: any) => ({ ...a, sentMessages: a.sentMessages ?? [] }));

    setActiveAlerts(normalized);
    setResqrs(persistedResqrs);

    setOrigState({ alerts: normalized, resqrs: persistedResqrs, selectedAlert: null });

    // check SpeechRecognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSpeechAPIAvailable(!!SpeechRecognition);
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
            sentMessages: [],
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
    if (recordingFor) stopRecording(recordingFor);
    localStorage.removeItem(ALERTS_STORAGE_KEY);
    localStorage.removeItem(RESQRS_STORAGE_KEY);
    setActiveAlerts([]);
    setResqrs({});
    setSelectedAlert(null);
    setOrigState({ alerts: null, resqrs: null, selectedAlert: null });
    setTranscripts({});
    setAudioBlobs({});
  };

  /* ---------------- UI State ---------------- */
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"alerts" | "map">("alerts");
  const [mapInteractionEnabled, setMapInteractionEnabled] = useState(true);

  /* ---------------- Translation State ---------------- */
  const [targetLang, setTargetLang] = useState<string>("hi");
  const [translatingPage, setTranslatingPage] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);

  /* ---------------- Translation helpers (MyMemory) ---------------- */
  const translateSingle = async (text: string, target: string) => {
    if (!text) return "";
    const tgt = target === "auto" ? "hi" : target;
    const source = "en";
    const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(`${source}|${tgt}`)}`;

    try {
      const resp = await fetch(url);
      if (!resp.ok) {
        const t = await resp.text();
        throw new Error(`Translate API error ${resp.status}: ${t}`);
      }
      const js = await resp.json();
      return js?.responseData?.translatedText ?? "";
    } catch (e) {
      console.error("MyMemory translate error:", e);
      return text;
    }
  };

  const translateFullPage = async (lang: string) => {
    setTranslateError(null);
    setTranslatingPage(true);

    setOrigState((s) => {
      if (!s.alerts || !s.resqrs) {
        return { alerts: s.alerts ?? activeAlerts, resqrs: s.resqrs ?? resqrs, selectedAlert: s.selectedAlert ?? selectedAlert };
      }
      return s;
    });

    try {
      const alertsPromises = activeAlerts.map(async (a) => {
        const [nameT, locT] = await Promise.all([
          translateSingle(String(a.name || ""), lang).catch(() => a.name),
          translateSingle(String(a.locationName || ""), lang).catch(() => a.locationName),
        ]);
        return { ...a, name: nameT || a.name, locationName: locT || a.locationName };
      });

      const resqIds = Object.keys(resqrs);
      const resqPromises = resqIds.map(async (id) => {
        const r = resqrs[id];
        const [rnameT, statusT] = await Promise.all([
          translateSingle(String(r.rname || ""), lang).catch(() => r.rname),
          translateSingle(String(r.status || ""), lang).catch(() => r.status),
        ]);
        return [id, { ...r, rname: rnameT || r.rname, status: statusT || r.status }];
      });

      let selectedTranslated = null;
      if (selectedAlert) {
        const [sname, sloc, sstat] = await Promise.all([
          translateSingle(String(selectedAlert.name || ""), lang).catch(() => selectedAlert.name),
          translateSingle(String(selectedAlert.locationName || ""), lang).catch(() => selectedAlert.locationName),
          translateSingle(String(selectedAlert.ticket_status || "inlist"), lang).catch(() => selectedAlert.ticket_status),
        ]);
        selectedTranslated = {
          ...selectedAlert,
          name: sname || selectedAlert.name,
          locationName: sloc || selectedAlert.locationName,
          ticket_status: sstat || selectedAlert.ticket_status,
        };
      }

      const alertsTranslated = await Promise.all(alertsPromises);
      const resqArr = await Promise.all(resqPromises);
      const resqMapped: Record<string, any> = {};
      resqArr.forEach(([id, val]: any) => (resqMapped[id] = val));

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

  const revertTranslation = () => {
    if (origState.alerts) setActiveAlerts(origState.alerts);
    if (origState.resqrs) setResqrs(origState.resqrs);
    if (origState.selectedAlert) setSelectedAlert(origState.selectedAlert);
    setTranslateError(null);
    setTranslatingPage(false);
  };

  /* ---------------- Recording helpers (FIXED: no duplicate transcript) ---------------- */

  const startRecording = async (alertId: string) => {
    // stop any other recording first
    if (recordingFor && recordingFor !== alertId) {
      await stopRecording(recordingFor);
    }

    // initialize transcript and audio storage for this alert
    setTranscripts((t) => ({ ...t, [alertId]: "" }));
    setAudioBlobs((a) => ({ ...a, [alertId]: null }));
    setRecordingFor(alertId);

    // SpeechRecognition (live transcription)
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const rec = new SpeechRecognition();
        rec.lang = "en-IN";
        rec.interimResults = true;
        rec.maxAlternatives = 1;

        // IMPORTANT: rebuild the transcript each onresult from ev.results
        rec.onresult = (ev: any) => {
          try {
            let combined = "";
            for (let i = 0; i < ev.results.length; i++) {
              const res = ev.results[i];
              // use the best alternative transcript for each result
              combined += res[0].transcript + (res.isFinal ? " " : " ");
            }
            // set the transcript to the rebuilt combined string (do NOT append previous state)
            setTranscripts((t) => ({ ...t, [alertId]: combined.trim() }));
          } catch (e) {
            console.warn("onresult processing error:", e);
          }
        };

        rec.onerror = (e: any) => {
          console.warn("SpeechRecognition error:", e);
        };

        rec.onend = () => {
          // recognition stopped naturally — we keep the final transcript
        };

        rec.start();
        recognitionRef.current[alertId] = rec;
      } catch (e) {
        console.warn("SpeechRecognition failed to start:", e);
      }
    }

    // MediaRecorder for audio blob
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamsRef.current[alertId] = stream;
        const mr = new MediaRecorder(stream);
        mediaRecorderRef.current[alertId] = mr;
        mediaChunksRef.current[alertId] = [];

        mr.ondataavailable = (ev) => {
          if (ev.data && ev.data.size > 0) mediaChunksRef.current[alertId].push(ev.data);
        };

        mr.onstop = () => {
          const chunks = mediaChunksRef.current[alertId] || [];
          const blob = new Blob(chunks, { type: "audio/webm" });
          setAudioBlobs((a) => ({ ...a, [alertId]: blob }));
          // stop tracks
          const s = mediaStreamsRef.current[alertId];
          if (s) s.getTracks().forEach((t) => t.stop());
          mediaStreamsRef.current[alertId] = null;
          mediaRecorderRef.current[alertId] = null;
          mediaChunksRef.current[alertId] = [];
        };

        mr.start();
      } catch (e) {
        console.warn("MediaRecorder error or permission denied:", e);
      }
    }
  };

  const stopRecording = async (alertId: string) => {
    // stop SpeechRecognition
    const rec = recognitionRef.current[alertId];
    if (rec) {
      try {
        rec.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current[alertId] = null;
    }

    // stop MediaRecorder
    const mr = mediaRecorderRef.current[alertId];
    if (mr && mr.state !== "inactive") {
      try {
        mr.stop();
      } catch (e) {
        console.warn("Error stopping MediaRecorder", e);
      }
    } else {
      const s = mediaStreamsRef.current[alertId];
      if (s) {
        s.getTracks().forEach((t) => t.stop());
        mediaStreamsRef.current[alertId] = null;
      }
    }

    setRecordingFor((cur) => (cur === alertId ? null : cur));
  };

  const sendTranscriptToAlert = (alertId: string) => {
    const text = (transcripts[alertId] || "").trim();
    const audio = audioBlobs[alertId] ?? null;

    if (!text && !audio) {
      alert("No recorded audio or transcript to send for this alert.");
      return;
    }

    setActiveAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              sentMessages: [
                ...(a.sentMessages ?? []),
                {
                  id: genRandom(),
                  text: text || null,
                  audioPresent: !!audio,
                  timestamp: new Date().toISOString(),
                },
              ],
            }
          : a
      )
    );

    // Optionally upload audio blob to server here. Placeholder:
    // if (audio) { uploadAudio(alertId, audio); }

    // clear local buffers (optional)
    setTranscripts((t) => ({ ...t, [alertId]: "" }));
    setAudioBlobs((a) => ({ ...a, [alertId]: null }));

    alert("Transcript/audio attached to the alert (local). Replace with server call as needed.");
  };

  const playRecordedAudio = (alertId: string) => {
    const blob = audioBlobs[alertId];
    if (blob) {
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.play();
      return;
    }

    // also check if a previously sent message has audio (we only store boolean for sent messages here)
    alert("No recorded audio for this alert.");
  };

  /* left/right pane height so each scrolls separately */
  const topOffset = 88;
  const paneMaxHeight = `calc(100vh - ${topOffset}px)`;

  /* ------------------------ JSX ------------------------ */
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <style>{`
        :root{
          --tourism-teal: #059669;
          --card-radius: 14px;
          --card-shadow: 0 10px 30px rgba(2,6,23,0.06);
        }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .app-header { background: linear-gradient(90deg, rgba(255,255,255,0.98), rgba(250,250,255,0.98)); backdrop-filter: blur(4px); }
        .card-surface { box-shadow: var(--card-shadow); border-radius: var(--card-radius); }
        .hero-bg { background: linear-gradient(135deg, rgba(5,150,105,0.04), rgba(249,115,22,0.02)); border-radius: 12px; }
        .left-card { border-left: 4px solid var(--tourism-teal); }
        .muted { color: #6b7280; }
        .scroll-hint { height: 10px; background: linear-gradient(180deg, rgba(2,6,23,0), rgba(2,6,23,0.02)); border-radius: 0 0 8px 8px; }
        .alerts-aside { position: sticky; top: 16px; align-self: start; z-index: 10; }
        .right-pane { position: sticky; top: 16px; align-self: start; z-index: 5; }
        .chip { background: rgba(5,150,105,0.1); color: var(--tourism-teal); padding: 6px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .title-accent { color: var(--tourism-teal); }
      `}</style>

      {/* Header */}
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
              <span className="text-lg font-semibold title-accent">Yatra Raksha</span>
              <span className="text-xs muted">Tourism Safety • Live Monitoring</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button size="sm" variant="ghost">Overview</Button>
            <Button size="sm" variant="ghost">Operations</Button>
            <Button size="sm" variant="outline" onClick={handleClearData}>Reset</Button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setActiveTab("alerts")}
              className={`px-3 py-1 rounded-md text-xs font-medium ${activeTab === "alerts" ? "bg-teal-600 text-white" : "bg-white border"}`}
            >
              Alerts
            </button>
            <button
              onClick={() => setActiveTab("map")}
              className={`px-3 py-1 rounded-md text-xs font-medium ${activeTab === "map" ? "bg-teal-600 text-white" : "bg-white border"}`}
            >
              Map
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 hero-bg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* LEFT: alerts */}
          <aside className="col-span-1 alerts-aside" style={{ maxHeight: paneMaxHeight }}>
            <div className="space-y-4 overflow-auto no-scrollbar card-surface px-4 py-4 bg-white left-card" style={{ maxHeight: paneMaxHeight }}>
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold title-accent">🧭 Active Alerts</h2>
                <div className="flex items-center gap-2">
                  <div className="chip">Tourism</div>
                  {activeAlerts.length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleClearData} className="text-xs">Clear</Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {activeAlerts.length === 0 && <p className="text-sm muted">No active alerts — visitors will appear here when they request help.</p>}

                {activeAlerts.map((a) => (
                  <Card key={a.id} className="border shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-sm text-slate-800">{a.name}</CardTitle>
                    </CardHeader>

                    <CardContent className="text-sm space-y-2">
                      <p className="text-slate-600">{a.locationName}</p>
                      <p className="text-slate-400 text-xs">Lat: {a.lat}, Lon: {a.lon}</p>

                      {/* Microphone / Transcript UI */}
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          {recordingFor === a.id ? (
                            <Button size="sm" className="bg-red-500 text-white" onClick={() => stopRecording(a.id)}>
                              <StopCircle className="w-4 h-4 mr-2" /> Stop
                            </Button>
                          ) : (
                            <Button size="sm" variant="default" onClick={() => startRecording(a.id)}>
                              <Mic className="w-4 h-4 mr-2" /> Record
                            </Button>
                          )}

                          <Button size="sm" variant="outline" onClick={() => playRecordedAudio(a.id)}>
                            <Play className="w-4 h-4 mr-2" /> Play
                          </Button>

                          <Button size="sm" variant="ghost" onClick={() => sendTranscriptToAlert(a.id)}>
                            <Send className="w-4 h-4 mr-2" /> Send
                          </Button>
                        </div>

                        <div className="text-xs text-slate-600 p-2 border rounded min-h-[48px]">
                          {transcripts[a.id] ? transcripts[a.id] : <span className="text-muted">Transcript will appear here when recording...</span>}
                        </div>

                        {/* show sent messages if any */}
                        {a.sentMessages && a.sentMessages.length > 0 && (
                          <div className="text-xs">
                            <div className="font-medium">Sent messages</div>
                            <ul className="list-disc pl-5">
                              {a.sentMessages.map((m: any) => (
                                <li key={m.id}>
                                  <div>{m.text ?? "(audio)"} — <span className="text-muted text-xs">{new Date(m.timestamp).toLocaleString()}</span></div>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <Button size="sm" className="mt-2 w-full" onClick={() => { setSelectedAlert(a); setActiveTab("map"); }}>
                        View
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT: map + details */}
          <section className="md:col-span-2 right-pane" style={{ maxHeight: paneMaxHeight }}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm muted">Teams: {Object.keys(resqrs).length}</div>

                <div className="flex items-center gap-2 ml-2">
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
                    <option value="auto">Auto-detect (defaults to Hindi)</option>
                  </select>

                  <Button size="sm" variant="default" onClick={() => translateFullPage(targetLang)} disabled={translatingPage}>
                    {translatingPage ? "Translating..." : "Translate Page"}
                  </Button>

                  <Button size="sm" variant="outline" onClick={revertTranslation} disabled={translatingPage}>
                    Revert
                  </Button>
                </div>
              </div>
            </div>

            {translateError && <div className="mx-4 mb-2 text-sm text-red-600">{translateError}</div>}

            <div className="rounded-lg border overflow-auto bg-white shadow-sm card-surface px-4 py-4" style={{ maxHeight: `calc(${paneMaxHeight} - 64px)` }}>
              {!selectedAlert ? (
                <div className="text-center text-sm muted mt-10 p-8">Select an alert from the left to view map & details</div>
              ) : (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex gap-2 items-center text-slate-800">
                        <MapPin className="w-4 h-4 text-teal-600" /> {selectedAlert.locationName}
                      </CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Alert Info */}
                      <div className="text-sm space-y-1 text-slate-700">
                        <p><strong>Name:</strong> {selectedAlert.name}</p>
                        <p className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <a href={`tel:${selectedAlert.phone}`} className="text-teal-600 underline">{selectedAlert.phone}</a>
                        </p>
                        <p><strong>Coordinates:</strong> {selectedAlert.lat}, {selectedAlert.lon}</p>
                        <p><strong>Status:</strong> <span className="text-slate-600">{selectedAlert.ticket_status ?? "inlist"}</span></p>
                      </div>

                      {/* Map */}
                      <div className="rounded-lg border overflow-hidden">
                        <div style={{ height: 420, position: "relative" }}>
                          <GarudaMap
                            center={[selectedAlert.lat, selectedAlert.lon]}
                            zoom={14}
                            height={420}
                            markers={[
                              { id: "alertMarker", position: [selectedAlert.lat, selectedAlert.lon], popup: selectedAlert.locationName, type: "alert" },
                              ...resqrsMarkers,
                            ]}
                            {...(mapInteractionEnabled
                              ? { dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true }
                              : { dragging: true, scrollWheelZoom: true, doubleClickZoom: true, touchZoom: true })}
                          />
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

                  <div style={{ height: 24 }} />
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
