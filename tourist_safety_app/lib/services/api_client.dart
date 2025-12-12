// lib/services/api_client.dart
import 'dart:async'; // for TimeoutException
import 'dart:convert';
import 'dart:io'; // for SocketException
import 'dart:math';

import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:http/http.dart' as http;

import '../models.dart';
import 'storage_service.dart';

/// Same logic as in your UI helpers: strip non-digits from phone number.
String normalizePhone(String? p) {
  if (p == null) return '';
  return p.replaceAll(RegExp(r'\D+'), '');
}

class ApiClient {
  late final String baseUrl;
  late final String _touristsBase;

  ApiClient() {
    baseUrl = dotenv.get('BACKEND_BASE_URL', fallback: 'http://192.168.137.1:8000');
    _touristsBase = '$baseUrl/tourists';
  }

  Map<String, String> get _jsonHeaders => const {
        'Content-Type': 'application/json',
      };

  // ---------------------------
  // OTP
  // ---------------------------

  Future<void> sendOtp({required String phone}) async {
    final uri = Uri.parse('$_touristsBase/send-otp');
    final resp = await http.post(
      uri,
      headers: _jsonHeaders,
      body: jsonEncode({'phone_number': phone}),
    );
    if (resp.statusCode < 200 || resp.statusCode >= 300) {
      throw Exception('Failed to send OTP: ${resp.statusCode} ${resp.body}');
    }
  }

