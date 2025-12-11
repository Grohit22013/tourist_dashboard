// import 'package:flutter/material.dart';
// import 'package:flutter_blue_plus/flutter_blue_plus.dart';
// import 'package:mraksha/services/native_sensor_service.dart';
// import 'package:mraksha/services/network_service.dart';
// import 'package:mraksha/services/sensor_service.dart';

// class DeviceDetails extends StatefulWidget {
//   final String title;
//   const DeviceDetails({super.key, required this.title});

//   @override
//   State<DeviceDetails> createState() => _DeviceDetailsState();
// }

// class _DeviceDetailsState extends State<DeviceDetails> {
//   String networkStatus = "Checking…";
//   String connectionType = "Unknown";

//   List<dynamic> sensorList = [];
//   List<BluetoothDevice> connectedDevices = [];
//   List<ScanResult> nearbyDevices = [];

//   double ax = 0, ay = 0, az = 0;
//   double gx = 0, gy = 0, gz = 0;
//   double mx = 0, my = 0, mz = 0;

//   @override
//   void initState() {
//     super.initState();
//     loadAllData();
//   }

//   void loadAllData() async {
//     // network
//     NetworkService.networkStatusStream().listen((data) {
//       setState(() {
//         networkStatus = data["status"]!;
//         connectionType = data["type"]!;
//       });
//     });

//     // sensors
//     sensorList = await NativeSensorService.getSensorList();
//     setState(() {});

//     SensorService.accelerometerStream().listen((e) {
//       setState(() {
//         ax = e["x"]!;
//         ay = e["y"]!;
//         az = e["z"]!;
//       });
//     });

//     SensorService.gyroscopeStream().listen((e) {
//       setState(() {
//         gx = e["x"]!;
//         gy = e["y"]!;
//         gz = e["z"]!;
//       });
//     });

//     SensorService.magnetometerStream().listen((e) {
//       setState(() {
//         mx = e["x"]!;
//         my = e["y"]!;
//         mz = e["z"]!;
//       });
//     });
//   }

// }

// import 'dart:async';
// import 'package:mraksha/services/network_service.dart';
// import 'package:mraksha/services/native_sensor_service.dart';
// import 'package:mraksha/services/sensor_service.dart';

// class DeviceStatusService {
//   // Singleton pattern
//   DeviceStatusService._internal();
//   static final DeviceStatusService instance = DeviceStatusService._internal();

//   // Network
//   String networkStatus = "Unknown";
//   String connectionType = "Unknown";

//   // Accelerometer
//   double ax = 0, ay = 0, az = 0;

//   // Gyroscope
//   double gx = 0, gy = 0, gz = 0;

//   // Magnetometer
//   double mx = 0, my = 0, mz = 0;

//   // Sensor list
//   List<dynamic> sensorList = [];

//   // Streams
//   late StreamSubscription networkSub;
//   late StreamSubscription accelSub;
//   late StreamSubscription gyroSub;
//   late StreamSubscription magnoSub;

//   bool _initialized = false;

//   Future<void> initialize() async {
//     if (_initialized) return; // avoid double init
//     _initialized = true;

//     // Load sensor list
//     sensorList = await NativeSensorService.getSensorList();

//     // Network stream
//     networkSub = NetworkService.networkStatusStream().listen((data) {
//       networkStatus = data["status"] ?? "Unknown";
//       connectionType = data["type"] ?? "Unknown";
//     });

//     // Accelerometer
//     accelSub = SensorService.accelerometerStream().listen((e) {
//       ax = e["x"]!;
//       ay = e["y"]!;
//       az = e["z"]!;
//     });

//     // Gyroscope
//     gyroSub = SensorService.gyroscopeStream().listen((e) {
//       gx = e["x"]!;
//       gy = e["y"]!;
//       gz = e["z"]!;
//     });

//     // Magnetometer
//     magnoSub = SensorService.magnetometerStream().listen((e) {
//       mx = e["x"]!;
//       my = e["y"]!;
//       mz = e["z"]!;
//     });
//   }

//   // Optional cleanup
//   void dispose() {
//     networkSub.cancel();
//     accelSub.cancel();
//     gyroSub.cancel();
//     magnoSub.cancel();
//   }
// }

import 'dart:async';
import 'package:mraksha/services/network_service.dart';
import 'package:mraksha/services/native_sensor_service.dart';
import 'package:mraksha/services/sensor_service.dart';
import 'package:pedometer/pedometer.dart';

class DeviceStatusService {
  // Singleton
  DeviceStatusService._internal();
  static final DeviceStatusService instance = DeviceStatusService._internal();

  bool _initialized = false;

  // Network
  String networkStatus = "Unknown";
  String connectionType = "Unknown";

  // Sensor values
  double ax = 0, ay = 0, az = 0;
  double gx = 0, gy = 0, gz = 0;
  double mx = 0, my = 0, mz = 0;

  int stepCount = 0;
  int proximity = 0;

  // Sensor List
  List<dynamic> sensorList = [];

  // Stream subscriptions
  StreamSubscription? networkSub;
  StreamSubscription? accelSub;
  StreamSubscription? gyroSub;
  StreamSubscription? magnoSub;
  StreamSubscription? stepSub;
  StreamSubscription? proxSub;

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;

    // Load available sensors
    sensorList = await NativeSensorService.getSensorList();

    // Network status
    networkSub = NetworkService.networkStatusStream().listen((data) {
      networkStatus = data["status"] ?? "Unknown";
      connectionType = data["type"] ?? "Unknown";
    });

    // Accelerometer
    accelSub = SensorService.accelerometerStream().listen((e) {
      ax = e["x"]!;
      ay = e["y"]!;
      az = e["z"]!;
    });

    // Gyroscope
    gyroSub = SensorService.gyroscopeStream().listen((e) {
      gx = e["x"]!;
      gy = e["y"]!;
      gz = e["z"]!;
    });

    // Magnetometer
    magnoSub = SensorService.magnetometerStream().listen((e) {
      mx = e["x"]!;
      my = e["y"]!;
      mz = e["z"]!;
    });

    // Step count
    stepSub = SensorService.stepCountStream().listen((StepCount e) {
      stepCount = e.steps;
    });

    // Proximity
    proxSub = SensorService.proximityStream().listen((value) {
      proximity = value; // 0 = far, 1 = near
    });
  }

  void dispose() {
    networkSub?.cancel();
    accelSub?.cancel();
    gyroSub?.cancel();
    magnoSub?.cancel();
    stepSub?.cancel();
    proxSub?.cancel();
  }
}
