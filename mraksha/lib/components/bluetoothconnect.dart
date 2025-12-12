import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:mraksha/globals.dart';
import 'package:mraksha/services/gps_services.dart';
import 'package:mraksha/services/network_service.dart';
import 'package:mraksha/services/signal_services.dart';
import 'package:mraksha/services/bluetooth_manager.dart';
import 'package:mraksha/components/devicepicker.dart';

class BluetoothHomePage extends StatefulWidget {
  const BluetoothHomePage({super.key});

  @override
  State<BluetoothHomePage> createState() => _BluetoothHomePageState();
}

class _BluetoothHomePageState extends State<BluetoothHomePage> {
  final FlutterBluetoothSerial _bluetooth = FlutterBluetoothSerial.instance;

  bool _isConnecting = false;
  String _status = "Not connected";
  String latitude = "0";
  String longitude = "0";
  String altitude = "0";
  String temprature = "0";
  String pressure = "0";
  String speed = "0";
  String _lastRawLine = "";
  Map<String, dynamic>? _lastJson;

  @override
  void initState() {
    super.initState();
    _initBluetooth();
    _sendCommand({"cmd": "GET_ENV"});
    // _initvalues();

    // 🔥 Listen to BTManager stream
    BluetoothManager.instance.dataStream.stream.listen((event) {
      _handleIncomingLine(event["raw"]);
    });
  }

  Future<void> _initBluetooth() async {
    try {
      final isEnabled = await _bluetooth.isEnabled;
      if (!(isEnabled ?? false)) {
        await _bluetooth.requestEnable();
      }
    } catch (e) {
      setState(() {
        _status = "Bluetooth init error: $e";
      });
    }
  }

  // ================= CONNECT =====================

  Future<void> _selectDeviceAndConnect() async {
    setState(() {
      _isConnecting = true;
      _status = "Selecting device...";
    });

    final BluetoothDevice? selected = await showDialog(
      context: context,
      builder: (context) => const DevicePickerDialog(),
    );

    if (selected == null) {
      setState(() {
        _isConnecting = false;
        _status = "Device selection cancelled";
      });
      return;
    }

    setState(() {
      _status = "Connecting to ${selected.name ?? selected.address}...";
    });

    final ok = await BluetoothManager.instance.connect(selected.address);

    if (!mounted) return;

    setState(() {
      _isConnecting = false;
      _status = ok
          ? "Connected to ${selected.name ?? selected.address}"
          : "Connection failed";
    });
  }

  // ================= INCOMING DATA =====================

  void _handleIncomingLine(String line) {
    Map<String, dynamic>? parsed;

    try {
      parsed = json.decode(line);
      if (parsed is! Map<String, dynamic>) parsed = null;
    } catch (_) {
      parsed = null;
    }
    print("\nhello lllo\n" + line);
    if (parsed != null) {
      print("\nits not null \n");
      _handleJsonFromDevice(parsed);
    }

    if (!mounted) return;

    setState(() {
      _lastRawLine = line;
      _lastJson = parsed;
      _status = parsed != null
          ? "Received JSON: ${parsed['type'] ?? parsed['cmd'] ?? '-'}"
          : "Received non-JSON data";
    });
  }

  Future<void> _handleJsonFromDevice(Map<String, dynamic> jsonMap) async {
    print("\nwelcome\n");
    print(jsonMap);
    final cmd = jsonMap["cmd"];
    if (cmd == "MSG") {
      String trans = await translateToGlobalLanguage(jsonMap["message"]);
      setState(() => globalInstruction = trans);

      print("\ninstruction\n");
      print(globalInstruction);
    } else if (cmd == "SOS") {
      _sendCommand(jsonMap);
    } else if (cmd == "CHECK_SIGNAL") {
      print("\ncheck signal call from bluetooth device\n");
      await _replySignalStatus();
    } else if (jsonMap["type"] == "ENV_GPS") {
      print("\nhhhhhhh\n");
      latitude = jsonMap["lat"];
      longitude = jsonMap["lon"];
      altitude = jsonMap["alt"];
      temprature = jsonMap["temp"];
      pressure = jsonMap["pressure"];

      print(jsonMap);
    } else if (jsonMap["type"] == "ENV") {
      temprature = jsonMap["temp"];
      pressure = jsonMap["pressure"];
    }
  }

