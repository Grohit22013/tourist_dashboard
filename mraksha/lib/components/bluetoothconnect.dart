import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';
import 'package:mraksha/globals.dart';
import 'package:mraksha/services/network_service.dart';
import 'package:mraksha/services/signal_services.dart';
import 'package:mraksha/components/devicepicker.dart';

class BluetoothHomePage extends StatefulWidget {
  const BluetoothHomePage({super.key});

  @override
  State<BluetoothHomePage> createState() => _BluetoothHomePageState();
}

class _BluetoothHomePageState extends State<BluetoothHomePage> {
  final FlutterBluetoothSerial _bluetooth = FlutterBluetoothSerial.instance;

  BluetoothConnection? _connection;
  BluetoothDevice? _device;
  bool _isConnecting = false;
  bool _isConnected = false;

  String _status = "Not connected";
  String _lastRawLine = "";
  Map<String, dynamic>? _lastJson;

  // Buffer for incoming data until '\n'
  String _incomingBuffer = "";

  @override
  void initState() {
    super.initState();
    _initBluetooth();
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

  Future<void> _selectDeviceAndConnect() async {
    try {
      setState(() {
        _isConnecting = true;
        _status = "Selecting device...";
      });

      final BluetoothDevice? selectedDevice = await showDialog<BluetoothDevice>(
        context: context,
        builder: (context) => const DevicePickerDialog(),
      );

      if (selectedDevice == null) {
        setState(() {
          _isConnecting = false;
          _status = "Device selection cancelled";
        });
        return;
      }

      _device = selectedDevice;

      setState(() {
        _status = "Connecting to ${_device!.name ?? _device!.address}...";
      });

      final connection = await BluetoothConnection.toAddress(_device!.address);

      // connection success
      if (!mounted) return;
      setState(() {
        _connection = connection;
        _isConnecting = false;
        _isConnected = true;
        _status = "Connected to ${_device!.name ?? _device!.address}";
      });

      _listenToData(connection);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isConnecting = false;
        _isConnected = false;
        _status = "Connection failed: $e";
      });
    }
  }

  void _listenToData(BluetoothConnection connection) {
    // ensure any previous listeners are cancelled
    connection.input?.listen(
      (Uint8List data) {
        // convert bytes to string chunk
        final chunk = String.fromCharCodes(data);
        _incomingBuffer += chunk;

        int index;
        while ((index = _incomingBuffer.indexOf('\n')) != -1) {
          final line = _incomingBuffer.substring(0, index).trim();
          _incomingBuffer = _incomingBuffer.substring(index + 1);
          if (line.isEmpty) continue;
          _handleLine(line);
        }
      },
      onDone: () {
        // remote closed connection
        if (!mounted) return;
        setState(() {
          _isConnected = false;
          _status = "Disconnected from ${_device?.name ?? 'device'}";
        });
        // dispose connection reference
        _connection = null;
      },
      onError: (err) {
        if (!mounted) return;
        setState(() {
          _isConnected = false;
          _status = "Connection error: $err";
        });
        _connection = null;
      },
    );
  }

  void _handleLine(String line) {
    print("\nReached \n");
    Map<String, dynamic>? parsed;
    try {
      final jsonData = json.decode(line);
      if (jsonData is Map<String, dynamic>) parsed = jsonData;
    } catch (_) {
      parsed = null;
    }

    // 🔍 NEW: handle commands from dongle (e.g., CHECK_SIGNAL)
    if (parsed != null) {
      _handleJsonFromDevice(parsed);
    }

    if (!mounted) return;
    setState(() {
      _lastRawLine = line;
      if (parsed != null) {
        _lastJson = parsed;
        final t = parsed['type'] ?? parsed['cmd'] ?? 'unknown';
        _status = "Received JSON: $t";
      } else {
        _status = "Received non-JSON line";
      }
    });
  }

  // NEW: async handler so we can await NetworkService / SignalService
  Future<void> _handleJsonFromDevice(Map<String, dynamic> parsed) async {
    final String? cmd = parsed['cmd']?.toString();
    print("\nreached here1\n");
    // ESP32 asks: "Do you have signal?"
    if (cmd == 'CHECK_SIGNAL') {
      try {
        // 1) Check network status
        final net = await NetworkService.checkStatusOnce();
        final netStatus = net["status"]?.toString() ?? "0";

        // FIX: Await cellular level BEFORE using it
        final int cellLevel = await SignalService.getCellularLevel();

        bool hasSignal;
        if (netStatus == "1") {
          print("internet check from esp");
          hasSignal = true;
        } else if (cellLevel != 0) {
          print("signal check from esp");
          hasSignal = true;
        } else {
          hasSignal = false;
        }

        // 2) Build reply JSON
        final reply = <String, dynamic>{
          "type": "SIGNAL_STATUS",
          "has_signal": hasSignal,
          "net_status": netStatus,
          "cell_level": cellLevel,
        };

        final jsonStr = json.encode(reply);

        // 3) Send reply to ESP32
        if (_connection != null && _isConnected) {
          _connection!.output.add(utf8.encode("$jsonStr\n"));
          await _connection!.output.allSent;
        }
        if (hasSignal) {
          _sendCommand({
            "cmd": "SOS",
            "fall_detected": true,
            "activity": "walking",
            "orientation": "upright",
            "heading_deg": 120.0,
            "accel_rms": 0.5,
            "gyro_rms": 0.3,
            "phone_battery": 78,
          });
        }

        print(jsonStr);

        if (!mounted) return;
        setState(() {
          _status = "Replied SIGNAL_STATUS: $hasSignal";
          _lastJson = reply;
          _lastRawLine = jsonStr;
        });
      } catch (e) {
        if (!mounted) return;
        setState(() {
          _status = "Error replying SIGNAL_STATUS: $e";
        });
      }

      return;
    }

    // For other messages, nothing special here (UI handled in _buildParsedView)
  }

  Future<void> _sendCommand(Map<String, dynamic> cmd) async {
    if (!_isConnected || _connection == null) {
      setState(() {
        _status = "Not connected to ESP";
      });
      return;
    }

    try {
      // 🔍 1️⃣ Check network once
      final net = await NetworkService.checkStatusOnce();

      print("Network check: $net");

      if (net["status"] == "1") {
        // 📡 2️⃣ Internet available → Send via HTTP
        try {
          final response = await http.post(
            Uri.parse(dashboardendpoint),
            headers: {"Content-Type": "application/json"},
            body: json.encode(cmd),
          );

          print("HTTP Response: ${response.body}");
          setState(() => _status = "Sent via Internet");
        } catch (e) {
          print("HTTP Error: $e");
        }

        return; // STOP here
      }

      // 📶 3️⃣ No internet → Check cellular signal
      if (SignalService.getCellularLevel() != 0) {
        print("No internet but cellular signal available → send using BT");

        final String jsonStr = json.encode(cmd);
        _connection!.output.add(utf8.encode("$jsonStr\n"));
        await _connection!.output.allSent;

        setState(() {
          _status = "Sent via Cellular (BT)";
        });

        return;
      }

      // ❌ 4️⃣ No internet + No signal
      print("No internet, no signal — message cannot be sent");
      setState(() {
        _status = "No internet & No signal";
      });
    } catch (e) {
      print("Send Error: $e");
      setState(() => _status = "Error: $e");
    }
  }

  void _disconnect() {
    try {
      _connection?.dispose();
    } catch (_) {}
    _connection = null;
    if (!mounted) return;
    setState(() {
      _isConnected = false;
      _status = "Disconnected";
    });
  }

  @override
  void dispose() {
    _disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lastType =
        _lastJson?['type']?.toString() ?? _lastJson?['cmd']?.toString() ?? '-';

    return Scaffold(
      appBar: AppBar(
        title: const Text('YatraRaksha Dongle'),
        actions: [
          Icon(
            _isConnected ? Icons.bluetooth_connected : Icons.bluetooth_disabled,
            color: _isConnected ? Colors.lightBlueAccent : Colors.redAccent,
          ),
          const SizedBox(width: 12),
        ],
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status
              Text(
                "Status: $_status",
                style: const TextStyle(fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 8),

              // Make top controls responsive: use Wrap so buttons wrap to next line
              Wrap(
                runSpacing: 8,
                spacing: 8,
                children: [
                  ConstrainedBox(
                    constraints: const BoxConstraints(minWidth: 140),
                    child: ElevatedButton.icon(
                      onPressed: _isConnecting ? null : _selectDeviceAndConnect,
                      icon: const Icon(Icons.bluetooth_searching),
                      label: Text(
                        _isConnected ? "Change Device" : "Connect",
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ),
                  if (_isConnected)
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 120),
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.redAccent,
                        ),
                        onPressed: _disconnect,
                        icon: const Icon(Icons.close),
                        label: const Text("Disconnect"),
                      ),
                    ),
                  if (_isConnected)
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 140),
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.send),
                        label: const Text("GET_ENV"),
                        onPressed: () => _sendCommand({"cmd": "GET_ENV"}),
                      ),
                    ),
                  if (_isConnected)
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 160),
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.my_location),
                        label: const Text("GET_ENV_GPS"),
                        onPressed: () => _sendCommand({"cmd": "GET_ENV_GPS"}),
                      ),
                    ),
                  if (_isConnected)
                    ConstrainedBox(
                      constraints: const BoxConstraints(minWidth: 140),
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.emergency),
                        label: const Text("Send SOS (demo)"),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.orangeAccent,
                        ),
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
                      ),
                    ),
                ],
              ),

              const SizedBox(height: 12),
              const Divider(),

              // Last message type
              Text(
                "Last message type: $lastType",
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 12),

              // Scrollable area (prevents overflow)
              Expanded(
                child: ListView(
                  children: [
                    _buildParsedView(),
                    const SizedBox(height: 16),
                    const Divider(),
                    const Text(
                      "Raw last line:",
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    SelectableText(
                      _lastRawLine,
                      style: const TextStyle(
                        fontFamily: 'monospace',
                        fontSize: 12,
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildParsedView() {
    if (_lastJson == null) {
      return const Padding(
        padding: EdgeInsets.all(8.0),
        child: Text("No JSON received yet."),
      );
    }

    final type = _lastJson!['type']?.toString();

    if (type == 'ENV') {
      return _buildEnvCard();
    } else if (type == 'SOS' || type == 'SOS_BUTTON') {
      return _buildSosCard();
    } else if (type == 'ACK_SOS') {
      return _buildAckCard();
    } else if (type == 'PHONE_HAS_SIGNAL') {
      return _buildPhoneSignalCard(); // NEW
    } else if (type == 'SIGNAL_STATUS') {
      // Optional: show our own reply to CHECK_SIGNAL nicely
      return _buildSignalStatusCard();
    }

    return Padding(
      padding: const EdgeInsets.all(8.0),
      child: Text(
        const JsonEncoder.withIndent('  ').convert(_lastJson),
        style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
      ),
    );
  }

  Widget _buildEnvCard() {
    final temp = _lastJson!['temp'];
    final pressure = _lastJson!['pressure'];
    final gpsValid = _lastJson!['gps_valid'];
    final lat = _lastJson!['lat'];
    final lon = _lastJson!['lon'];
    final alt = _lastJson!['alt'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Environment Data",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text("Temperature: ${_formatNum(temp)} °C"),
            Text("Pressure: ${_formatNum(pressure)} hPa"),
            const SizedBox(height: 8),
            Text("GPS valid: $gpsValid"),
            if (lat != null && lon != null)
              Text("Location: $lat, $lon (alt: ${alt ?? '-'} m)"),
          ],
        ),
      ),
    );
  }

  Widget _buildSosCard() {
    final fromPhone = _lastJson!['from_phone'];
    final fall = _lastJson!['fall'] ?? _lastJson!['fall_detected'];
    final activity = _lastJson!['activity'];
    final orient = _lastJson!['orient'] ?? _lastJson!['orientation'];
    final heading = _lastJson!['heading'];
    final accel = _lastJson!['accel_rms'];
    final gyro = _lastJson!['gyro_rms'];
    final phoneBatt = _lastJson!['phone_batt'] ?? _lastJson!['phone_battery'];

    final lat = _lastJson!['lat'];
    final lon = _lastJson!['lon'];
    final alt = _lastJson!['alt'];
    final temp = _lastJson!['temp'];
    final pressure = _lastJson!['pressure'];

    return Card(
      color: Colors.red.withOpacity(0.08),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "🚨 SOS Event",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text("From phone: $fromPhone"),
            Text("Fall detected: $fall"),
            Text("Activity: ${activity ?? '-'}"),
            Text("Orientation: ${orient ?? '-'}"),
            Text("Heading: ${heading ?? '-'}"),
            Text("Accel RMS: ${_formatNum(accel)}"),
            Text("Gyro RMS: ${_formatNum(gyro)}"),
            Text("Phone battery: ${phoneBatt ?? '-'} %"),
            const SizedBox(height: 8),
            Text("Temperature: ${_formatNum(temp)} °C"),
            Text("Pressure: ${_formatNum(pressure)} hPa"),
            const SizedBox(height: 8),
            if (lat != null && lon != null)
              Text("Location: $lat, $lon (alt: ${alt ?? '-'} m)"),
          ],
        ),
      ),
    );
  }

  Widget _buildAckCard() {
    final status = _lastJson!['status'];

    return Card(
      color: Colors.green.withOpacity(0.12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const Icon(Icons.check_circle, color: Colors.greenAccent),
            const SizedBox(width: 8),
            Text("SOS ACK: $status"),
          ],
        ),
      ),
    );
  }

  // NEW: when dongle says "PHONE_HAS_SIGNAL"
  Widget _buildPhoneSignalCard() {
    return Card(
      color: Colors.blue.withOpacity(0.08),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: const [
            Icon(Icons.signal_cellular_alt, color: Colors.blueAccent),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                "Phone has network. Use phone to call emergency services.",
                style: TextStyle(fontSize: 14),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // NEW: show our own SIGNAL_STATUS reply (optional)
  Widget _buildSignalStatusCard() {
    final hasSignal = _lastJson!['has_signal'];
    final netStatus = _lastJson!['net_status'];
    final cellLevel = _lastJson!['cell_level'];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              "Signal Status (App → Dongle)",
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text("Has signal: $hasSignal"),
            Text("Net status: $netStatus"),
            Text("Cellular level: $cellLevel"),
          ],
        ),
      ),
    );
  }

  String _formatNum(dynamic v, [int digits = 2]) {
    if (v == null) return '-';
    if (v is num) {
      if (v.isNaN || v.isInfinite) return '-';
      try {
        return v.toStringAsFixed(digits);
      } catch (_) {
        return v.toString();
      }
    }
    return v.toString();
  }
}

// ================ Device Picker Dialog ===================
