// import 'dart:convert';
// import 'package:flutter/material.dart';
// import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';
// import 'package:http/http.dart' as http;
// import 'package:mraksha/globals.dart';
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

//   String _lastRawLine = "";
//   Map<String, dynamic>? _lastJson;

//   @override
//   void initState() {
//     super.initState();
//     _initBluetooth();

//     // 🔥 Listen to BTManager stream
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

//   // ================= HANDLE JSON =======================

//   Future<void> _handleJsonFromDevice(Map<String, dynamic> jsonMap) async {
//     final cmd = jsonMap["cmd"];

//     if (cmd == "CHECK_SIGNAL") {
//       await _replySignalStatus();
//     }
//   }

//   Future<void> _replySignalStatus() async {
//     try {
//       final net = await NetworkService.checkStatusOnce();
//       final netStatus = net["status"]?.toString() ?? "0";
//       final cellLevel = await SignalService.getCellularLevel();

//       final hasSignal = netStatus == "1" || cellLevel != 0;

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
//       final net = await NetworkService.checkStatusOnce();
//       print("Network check: $net");

//       if (net["status"] == "1") {
//         // Cloud
//         final res = await http.post(
//           Uri.parse(dashboardendpoint),
//           headers: {"Content-Type": "application/json"},
//           body: json.encode(cmd),
//         );

//         print("HTTP Response: ${res.body}");
//         setState(() => _status = "Sent via Internet");
//         return;
//       }

//       final level = await SignalService.getCellularLevel();

//       if (level != 0) {
//         BluetoothManager.instance.sendJson(cmd);
//         setState(() => _status = "Sent via BT (cell signal)");
//         return;
//       }

//       setState(() => _status = "No internet or signal");
//     } catch (e) {
//       setState(() => _status = "Error sending: $e");
//     }
//   }

//   // ================= UI =============================

//   @override
//   Widget build(BuildContext context) {
//     final isConnected = BluetoothManager.instance.isConnected;

//     return Scaffold(
//       appBar: AppBar(
//         title: const Text("YatraRaksha Dongle"),
//         actions: [
//           Icon(
//             isConnected ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
//             color: isConnected ? Colors.lightBlueAccent : Colors.redAccent,
//           ),
//           const SizedBox(width: 12),
//         ],
//       ),

//       body: SafeArea(
//         child: Padding(
//           padding: const EdgeInsets.all(12),
//           child: Column(
//             children: [
//               Text(
//                 "Status: $_status",
//                 style: const TextStyle(color: Colors.grey),
//               ),
//               const SizedBox(height: 8),

//               Wrap(
//                 spacing: 10,
//                 runSpacing: 10,
//                 children: [
//                   ElevatedButton.icon(
//                     onPressed: _isConnecting ? null : _selectDeviceAndConnect,
//                     icon: const Icon(Icons.bluetooth_searching),
//                     label: Text(isConnected ? "Change Device" : "Connect"),
//                   ),

//                   if (isConnected)
//                     ElevatedButton.icon(
//                       style: ElevatedButton.styleFrom(
//                         backgroundColor: Colors.redAccent,
//                       ),
//                       onPressed: () {
//                         BluetoothManager.instance.disconnect();
//                         setState(() => _status = "Disconnected");
//                       },
//                       icon: const Icon(Icons.close),
//                       label: const Text("Disconnect"),
//                     ),

//                   if (isConnected)
//                     ElevatedButton.icon(
//                       icon: const Icon(Icons.send),
//                       label: const Text("GET_ENV"),
//                       onPressed: () => _sendCommand({"cmd": "GET_ENV"}),
//                     ),

//                   if (isConnected)
//                     ElevatedButton.icon(
//                       icon: const Icon(Icons.place),
//                       label: const Text("GET_ENV_GPS"),
//                       onPressed: () => _sendCommand({"cmd": "GET_ENV_GPS"}),
//                     ),

//                   if (isConnected)
//                     ElevatedButton.icon(
//                       icon: const Icon(Icons.emergency),
//                       label: const Text("Send SOS (demo)"),
//                       style: ElevatedButton.styleFrom(
//                         backgroundColor: Colors.orangeAccent,
//                       ),
//                       onPressed: () => _sendCommand({
//                         "cmd": "SOS",
//                         "fall_detected": true,
//                         "activity": "walking",
//                         "orientation": "upright",
//                         "heading_deg": 120.0,
//                         "accel_rms": 0.5,
//                         "gyro_rms": 0.3,
//                         "phone_battery": 78,
//                       }),
//                     ),
//                 ],
//               ),