  Future<void> _replySignalStatus() async {
    try {
      final net = await NetworkService.checkStatusOnce();
      final netStatus = net["status"]?.toString() ?? "0";
      final cellLevel = await SignalService.getCellularLevel();

      final hasSignal = netStatus == "1" || cellLevel != 0;
      if (hasSignal) {
        print("\nhas signal, summmmmmmmma\n");
        Position? position = await GPSService.getCurrentLocation();
        _sendCommand({
          "name": "Tourist 0101",
          "gateway_id": "GATEWAY_01",
          "cmd": "SOS",
          "type": "SOS",
          "device_id": "NODE_01",
          "from_phone": true,
          "lat": position?.latitude.toString(),
          "lon": position?.longitude.toString(),
          "alt": position?.altitude.toString(),
          "speed": position?.speed.toString(),
          "gyro_rms": 0.3,
          "temp": temprature,
          "pressure": pressure,
        });
      }
      final reply = {
        "type": "SIGNAL_STATUS",
        "has_signal": hasSignal,
        "net_status": netStatus,
        "cell_level": cellLevel,
      };

      BluetoothManager.instance.sendJson(reply);

      setState(() {
        _status = "Replied SIGNAL_STATUS";
        _lastJson = reply;
        _lastRawLine = json.encode(reply);
      });
    } catch (e) {
      setState(() {
        _status = "Error replying signal status: $e";
      });
    }
  }

  // Future<void> _replySignalStatus() async {
  //   try {
  //     final net = await NetworkService.checkStatusOnce();
  //     final netStatus = net["status"]?.toString() ?? "0";
  //     final cellLevel = await SignalService.getCellularLevel();

  //     // Phone considers we have usable signal if:
  //     // - true internet (netStatus == "1")
  //     // - OR some cellular level
  //     final hasSignal = netStatus == "1" || cellLevel != 0;

  //     final reply = {
  //       "type": "SIGNAL_STATUS",
  //       "has_signal": hasSignal,
  //       "net_status": netStatus,
  //       "cell_level": cellLevel,
  //     };

  //     // Only send if BT connected
  //     if (BluetoothManager.instance.isConnected) {
  //       BluetoothManager.instance.sendJson(reply);
  //     }

  //     setState(() {
  //       _status = "Replied SIGNAL_STATUS";
  //       _lastJson = reply;
  //       _lastRawLine = json.encode(reply);
  //     });
  //   } catch (e) {
  //     setState(() {
  //       _status = "Error replying signal status: $e";
  //     });
  //   }
  // }
  // ================= SEND COMMAND =====================

  Future<void> _sendCommand(Map<String, dynamic> cmd) async {
    try {
      if (cmd['cmd'] == "SOS") {
        final net = await NetworkService.checkStatusOnce();
        final level = await SignalService.getCellularLevel();
        print("\nNetwork check: $net\n");

        if (net["status"] == "1") {
          Position? position = await GPSService.getCurrentLocation();
          cmd["lat"] = position?.latitude.toString();
          cmd["lon"] = position?.longitude.toString();
          cmd["alt"] = position?.altitude.toString();
          cmd["speed"] = position?.speed.toString();
          // Cloud
          final res = await http.post(
            Uri.parse(dashboardendpoint),
            headers: {"Content-Type": "application/json"},
            body: json.encode(cmd),
          );

          print("HTTP Response: ${res.body}");
          setState(() => _status = "Sent via Internet");
          return;
        } else if (level > 0) {
          print("signal is available, send via cell signal");

          setState(() => _status = "Sent via BT (cell signal)");
          return;
        } else {
          BluetoothManager.instance.sendJson(cmd);
          setState(() => _status = "No internet or signal");
        }
      } else {
        BluetoothManager.instance.sendJson(cmd);
      }
    } catch (e) {
      setState(() => _status = "Error sending: $e");
    }
  }

  // ================= UI =============================

