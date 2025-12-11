import 'dart:async';
import 'dart:typed_data';
import 'dart:convert';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';

class BluetoothManager {
  BluetoothManager._private();
  static final BluetoothManager instance = BluetoothManager._private();

  BluetoothConnection? connection;
  BluetoothDevice? device;
  bool isConnected = false;

  final StreamController<Map<String, dynamic>> dataStream =
      StreamController.broadcast();

  Future<bool> connect(String address) async {
    try {
      connection = await BluetoothConnection.toAddress(address);
      isConnected = true;

      connection!.input?.listen(
        (Uint8List data) {
          final line = utf8.decode(data);
          dataStream.add({"raw": line});
        },
        onDone: () {
          isConnected = false;
          connection = null;
        },
      );

      return true;
    } catch (e) {
      isConnected = false;
      connection = null;
      return false;
    }
  }

  Future<void> sendJson(Map<String, dynamic> jsonMap) async {
    if (!isConnected || connection == null) return;
    final out = json.encode(jsonMap) + "\n";
    connection!.output.add(utf8.encode(out));
    await connection!.output.allSent;
  }

  void disconnect() {
    try {
      connection?.dispose();
    } catch (_) {}
    connection = null;
    isConnected = false;
  }
}
