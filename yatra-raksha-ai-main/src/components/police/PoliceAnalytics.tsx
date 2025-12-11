// src/components/police/PoliceAnalytics.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  LayerGroup,
  useMap,
} from 'react-leaflet';

/* -------------------- Types -------------------- */
type TrustedPlace = {
  id: string;
  name: string;
  category: 'temple' | 'fort' | 'waterfall' | 'hill-station' | 'national-park' | 'beach';
  lat: number;
  lon: number;
  source?: string;
  notes?: string;
};

type RiskZone = {
  id: string;
  label: string;
  type: string;
  lat: number;
  lon: number;
  radius: number;
  color: string;
};

/* -------------------- Seed data (Ministry / Incredible India examples) -------------------- */
const TRUSTED_PLACES: TrustedPlace[] = [
  { id: 'tp-agra-taj', name: 'Taj Mahal (Agra)', category: 'fort', lat: 27.175145, lon: 78.042142, source: 'Incredible India' },
  { id: 'tp-rishikesh', name: 'Rishikesh (Ganga Ghats)', category: 'temple', lat: 30.0869, lon: 78.2676, source: 'Incredible India' },
  { id: 'tp-manali', name: 'Manali - Solang / Old Manali', category: 'hill-station', lat: 32.2432, lon: 77.1892, source: 'Incredible India' },
  { id: 'tp-ooty', name: 'Ooty (Udhagamandalam)', category: 'hill-station', lat: 11.4064, lon: 76.6950, source: 'Incredible India' },
  { id: 'tp-munnar', name: 'Munnar', category: 'hill-station', lat: 10.0892, lon: 77.0591, source: 'Incredible India' },
  { id: 'tp-shillong', name: 'Shillong', category: 'hill-station', lat: 25.5788, lon: 91.8933, source: 'Incredible India' },
  { id: 'tp-calangute', name: 'Calangute Beach, Goa', category: 'beach', lat: 15.5471, lon: 73.7515, source: 'Incredible India' },
];

const RISK_ZONES: RiskZone[] = [
  { id: 'rz-cliff-kedarnath', label: 'Cliff / Steep terrain (example)', type: 'cliff', lat: 30.7352, lon: 79.0668, radius: 1200, color: '#ef4444' },
  { id: 'rz-wildlife-kaziranga', label: 'Wildlife Zone - High animal activity (example)', type: 'wildlife', lat: 26.5775, lon: 93.1710, radius: 4000, color: '#d97706' },
  { id: 'rz-no-network-himalaya', label: 'No-network valley (example)', type: 'no-network', lat: 32.1046, lon: 77.2235, radius: 5000, color: '#9ca3af' },
];

/* -------------------- Utils -------------------- */
const RISK_PLACES_KEY = 'yatra_trusted_places_v1';
const DENSITY_KEY = 'yatra_density_mode_v1';

