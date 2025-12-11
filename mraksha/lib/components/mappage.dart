// import 'package:flutter/material.dart';
// import 'package:flutter_map/flutter_map.dart';
// import 'package:latlong2/latlong.dart';

// class MapPage extends StatelessWidget {
//   const MapPage({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(
//         title: const Text("Jaipur Map"),
//         backgroundColor: Colors.black87,
//       ),
//       body: FlutterMap(
//         options: MapOptions(
//           initialCenter: LatLng(26.9124, 75.7873), // Jaipur
//           initialZoom: 13,
//         ),
//         children: [
//           TileLayer(
//             urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
//             userAgentPackageName: "com.yatra.raksha",
//           ),
//         ],
//       ),
//     );
//   }
// }

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class MapPage extends StatelessWidget {
  const MapPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Jaipur Map"),
        backgroundColor: Colors.black87,
      ),
      body: FlutterMap(
        options: MapOptions(
          initialCenter: LatLng(26.9124, 75.7873), // Jaipur
          initialZoom: 13,
        ),
        children: [
          TileLayer(
            urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
            userAgentPackageName: "com.yatra.raksha",
          ),

          // --- Markers Layer ---
          MarkerLayer(
            markers: [
              // 🔴 Red Main Marker (example: Jaipur center)
              Marker(
                point: LatLng(26.9124, 75.7873),
                width: 40,
                height: 40,
                child: const Icon(
                  Icons.location_pin,
                  color: Colors.red,
                  size: 40,
                ),
              ),

              // 🔵 Blue Marker 1
              Marker(
                point: LatLng(26.9150, 75.8100),
                width: 35,
                height: 35,
                child: const Icon(
                  Icons.location_pin,
                  color: Colors.blue,
                  size: 35,
                ),
              ),

              // 🔵 Blue Marker 2
              Marker(
                point: LatLng(26.9000, 75.7800),
                width: 35,
                height: 35,
                child: const Icon(
                  Icons.location_pin,
                  color: Colors.blue,
                  size: 35,
                ),
              ),

              // 🔵 Blue Marker 3
              Marker(
                point: LatLng(26.9300, 75.7700),
                width: 35,
                height: 35,
                child: const Icon(
                  Icons.location_pin,
                  color: Colors.blue,
                  size: 35,
                ),
              ),

              // 🔵 Blue Marker 4
              Marker(
                point: LatLng(26.9050, 75.8000),
                width: 35,
                height: 35,
                child: const Icon(
                  Icons.location_pin,
                  color: Colors.blue,
                  size: 35,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