  @override
  Widget build(BuildContext context) {
    final isConnected = BluetoothManager.instance.isConnected;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F7FF),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.transparent,
        title: const Text(
          "YatraRaksha Dongle",
          style: TextStyle(
            color: Color(0xFF6B46C1),
            fontSize: 22,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
          ),
        ),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 16),
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              border: Border.all(
                color: isConnected
                    ? const Color(0xFF7C3AED)
                    : const Color(0xFFD1D5DB),
                width: 2,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(
              isConnected
                  ? Icons.bluetooth_connected
                  : Icons.bluetooth_disabled,
              color: isConnected
                  ? const Color(0xFF7C3AED)
                  : const Color(0xFFD1D5DB),
              size: 20,
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            children: [
              // Status Container
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  border: Border.all(
                    color: const Color(0xFFE9D5FF),
                    width: 1.5,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  color: const Color(0xFFFAF5FF),
                ),
                child: Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: _status.contains("Connected")
                            ? const Color(0xFF10B981)
                            : const Color(0xFFF59E0B),
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        "Status: $_status",
                        style: const TextStyle(
                          color: Color(0xFF6B46C1),
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Buttons Grid
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  _buildPurpleButton(
                    icon: Icons.bluetooth_searching,
                    label: isConnected ? "Change Device" : "Connect",
                    onPressed: _isConnecting ? null : _selectDeviceAndConnect,
                    isPrimary: true,
                  ),
                  if (isConnected)
                    _buildPurpleButton(
                      icon: Icons.close,
                      label: "Disconnect",
                      onPressed: () {
                        BluetoothManager.instance.disconnect();
                        setState(() => _status = "Disconnected");
                      },
                      isDanger: true,
                    ),
                  if (isConnected)
                    _buildPurpleButton(
                      icon: Icons.send,
                      label: "GET_ENV",
                      onPressed: () => _sendCommand({"cmd": "GET_ENV"}),
                    ),
                  if (isConnected)
                    _buildPurpleButton(
                      icon: Icons.place,
                      label: "GET_ENV_GPS",
                      onPressed: () => _sendCommand({"cmd": "GET_ENV_GPS"}),
                    ),
                  if (isConnected)
                    _buildPurpleButton(
                      icon: Icons.emergency,
                      label: "Send SOS (demo)",

                      onPressed: () => _sendCommand({
                        "name": "Tourist 1010",
                        "gateway_id": "GATEWAY_01",
                        "cmd": "SOS",
                        "type": "SOS",
                        "device_id": "NODE_01",
                        "from_phone": true,
                        "lat": latitude,
                        "lon": longitude,
                        "alt": altitude,
                        "speed": speed,
                        "gyro_rms": 0.3,
                        "temp": temprature,
                        "pressure": pressure,
                      }),
                      isWarning: true,
                    ),
                ],
              ),

              const SizedBox(height: 16),
              Container(
                height: 1,
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [
                      Colors.transparent,
                      const Color(0xFFE9D5FF),
                      Colors.transparent,
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),

              Expanded(
                child: ListView(
                  children: [_buildParsedView(), const SizedBox(height: 20)],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPurpleButton({
    required IconData icon,
    required String label,
    required VoidCallback? onPressed,
    bool isPrimary = false,
    bool isDanger = false,
    bool isWarning = false,
  }) {
    Color borderColor = const Color(0xFF7C3AED);
    Color textColor = const Color(0xFF6B46C1);
    Color bgColor = const Color(0xFFFAF5FF);

    if (isDanger) {
      borderColor = const Color(0xFFEC4899);
      textColor = const Color(0xFFBE123C);
      bgColor = const Color(0xFFFFF0F6);
    } else if (isWarning) {
      borderColor = const Color(0xFFF97316);
      textColor = const Color(0xFFEA580C);
      bgColor = const Color(0xFFFFF7ED);
    }

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: borderColor, width: 1.5),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Material(
        color: bgColor,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(10),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: textColor, size: 18),
                const SizedBox(width: 6),
                Text(
                  label,
                  style: TextStyle(
                    color: textColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  // ==================== JSON CARDS =====================

  Widget _buildParsedView() {
    if (_lastJson == null) {
      return Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE9D5FF), width: 1.5),
          borderRadius: BorderRadius.circular(12),
          color: const Color(0xFFFAF5FF),
        ),
        child: const Center(
          child: Text(
            "No JSON received yet.",
            style: TextStyle(
              color: Color(0xFF9333EA),
              fontSize: 14,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      );
    }

    final type = _lastJson!['type'];
    switch (type) {
      case "ENV":
        return _buildEnvCard();
      case "SOS":
      case "SOS_BUTTON":
        return _buildSosCard();
      case "ACK_SOS":
        return _buildAckCard();
      case "SIGNAL_STATUS":
        return _buildSignalStatusCard();
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE9D5FF), width: 1.5),
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFFFAF5FF),
      ),
      child: Text(
        const JsonEncoder.withIndent('  ').convert(_lastJson),
        style: const TextStyle(
          fontFamily: 'monospace',
          color: Color(0xFF6B46C1),
          fontSize: 11,
        ),
      ),
    );
  }

  // ===== ENV Card =====

  Widget _buildEnvCard() {
    final j = _lastJson!;
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE9D5FF), width: 1.5),
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFFFAF5FF),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.thermostat,
                  color: Color(0xFF7C3AED),
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Text(
                  "Environment Data",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF6B46C1),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildDataRow("Temperature", "${j['temp']} °C"),
            _buildDataRow("Pressure", "${j['pressure']} hPa"),
            if (j['lat'] != null)
              _buildDataRow(
                "GPS",
                "${j['lat']}, ${j['lon']} (alt: ${j['alt']})",
              ),
          ],
        ),
      ),
    );
  }

  // ===== SOS Card =====

  Widget _buildSosCard() {
    final j = _lastJson!;
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFFF6B6B), width: 2),
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFFFFF5F5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.emergency, color: Color(0xFFDC2626), size: 22),
                const SizedBox(width: 8),
                const Text(
                  "🚨 SOS Detected",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFFDC2626),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildDataRow(
              "Fall Detected",
              "${j['fall_detected']}",
              isDanger: true,
            ),
            _buildDataRow("Activity", "${j['activity']}", isDanger: true),
            _buildDataRow("Orientation", "${j['orientation']}", isDanger: true),
            _buildDataRow("Heading", "${j['heading_deg']}°", isDanger: true),
          ],
        ),
      ),
    );
  }

  // ===== ACK Card =====

  Widget _buildAckCard() {
    final status = _lastJson!['status'];
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFF10B981), width: 2),
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFFF0FDF4),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            const Icon(Icons.check_circle, color: Color(0xFF059669), size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                "ACK: $status",
                style: const TextStyle(
                  color: Color(0xFF065F46),
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ===== Signal Status Card =====

  Widget _buildSignalStatusCard() {
    final j = _lastJson!;
    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFF7C3AED), width: 1.5),
        borderRadius: BorderRadius.circular(12),
        color: const Color(0xFFFAF5FF),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.signal_cellular_alt,
                  color: Color(0xFF7C3AED),
                  size: 20,
                ),
                const SizedBox(width: 8),
                const Text(
                  "Signal Status",
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: Color(0xFF6B46C1),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            _buildDataRow("Has Signal", "${j['has_signal']}"),
            _buildDataRow("Network Status", "${j['net_status']}"),
            _buildDataRow("Cellular Level", "${j['cell_level']}"),
          ],
        ),
      ),
    );
  }

  Widget _buildDataRow(String label, String value, {bool isDanger = false}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              color: isDanger
                  ? const Color(0xFFDC2626)
                  : const Color(0xFF9333EA),
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              color: isDanger
                  ? const Color(0xFF991B1B)
                  : const Color(0xFF6B46C1),
              fontSize: 13,
              fontWeight: FontWeight.w700,
              fontFamily: 'monospace',
            ),
          ),
        ],
      ),
    );
  }
}

