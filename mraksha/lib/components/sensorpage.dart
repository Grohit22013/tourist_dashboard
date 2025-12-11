import 'dart:async';
import 'package:flutter/material.dart';
import 'package:mraksha/components/settings.dart';
// import 'package:mraksha/services/device_status_service.dart';

class SensorPage extends StatefulWidget {
  const SensorPage({super.key});

  @override
  State<SensorPage> createState() => _SensorPageState();
}

class _SensorPageState extends State<SensorPage> {
  late Timer timer;

  @override
  void initState() {
    super.initState();
    DeviceStatusService.instance.initialize();

    // Refresh UI every 500ms
    timer = Timer.periodic(const Duration(milliseconds: 500), (_) {
      setState(() {});
    });
  }

  @override
  void dispose() {
    timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ds = DeviceStatusService.instance;

    return Scaffold(
      appBar: AppBar(title: const Text("Device Sensors")),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          sensorTile("Network Status", ds.networkStatus),
          sensorTile("Connection Type", ds.connectionType),
          divider(),

          title("Accelerometer"),
          sensorTile("X", ds.ax.toStringAsFixed(3)),
          sensorTile("Y", ds.ay.toStringAsFixed(3)),
          sensorTile("Z", ds.az.toStringAsFixed(3)),
          divider(),

          title("Gyroscope"),
          sensorTile("X", ds.gx.toStringAsFixed(3)),
          sensorTile("Y", ds.gy.toStringAsFixed(3)),
          sensorTile("Z", ds.gz.toStringAsFixed(3)),
          divider(),

          title("Magnetometer"),
          sensorTile("X", ds.mx.toStringAsFixed(3)),
          sensorTile("Y", ds.my.toStringAsFixed(3)),
          sensorTile("Z", ds.mz.toStringAsFixed(3)),
          divider(),

          title("Step Counter"),
          sensorTile("Steps", ds.stepCount.toString()),
          divider(),

          title("Proximity"),
          sensorTile("Value (0=far,1=near)", ds.proximity.toString()),
          divider(),

          title("Available Sensors"),
          Text(
            ds.sensorList.join("\n"),
            style: const TextStyle(fontSize: 14, color: Colors.black),
          ),
        ],
      ),
    );
  }

  Widget sensorTile(String label, String value) {
    return ListTile(
      title: Text(label),
      trailing: Text(
        value,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
          color: Colors.greenAccent,
        ),
      ),
    );
  }

  Widget title(String text) => Padding(
    padding: const EdgeInsets.only(top: 18, bottom: 6),
    child: Text(
      text,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
    ),
  );

  Widget divider() => const Divider(color: Colors.black, height: 30);
}
