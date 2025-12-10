import 'package:flutter/services.dart';
import 'package:flutter_signal_strength/flutter_signal_strength.dart';
import 'package:permission_handler/permission_handler.dart';

class SignalService {
  static final FlutterSignalStrength _signal = FlutterSignalStrength();

  /// Ensure required permissions (PHONE + LOCATION)
  static Future<void> _ensurePermissions() async {
    await Permission.phone.request();
    await Permission.location.request();
  }

  /// Get Cellular Signal Level (0–4)
  static Future<int> getCellularLevel() async {
    await _ensurePermissions();
    try {
      return await _signal.getCellularSignalStrength();
    } on PlatformException {
      return -1;
    }
  }

  /// Get WiFi Signal Level (0–4)
  static Future<int> getWifiLevel() async {
    try {
      return await _signal.getWifiSignalStrength();
    } on PlatformException {
      return -1;
    }
  }

  /// Get Cellular Signal in dBm (e.g., -110 to -50)
  static Future<int> getCellularDbm() async {
    await _ensurePermissions();
    try {
      return await _signal.getCellularSignalStrengthDbm();
    } on PlatformException {
      return 0;
    }
  }

  /// Get WiFi Signal in dBm
  static Future<int> getWifiDbm() async {
    try {
      return await _signal.getWifiSignalStrengthDbm();
    } on PlatformException {
      return 0;
    }
  }

  /// Optional: descriptive text
  static String getSignalDescription(int level) {
    switch (level) {
      case 0:
        return '0';
      case 1:
        return '1';
      case 2:
        return '2';
      case 3:
        return '3';
      case 4:
        return '4';
      default:
        return '0';
    }
  }
}