function genId(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/* -------------------- Component -------------------- */
export const PoliceAnalytics: React.FC = () => {
  const [places, setPlaces] = useState<TrustedPlace[]>(() => {
    try {
      const raw = localStorage.getItem(RISK_PLACES_KEY);
      if (raw) return JSON.parse(raw) as TrustedPlace[];
    } catch { /* ignore */ }
    return TRUSTED_PLACES;
  });

  useEffect(() => {
    try { localStorage.setItem(RISK_PLACES_KEY, JSON.stringify(places)); } catch { /* ignore */ }
  }, [places]);

  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | TrustedPlace['category']>('all');

  const mapRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<any>(null);
  const [densityMode, setDensityMode] = useState<'places' | 'simulated-realtime'>(() => {
    try {
      const r = localStorage.getItem(DENSITY_KEY);
      return (r as any) || 'places';
    } catch { return 'places'; }
  });

  useEffect(() => {
    try { localStorage.setItem(DENSITY_KEY, densityMode); } catch {}
  }, [densityMode]);

  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<TrustedPlace['category']>('temple');
  const [formLat, setFormLat] = useState('');
  const [formLon, setFormLon] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const filtered = useMemo(() => {
    const t = query.trim().toLowerCase();
    return places.filter(p => {
      if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
      if (!t) return true;
      return p.name.toLowerCase().includes(t) || (p.notes || '').toLowerCase().includes(t);
    });
  }, [places, query, categoryFilter]);

  /* Heatmap update */
  const updateHeatmap = (mapInstance?: L.Map | null) => {
    const m = mapInstance || mapRef.current;
    if (!m) return;

    if (heatLayerRef.current) {
      try { m.removeLayer(heatLayerRef.current); } catch (e) {}
      heatLayerRef.current = null;
    }

    const basePoints: [number, number, number][] = [];
    if (densityMode === 'places') {
      for (const p of places) basePoints.push([p.lat, p.lon, 0.6]);
    } else {
      for (const p of places) {
        for (let i = 0; i < 6; i++) {
          const jitterLat = p.lat + (Math.random() - 0.5) * 0.02;
          const jitterLon = p.lon + (Math.random() - 0.5) * 0.02;
          basePoints.push([jitterLat, jitterLon, Math.random() * 0.8 + 0.2]);
        }
      }
    }

    // create heat layer using leaflet.heat (L.heatLayer)
    // @ts-ignore
    const heatLayer = (L as any).heatLayer(basePoints.map(pt => [pt[0], pt[1], pt[2]]), { radius: 25, blur: 20, maxZoom: 13 });
    heatLayer.addTo(m);
    heatLayerRef.current = heatLayer;
  };

  useEffect(() => {
    if (!mapRef.current) return;
    updateHeatmap(mapRef.current);
  }, [places, densityMode]);

  const onMapCreated = (mapInstance: L.Map) => {
    mapRef.current = mapInstance;
    updateHeatmap(mapInstance);
  };

  const handleUseMapClickCoords = () => {
    if (!mapRef.current) { alert('Map not ready.'); return; }
    alert('Click on the map to pick coordinates; click once on desired location.');
    const handler = (ev: any) => {
      const { latlng } = ev;
      setFormLat(String(Number(latlng.lat).toFixed(6)));
      setFormLon(String(Number(latlng.lng).toFixed(6)));
      mapRef.current?.off('click', handler);
    };
    mapRef.current.on('click', handler);
  };

  const addPlace = () => {
    const lat = Number(formLat);
    const lon = Number(formLon);
    if (!formName.trim() || Number.isNaN(lat) || Number.isNaN(lon)) {
      alert('Please provide place name and numeric lat/lon.');
      return;
    }
    const p: TrustedPlace = {
      id: genId('tp'),
      name: formName.trim(),
      category: formCategory,
      lat,
      lon,
      notes: formNotes || undefined,
      source: 'Authority (manual)',
    };
    setPlaces(prev => [p, ...prev]);
    setFormName(''); setFormLat(''); setFormLon(''); setFormNotes('');
    if (mapRef.current) mapRef.current.setView([p.lat, p.lon], 12);
  };

  const removePlace = (id: string) => {
    if (!confirm('Remove this trusted place?')) return;
    setPlaces(prev => prev.filter(p => p.id !== id));
  };

  const clearAll = () => {
    if (!confirm('Clear ALL trusted places? This will remove seeded places as well.')) return;
    setPlaces([]);
  };

  /* Helper: center control (uses mapRef) */
  function CenterButton({ lat, lon }: { lat: number; lon: number }) {
    return (
      <Button onClick={() => mapRef.current?.setView([lat, lon], 12)} size="sm" variant="ghost">Center</Button>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <style>{`
        .card-surface { box-shadow: 0 8px 28px rgba(2,6,23,0.04); border-radius: 12px; }
        .muted { color: #6b7280; }
        .left-pane { height: calc(100vh - 120px); overflow-y: auto; }
        .right-pane { height: calc(100vh - 120px); overflow-y: auto; }
      `}</style>

      <header className="max-w-7xl mx-auto mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-emerald-700">Trusted Risk Zones & Density — (Ministry-sourced)</h1>
          <div className="text-xs muted">Marked risk zones + tourist density heatmap (seeded from Incredible India / Ministry lists).</div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setDensityMode(m => m === 'places' ? 'simulated-realtime' : 'places')}>
            Mode: {densityMode === 'places' ? 'Places' : 'Simulated Realtime'}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { updateHeatmap(mapRef.current); }}>Refresh Heatmap</Button>
          <Button size="sm" variant="outline" onClick={clearAll}>Reset</Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <aside className="col-span-1 left-pane card-surface p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search places..." value={query} onChange={(e: any) => setQuery(e.target.value)} className="pl-8" />
            </div>
            <Badge className="bg-emerald-100">Trusted list</Badge>
          </div>

          <div className="mb-3 flex gap-2">
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as any)} className="px-2 py-1 border rounded">
              <option value="all">All categories</option>
              <option value="temple">Temples</option>
              <option value="fort">Forts/Monuments</option>
              <option value="hill-station">Hill stations</option>
              <option value="waterfall">Waterfalls</option>
              <option value="national-park">National parks</option>
              <option value="beach">Beaches</option>
            </select>
          </div>

          <div className="space-y-3 mb-3">
            {filtered.length === 0 && <div className="text-sm muted">No places found.</div>}
            {filtered.map(p => (
              <Card key={p.id} className="border">
                <CardHeader>
                  <CardTitle className="text-sm">{p.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-xs">
                  <div className="text-slate-600">{p.category.replace('-', ' ')}</div>
                  <div className="text-slate-400 text-xs">Lat: {p.lat.toFixed(5)}, Lon: {p.lon.toFixed(5)}</div>
                  <div className="flex gap-2 mt-2">
                    <CenterButton lat={p.lat} lon={p.lon} />
                    <Button size="sm" variant="outline" onClick={() => removePlace(p.id)}>Remove</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="border-t pt-3">
            <h4 className="text-sm font-medium mb-2">Add Trusted Place (manual)</h4>
            <div className="grid grid-cols-1 gap-2">
              <Input placeholder="Name" value={formName} onChange={(e: any) => setFormName(e.target.value)} />
              <select value={formCategory} onChange={(e) => setFormCategory(e.target.value as any)} className="px-2 py-2 border rounded">
                <option value="temple">Temple</option>
                <option value="fort">Fort/Monument</option>
                <option value="waterfall">Waterfall</option>
                <option value="hill-station">Hill station</option>
                <option value="national-park">National park</option>
                <option value="beach">Beach</option>
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Latitude" value={formLat} onChange={(e: any) => setFormLat(e.target.value)} />
                <Input placeholder="Longitude" value={formLon} onChange={(e: any) => setFormLon(e.target.value)} />
              </div>
              <Input placeholder="Notes (optional)" value={formNotes} onChange={(e: any) => setFormNotes(e.target.value)} />
              <div className="flex gap-2">
                <Button onClick={addPlace}>Add Place</Button>
                <Button variant="outline" onClick={() => { setFormLat(''); setFormLon(''); setFormName(''); setFormNotes(''); }}>Clear</Button>
                <Button variant="ghost" onClick={handleUseMapClickCoords}>Pick from map</Button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-xs muted">
            <div className="font-medium">Sources</div>
            <ul className="list-disc pl-5">
              <li>Incredible India / Ministry of Tourism official destination pages (seed list).</li>
            </ul>
          </div>
        </aside>

        <section className="md:col-span-2 right-pane space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Map & Layers</CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: 520, position: 'relative' }}>
                <MapContainer
                  whenCreated={onMapCreated as any}
                  center={[23.5937, 80.9629]}
                  zoom={5}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <LayerGroup>
                    {places.map(p => (
                      <Marker key={p.id} position={[p.lat, p.lon]}>
                        <Popup>
                          <div>
                            <div className="font-medium">{p.name}</div>
                            <div className="text-xs muted">{p.category}</div>
                            <div className="text-xs">{p.notes}</div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                  </LayerGroup>

                  <LayerGroup>
                    {RISK_ZONES.map(z => (
                      <Circle
                        key={z.id}
                        center={[z.lat, z.lon]}
                        radius={z.radius}
                        pathOptions={{ color: z.color, fillOpacity: 0.12 }}
                      />
                    ))}
                  </LayerGroup>
                </MapContainer>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="text-sm">
                  <div className="font-medium">Legend</div>
                  <div className="text-xs muted">Red: Cliff/Slippery • Amber: Wildlife • Gray: No-network</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Heatmap</div>
                  <div className="text-xs muted">Density computed from trusted places (or simulated real-time).</div>
                </div>
                <div className="text-sm">
                  <div className="font-medium">Risk Zones</div>
                  <div className="text-xs muted">Replace samples with official hazard polygons for SIH finals.</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Zone Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium">Marked as red zones:</div>
                  <ul className="list-disc pl-5 text-sm">
                    <li>slippery areas</li>
                    <li>cliffs</li>
                    <li>wildlife zones</li>
                    <li>no-network zones</li>
                  </ul>
                </div>

                <div>
                  <div className="font-medium">Tourist Density Heatmap uses:</div>
                  <ul className="list-disc pl-5 text-sm">
                    <li>Temples, forts, waterfalls, hill stations, beaches (trusted, Ministry sources)</li>
                    <li>Live data channel placeholder — replace with real-time feed (telco / crowdsourced / admin uploads)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="max-w-7xl mx-auto mt-6 text-xs muted">
        <div>Seeded from official Ministry of Tourism / Incredible India pages (examples).</div>
        <div className="mt-2">For SIH finals: replace the risk zone polygons and heatmap data with official hazard maps (GeoJSON) from the Ministry or state disaster management authorities.</div>
      </footer>
    </div>
  );
};

export default PoliceAnalytics;