// import 'dart:convert';
// import 'package:flutter/material.dart';
// import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';
// import 'package:geolocator/geolocator.dart';
// import 'package:http/http.dart' as http;
// import 'package:mraksha/globals.dart';
// import 'package:mraksha/services/gps_services.dart';
// import 'package:mraksha/services/network_service.dart';
// import 'package:mraksha/services/signal_services.dart';
// import 'package:mraksha/services/bluetooth_manager.dart';
// import 'package:mraksha/components/devicepicker.dart';

// class BluetoothHomePage extends StatefulWidget {
//   const BluetoothHomePage({super.key});

//   @override
//   State<BluetoothHomePage> createState() => _BluetoothHomePageState();
// }

// class _BluetoothHomePageState extends State<BluetoothHomePage> {
//   final FlutterBluetoothSerial _bluetooth = FlutterBluetoothSerial.instance;

//   bool _isConnecting = false;
//   String _status = "Not connected";

//   // GPS + ENV values
//   String latitude = "0";
//   String longitude = "0";
//   String altitude = "0";
//   String temprature = "0";
//   String pressure = "0";

//   String _lastRawLine = "";
//   Map<String, dynamic>? _lastJson;

//   bool waitingForGPS = false; // <-- for fallback logic

//   @override
//   void initState() {
//     super.initState();
//     _initBluetooth();

//     // Ask node for ENV immediately
//     _sendCommand({"cmd": "GET_ENV"});

//     // Listen to incoming BT packets
//     BluetoothManager.instance.dataStream.stream.listen((event) {
//       _handleIncomingLine(event["raw"]);
//     });
//   }

//   Future<void> _initBluetooth() async {
//     try {
//       final isEnabled = await _bluetooth.isEnabled;
//       if (!(isEnabled ?? false)) {
//         await _bluetooth.requestEnable();
//       }
//     } catch (e) {
//       setState(() {
//         _status = "Bluetooth init error: $e";
//       });
//     }
//   }

//   // ================= CONNECT =====================

//   Future<void> _selectDeviceAndConnect() async {
//     setState(() {
//       _isConnecting = true;
//       _status = "Selecting device...";
//     });

//     final BluetoothDevice? selected = await showDialog(
//       context: context,
//       builder: (context) => const DevicePickerDialog(),
//     );

//     if (selected == null) {
//       setState(() {
//         _isConnecting = false;
//         _status = "Device selection cancelled";
//       });
//       return;
//     }

//     setState(() {
//       _status = "Connecting to ${selected.name ?? selected.address}...";
//     });

//     final ok = await BluetoothManager.instance.connect(selected.address);

//     if (!mounted) return;

//     setState(() {
//       _isConnecting = false;
//       _status = ok
//           ? "Connected to ${selected.name ?? selected.address}"
//           : "Connection failed";
//     });
//   }

//   // ================= INCOMING DATA =====================

//   void _handleIncomingLine(String line) {
//     Map<String, dynamic>? parsed;

//     try {
//       parsed = json.decode(line);
//       if (parsed is! Map<String, dynamic>) parsed = null;
//     } catch (_) {
//       parsed = null;
//     }

