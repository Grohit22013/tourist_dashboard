// import 'package:flutter/material.dart';
// import 'package:flutter_map/flutter_map.dart';
// import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';
// import 'package:latlong2/latlong.dart';
// import 'package:connectivity_plus/connectivity_plus.dart';

// class MapPage extends StatefulWidget {
//   const MapPage({super.key});

//   @override
//   State<MapPage> createState() => _MapPageState();
// }

// class _MapPageState extends State<MapPage> {
//   bool isOnline = true;

//   @override
//   void initState() {
//     super.initState();
//     _checkConnectivity();
//     Connectivity().onConnectivityChanged.listen((status) {
//       setState(() {
//         isOnline = status != ConnectivityResult.none;
//       });
//     });
//   }

//   Future<void> _checkConnectivity() async {
//     final status = await Connectivity().checkConnectivity();
//     isOnline = status != ConnectivityResult.none;
//     setState(() {});
//   }

//   @override
//   Widget build(BuildContext context) {
//     final tileProvider = FMTC.instance('mapStore').getTileProvider();

//     return Scaffold(
//       appBar: AppBar(
//         title: const Text('Offline Map'),
//         backgroundColor: Colors.black87,
//       ),
//       body: Stack(
//         children: [
//           FlutterMap(
//             options: MapOptions(
//               initialCenter: LatLng(20.5937, 78.9629), // India center
//               initialZoom: 5,
//             ),
//             children: [
//               TileLayer(
//                 tileProvider: tileProvider,
//                 urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
//                 userAgentPackageName: 'com.yatra.raksha',
//               ),
//             ],
//           ),

//           if (!isOnline)
//             Positioned(
//               top: 10,
//               right: 10,
//               child: Container(
//                 padding: const EdgeInsets.all(8),
//                 decoration: BoxDecoration(
//                   color: Colors.red.withOpacity(0.7),
//                   borderRadius: BorderRadius.circular(8),
//                 ),
//                 child: const Text(
//                   "Offline Mode",
//                   style: TextStyle(color: Colors.white, fontSize: 14),
//                 ),
//               ),
//             ),
//         ],
//       ),
//     );
//   }
// }

import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';
import 'package:latlong2/latlong.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class MapPage extends StatefulWidget {
  const MapPage({super.key});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  bool isOnline = true;

  @override
  void initState() {
    super.initState();
    _checkConnectivity();

    Connectivity().onConnectivityChanged.listen((status) {
      setState(() {
        isOnline = status != ConnectivityResult.none;
      });
    });
  }

  Future<void> _checkConnectivity() async {
    final status = await Connectivity().checkConnectivity();
    setState(() {
      isOnline = status != ConnectivityResult.none;
    });
  }

  @override
  Widget build(BuildContext context) {
    final tileProvider = FMTC.instance('mapStore').getTileProvider();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Offline Map'),
        backgroundColor: Colors.black87,
      ),
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: LatLng(20.5937, 78.9629),
              initialZoom: 5,
            ),
            children: [
              TileLayer(
                urlTemplate: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
                tileProvider: tileProvider,
                userAgentPackageName: 'com.yatra.raksha',
              ),
            ],
          ),

          if (!isOnline)
            Positioned(
              top: 10,
              right: 10,
              child: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  "Offline Mode",
                  style: TextStyle(color: Colors.white),
                ),
              ),
            ),
        ],
      ),
    );
  }
}
