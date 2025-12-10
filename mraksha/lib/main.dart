// import 'package:flutter/material.dart';
// import 'package:flutter/services.dart';
// import 'package:mraksha/components/settings.dart';

// void main() {
//   runApp(const MyApp());
// }

// class MyApp extends StatelessWidget {
//   const MyApp({super.key});

//   // Request permissions before using the plugin
//   // Example using permission_handler package:
//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(
//       debugShowCheckedModeBanner: false,
//       title: 'Rescue System Demo',
//       theme: ThemeData(
//         colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
//       ),
//       // home: const SettingsPage(),
//       home: MyHomePage(title: "hello"),
//     );
//   }
// }

// import 'package:flutter/material.dart';
// import 'package:mraksha/components/settings.dart';
// import 'services/network_service.dart';
// import 'services/native_sensor_service.dart';
// import 'services/sensor_service.dart';

// void main() => runApp(const MyApp());

// class MyApp extends StatelessWidget {
//   const MyApp({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return const MaterialApp(
//       debugShowCheckedModeBanner: false,
//       home: MyHomePage(title: "Dashboard"),
//     );
//   }
// }

import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_bluetooth_serial/flutter_bluetooth_serial.dart';
import 'package:mraksha/components/bluetoothconnect.dart';

import 'package:flutter/material.dart';
import 'package:mraksha/globals.dart';

void main() {
  runApp(const YatraRakshaApp());
}

class YatraRakshaApp extends StatelessWidget {
  const YatraRakshaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YatraRaksha Dongle',
      theme: ThemeData.dark().copyWith(
        colorScheme: const ColorScheme.dark(primary: Colors.teal),
      ),
      // home: const BluetoothHomePage(),
      // home: CallAndSpeakButton(),
      home: BluetoothHomePage(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class CallAndSpeakButton extends StatelessWidget {
  const CallAndSpeakButton({super.key});

  Future<void> _handlePress() async {
    await speakMessage(); // global function
    await makeCall("9182397302"); // global function
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Call & Speak Demo")),
      body: Center(
        child: ElevatedButton(
          onPressed: _handlePress,
          child: const Text("Speak & Call"),
        ),
      ),
    );
  }
}