//     if (parsed != null) {
//       _handleJsonFromDevice(parsed);
//     }

//     if (!mounted) return;

//     setState(() {
//       _lastRawLine = line;
//       _lastJson = parsed;
//       _status = parsed != null
//           ? "Received JSON: ${parsed['type'] ?? parsed['cmd'] ?? '-'}"
//           : "Received non-JSON data";
//     });
//   }

//   Future<void> _handleJsonFromDevice(Map<String, dynamic> jsonMap) async {
//     final cmd = jsonMap["cmd"];

//     if (cmd == "SOS") {
//       _sendCommand(jsonMap);
//       return;
//     }

//     if (cmd == "CHECK_SIGNAL") {
//       await _replySignalStatus();
//       return;
//     }

//     if (jsonMap["type"] == "ENV_GPS") {
//       // Node’s GPS fallback
//       latitude = jsonMap["lat"];
//       longitude = jsonMap["lon"];
//       altitude = jsonMap["alt"];
//       temprature = jsonMap["temp"];
//       pressure = jsonMap["pressure"];

//       waitingForGPS = false;
//       return;
//     }

//     if (jsonMap["type"] == "ENV") {
//       temprature = jsonMap["temp"];
//       pressure = jsonMap["pressure"];
//     }
//   }

//   // ================= REPLY SIGNAL STATUS =====================

//   Future<void> _replySignalStatus() async {
//     try {
//       final net = await NetworkService.checkStatusOnce();
//       final netStatus = net["status"]?.toString() ?? "0";
//       final cellLevel = await SignalService.getCellularLevel();

//       bool hasSignal = netStatus == "1" || cellLevel != 0;

//       String usedLat = latitude;
//       String usedLon = longitude;
//       String usedAlt = altitude;
//       String usedSpeed = "0";

//       // Try GPS first
//       Position? position = await GPSService.getCurrentLocation();

//       if (position == null) {
//         // GPS failed → fallback to node → request GPS from dongle
//         if (BluetoothManager.instance.isConnected) {
//           waitingForGPS = true;
//           _sendCommand({"cmd": "GET_ENV_GPS"});
//         }

//         // Use last known node GPS value if available
//       } else {
//         usedLat = position.latitude.toString();
//         usedLon = position.longitude.toString();
//         usedAlt = position.altitude.toString();
//         usedSpeed = position.speed.toString();
//       }

//       // Prepare SOS reply
//       if (hasSignal) {
//         _sendCommand({
//           "gateway_id": "GATEWAY_01",
//           "cmd": "SOS",
//           "type": "SOS",
//           "device_id": "NODE_01",
//           "from_phone": true,
//           "lat": usedLat,
//           "lon": usedLon,
//           "alt": usedAlt,
//           "speed": usedSpeed,
//           "gyro_rms": 0.3,
//           "temp": temprature,
//           "pressure": pressure,
//         });
//       }

//       final reply = {
//         "type": "SIGNAL_STATUS",
//         "has_signal": hasSignal,
//         "net_status": netStatus,
//         "cell_level": cellLevel,
//       };

//       BluetoothManager.instance.sendJson(reply);

//       setState(() {
//         _status = "Replied SIGNAL_STATUS";
//         _lastJson = reply;
//         _lastRawLine = json.encode(reply);
//       });
//     } catch (e) {
//       setState(() {
//         _status = "Error replying signal status: $e";
//       });
//     }
//   }

//   // ================= SEND COMMAND =====================

//   Future<void> _sendCommand(Map<String, dynamic> cmd) async {
//     try {
//       if (cmd['cmd'] == "SOS") {
//         final net = await NetworkService.checkStatusOnce();

//         if (net["status"] == "1") {
//           final res = await http.post(
//             Uri.parse(dashboardendpoint),
//             headers: {"Content-Type": "application/json"},
//             body: json.encode(cmd),
//           );

//           setState(() => _status = "Sent via Internet");
//           return;
//         }

//         final level = await SignalService.getCellularLevel();

//         if (level != 0) {
//           setState(() => _status = "Sent via BT (cell signal)");
//           return;
//         }

//         BluetoothManager.instance.sendJson(cmd);
//         setState(() => _status = "No internet or signal");
//       } else {
//         BluetoothManager.instance.sendJson(cmd);
//       }
//     } catch (e) {
//       setState(() => _status = "Error sending: $e");
//     }
//   }

//   // ================= UI =============================

//   @override
//   Widget build(BuildContext context) {
//     final isConnected = BluetoothManager.instance.isConnected;

