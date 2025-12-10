// import 'package:flutter/material.dart';
// import 'package:flutter/services.dart';
// import 'package:sensors_plus/sensors_plus.dart';
// import 'package:flutter_blue_plus/flutter_blue_plus.dart';
// import 'package:permission_handler/permission_handler.dart';
// import 'package:connectivity_plus/connectivity_plus.dart';
// import 'package:internet_connection_checker/internet_connection_checker.dart';

// class MyHomePage extends StatefulWidget {
//   final String title;
//   const MyHomePage({super.key, required this.title});

//   @override
//   State<MyHomePage> createState() => _MyHomePageState();
// }

// class _MyHomePageState extends State<MyHomePage> {
//   static const platform = MethodChannel("sensor_channel");

//   // ---------- NETWORK ----------
//   String networkStatus = "Checking...";
//   String connectionType = "Unknown";

//   // ---------- SENSORS ----------
//   List<dynamic> sensorList = [];
//   bool sensorsStarted = false;

//   double ax = 0, ay = 0, az = 0;
//   double gx = 0, gy = 0, gz = 0;
//   double mx = 0, my = 0, mz = 0;

//   // ---------- BLUETOOTH ----------
//   List<BluetoothDevice> connectedDevices = [];
//   List<ScanResult> nearbyDevices = [];
//   bool scanning = false;

//   @override
//   void initState() {
//     super.initState();
//     loadSensorList();
//     requestBluetoothPermissions();
//     loadConnectedBluetoothDevices();
//     startNetworkListener();
//   }

//   // ---------- NETWORK LISTENER ----------
//   void startNetworkListener() {
//     Connectivity().onConnectivityChanged.listen((
//       List<ConnectivityResult> results,
//     ) async {
//       // true internet check (ping based)
//       bool hasInternet = await InternetConnectionChecker().hasConnection;

//       setState(() {
//         networkStatus = hasInternet ? "Connected" : "No Internet";

//         if (results.contains(ConnectivityResult.wifi)) {
//           connectionType = "WiFi";
//         } else if (results.contains(ConnectivityResult.mobile)) {
//           connectionType = "Mobile Data";
//         } else if (results.contains(ConnectivityResult.ethernet)) {
//           connectionType = "Ethernet";
//         } else {
//           connectionType = "Offline";
//         }
//       });
//     });
//   }

//   // ---------- PERMISSIONS ----------
//   Future<void> requestBluetoothPermissions() async {
//     await [
//       Permission.bluetooth,
//       Permission.bluetoothScan,
//       Permission.bluetoothConnect,
//       Permission.location,
//     ].request();
//   }

//   // ---------- SENSOR LIST ----------
//   Future<void> loadSensorList() async {
//     try {
//       final sensors = await platform.invokeMethod("getSensorList");
//       setState(() => sensorList = sensors);
//     } catch (e) {
//       print("Error loading sensors: $e");
//     }
//   }

//   // ---------- START LIVE SENSOR READ ----------
//   void startSensors() {
//     if (sensorsStarted) return;
//     sensorsStarted = true;

//     accelerometerEventStream().listen((e) {
//       setState(() {
//         ax = e.x;
//         ay = e.y;
//         az = e.z;
//       });
//     });

//     gyroscopeEventStream().listen((e) {
//       setState(() {
//         gx = e.x;
//         gy = e.y;
//         gz = e.z;
//       });
//     });

//     magnetometerEventStream().listen((e) {
//       setState(() {
//         mx = e.x;
//         my = e.y;
//         mz = e.z;
//       });
//     });
//   }

//   // ---------- BLUETOOTH ----------
//   Future<void> loadConnectedBluetoothDevices() async {
//     connectedDevices = await FlutterBluePlus.connectedDevices;
//     setState(() {});
//   }

//   void scanNearbyDevices() async {
//     if (scanning) return;

//     nearbyDevices.clear();
//     scanning = true;
//     setState(() {});

//     FlutterBluePlus.startScan(timeout: const Duration(seconds: 5));

//     FlutterBluePlus.scanResults.listen((results) {
//       setState(() => nearbyDevices = results);
//     });

//     Future.delayed(const Duration(seconds: 5), () {
//       scanning = false;
//       FlutterBluePlus.stopScan();
//       setState(() {});
//     });
//   }

//   bool isSmartWatch(String name) {
//     name = name.toLowerCase();
//     return name.contains("watch") ||
//         name.contains("gear") ||
//         name.contains("galaxy") ||
//         name.contains("amazfit") ||
//         name.contains("fitbit") ||
//         name.contains("wear");
//   }

//   // ---------- UI ----------
//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: AppBar(title: Text(widget.title)),
//       body: SingleChildScrollView(
//         padding: const EdgeInsets.all(16),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             // NETWORK STATUS
//             const Text(
//               "Network Status:",
//               style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
//             ),
//             Text(
//               "Status: $networkStatus",
//               style: const TextStyle(fontSize: 18),
//             ),
//             Text(
//               "Connection Type: $connectionType",
//               style: const TextStyle(fontSize: 18),
//             ),
//             const Divider(height: 30, thickness: 2),

//             // SENSOR LIST
//             const Text(
//               "Available Sensors:",
//               style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
//             ),
//             for (var s in sensorList)
//               Text("• $s", style: const TextStyle(fontSize: 18)),
//             const Divider(height: 30, thickness: 2),

