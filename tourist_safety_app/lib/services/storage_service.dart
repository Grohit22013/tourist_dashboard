// lib/services/storage_service.dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SecureStorage {
  final FlutterSecureStorage _storage = const FlutterSecureStorage();

  // Keys
  static const String _digitalIdKey = 'digital_id';
  static const String _phoneKey = 'phone';
  static const String _requireOtpKey = 'require_otp';
  static const String _tokenKey = 'auth_token';
  static const String _trackingKey = 'tracking_enabled';
  static const String _languageKey = 'language'; // ✅ added

  // -------------------------
  // Digital ID
  // -------------------------
  Future<void> saveDigitalId(String id) async {
    await _storage.write(key: _digitalIdKey, value: id);
  }
// inside SecureStorage class

  Future<void> saveDeviceId(String deviceId) async {
    await _storage.write(key: 'device_id', value: deviceId);
  }

  Future<String?> getDeviceId() async {
    return await _storage.read(key: 'device_id');
  }

  Future<String?> getDigitalId() async {
    return await _storage.read(key: _digitalIdKey);
  }

  Future<void> deleteDigitalId() async {
    await _storage.delete(key: _digitalIdKey);
  }

  // ---- Aliases (for code that calls saveDid/getDid) ----
  Future<void> saveDid(String id) async => saveDigitalId(id);
  Future<String?> getDid() async => getDigitalId();

  // -------------------------
  // Phone Number
  // -------------------------
  Future<void> savePhone(String phone) async {
    await _storage.write(key: _phoneKey, value: phone);
  }

  Future<String?> getPhone() async {
    return await _storage.read(key: _phoneKey);
  }

  Future<void> deletePhone() async {
    await _storage.delete(key: _phoneKey);
  }

  // ---- Compatibility alias used in some files ----
  Future<String?> readPhone() async => getPhone();

  // -------------------------
  // Require OTP flag
  // -------------------------
  Future<void> setRequireOtp(bool value) async =>
      _storage.write(key: _requireOtpKey, value: value ? '1' : '0');

  Future<bool> getRequireOtp() async {
    final v = await _storage.read(key: _requireOtpKey);
    return v == '1';
  }

  // -------------------------
  // Auth token (optional)
  // -------------------------
  Future<void> saveToken(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: _tokenKey);
  }

  Future<void> deleteToken() async {
    await _storage.delete(key: _tokenKey);
  }

  // ---- Compatibility alias used by ApiClient/location_service ----
  Future<String?> readToken() async => getToken();

  // -------------------------
  // Background tracking preference
  // -------------------------
  Future<void> setTrackingEnabled(bool enabled) async {
    await _storage.write(key: _trackingKey, value: enabled ? '1' : '0');
  }

  Future<bool?> getTrackingEnabled() async {
    final v = await _storage.read(key: _trackingKey);
    if (v == null) return null;
    return v == '1';
  }

  Future<bool> isTrackingEnabled() async {
    final v = await getTrackingEnabled();
    return v ?? false;
  }

  // -------------------------
  // Language preference ✅
  // -------------------------
  Future<void> saveLanguage(String lang) async {
    await _storage.write(key: _languageKey, value: lang);
  }

  Future<String?> getLanguage() async {
    return await _storage.read(key: _languageKey);
  }
  
  // -------------------------
  // Clear Everything
  // -------------------------
  Future<void> clear() async {
    await _storage.deleteAll();
  }
}