//     return Scaffold(
//       backgroundColor: const Color(0xFFF8F7FF),
//       appBar: AppBar(
//         elevation: 0,
//         backgroundColor: Colors.transparent,
//         title: const Text(
//           "YatraRaksha Dongle",
//           style: TextStyle(
//             color: Color(0xFF6B46C1),
//             fontSize: 22,
//             fontWeight: FontWeight.w700,
//             letterSpacing: 0.5,
//           ),
//         ),
//         actions: [
//           Container(
//             margin: const EdgeInsets.only(right: 16),
//             padding: const EdgeInsets.all(8),
//             decoration: BoxDecoration(
//               border: Border.all(
//                 color: isConnected
//                     ? const Color(0xFF7C3AED)
//                     : const Color(0xFFD1D5DB),
//                 width: 2,
//               ),
//               borderRadius: BorderRadius.circular(8),
//             ),
//             child: Icon(
//               isConnected
//                   ? Icons.bluetooth_connected
//                   : Icons.bluetooth_disabled,
//               color: isConnected
//                   ? const Color(0xFF7C3AED)
//                   : const Color(0xFFD1D5DB),
//               size: 20,
//             ),
//           ),
//         ],
//       ),
//       body: SafeArea(
//         child: Padding(
//           padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
//           child: Column(
//             children: [
//               // Status Container
//               Container(
//                 padding: const EdgeInsets.all(14),
//                 decoration: BoxDecoration(
//                   border: Border.all(
//                     color: const Color(0xFFE9D5FF),
//                     width: 1.5,
//                   ),
//                   borderRadius: BorderRadius.circular(12),
//                   color: const Color(0xFFFAF5FF),
//                 ),
//                 child: Row(
//                   children: [
//                     Container(
//                       width: 8,
//                       height: 8,
//                       decoration: BoxDecoration(
//                         color: _status.contains("Connected")
//                             ? const Color(0xFF10B981)
//                             : const Color(0xFFF59E0B),
//                         borderRadius: BorderRadius.circular(4),
//                       ),
//                     ),
//                     const SizedBox(width: 10),
//                     Expanded(
//                       child: Text(
//                         "Status: $_status",
//                         style: const TextStyle(
//                           color: Color(0xFF6B46C1),
//                           fontSize: 13,
//                           fontWeight: FontWeight.w500,
//                         ),
//                       ),
//                     ),
//                   ],
//                 ),
//               ),
//               const SizedBox(height: 16),

//               // Buttons Grid
//               Wrap(
//                 spacing: 10,
//                 runSpacing: 10,
//                 children: [
//                   _buildPurpleButton(
//                     icon: Icons.bluetooth_searching,
//                     label: isConnected ? "Change Device" : "Connect",
//                     onPressed: _isConnecting ? null : _selectDeviceAndConnect,
//                     isPrimary: true,
//                   ),
//                   if (isConnected)
//                     _buildPurpleButton(
//                       icon: Icons.close,
//                       label: "Disconnect",
//                       onPressed: () {
//                         BluetoothManager.instance.disconnect();
//                         setState(() => _status = "Disconnected");
//                       },
//                       isDanger: true,
//                     ),
//                   if (isConnected)
//                     _buildPurpleButton(
//                       icon: Icons.send,
//                       label: "GET_ENV",
//                       onPressed: () => _sendCommand({"cmd": "GET_ENV"}),
//                     ),
//                   if (isConnected)
//                     _buildPurpleButton(
//                       icon: Icons.place,
//                       label: "GET_ENV_GPS",
//                       onPressed: () => _sendCommand({"cmd": "GET_ENV_GPS"}),
//                     ),
//                   if (isConnected)
//                     _buildPurpleButton(
//                       icon: Icons.emergency,
//                       label: "Send SOS (demo)",
//                       onPressed: () async {
//                         // Same patched GPS fallback as above
//                         Position? position =
//                             await GPSService.getCurrentLocation();

//                         String usedLat = latitude;
//                         String usedLon = longitude;
//                         String usedAlt = altitude;
//                         String usedSpeed = "0";

//                         if (position == null) {
//                           if (BluetoothManager.instance.isConnected) {
//                             waitingForGPS = true;
//                             _sendCommand({"cmd": "GET_ENV_GPS"});
//                           }
//                         } else {
//                           usedLat = position.latitude.toString();
//                           usedLon = position.longitude.toString();
//                           usedAlt = position.altitude.toString();
//                           usedSpeed = position.speed.toString();
//                         }

//                         _sendCommand({
//                           "gateway_id": "GATEWAY_01",
//                           "cmd": "SOS",
//                           "type": "SOS",
//                           "device_id": "NODE_01",
//                           "from_phone": true,
//                           "lat": usedLat,
//                           "lon": usedLon,
//                           "alt": usedAlt,
//                           "speed": usedSpeed,
//                           "gyro_rms": 0.3,
//                           "temp": temprature,
//                           "pressure": pressure,
//                         });
//                       },
//                       isWarning: true,
//                     ),
//                 ],
//               ),