//             // CONNECTED DEVICES
//             const Text(
//               "Connected Bluetooth Devices:",
//               style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
//             ),
//             for (var d in connectedDevices)
//               ListTile(
//                 title: Text("${d.platformName} (${d.remoteId})"),
//                 subtitle: isSmartWatch(d.platformName)
//                     ? const Text("Smartwatch Detected ✔")
//                     : null,
//               ),
//             const Divider(height: 30, thickness: 2),

//             // NEARBY SCAN
//             Row(
//               mainAxisAlignment: MainAxisAlignment.spaceBetween,
//               children: [
//                 const Text(
//                   "Nearby Bluetooth Devices:",
//                   style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
//                 ),
//                 ElevatedButton(
//                   onPressed: scanNearbyDevices,
//                   child: const Text("Scan"),
//                 ),
//               ],
//             ),

//             for (var r in nearbyDevices)
//               ListTile(
//                 title: Text("${r.device.platformName} (${r.device.remoteId})"),
//                 subtitle: isSmartWatch(r.device.platformName)
//                     ? const Text("Smartwatch Detected ✔")
//                     : null,
//               ),
//             const Divider(height: 30, thickness: 2),

//             // SENSOR START BUTTON
//             Center(
//               child: ElevatedButton(
//                 onPressed: startSensors,
//                 child: const Text("Start Reading Phone Sensors"),
//               ),
//             ),
//             const SizedBox(height: 20),

//             // SENSOR VALUES
//             Text(
//               "Accelerometer: X:$ax  Y:$ay  Z:$az",
//               style: const TextStyle(fontSize: 18),
//             ),
//             const SizedBox(height: 10),
//             Text(
//               "Gyroscope: X:$gx  Y:$gy  Z:$gz",
//               style: const TextStyle(fontSize: 18),
//             ),
//             const SizedBox(height: 10),
//             Text(
//               "Magnetometer: X:$mx  Y:$my  Z:$mz",
//               style: const TextStyle(fontSize: 18),
//             ),
//           ],
//         ),
//       ),
//     );
//   }
// }
import 'package:flutter/material.dart';
import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:mraksha/services/native_sensor_service.dart';
import 'package:mraksha/services/network_service.dart';
import 'package:mraksha/services/sensor_service.dart';

class MyHomePage extends StatefulWidget {
  final String title;
  const MyHomePage({super.key, required this.title});

  @override
  State<MyHomePage> createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  String networkStatus = "Checking…";
  String connectionType = "Unknown";

  List<dynamic> sensorList = [];
  List<BluetoothDevice> connectedDevices = [];
  List<ScanResult> nearbyDevices = [];

  double ax = 0, ay = 0, az = 0;
  double gx = 0, gy = 0, gz = 0;
  double mx = 0, my = 0, mz = 0;

  @override
  void initState() {
    super.initState();
    loadAllData();
  }

  void loadAllData() async {
    // network
    NetworkService.networkStatusStream().listen((data) {
      setState(() {
        networkStatus = data["status"]!;
        connectionType = data["type"]!;
      });
    });

    // sensors
    sensorList = await NativeSensorService.getSensorList();
    setState(() {});

    SensorService.accelerometerStream().listen((e) {
      setState(() {
        ax = e["x"]!;
        ay = e["y"]!;
        az = e["z"]!;
      });
    });

    SensorService.gyroscopeStream().listen((e) {
      setState(() {
        gx = e["x"]!;
        gy = e["y"]!;
        gz = e["z"]!;
      });
    });

    SensorService.magnetometerStream().listen((e) {
      setState(() {
        mx = e["x"]!;
        my = e["y"]!;
        mz = e["z"]!;
      });
    });

    // bluetooth
    // await BluetoothService.requestPermissions();
    // connectedDevices = await BluetoothService.getConnectedDevices();
    // setState(() {});
  }

  // void scanNearby() {
  //   BluetoothService.scanNearbyDevices().listen((list) {
  //     setState(() => nearbyDevices = list);
  //   });
  // }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              "Network Status: $networkStatus",
              style: const TextStyle(fontSize: 18),
            ),
            Text(
              "Connection: $connectionType",
              style: const TextStyle(fontSize: 18),
            ),
            const Divider(),

            const Text("Sensors:", style: TextStyle(fontSize: 22)),
            for (var s in sensorList) Text("• $s"),

            const Divider(),

            // const Text(
            //   "Connected Bluetooth Devices:",
            //   style: TextStyle(fontSize: 22),
            // ),
            // for (var d in connectedDevices)
            //   ListTile(
            //     title: Text(d.platformName),
            //     subtitle: BluetoothService.isSmartWatch(d.platformName)
            //         ? const Text("Smartwatch Detected ✔")
            //         : null,
            //   ),

            // ElevatedButton(
            //   onPressed: scanNearby,
            //   child: const Text("Scan Nearby"),
            // ),

            // for (var r in nearbyDevices)
            //   ListTile(
            //     title: Text(r.device.platformName),
            //     subtitle: BluetoothService.isSmartWatch(r.device.platformName)
            //         ? const Text("Smartwatch ✔")
            //         : null,
            //   ),
            const Divider(),

            Text("Accelerometer: X:$ax  Y:$ay  Z:$az"),
            Text("Gyroscope: X:$gx  Y:$gy  Z:$gz"),
            Text("Magnetometer: X:$mx  Y:$my  Z:$mz"),
          ],
        ),
      ),
    );
  }
}
