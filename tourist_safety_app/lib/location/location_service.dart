// lib/location/location_service.dart
import 'dart:async';
import 'dart:convert';
import 'dart:math' as math;

import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:tourist_safety_app/services/storage_service.dart';

/// LocationService
/// - Keeps your performLocationUpload() logic (IP coarse upload)
/// - Adds device/GPS tracking, geofence enter/exit detection with hysteresis
/// - Posts zone events to backend at /zone_event
/// - Shows local notifications on enter/exit
class LocationService {
  // Replace with your backend base URL. Use emulator host (10.0.2.2) for Android emulator,
  // or your machine LAN IP for a real device on same network.
  // Example: 'http://10.0.2.2:8000' (emulator) or 'http://192.168.1.12:8000' (real machine)
  static String API_BASE = 'http://192.168.137.1:8000';

  // Foreground periodic upload timer (optional)
  static Timer? _foregroundTimer;

  // Geolocator subscription for continuous GPS tracking
  StreamSubscription<Position>? _posSub;

  // Local notifications
  final FlutterLocalNotificationsPlugin _localNotif = FlutterLocalNotificationsPlugin();

  // Hysteresis / debounce params (adjust for demo)
  static const int T_ENTER_MS = 8000; // require ~8s inside to confirm enter
  static const int T_EXIT_MS = 5000;  // require ~5s outside to confirm exit
  static const double EXIT_BUFFER_FACTOR = 1.08; // exit when distance > radius * factor

  // Internal state maps
  final Map<String, bool> _inside = {}; // zoneId -> inside flag
  final Map<String, DateTime> _enterCandidateTs = {};
  final Map<String, DateTime> _exitCandidateTs = {};

  // Cached zones (simple structure expected: {id, name, lat, lng, radius_m, severity, description})
  List<Map<String, dynamic>> _zones = [];

  // Singleton-ish usage (optional)
  static final LocationService instance = LocationService._internal();
  LocationService._internal();

  /// Initialize local notifications & (optionally) other one-time setup
  Future<void> init() async {
    // Flutter Local Notifications init
    const androidInit = AndroidInitializationSettings('@mipmap/ic_launcher');
    final iosInit = DarwinInitializationSettings();
    await _localNotif.initialize(
      InitializationSettings(android: androidInit, iOS: iosInit),
      // onSelectNotification: (payload) => handle if needed
    );

    // Optionally fetch zones immediately
    await fetchZones();
  }