//               const SizedBox(height: 16),
//               Container(
//                 height: 1,
//                 decoration: BoxDecoration(
//                   gradient: LinearGradient(
//                     colors: [
//                       Colors.transparent,
//                       const Color(0xFFE9D5FF),
//                       Colors.transparent,
//                     ],
//                   ),
//                 ),
//               ),
//               const SizedBox(height: 16),

//               Expanded(
//                 child: ListView(
//                   children: [_buildParsedView(), const SizedBox(height: 20)],
//                 ),
//               ),
//             ],
//           ),
//         ),
//       ),
//     );
//   }

//   Widget _buildPurpleButton({
//     required IconData icon,
//     required String label,
//     required VoidCallback? onPressed,
//     bool isPrimary = false,
//     bool isDanger = false,
//     bool isWarning = false,
//   }) {
//     Color borderColor = const Color(0xFF7C3AED);
//     Color textColor = const Color(0xFF6B46C1);
//     Color bgColor = const Color(0xFFFAF5FF);

//     if (isDanger) {
//       borderColor = const Color(0xFFEC4899);
//       textColor = const Color(0xFFBE123C);
//       bgColor = const Color(0xFFFFF0F6);
//     } else if (isWarning) {
//       borderColor = const Color(0xFFF97316);
//       textColor = const Color(0xFFEA580C);
//       bgColor = const Color(0xFFFFF7ED);
//     }

//     return Container(
//       decoration: BoxDecoration(
//         border: Border.all(color: borderColor, width: 1.5),
//         borderRadius: BorderRadius.circular(10),
//       ),
//       child: Material(
//         color: bgColor,
//         borderRadius: BorderRadius.circular(10),
//         child: InkWell(
//           onTap: onPressed,
//           borderRadius: BorderRadius.circular(10),
//           child: Padding(
//             padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
//             child: Row(
//               mainAxisSize: MainAxisSize.min,
//               children: [
//                 Icon(icon, color: textColor, size: 18),
//                 const SizedBox(width: 6),
//                 Text(
//                   label,
//                   style: TextStyle(
//                     color: textColor,
//                     fontWeight: FontWeight.w600,
//                     fontSize: 12,
//                   ),
//                 ),
//               ],
//             ),
//           ),
//         ),
//       ),
//     );
//   }

//   // ==================== JSON CARDS =====================

//   Widget _buildParsedView() {
//     if (_lastJson == null) {
//       return Container(
//         padding: const EdgeInsets.all(20),
//         decoration: BoxDecoration(
//           border: Border.all(color: const Color(0xFFE9D5FF), width: 1.5),
//           borderRadius: BorderRadius.circular(12),
//           color: const Color(0xFFFAF5FF),
//         ),
//         child: const Center(
//           child: Text(
//             "No JSON received yet.",
//             style: TextStyle(
//               color: Color(0xFF9333EA),
//               fontSize: 14,
//               fontStyle: FontStyle.italic,
//             ),
//           ),
//         ),
//       );
//     }

//     final type = _lastJson!['type'];
//     switch (type) {
//       case "ENV":
//         return _buildEnvCard();
//       case "SOS":
//       case "SOS_BUTTON":
//         return _buildSosCard();
//       case "ACK_SOS":
//         return _buildAckCard();
//       case "SIGNAL_STATUS":
//         return _buildSignalStatusCard();
//     }

//     return Container(
//       padding: const EdgeInsets.all(12),
//       decoration: BoxDecoration(
//         border: Border.all(color: const Color(0xFFE9D5FF), width: 1.5),
//         borderRadius: BorderRadius.circular(12),
//         color: const Color(0xFFFAF5FF),
//       ),
//       child: Text(
//         const JsonEncoder.withIndent('  ').convert(_lastJson),
//         style: const TextStyle(
//           fontFamily: 'monospace',
//           color: Color(0xFF6B46C1),
//           fontSize: 11,
//         ),
//       ),
//     );
//   }

//   // ===== ENV Card =====

//   Widget _buildEnvCard() {
//     final j = _lastJson!;
//     return Container(
//       decoration: BoxDecoration(
//         border: Border.all(color: const Color(0xFFE9D5FF), width: 1.5),
//         borderRadius: BorderRadius.circular(12),
//         color: const Color(0xFFFAF5FF),
//       ),
//       child: Padding(
//         padding: const EdgeInsets.all(16),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Row(
//               children: [
//                 const Icon(
//                   Icons.thermostat,
//                   color: Color(0xFF7C3AED),
//                   size: 20,
//                 ),
//                 const SizedBox(width: 8),
//                 const Text(
//                   "Environment Data",
//                   style: TextStyle(
//                     fontSize: 16,
//                     fontWeight: FontWeight.w700,
//                     color: Color(0xFF6B46C1),
//                   ),
//                 ),
//               ],
//             ),
//             const SizedBox(height: 12),
//             _buildDataRow("Temperature", "${j['temp']} °C"),
//             _buildDataRow("Pressure", "${j['pressure']} hPa"),
//             if (j['lat'] != null)
//               _buildDataRow(
//                 "GPS",
//                 "${j['lat']}, ${j['lon']} (alt: ${j['alt']})",
//               ),
//           ],
//         ),
//       ),
//     );
//   }

