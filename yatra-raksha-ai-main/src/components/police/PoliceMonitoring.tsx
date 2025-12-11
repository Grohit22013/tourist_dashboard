

// import React, { useEffect, useState, useMemo } from "react";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Button } from "@/components/ui/button";
// import { useWebSocket } from "@/context/WebSocketContext";
// import GarudaMap, { MarkerType } from "./GarudaMap";
// import { MapPin, Phone } from "lucide-react";
// import getLocationName from "@/functions/Location";

// // --- Haversine Distance (km) ---
// const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
//   const R = 6371;
//   const dLat = ((lat2 - lat1) * Math.PI) / 180;
//   const dLon = ((lon2 - lon1) * Math.PI) / 180;
//   const a =
//     Math.sin(dLat / 2) ** 2 +
//     Math.cos(lat1 * Math.PI / 180) *
//       Math.cos(lat2 * Math.PI / 180) *
//       Math.sin(dLon / 2) ** 2;

//   return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
// };

// export const PoliceMonitoring: React.FC = () => {
//   const ws = useWebSocket();

//   const [activeAlerts, setActiveAlerts] = useState<any[]>([]);
//   const [selectedAlert, setSelectedAlert] = useState<any | null>(null);

//   // RESQR data format:
//   // { id: { lat, lon, rname, rid, status } }
//   const [resqrs, setResqrs] = useState<any>({});

//   /* ---------------------- WEBSOCKET LISTENER ---------------------- */
//   useEffect(() => {
//     if (!ws) return;

//     ws.onmessage = async (event) => {
//       const data = JSON.parse(event.data);

//       // --- SOS EVENT ---
//       if (data.type === "SOS") {
//         const lat = Number(data.lat);
//         const lon = Number(data.lon);

//         const location = await getLocationName(lat, lon);

//         setActiveAlerts((prev) => [
//           ...prev,
//           {
//             id: crypto.randomUUID(),
//             name: data.name || "Unknown",
//             phone: data.phone || "",
//             lat,
//             lon,
//             locationName: location?.display_name || "Unknown",
//             ticket_status: "inlist",
//           },
//         ]);
//       }

//       // --- RESQR LIVE LOCATION ---
//       if (data.type === "resqrs") {
//         setResqrs((prev: any) => ({
//           ...prev,
//           [data.id]: {
//             lat: Number(data.lat),
//             lon: Number(data.lon),
//             rname: data.rname,
//             rid: data.rid,
//             status: data.status,
//           },
//         }));
//       }
//     };
//   }, [ws]);

//   /* ---------------------- SORT RESQRS BY DISTANCE ---------------------- */
//   const sortedResqrs = useMemo(() => {
//     if (!selectedAlert) return [];

//     let list = Object.entries(resqrs).map(([id, r]: any) => ({
//       id,
//       ...r,
//       distance: distanceKm(selectedAlert.lat, selectedAlert.lon, r.lat, r.lon),
//     }));

//     list.sort((a, b) => a.distance - b.distance);

//     // Auto-assign closest available → in-op
//     if (list.length > 0 && list[0].status === "available") {
//       list[0].status = "in-op";
//     }

//     return list;
//   }, [resqrs, selectedAlert]);

//   /* ---------------------- RESQR MAP MARKERS ---------------------- */
//   const resqrsMarkers: MarkerType[] = Object.entries(resqrs).map(
//     ([id, r]: any) => ({
//       id,
//       position: [r.lat, r.lon],
//       popup: `${r.rname} (${r.rid})`,
//       type: "resqr",
//     })
//   );

//   /* ---------------------- UI ---------------------- */
//   return (
//     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//       {/* Left — Alerts List */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold">🛟 Active Alerts</h2>

//         {activeAlerts.length === 0 && (
//           <p className="text-sm text-muted-foreground">No active alerts.</p>
//         )}

//         {activeAlerts.map((a) => (
//           <Card key={a.id}>
//             <CardHeader>
//               <CardTitle className="text-sm">{a.name}</CardTitle>
//             </CardHeader>

//             <CardContent className="text-xs space-y-1">
//               <p>{a.locationName}</p>
//               <p className="text-muted-foreground">
//                 Lat: {a.lat}, Lon: {a.lon}
//               </p>

//               <Button
//                 size="sm"
//                 className="mt-2 w-full"
//                 onClick={() => setSelectedAlert(a)}
//               >
//                 View
//               </Button>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       {/* Right — Details + Map */}
//       <div className="md:col-span-2">
//         {selectedAlert ? (
//           <Card>
//             <CardHeader>
//               <CardTitle className="flex items-center gap-2">
//                 <MapPin className="w-4 h-4" /> {selectedAlert.locationName}
//               </CardTitle>
//             </CardHeader>

//             <CardContent className="space-y-4">
//               {/* --- DETAILS --- */}
//               <div className="text-sm space-y-1">
//                 <p>
//                   <strong>Name:</strong> {selectedAlert.name}
//                 </p>
//                 <p className="flex items-center gap-1">
//                   <Phone className="w-3 h-3" />
//                   <a
//                     href={`tel:${selectedAlert.phone}`}
//                     className="text-primary underline"
//                   >
//                     {selectedAlert.phone}
//                   </a>
//                 </p>
//                 <p>
//                   <strong>Coordinates:</strong>{" "}
//                   {selectedAlert.lat}, {selectedAlert.lon}
//                 </p>
//               </div>

