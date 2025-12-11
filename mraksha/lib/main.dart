// import 'package:flutter/material.dart';
// import 'package:mraksha/background/service_initializer.dart';
// import 'package:mraksha/components/bluetoothconnect.dart';
// import 'package:mraksha/components/mappage.dart';
// import 'package:mraksha/components/sensorpage.dart';

// Future<void> main() async {
//   // runApp(const YatraRakshaApp());
//   WidgetsFlutterBinding.ensureInitialized();
//   await initializeService();
//   runApp(YatraRakshaApp());
// }

// class YatraRakshaApp extends StatelessWidget {
//   const YatraRakshaApp({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return MaterialApp(
//       title: 'YatraRaksha Dongle',
//       theme: ThemeData(
//         brightness: Brightness.dark,
//         colorSchemeSeed: Colors.greenAccent,
//         useMaterial3: true,
//       ),
//       home: const MainHome(),
//       debugShowCheckedModeBanner: false,
//     );
//   }
// }

// class MainHome extends StatefulWidget {
//   const MainHome({super.key});

//   @override
//   State<MainHome> createState() => _MainHomeState();
// }

// class _MainHomeState extends State<MainHome> {
//   int _currentIndex = 0;

//   final pages = const [BluetoothHomePage(), SensorPage(), MapPage()];

//   @override
//   Widget build(BuildContext context) {
//     return Scaffold(
//       appBar: _buildHeader(),
//       body: pages[_currentIndex],
//       bottomNavigationBar: _buildBottomNavBar(),
//     );
//   }

//   PreferredSizeWidget _buildHeader() {
//     return AppBar(
//       title: const Text(
//         "YatraRaksha",
//         style: TextStyle(fontWeight: FontWeight.bold, fontSize: 22),
//       ),
//       centerTitle: true,
//       backgroundColor: Colors.green.shade800,
//       elevation: 10,
//       shadowColor: Colors.greenAccent,
//     );
//   }

//   Widget _buildBottomNavBar() {
//     return BottomNavigationBar(
//       currentIndex: _currentIndex,
//       onTap: (index) => setState(() => _currentIndex = index),
//       backgroundColor: Colors.green.shade900,
//       selectedItemColor: Colors.greenAccent,
//       unselectedItemColor: Colors.white70,
//       items: const [
//         BottomNavigationBarItem(icon: Icon(Icons.bluetooth), label: "Home"),
//         BottomNavigationBarItem(icon: Icon(Icons.sensors), label: "Sensors"),
//         BottomNavigationBarItem(icon: Icon(Icons.map), label: "Map"),
//       ],
//     );
//   }
// }

import 'package:flutter/material.dart';
import 'package:mraksha/background/service_initializer.dart';
import 'package:mraksha/components/bluetoothconnect.dart';
import 'package:mraksha/components/mappage.dart';
import 'package:mraksha/components/sensorpage.dart';
import 'package:mraksha/components/settings.dart';
import 'package:flutter_map_tile_caching/flutter_map_tile_caching.dart';

Future<void> main() async {
  // runApp(const YatraRakshaApp());
  WidgetsFlutterBinding.ensureInitialized();
  await DeviceStatusService.instance.initialize();
  await initializeService();
  await FMTC.instance('mapStore').manage.create();
  runApp(YatraRakshaApp());
}

class YatraRakshaApp extends StatelessWidget {
  const YatraRakshaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'YatraRaksha Dongle',
      theme: ThemeData(
        brightness: Brightness.light,
        colorSchemeSeed: const Color(0xFF7C3AED),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8F7FF),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFF8F7FF),
          elevation: 0,
          surfaceTintColor: Colors.transparent,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Color(0xFFF8F7FF),
          selectedItemColor: Color(0xFF7C3AED),
          unselectedItemColor: Color(0xFFD1D5DB),
        ),
      ),
      home: const MainHome(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class MainHome extends StatefulWidget {
  const MainHome({super.key});

  @override
  State<MainHome> createState() => _MainHomeState();
}

class _MainHomeState extends State<MainHome> {
  int _currentIndex = 0;

  final pages = const [BluetoothHomePage(), SensorPage(), MapPage()];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: _buildHeader(),
      body: pages[_currentIndex],
      bottomNavigationBar: _buildBottomNavBar(),
    );
  }

  PreferredSizeWidget _buildHeader() {
    return AppBar(
      title: const Text(
        "YatraRaksha",
        style: TextStyle(
          fontWeight: FontWeight.w800,
          fontSize: 24,
          color: Color(0xFF6B46C1),
          letterSpacing: 0.5,
        ),
      ),
      centerTitle: true,
      backgroundColor: const Color(0xFFF8F7FF),
      elevation: 0,
      shadowColor: Colors.transparent,
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(
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
      ),
    );
  }

  Widget _buildBottomNavBar() {
    return Container(
      decoration: BoxDecoration(
        border: Border(
          top: BorderSide(color: const Color(0xFFE9D5FF), width: 1.5),
        ),
      ),
      child: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        backgroundColor: const Color(0xFFF8F7FF),
        selectedItemColor: const Color(0xFF7C3AED),
        unselectedItemColor: const Color(0xFFD1D5DB),
        elevation: 0,
        type: BottomNavigationBarType.fixed,
        items: [
          BottomNavigationBarItem(
            icon: _buildNavIcon(0, Icons.bluetooth),
            label: "Home",
          ),
          BottomNavigationBarItem(
            icon: _buildNavIcon(1, Icons.sensors),
            label: "Sensors",
          ),
          BottomNavigationBarItem(
            icon: _buildNavIcon(2, Icons.map),
            label: "Map",
          ),
        ],
      ),
    );
  }

  Widget _buildNavIcon(int index, IconData icon) {
    final isActive = _currentIndex == index;
    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        border: Border.all(
          color: isActive ? const Color(0xFF7C3AED) : const Color(0xFFE9D5FF),
          width: isActive ? 2 : 1.5,
        ),
        borderRadius: BorderRadius.circular(10),
        color: isActive ? const Color(0xFFFAF5FF) : Colors.transparent,
      ),
      child: Icon(
        icon,
        size: 20,
        color: isActive ? const Color(0xFF7C3AED) : const Color(0xFFD1D5DB),
      ),
    );
  }
}
