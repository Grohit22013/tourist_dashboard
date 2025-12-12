// lib/services/localization_service.dart
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocalizationService extends ChangeNotifier {
  LocalizationService._();
  static final LocalizationService instance = LocalizationService._();

  final supportedLocales = const [Locale('en'), 
  Locale('hi'),
  Locale('ta'),
  Locale('te'),
  Locale('bn'),
  Locale('ml'),
  Locale('kn'),
  Locale('gu'),
  Locale('pa'),
  Locale('or'),
  Locale('as'),];
  final fallbackLocale = const Locale('en');

  Locale _locale = const Locale('en');
  Locale get locale => _locale;

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    final code = prefs.getString('app_locale') ?? 'en';
    _locale = supportedLocales.firstWhere(
      (l) => l.languageCode == code,
      orElse: () => fallbackLocale,
    );
  }

  Future<void> setLocale(Locale l) async {
    _locale = l;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('app_locale', l.languageCode);
    notifyListeners();
  }

  // Convenience passthroughs (not strictly required)
  List<Locale> get locales => supportedLocales;
  List<LocalizationsDelegate<dynamic>> get delegates => [
        ...GlobalMaterialLocalizations.delegates,
      ];
}