  Future<RegistrationStatus> verifyOtp({
    required String phone,
    required String code,
  }) async {
    final uri = Uri.parse('$_touristsBase/verify-otp');
    final resp = await http.post(
      uri,
      headers: _jsonHeaders,
      body: jsonEncode({'phone_number': phone, 'otp': code}),
    );

    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      final data = jsonDecode(resp.body) as Map<String, dynamic>;
      // persist phone used for OTP so registration can read it later
      try {
        await SecureStorage().savePhone(phone);
      } catch (e) {
        // non-fatal: log but don't fail verification if storage write fails
        // ignore: avoid_print
        print('[ApiClient] warning: failed to save phone to storage: $e');
      }
      return RegistrationStatus.fromJson(data);
    } else {
      throw Exception('OTP verification failed: ${resp.statusCode} ${resp.body}');
    }
  }

  // ---------------------------
  // Registration (on-chain anchor)
  // ---------------------------

  Future<String> registerTourist({
    required String phone,
    required String fullName,
    required String kycId,
    required DateTime visitStart,
    required DateTime visitEnd,
    required String emergencyPhone,
    List<Map<String, String>>? itinerary, // optional param
  }) async {
    final url = Uri.parse('$_touristsBase/register');

    final body = {
      "phone_number": phone,
      "full_name": fullName,
      "kyc_id": kycId,
      "visitStart": visitStart.toIso8601String(),
      "visitEnd": visitEnd.toIso8601String(),
      "emergencyPhone": emergencyPhone,
      if (itinerary != null && itinerary.isNotEmpty) "itinerary": itinerary,
    };

    final res = await http.post(
      url,
      headers: _jsonHeaders,
      body: jsonEncode(body),
    );

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body) as Map<String, dynamic>;
      return (data['digital_id'] ?? '') as String;
    } else {
      throw Exception('Registration failed: ${res.statusCode} ${res.body}');
    }
  }

  // ---------------------------
  // Status / KYC
  // ---------------------------

  Future<RegistrationStatus> status(String phone) async {
    final uri = Uri.parse('$_touristsBase/status/$phone');
    final resp = await http.get(uri, headers: _jsonHeaders);
    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      return RegistrationStatus.fromJson(jsonDecode(resp.body));
    }
    throw Exception('Status failed: ${resp.statusCode} ${resp.body}');
  }

  Future<RegistrationStatus> submitKyc({
    required String phone,
    required String fullName,
    required String kycId,
    required String dobIso,
    required String address,
  }) async {
    final uri = Uri.parse('$_touristsBase/kyc/submit');
    final resp = await http.post(
      uri,
      headers: _jsonHeaders,
      body: jsonEncode({
        'phone_number': phone,
        'full_name': fullName,
        'kyc_id': kycId,
        'dob': dobIso,
        'address': address,
      }),
    );
    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      return RegistrationStatus.fromJson(jsonDecode(resp.body));
    }
    throw Exception('KYC submit failed: ${resp.statusCode} ${resp.body}');
  }

  Future<RegistrationStatus> approveKyc({required String phone}) async {
    final uri = Uri.parse('$_touristsBase/kyc/approve');
    final resp = await http.post(
      uri,
      headers: _jsonHeaders,
      body: jsonEncode({'phone_number': phone, 'approved': true}),
    );
    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      return RegistrationStatus.fromJson(jsonDecode(resp.body));
    }
    throw Exception('KYC approve failed: ${resp.statusCode} ${resp.body}');
  }

  Future<RegistrationStatus> issueDigitalId(
    String phone, {
    String? deviceId,
    String? deviceType,
  }) async {
    // normalizePhone previously from login_page.dart – now local helper
    final normalized = normalizePhone(phone);

    // --- Preferred: v2 endpoint with blockchain + optional device binding ---
    final uriV2 = Uri.parse('$_touristsBase/issue-digital-id-v2');
    final bodyV2 = jsonEncode({
      'phone_number': normalized,
      if (deviceId != null && deviceId.isNotEmpty) 'device_id': deviceId,
      if (deviceType != null && deviceType.isNotEmpty) 'device_type': deviceType,
    });

    try {
      final resp = await http.post(uriV2, headers: _jsonHeaders, body: bodyV2);

      // 2xx → success
      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        final data = jsonDecode(resp.body) as Map<String, dynamic>;
        return RegistrationStatus.fromJson(data);
      }

      // If v2 endpoint exists but blockchain fails, backend sends 4xx/5xx.
      // Surface that clearly to the UI.
      if (resp.statusCode != 404 && resp.statusCode != 405) {
        throw Exception(
          'Issue DID (v2) failed: ${resp.statusCode} ${resp.body}',
        );
      }
    } catch (e) {
      // fall through to legacy path
      // ignore: avoid_print
      print('[ApiClient] issueDigitalId v2 failed, falling back: $e');
    }

    // --- Fallback: legacy /issue-digital-id (for dev/older backend) ---
    final uriLegacy = Uri.parse('$_touristsBase/issue-digital-id');
    final bodyLegacy = jsonEncode({'phone_number': normalized});

    final respLegacy =
        await http.post(uriLegacy, headers: _jsonHeaders, body: bodyLegacy);

    if (respLegacy.statusCode >= 200 && respLegacy.statusCode < 300) {
      final data = jsonDecode(respLegacy.body) as Map<String, dynamic>;
      return RegistrationStatus.fromJson(data);
    }

    throw Exception(
      'Issue DID (legacy) failed: ${respLegacy.statusCode} ${respLegacy.body}',
    );
  }

  // ---------------------------
  // Location / SOS / Receipt
  // ---------------------------

  Future<Map<String, String>> _authHeaders() async {
    final token = await SecureStorage().readToken();
    final headers = {'Content-Type': 'application/json'};
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }
    return headers;
  }

  Future<bool> uploadLocation({
    required String phone,
    required double lat,
    required double lng,
    double? accuracy,
  }) async {
    // FIXED: match backend route /alerts/locations/update
    final uri = Uri.parse('$baseUrl/alerts/locations/update');
    final body = jsonEncode({
      'phone_number': phone,
      'lat': lat,
      'lng': lng,
      'accuracy': accuracy,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
    });

    final headers = await _authHeaders();
    final resp = await http.post(uri, headers: headers, body: body);
    return resp.statusCode >= 200 && resp.statusCode < 300;
  }

  Future<bool> sendSos({
    required String phone,
    double? lat,
    double? lng,
    String? note,
  }) async {
    if (phone.trim().isEmpty) {
      print('[ApiClient] sendSos: phone is empty');
      return false;
    }

    final uri = Uri.parse('$baseUrl/alerts/sos');
    final payload = {
      'phone_number': phone,
      if (lat != null) 'lat': lat,
      if (lng != null) 'lng': lng,
      if (note != null) 'note': note,
      'timestamp': DateTime.now().toUtc().toIso8601String(),
    };
    final body = jsonEncode(payload);
    final headers = await _authHeaders();
    headers['Content-Type'] = 'application/json';

    // DEBUG prints so you can confirm what is being sent
    print('[ApiClient] sendSos -> POST $uri');
    print('[ApiClient] sendSos body: $body');

    const int maxAttempts = 3;
    int attempt = 0;
    final Random jitter = Random();

    while (attempt < maxAttempts) {
      attempt += 1;
      try {
        final resp = await http
            .post(uri, headers: headers, body: body)
            .timeout(const Duration(seconds: 8));

        if (resp.statusCode >= 200 && resp.statusCode < 300) {
          return true;
        }

        print(
          '[ApiClient] sendSos failed (attempt $attempt) status=${resp.statusCode} body=${resp.body}',
        );

        if (resp.statusCode >= 400 && resp.statusCode < 500) {
          return false;
        }
      } on TimeoutException catch (e) {
        print('[ApiClient] sendSos timeout (attempt $attempt): $e');
      } on SocketException catch (e) {
        print('[ApiClient] sendSos network error (attempt $attempt): $e');
      } catch (e, st) {
        print('[ApiClient] sendSos unexpected error: $e\n$st');
        return false;
      }

      if (attempt < maxAttempts) {
        final backoffMs = (500 * pow(2, attempt - 1)).toInt();
        final jitterMs = jitter.nextInt(200);
        final waitMs = backoffMs + jitterMs;
        await Future.delayed(Duration(milliseconds: waitMs));
      }
    }

    print('[ApiClient] sendSos: all $maxAttempts attempts failed');
    return false;
  }

  Future<bool> attachReceipt({
    required String phone,
    required String txHash,
    Map<String, dynamic>? receipt,
    String? walletAddress,
    String? kycId,
  }) async {
    // FIXED: match backend route /alerts/users/attach-receipt
    final uri = Uri.parse('$baseUrl/alerts/users/attach-receipt');
    final body = jsonEncode({
      'phone_number': phone,
      'digital_id': txHash,
      'receipt': receipt,
      'wallet_address': walletAddress,
      'kyc_id': kycId,
    });

    final headers = await _authHeaders();
    final resp = await http.post(uri, headers: headers, body: body);
    return resp.statusCode >= 200 && resp.statusCode < 300;
  }

  // ---------------------------
  // Safety Score (NEW)
  // ---------------------------

  Future<Map<String, dynamic>> fetchSafetyScore(String userId) async {
    if (userId.isEmpty) {
      throw Exception("User ID is empty");
    }

    final uri = Uri.parse('$baseUrl/api/safety_score/$userId');
    final resp = await http.get(uri, headers: _jsonHeaders);

    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      return jsonDecode(resp.body) as Map<String, dynamic>;
    } else {
      throw Exception('Failed to fetch safety score: ${resp.statusCode} ${resp.body}');
    }
  }

  // ---------------------------
  // OTP Verify (legacy compat)
  // ---------------------------

  Future<VerifyOutcome> verifyOtpNormalized({
    required String phone,
    required String code,
  }) async {
    try {
      final uri = Uri.parse('$_touristsBase/verify-otp');
      final resp = await http.post(
        uri,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'phone_number': phone, 'otp': code}),
      );

      if (resp.statusCode >= 200 && resp.statusCode < 300) {
        final data = jsonDecode(resp.body) as Map<String, dynamic>;
        // save phone to secure storage
        try {
          await SecureStorage().savePhone(phone);
        } catch (e) {
          // non-fatal
          // ignore: avoid_print
          print('[ApiClient] warning: failed to save phone to storage: $e');
        }

        final state = (data['state'] ?? '').toString();
        final did = (data['digital_id']?.toString());
        final registered = state == 'DIGITAL_ID_ISSUED' && (did?.isNotEmpty ?? false);
        return VerifyOutcome(
          registered: registered,
          state: state,
          digitalId: did,
        );
      }

      if (resp.statusCode != 404 && resp.statusCode != 405) {
        throw Exception('OTP verification failed: ${resp.statusCode} ${resp.body}');
      }
    } catch (_) {
      // fall through to legacy
    }

    final legacyUri = Uri.parse('$baseUrl/auth/verify_otp');
    final legacyResp = await http.post(
      legacyUri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'phone': phone, 'code': code}),
    );

    if (legacyResp.statusCode >= 200 && legacyResp.statusCode < 300) {
      final data = jsonDecode(legacyResp.body) as Map<String, dynamic>;

      // save phone to secure storage for legacy path as well
      try {
        await SecureStorage().savePhone(phone);
      } catch (e) {
        // ignore: avoid_print
        print('[ApiClient] warning: failed to save phone to storage (legacy): $e');
      }

      final isRegistered = data['is_registered'] == true;
      final did = data['digital_id']?.toString();
      final state = isRegistered && (did?.isNotEmpty ?? false)
          ? 'DIGITAL_ID_ISSUED'
          : 'OTP_VERIFIED';
      return VerifyOutcome(
        registered: isRegistered && (did?.isNotEmpty ?? false),
        state: state,
        digitalId: did,
      );
    }

    throw Exception(
      'OTP verification failed: ${legacyResp.statusCode} ${legacyResp.body}',
    );
  }
}
