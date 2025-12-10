import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:permission_handler/permission_handler.dart';

class BluetoothService {
  static Future<void> requestPermissions() async {
    await [
      Permission.bluetooth,
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.location,
    ].request();
  }

  static Future<List<BluetoothDevice>> getConnectedDevices() async {
    return FlutterBluePlus.connectedDevices;
  }

  static Stream<List<ScanResult>> scanNearbyDevices() {
    FlutterBluePlus.startScan(timeout: const Duration(seconds: 5));
    return FlutterBluePlus.scanResults;
  }

  static bool isSmartWatch(String name) {
    name = name.toLowerCase();
    return name.contains("watch") ||
        name.contains("gear") ||
        name.contains("galaxy") ||
        name.contains("amazfit") ||
        name.contains("fitbit") ||
        name.contains("wear");
  }
}