//   // ===== SOS Card =====

//   Widget _buildSosCard() {
//     final j = _lastJson!;
//     return Container(
//       decoration: BoxDecoration(
//         border: Border.all(color: const Color(0xFFFF6B6B), width: 2),
//         borderRadius: BorderRadius.circular(12),
//         color: const Color(0xFFFFF5F5),
//       ),
//       child: Padding(
//         padding: const EdgeInsets.all(16),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Row(
//               children: [
//                 const Icon(Icons.emergency, color: Color(0xFFDC2626), size: 22),
//                 const SizedBox(width: 8),
//                 const Text(
//                   "🚨 SOS Detected",
//                   style: TextStyle(
//                     fontSize: 16,
//                     fontWeight: FontWeight.w700,
//                     color: Color(0xFFDC2626),
//                   ),
//                 ),
//               ],
//             ),
//             const SizedBox(height: 12),
//             _buildDataRow(
//               "Fall Detected",
//               "${j['fall_detected']}",
//               isDanger: true,
//             ),
//             _buildDataRow("Activity", "${j['activity']}", isDanger: true),
//             _buildDataRow("Orientation", "${j['orientation']}", isDanger: true),
//             _buildDataRow("Heading", "${j['heading_deg']}°", isDanger: true),
//           ],
//         ),
//       ),
//     );
//   }

//   // ===== ACK Card =====

//   Widget _buildAckCard() {
//     final status = _lastJson!['status'];
//     return Container(
//       decoration: BoxDecoration(
//         border: Border.all(color: const Color(0xFF10B981), width: 2),
//         borderRadius: BorderRadius.circular(12),
//         color: const Color(0xFFF0FDF4),
//       ),
//       child: Padding(
//         padding: const EdgeInsets.all(16),
//         child: Row(
//           children: [
//             const Icon(Icons.check_circle, color: Color(0xFF059669), size: 24),
//             const SizedBox(width: 12),
//             Expanded(
//               child: Text(
//                 "ACK: $status",
//                 style: const TextStyle(
//                   color: Color(0xFF065F46),
//                   fontWeight: FontWeight.w600,
//                   fontSize: 14,
//                 ),
//               ),
//             ),
//           ],
//         ),
//       ),
//     );
//   }

//   // ===== Signal Status Card =====

//   Widget _buildSignalStatusCard() {
//     final j = _lastJson!;
//     return Container(
//       decoration: BoxDecoration(
//         border: Border.all(color: const Color(0xFF7C3AED), width: 1.5),
//         borderRadius: BorderRadius.circular(12),
//         color: const Color(0xFFFAF5FF),
//       ),
//       child: Padding(
//         padding: const EdgeInsets.all(16),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             Row(
//               children: [
//                 const Icon(
//                   Icons.signal_cellular_alt,
//                   color: Color(0xFF7C3AED),
//                   size: 20,
//                 ),
//                 const SizedBox(width: 8),
//                 const Text(
//                   "Signal Status",
//                   style: TextStyle(
//                     fontSize: 16,
//                     fontWeight: FontWeight.w700,
//                     color: Color(0xFF6B46C1),
//                   ),
//                 ),
//               ],
//             ),
//             const SizedBox(height: 12),
//             _buildDataRow("Has Signal", "${j['has_signal']}"),
//             _buildDataRow("Network Status", "${j['net_status']}"),
//             _buildDataRow("Cellular Level", "${j['cell_level']}"),
//           ],
//         ),
//       ),
//     );
//   }

//   Widget _buildDataRow(String label, String value, {bool isDanger = false}) {
//     return Padding(
//       padding: const EdgeInsets.only(bottom: 8),
//       child: Row(
//         mainAxisAlignment: MainAxisAlignment.spaceBetween,
//         children: [
//           Text(
//             label,
//             style: TextStyle(
//               color: isDanger
//                   ? const Color(0xFFDC2626)
//                   : const Color(0xFF9333EA),
//               fontSize: 13,
//               fontWeight: FontWeight.w500,
//             ),
//           ),
//           Text(
//             value,
//             style: TextStyle(
//               color: isDanger
//                   ? const Color(0xFF991B1B)
//                   : const Color(0xFF6B46C1),
//               fontSize: 13,
//               fontWeight: FontWeight.w700,
//               fontFamily: 'monospace',
//             ),
//           ),
//         ],
//       ),
//     );
//   }
// }
