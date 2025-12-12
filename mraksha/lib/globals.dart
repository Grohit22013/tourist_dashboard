import 'package:flutter_blue_plus/flutter_blue_plus.dart';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart'
    hide BluetoothDevice;
import 'package:mraksha/services/native_sensor_service.dart';
import 'package:mraksha/services/signal_services.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_tts/flutter_tts.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:translator/translator.dart';

final _translator = GoogleTranslator();

String globalLanguage = "en-US";
String globalInstruction = "";

// Future<void> translateToGlobalLanguage(String text) async {
//   try {
//     final translation = await _translator.translate(text, to: globalLanguage);
//     globalInstruction = translation.text;
//     print("Translated: $globalInstruction");
//   } catch (e) {
//     print("Translation Error: $e");
//   }
// }

// final _translator = GoogleTranslator();

Future<String> translateToGlobalLanguage(String text) async {
  try {
    final translation = await _translator.translate(text, to: globalLanguage);
    return translation.text;
  } catch (e) {
    print("Translation Error: $e");
    return text; // fallback
  }
}

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
  await tts.setLanguage(globalLanguage);
  await tts.speak(globalInstruction);
}

class Globals {
  static Future<int> getCellularLevel() => SignalService.getCellularLevel();
  static Future<int> getWifiLevel() => SignalService.getWifiLevel();
  static Future<int> getCellularDbm() => SignalService.getCellularDbm();
  static Future<int> getWifiDbm() => SignalService.getWifiDbm();
}

String lat = "0";
String long = "0";

final String dashboardendpoint = "http://172.20.10.8:8000/send-sos";
