import 'package:flutter/services.dart';

class NativeSensorService {
  static const MethodChannel _platform = MethodChannel("sensor_channel");

  static Future<List<dynamic>> getSensorList() async {
    try {
      return await _platform.invokeMethod("getSensorList");
    } catch (_) {
      return [];
    }
  }
}