  /// Start GPS tracking (requests permissions if needed)
  Future<void> startTracking({LocationSettings? settings}) async {
    // Request permission
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied || permission == LocationPermission.deniedForever) {
        // permission denied; fallback to IP upload only
        print('Location permission denied. Falling back to coarse IP upload.');
        return;
      }
    }

    // Optionally re-fetch zones before tracking starts
    await fetchZones();

    final locationSettings = settings ??
        const LocationSettings(
          accuracy: LocationAccuracy.bestForNavigation,
          distanceFilter: 5, // meters
        );

    // Cancel existing subscription if any
    await _posSub?.cancel();

    _posSub = Geolocator.getPositionStream(locationSettings: locationSettings)
        .listen((Position pos) async {
      // immediate upload of precise position to /locations/update (optional)
      await _sendPreciseLocation(pos);

      // run geofence checks
      _processPosition(pos);
    }, onError: (e) {
      print('Position stream error: $e');
    });
  }

  /// Stop GPS tracking
  Future<void> stopTracking() async {
    await _posSub?.cancel();
    _posSub = null;
  }

  /// Optional: start periodic foreground uploads (while app open)
  static Timer startForegroundTimer(Duration interval) {
    _foregroundTimer?.cancel();
    _foregroundTimer = Timer.periodic(interval, (_) => performLocationUpload());
    return _foregroundTimer!;
  }

  static void stopForegroundTimer() {
    _foregroundTimer?.cancel();
    _foregroundTimer = null;
  }

  /// ---------------------------------------
  /// Existing code preserved & enhanced
  /// ---------------------------------------

  /// Do a single coarse upload (IP-based) to backend (keeps your original behavior)
  static Future<void> performLocationUpload() async {
    try {
      final storedPhone = await SecureStorage().getPhone();
      final token = await SecureStorage().getToken();

      final ipLoc = await _fetchIpLocation();

      final body = {
        "phone_number": storedPhone ?? "",
        "lat": ipLoc?['lat'],
        "lng": ipLoc?['lng'],
        "accuracy": ipLoc?['accuracy'],
        "timestamp": DateTime.now().toUtc().toIso8601String(),
      };

      final headers = {"Content-Type": "application/json"};
      if (token != null && token.isNotEmpty) {
        headers["Authorization"] = "Bearer $token";
      }

      final uri = Uri.parse("$API_BASE/locations/update");
      final resp = await http.post(uri, headers: headers, body: jsonEncode(body));
      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        // ignore or log (demo)
        print('Location upload failed: ${resp.statusCode} ${resp.body}');
      }
    } catch (e) {
      // ignore or log
      print('performLocationUpload error: $e');
    }
  }

  /// IP-based coarse geolocation. Returns {lat, lng, accuracy?} or null.
  static Future<Map<String, double>?> _fetchIpLocation() async {
    try {
      final res = await http.get(Uri.parse('https://ipapi.co/json/')).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final lat = double.tryParse((data['latitude'] ?? data['lat'] ?? '').toString());
        final lng = double.tryParse((data['longitude'] ?? data['lon'] ?? data['lng'] ?? '').toString());
        if (lat != null && lng != null) {
          final accuracy = double.tryParse((data['accuracy'] ?? '').toString()) ?? 5000.0;
          return {'lat': lat, 'lng': lng, 'accuracy': accuracy};
        }
      }
    } catch (_) {
      // ignore
    }
    return null;
  }

  /// Send a precise device location to /locations/update (called on each position update)
  Future<void> _sendPreciseLocation(Position pos) async {
    try {
      final storedPhone = await SecureStorage().getPhone();
      final token = await SecureStorage().getToken();

      final body = {
        "phone_number": storedPhone ?? "",
        "lat": pos.latitude,
        "lng": pos.longitude,
        "accuracy": pos.accuracy,
        "timestamp": DateTime.now().toUtc().toIso8601String(),
      };

      final headers = {"Content-Type": "application/json"};
      if (token != null && token.isNotEmpty) {
        headers["Authorization"] = "Bearer $token";
      }

      // Use the backend path your server exposes (alerts/locations/update in your logs)
      final uri = Uri.parse("$API_BASE/alerts/locations/update");
      final resp = await http.post(uri, headers: headers, body: jsonEncode(body));
      if (resp.statusCode < 200 || resp.statusCode >= 300) {
        print('_sendPreciseLocation: upload failed ${resp.statusCode} ${resp.body}');
      } else {
        print('_sendPreciseLocation: uploaded ${pos.latitude},${pos.longitude}');
      }
    } catch (e) {
      print('_sendPreciseLocation error: $e');
    }
  }


  /// ---------------------------------------
  /// Geofence support
  /// ---------------------------------------

  /// Fetch zones from backend (expected endpoint returns JSON list)
  /// Backend path depends on your router; adjust if you host zones under /alerts or /api.
