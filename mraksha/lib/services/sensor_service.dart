// import 'package:sensors_plus/sensors_plus.dart';

// class SensorService {
//   static Stream<Map<String, double>> accelerometerStream() {
//     return accelerometerEventStream().map(
//       (e) => {"x": e.x, "y": e.y, "z": e.z},
//     );
//   }

//   static Stream<Map<String, double>> gyroscopeStream() {
//     return gyroscopeEventStream().map((e) => {"x": e.x, "y": e.y, "z": e.z});
//   }

//   static Stream<Map<String, double>> magnetometerStream() {
//     return magnetometerEventStream().map((e) => {"x": e.x, "y": e.y, "z": e.z});
//   }
// }

import 'dart:math' as math;
import 'package:sensors_plus/sensors_plus.dart';
import 'package:pedometer/pedometer.dart';
import 'package:light/light.dart';

class SensorService {
  // ---------------- Accelerometer ----------------
  static Stream<Map<String, double>> accelerometerStream() {
    return accelerometerEventStream().map(
      (e) => {"x": e.x, "y": e.y, "z": e.z},
    );
  }

  // ---------------- Gyroscope ----------------
  static Stream<Map<String, double>> gyroscopeStream() {
    return gyroscopeEventStream().map((e) => {"x": e.x, "y": e.y, "z": e.z});
  }

  // ---------------- Magnetometer ----------------
  static Stream<Map<String, double>> magnetometerStream() {
    return magnetometerEventStream().map((e) => {"x": e.x, "y": e.y, "z": e.z});
  }

  // ---------------- Step Counter ----------------
  static Stream<StepCount> stepCountStream() {
    return Pedometer.stepCountStream;
  }

  // ---------------- Step Detection ----------------

  // ---------------- Ambient Light ----------------
  static Stream<int> ambientLightStream() {
    Light light = Light();
    return light.lightSensorStream;
  }

  // ---------------- Orientation ----------------

  // ---------------- Proximity ----------------

  // ---------------- Pickup Sensor ----------------
  static Stream<bool> pickupStream() {
    return accelerometerEventStream().map((e) {
      double magnitude = math.sqrt(e.x * e.x + e.y * e.y + e.z * e.z);

      // 11–18 m/s² → lifted by hand
      return magnitude > 11 && magnitude < 18;
    });
  }
}