//               {/* --- MAP --- */}
//               <div className="rounded-lg overflow-hidden border">
//                 <GarudaMap
//                   center={[selectedAlert.lat, selectedAlert.lon]}
//                   zoom={14}
//                   height={300}
//                   markers={[
//                     {
//                       id: "alert",
//                       position: [selectedAlert.lat, selectedAlert.lon],
//                       popup: selectedAlert.locationName,
//                       type: "alert",
//                       radius: 300,
//                     },
//                     ...resqrsMarkers,
//                   ]}
//                 />
//               </div>

//               {/* --- RESQR LIST BELOW MAP --- */}
//               <div>
//                 <h3 className="font-semibold text-md mt-4 mb-2">
//                   Nearby Rescue Units (sorted by distance)
//                 </h3>

//                 <div className="space-y-2">
//                   {sortedResqrs.map((r: any, index) => {
//                     const isClosest = index === 0;

//                     return (
//                       <div
//                         key={r.id}
//                         className={`p-3 rounded border text-sm flex justify-between items-center
//                           ${
//                             isClosest
//                               ? "bg-green-900/40 border-green-500"
//                               : "bg-gray-800 border-gray-700"
//                           }
//                         `}
//                       >
//                         <div>
//                           <p>
//                             <strong>{r.rname}</strong> ({r.rid})
//                           </p>
//                           <p className="text-xs text-muted-foreground">
//                             {r.distance.toFixed(2)} km away
//                           </p>
//                         </div>

//                         <span
//                           className={`px-2 py-1 text-xs rounded ${
//                             r.status === "available"
//                               ? "bg-green-500 text-black"
//                               : r.status === "in-op"
//                               ? "bg-orange-500 text-black"
//                               : "bg-red-500 text-black"
//                           }`}
//                         >
//                           {r.status}
//                         </span>
//                       </div>
//                     );
//                   })}
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         ) : (
//           <div className="text-center text-sm text-muted-foreground mt-20">
//             Select an alert to view details.
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default PoliceMonitoring;


import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWebSocket } from "@/context/WebSocketContext";
import GarudaMap, { MarkerType } from "./GarudaMap";

import { MapPin, Phone } from "lucide-react";
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
        }

        /* ---- RESCUE TEAM STREAM ---- */
        else if (data.type === "resqrs") {
          setResqrs((prev) => ({
            ...prev,
            [data.id]: {
              lat: Number(data.lat),
              lon: Number(data.lon),
              rname: data.rname,
              rid: data.rid,
              status: data.status,
              assigned_operations: data.assigned_operations || [],
            },
          }));
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

    // sort nearest → farthest
    list.sort((a, b) => a.distance - b.distance);

    // assignment logic
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

  /* ------------------------ JSX ------------------------ */
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* LEFT AREA — Alerts List */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">🛟 Yatra Raksha — Active Alerts</h2>

        {activeAlerts.length === 0 && (
          <p className="text-sm text-muted-foreground">No active alerts yet.</p>
        )}

        {activeAlerts.map((a) => (
          <Card key={a.id} className="border">
            <CardHeader>
              <CardTitle className="text-sm">{a.name}</CardTitle>
            </CardHeader>

            <CardContent className="text-xs space-y-1">
              <p>{a.locationName}</p>
              <p className="text-muted-foreground">
                Lat: {a.lat}, Lon: {a.lon}
              </p>

              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={() => setSelectedAlert(a)}
              >
                View
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* RIGHT AREA — Alert Details + Map + Ranger List */}
      <div className="md:col-span-2">
        {!selectedAlert ? (
          <p className="text-center text-sm text-muted-foreground mt-20">
            Select an alert from the left
          </p>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex gap-2 items-center">
                <MapPin className="w-4 h-4" /> {selectedAlert.locationName}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Alert Info */}
              <div className="text-sm space-y-1">
                <p>
                  <strong>Name:</strong> {selectedAlert.name}
                </p>
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  <a
                    href={`tel:${selectedAlert.phone}`}
                    className="text-primary underline"
                  >
                    {selectedAlert.phone}
                  </a>
                </p>
                <p>
                  <strong>Coordinates:</strong> {selectedAlert.lat},{" "}
                  {selectedAlert.lon}
                </p>
                <p>
                  <strong>Status:</strong> inlist
                </p>
              </div>

              {/* Map */}
              <div className="rounded-lg border overflow-hidden">
                <GarudaMap
                  center={[selectedAlert.lat, selectedAlert.lon]}
                  zoom={14}
                  height={300}
                  markers={[
                    {
                      id: "alertMarker",
                      position: [selectedAlert.lat, selectedAlert.lon],
                      popup: selectedAlert.locationName,
                      type: "alert",
                    },
                    ...resqrsMarkers,
                  ]}
                />
              </div>

              {/* Ranger Sorted List */}
              <div className="mt-4 space-y-3">
                <h3 className="font-bold text-md">Nearest Rescue Teams</h3>

                {getSortedRangers().map((r, i) => (
                  <div
                    key={r.rid}
                    className={`p-3 rounded-lg border flex justify-between items-center ${
                      r.status === "in-op"
                        ? "bg-red-100 border-red-400"
                        : "bg-green-100 border-green-400"
                    }`}
                  >
                    <div>
                      <p>
                        <strong>{r.rname}</strong> ({r.rid})
                      </p>
                      <p className="text-sm">
                        Distance: {r.distance.toFixed(2)} km
                      </p>
                      <p className="text-sm">Status: {r.status}</p>
                      <p className="text-sm">
                        Assigned Alerts: {r.assigned_operations.length}/3
                      </p>
                    </div>

                    {i === 0 && (
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded">
                        Closest
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PoliceMonitoring;
