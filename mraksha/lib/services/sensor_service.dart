import 'package:sensors_plus/sensors_plus.dart';

class SensorService {
  static Stream<Map<String, double>> accelerometerStream() {
    return accelerometerEventStream().map(
      (e) => {"x": e.x, "y": e.y, "z": e.z},
    );
  }

  static Stream<Map<String, double>> gyroscopeStream() {
    return gyroscopeEventStream().map((e) => {"x": e.x, "y": e.y, "z": e.z});
  }

  static Stream<Map<String, double>> magnetometerStream() {
    return magnetometerEventStream().map((e) => {"x": e.x, "y": e.y, "z": e.z});
  }
}
