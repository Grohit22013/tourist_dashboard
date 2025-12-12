import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter_background_service/flutter_background_service.dart';
import 'package:flutter_background_service_android/flutter_background_service_android.dart';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';
import 'package:http/http.dart' as http;

import '../../mraksha/lib/globals.dart';
import '../../mraksha/lib/services/network_service.dart';
import '../../mraksha/lib/services/signal_services.dart';

BluetoothConnection? globalConnection;

Future<void> onStart(ServiceInstance service) async {
  if (service is AndroidServiceInstance) {
    service.setForegroundNotificationInfo(
      title: "YatraRaksha Running",
      content: "Monitoring Bluetooth and Network",
    );
  }

  final bt = FlutterBluetoothSerial.instance;

  // Ensure BT is on
  if (!(await bt.isEnabled ?? false)) {
    await bt.requestEnable();
  }

  // Auto-connect if last device known (optional)
  Timer.periodic(Duration(seconds: 3), (timer) async {
    if (globalConnection == null) return;

    // Listen to data
    globalConnection!.input?.listen((Uint8List data) async {
      final chunk = String.fromCharCodes(data);
      if (chunk.contains('\n')) {
        final line = chunk.trim();
        await handleIncomingJson(line);
      }
    });
  });
}

Future<void> handleIncomingJson(String line) async {
  Map<String, dynamic>? parsed;
  try {
    parsed = json.decode(line);
  } catch (_) {
    return;
  }

  final cmd = parsed?['cmd'];

  if (cmd == "CHECK_SIGNAL") {
    final net = await NetworkService.checkStatusOnce();
    final netStatus = net["status"] ?? "0";

    final int cellLevel = await SignalService.getCellularLevel();

    bool hasSignal = (netStatus == "1" || cellLevel != 0);

    final reply = {
      "type": "SIGNAL_STATUS",
      "has_signal": hasSignal,
      "net_status": netStatus,
      "cell_level": cellLevel,
    };

    if (globalConnection != null) {
      globalConnection!.output.add(utf8.encode("${json.encode(reply)}\n"));
      await globalConnection!.output.allSent;
    }

    if (hasSignal) {
      // send SOS to server
      await http.post(
        Uri.parse(dashboardendpoint),
        headers: {"Content-Type": "application/json"},
        body: json.encode({
          "cmd": "SOS",
          "fall_detected": true,
          "activity": "walking",
        }),
      );
    }
  }
}