//               const SizedBox(height: 12),
//               const Divider(),

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

//   // ==================== JSON CARDS =====================

//   Widget _buildParsedView() {
//     if (_lastJson == null) {
//       return const Text("No JSON received yet.");
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

//     return Text(
//       const JsonEncoder.withIndent('  ').convert(_lastJson),
//       style: const TextStyle(fontFamily: 'monospace'),
//     );
//   }

//   // ===== ENV Card =====

//   Widget _buildEnvCard() {
//     final j = _lastJson!;
//     return Card(
//       child: Padding(
//         padding: const EdgeInsets.all(12),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             const Text(
//               "Environment",
//               style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
//             ),
//             Text("Temp: ${j['temp']} °C"),
//             Text("Pressure: ${j['pressure']} hPa"),
//             if (j['lat'] != null)
//               Text("GPS: ${j['lat']}, ${j['lon']} (alt: ${j['alt']})"),
//           ],
//         ),
//       ),
//     );
//   }

//   // ===== SOS Card =====

//   Widget _buildSosCard() {
//     final j = _lastJson!;
//     return Card(
//       color: Colors.red.withOpacity(.08),
//       child: Padding(
//         padding: const EdgeInsets.all(12),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             const Text(
//               "🚨 SOS Detected",
//               style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
//             ),
//             Text("Fall: ${j['fall_detected']}"),
//             Text("Activity: ${j['activity']}"),
//             Text("Orientation: ${j['orientation']}"),
//             Text("Heading: ${j['heading_deg']}"),
//           ],
//         ),
//       ),
//     );
//   }

//   // ===== ACK Card =====

//   Widget _buildAckCard() {
//     final status = _lastJson!['status'];
//     return Card(
//       color: Colors.green.withOpacity(.15),
//       child: Padding(
//         padding: const EdgeInsets.all(12),
//         child: Row(
//           children: [
//             const Icon(Icons.check_circle, color: Colors.green),
//             const SizedBox(width: 8),
//             Text("ACK: $status"),
//           ],
//         ),
//       ),
//     );
//   }

//   // ===== Signal Status Card =====

//   Widget _buildSignalStatusCard() {
//     final j = _lastJson!;
//     return Card(
//       child: Padding(
//         padding: const EdgeInsets.all(12),
//         child: Column(
//           crossAxisAlignment: CrossAxisAlignment.start,
//           children: [
//             const Text(
//               "Signal Status",
//               style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
//             ),
//             Text("Has signal: ${j['has_signal']}"),
//             Text("Net status: ${j['net_status']}"),
//             Text("Cellular: ${j['cell_level']}"),
//           ],
//         ),
//       ),
//     );
//   }
// }

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';
import 'package:http/http.dart' as http;
import 'package:mraksha/globals.dart';
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

  String _lastRawLine = "";
  Map<String, dynamic>? _lastJson;

  @override
  void initState() {
    super.initState();
    _initBluetooth();

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

  // ================= HANDLE JSON =======================

  Future<void> _handleJsonFromDevice(Map<String, dynamic> jsonMap) async {
    final cmd = jsonMap["cmd"];

    if (cmd == "CHECK_SIGNAL") {
      await _replySignalStatus();
    }
  }

  Future<void> _replySignalStatus() async {
    try {
      final net = await NetworkService.checkStatusOnce();
      final netStatus = net["status"]?.toString() ?? "0";
      final cellLevel = await SignalService.getCellularLevel();

      final hasSignal = netStatus == "1" || cellLevel != 0;

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

  // ================= SEND COMMAND =====================

  Future<void> _sendCommand(Map<String, dynamic> cmd) async {
    try {
      final net = await NetworkService.checkStatusOnce();

      print("\nNetwork check: $net\n");

      if (net["status"] == "1") {
        // Cloud
        final res = await http.post(
          Uri.parse(dashboardendpoint),
          headers: {"Content-Type": "application/json"},
          body: json.encode(cmd),
        );

        print("HTTP Response: ${res.body}");
        setState(() => _status = "Sent via Internet");
        return;
      }

      final level = await SignalService.getCellularLevel();

      if (level != 0) {
        BluetoothManager.instance.sendJson(cmd);
        setState(() => _status = "Sent via BT (cell signal)");
        return;
      }

      setState(() => _status = "No internet or signal");
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
                        "cmd": "SOS",
                        "fall_detected": true,
                        "activity": "walking",
                        "orientation": "upright",
                        "heading_deg": 120.0,
                        "accel_rms": 0.5,
                        "gyro_rms": 0.3,
                        "phone_battery": 78,
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
