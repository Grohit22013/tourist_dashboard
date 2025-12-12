// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:easy_localization/easy_localization.dart';

import 'location/location_service.dart'; // background tracking + zones
import 'pages/home_page.dart';
import 'pages/login_page.dart';
import 'pages/map_page.dart';
import 'pages/registration_page.dart';
import 'services/localization_service.dart';
import 'services/storage_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: 'assets/.env');
  await EasyLocalization.ensureInitialized();

  // ✅ Initialize language (default English if not stored)
  await LocalizationService.instance.init();

  runApp(
    EasyLocalization(
      supportedLocales: LocalizationService.instance.supportedLocales,
      fallbackLocale: LocalizationService.instance.fallbackLocale,
      startLocale: LocalizationService.instance.locale,
      path: 'assets/lang/translations',
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatefulWidget {
  const MyApp({super.key});
  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  // decide start widget and initialize background tracking if we land on Home
  Future<Widget> _decideStartWidget() async {
    final s = SecureStorage();
    final did = await s.getDigitalId();
    if (did != null && did.isNotEmpty) {
      final requireOtp = await s.getRequireOtp();
      if (requireOtp) return const LoginPage(); // force OTP even though DID exists

      try {
        await LocationService.instance.init();
        await LocationService.instance.startTracking();
      } catch (_) {/* ignore */}
      return const HomePage();
    }
    return const LoginPage(); // no DID yet → OTP
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Widget>(
      future: _decideStartWidget(),
      builder: (context, snap) {
        // While deciding start screen
        if (snap.connectionState != ConnectionState.done) {
          return MaterialApp(
            debugShowCheckedModeBanner: false,
            title: 'Tourist Safety App',
            theme: ThemeData(
              colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
              useMaterial3: true,
            ),
            // 🔑 tell MaterialApp about localization
            locale: context.locale,
            supportedLocales: context.supportedLocales,
            localizationsDelegates: context.localizationDelegates,
            home: const Scaffold(
              body: Center(child: CircularProgressIndicator()),
            ),
          );
        }

        // Main app
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'Tourist Safety App',
          theme: ThemeData(
            colorScheme: ColorScheme.fromSeed(seedColor: Colors.indigo),
            useMaterial3: true,
          ),
          // 🔑 tell MaterialApp about localization
          locale: context.locale,
          supportedLocales: context.supportedLocales,
          localizationsDelegates: context.localizationDelegates,

          home: snap.data!,
          routes: {
            '/login': (_) => const LoginPage(),
            '/register': (_) => const RegistrationPage(),
            '/home': (_) => const HomePage(),
            '/map': (_) => const MapPage(),
          },
          onUnknownRoute: (_) => MaterialPageRoute(builder: (_) => const LoginPage()),
        );
      },
    );
  }
}