// fetchZones: always try the canonical /api path first
Future<void> fetchZones() async {
  try {
    final uri = Uri.parse("$API_BASE/api/danger_zones");
    final resp = await http.get(uri);
    if (resp.statusCode == 200) {
      final data = jsonDecode(resp.body) as List<dynamic>;
      _zones = data.map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } else {
      print("fetchZones: /api/danger_zones returned ${resp.statusCode}");
      _zones = [];
    }
  } catch (e) {
    print("fetchZones error: $e");
    _zones = [];
  }
}


  /// Compute Haversine distance (meters)
  double _haversineDistanceMeters(double lat1, double lon1, double lat2, double lon2) {
    final toRad = (double deg) => deg * math.pi / 180.0;
    final R = 6371000.0; // meters
    final dLat = toRad(lat2 - lat1);
    final dLon = toRad(lon2 - lon1);
    final a = math.pow(math.sin(dLat / 2), 2) +
        math.cos(toRad(lat1)) * math.cos(toRad(lat2)) * math.pow(math.sin(dLon / 2), 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return R * c;
  }

  /// Called for every position update to check zones and manage hysteresis
  void _processPosition(Position pos) {
    final now = DateTime.now();

    for (final z in _zones) {
      final String zoneId = z['id'].toString();
      final double zlat = (z['lat'] as num).toDouble();
      final double zlng = (z['lng'] as num).toDouble();
      final int radius = (z['radius_m'] as num).toInt();

      final d = _haversineDistanceMeters(pos.latitude, pos.longitude, zlat, zlng);
      final insideNow = d <= radius;
      final wasInside = _inside[zoneId] ?? false;

      if (insideNow && !wasInside) {
        // candidate enter
        _enterCandidateTs[zoneId] ??= now;
        final dt = now.difference(_enterCandidateTs[zoneId]!);
        if (dt.inMilliseconds >= T_ENTER_MS) {
          _inside[zoneId] = true;
          _enterCandidateTs.remove(zoneId);
          _onZoneEnter(zoneId, z, pos);
        }
      } else if (!insideNow && wasInside) {
        // candidate exit with a small buffer to avoid oscillation
        final exitThreshold = radius * EXIT_BUFFER_FACTOR;
        if (d > exitThreshold) {
          _exitCandidateTs[zoneId] ??= now;
          final dt = now.difference(_exitCandidateTs[zoneId]!);
          if (dt.inMilliseconds >= T_EXIT_MS) {
            _inside[zoneId] = false;
            _exitCandidateTs.remove(zoneId);
            _onZoneExit(zoneId, z, pos);
          }
        } else {
          // still within buffer -> reset exit candidate
          _exitCandidateTs.remove(zoneId);
        }
      } else {
        // stable state: clear candidates
        _enterCandidateTs.remove(zoneId);
        _exitCandidateTs.remove(zoneId);
      }
    }
  }
    // last notification times to throttle notifications per zone
  final Map<String, DateTime> _lastNotificationTs = {};
  static const Duration notificationThrottle = Duration(minutes: 2);

  Future<void> _onZoneEnter(String zoneId, Map<String, dynamic> zone, Position pos) async {
    final now = DateTime.now();
    final last = _lastNotificationTs[zoneId];
    if (last != null && now.difference(last) < notificationThrottle) {
      print('Skipping enter notification for $zoneId (throttled)');
      // still post zone_event if you want, or skip posting too
      await _postZoneEvent(zoneId, 'enter', pos);
      return;
    }
    _lastNotificationTs[zoneId] = now;

    print('Entered zone $zoneId (${zone['name']})');
    _showNotification('Entering ${zone['name']}', zone['description'] ?? zone['severity'] ?? '');
    await _postZoneEvent(zoneId, 'enter', pos);
  }

  Future<void> _onZoneExit(String zoneId, Map<String, dynamic> zone, Position pos) async {
    print('Exited zone $zoneId (${zone['name']})');
    _showNotification('Exited ${zone['name']}', '');
    await _postZoneEvent(zoneId, 'exit', pos);
  }

  Future<void> _postZoneEvent(String zoneId, String eventType, Position pos) async {
    try {
      final storedPhone = await SecureStorage().getPhone();
      final token = await SecureStorage().getToken();

      final payload = {
        "user_id": storedPhone ?? "",
        "zone_id": zoneId,
        "event": eventType,
        "lat": pos.latitude,
        "lng": pos.longitude,
        "accuracy_m": pos.accuracy,
        "ts": DateTime.now().toUtc().toIso8601String(),
      };

      final headers = {"Content-Type": "application/json"};
      if (token != null && token.isNotEmpty) headers["Authorization"] = "Bearer $token";

      // Try multiple likely endpoints
      var uri = Uri.parse("$API_BASE/zone_event");
      var resp = await http.post(uri, headers: headers, body: jsonEncode(payload));
      if (resp.statusCode >= 400) {
        // try fallback paths used in other examples
        uri = Uri.parse("$API_BASE/api/zone_event");
        resp = await http.post(uri, headers: headers, body: jsonEncode(payload));
      }
      if (resp.statusCode >= 400) {
        uri = Uri.parse("$API_BASE/alerts/zone_event");
        await http.post(uri, headers: headers, body: jsonEncode(payload));
      }
    } catch (e) {
      print('_postZoneEvent error: $e');
    }
  }

  /// Local notification helper
  int _notifIdCounter = 0;

  Future<void> _showNotification(String title, String body) async {
    final id = _notifIdCounter++ % 100000;
    const androidDetails = AndroidNotificationDetails(
      'zone_channel', 'Zone Alerts',
      channelDescription: 'Notifications for zone enter/exit',
      importance: Importance.max,
      priority: Priority.high,
      playSound: true,
    );
    final iosDetails = DarwinNotificationDetails();
    await _localNotif.show(id, title, body, NotificationDetails(android: androidDetails, iOS: iosDetails));
  }


  /// Debug helper: simulate entering a zone (shows local notification + POSTs event)
  /// Debug helper: simulate entering a zone (shows local notification + POSTs event)
  /// Pass debug: true to mark the event as debug (server will ignore for real notifications).
// ... inside your LocationService class (or wherever simulateEnterSimple lives) ...

Future<bool> simulateEnterSimple(String zoneId, {bool debug = false, String? userId}) async {
  // Ensure zones cached
  if (_zones.isEmpty) {
    await fetchZones();
  }

  // find the zone entry
  final zone = _zones.firstWhere(
    (z) => z['id'].toString() == zoneId,
    orElse: () => <String, dynamic>{},
  );

  if (zone.isEmpty) {
    print('simulateEnterSimple: zone not found: $zoneId');
    return false;
  }

  // Show a local notification for the simulated enter (best-effort)
  try {
    await _showNotification(
      'Entering ${zone['name']} (debug)',
      zone['description'] ?? zone['severity'] ?? '',
    );
  } catch (e) {
    print('simulateEnterSimple: notification failed: $e');
  }

  // Resolve userId: prefer explicit param -> DID -> phone -> debug-user
  String resolvedUserId = 'debug-user';
  try {
    if (userId != null && userId.isNotEmpty) {
      resolvedUserId = userId;
    } else {
      final did = await SecureStorage().getDid(); // alias to getDigitalId()
      if (did != null && did.isNotEmpty) {
        resolvedUserId = did;
      } else {
        final storedPhone = await SecureStorage().getPhone();
        if (storedPhone != null && storedPhone.isNotEmpty) {
          resolvedUserId = storedPhone;
        }
      }
    }
  } catch (e) {
    print('simulateEnterSimple: reading storage failed, using debug-user: $e');
  }

  final payload = {
    "user_id": resolvedUserId,
    "zone_id": zoneId,
    "event": "enter",
    "lat": zone['lat'],
    "lng": zone['lng'],
    "accuracy_m": 5,
    "ts": DateTime.now().toUtc().toIso8601String(),
    "debug": debug,
  };

  final headers = {"Content-Type": "application/json"};

  try {
    // Primary: canonical API path
    Uri uri = Uri.parse("$API_BASE/api/zone_event");
    print('simulateEnterSimple: posting to $uri payload=$payload');

    // attempt with timeout
    var resp = await http
        .post(uri, headers: headers, body: jsonEncode(payload))
        .timeout(const Duration(seconds: 8));

    print('simulateEnterSimple: status ${resp.statusCode} body=${resp.body}');

    // fallback attempts if necessary (try alternate endpoints)
    if (resp.statusCode >= 400) {
      uri = Uri.parse("$API_BASE/zone_event");
      resp = await http
          .post(uri, headers: headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 8));
      print('simulateEnterSimple fallback1: status ${resp.statusCode} body=${resp.body}');
    }
    if (resp.statusCode >= 400) {
      uri = Uri.parse("$API_BASE/alerts/zone_event");
      resp = await http
          .post(uri, headers: headers, body: jsonEncode(payload))
          .timeout(const Duration(seconds: 8));
      print('simulateEnterSimple fallback2: status ${resp.statusCode} body=${resp.body}');
    }

    // treat 2xx as success
    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      print('simulateEnterSimple: posted successfully (user_id=$resolvedUserId)');
      return true;
    } else {
      print('simulateEnterSimple: all attempts failed; last status=${resp.statusCode}');
      return false;
    }
  } on TimeoutException catch (e) {
    print('timeout $e');
    return false;
  } catch (e) {
    print('error $e');
    return false;
  }
}
    List<Map<String, dynamic>> getZones() {
    return _zones;
  }


}
