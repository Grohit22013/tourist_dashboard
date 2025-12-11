import 'package:flutter/material.dart';
import 'package:flutter_bluetooth_serial_plus/flutter_bluetooth_serial_plus.dart';

class DevicePickerDialog extends StatefulWidget {
  const DevicePickerDialog();

  @override
  State<DevicePickerDialog> createState() => DevicePickerDialogState();
}

class DevicePickerDialogState extends State<DevicePickerDialog> {
  final FlutterBluetoothSerial _bluetooth = FlutterBluetoothSerial.instance;
  List<BluetoothDevice> _devices = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadBondedDevices();
  }

  Future<void> _loadBondedDevices() async {
    try {
      final List<BluetoothDevice> devices = await _bluetooth.getBondedDevices();
      if (!mounted) return;
      setState(() {
        _devices = devices;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _devices = [];
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text("Select Device"),
      content: _loading
          ? const SizedBox(
              height: 60,
              child: Center(child: CircularProgressIndicator()),
            )
          : SizedBox(
              width: double.maxFinite,
              height: 260,
              child: _devices.isEmpty
                  ? Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Text(
                          "No paired Bluetooth devices found.",
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 8),
                        const Text(
                          "1. Go to Android Settings → Bluetooth\n"
                          "2. Pair with 'YatraRaksha_Dongle'\n"
                          "3. Then come back and try again.",
                          textAlign: TextAlign.center,
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        const SizedBox(height: 12),
                        TextButton.icon(
                          onPressed: () {
                            _bluetooth.openSettings();
                          },
                          icon: const Icon(Icons.settings),
                          label: const Text("Open Bluetooth Settings"),
                        ),
                      ],
                    )
                  : ListView.builder(
                      itemCount: _devices.length,
                      itemBuilder: (context, index) {
                        final d = _devices[index];
                        return ListTile(
                          title: Text(d.name ?? d.address),
                          subtitle: Text(d.address),
                          onTap: () => Navigator.pop(context, d),
                        );
                      },
                    ),
            ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Cancel"),
        ),
      ],
    );
  }
}
