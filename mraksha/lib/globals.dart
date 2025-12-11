import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart'
    hide BluetoothDevice;
import 'package:mraksha/services/native_sensor_service.dart';
import 'package:mraksha/services/signal_services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:permission_handler/permission_handler.dart';

Future<List> sensorList = NativeSensorService.getSensorList();

List<ScanResult> nearbyDevices = [];
BluetoothConnection? globalConnection;
Future<void> makeCall(String number) async {
  // Request CALL_PHONE permission
  final status = await Permission.phone.request();
  if (!status.isGranted) {
    print("Phone permission denied");
    return;
  }

  final Uri url = Uri(scheme: 'tel', path: number);

  if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
    print("Could not launch call");
  }
}

final FlutterTts tts = FlutterTts();

// Future<void> speakMessage() async {
//   await tts.speak("This is an emergency. Please help me immediately.");
// }

Future<void> speakMessage() async {
  await tts.setLanguage("en-US");
  await tts.speak("This is a test emergency message");
}
// Future<void> makeCall(String number) async {
//   final Uri callUri = Uri(scheme: 'tel', path: number);
//   await launchUrl(callUri);
// }

class Globals {
  static Future<int> getCellularLevel() => SignalService.getCellularLevel();
  static Future<int> getWifiLevel() => SignalService.getWifiLevel();
  static Future<int> getCellularDbm() => SignalService.getCellularDbm();
  static Future<int> getWifiDbm() => SignalService.getWifiDbm();
}

final String dashboardendpoint = "http://172.20.10.8:8000/send-sos";
