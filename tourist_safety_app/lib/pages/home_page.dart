// lib/pages/home_page.dart
import 'dart:convert';

import 'package:background_fetch/background_fetch.dart';
import 'package:easy_localization/easy_localization.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:http/http.dart' as http;
import 'package:tourist_safety_app/services/localization_service.dart';

import '../location/location_service.dart';
import '../models.dart';
import '../services/api_client.dart';
import '../services/storage_service.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final storage = SecureStorage();

  String? _digitalId;
  String? _phone;
  String _state = 'UNKNOWN';
  bool _loading = false;
  String? _error;

  // local UI state for tracking toggle
  bool _trackingEnabled = false;
  bool _sendingSos = false;

  // 🔹 NEW: stored device ID (bound LoRa/ESP node)
  String? _deviceId;

  @override
  void initState() {
    super.initState();
    _loadLocal();
  }

  @override
  void dispose() {
    // Stop tracking & timers when leaving the page
    try {
      LocationService.instance.stopTracking();
    } catch (_) {}
    try {
      LocationService.stopForegroundTimer();
    } catch (_) {}
    super.dispose();
  }

  Future<void> _loadLocal() async {
    final did = await storage.getDid(); // alias to getDigitalId()
    final phone = await storage.getPhone();
    final trackingPref = await storage.getTrackingEnabled(); // returns bool? per your storage

    // 🔹 NEW: load device ID from secure storage
    final deviceId = await storage.getDeviceId();

    setState(() {
      _digitalId = did;
      _phone = phone;
      _trackingEnabled = trackingPref ?? false;
      _deviceId = deviceId; // 🔹 store loaded deviceId
    });

    // Refresh user status if we have a phone
    if (phone != null && phone.isNotEmpty) {
      await _refreshStatus();
    }

    // If user preference was to keep tracking on, initialize and start tracking
    if (_trackingEnabled) {
      try {
        await LocationService.instance.init();
        await LocationService.instance.startTracking();
        // Optionally start foreground periodic uploads (while app is open)
        // LocationService.startForegroundTimer(const Duration(minutes: 15));
      } catch (e) {
        // couldn't start tracking — inform user but keep preference saved
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('home.could_not_resume'.tr(namedArgs: {'error': '$e'}))),
        );
      }
    }
  }

  Future<void> _refreshStatus() async {
    if (_phone == null || _phone!.isEmpty) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final RegistrationStatus status = await ApiClient().status(_phone!);
      setState(() {
        _state = status.state;
        _digitalId = status.digitalId ?? _digitalId;
      });
      if (status.digitalId != null && status.digitalId!.isNotEmpty) {
        await storage.saveDid(status.digitalId!);
      }
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  // LOGOUT: require OTP next time, but KEEP the DID (no KYC again)
  Future<void> _logoutRequireOtp() async {
    await storage.setRequireOtp(true); // flag for main.dart to start at Login (OTP)
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  // Full reset: wipe phone + DID, go back to OTP login (use when switching number)
  Future<void> _resetApp() async {
    await storage.clear();
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/login');
  }

  void _copyDid() {
    if (_digitalId == null || _digitalId!.isEmpty) return;
    Clipboard.setData(ClipboardData(text: _digitalId!));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('home.did_copied'.tr())),
    );
  }

  // -------------------------
  // IP-based geolocation helper (coarse)
  // -------------------------
  /// Returns map { 'lat': double, 'lng': double } or null if unavailable.
  Future<Map<String, double>?> fetchIpLocation() async {
    try {
      final res = await http.get(Uri.parse('https://ipapi.co/json/')).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final lat = double.tryParse((data['latitude'] ?? data['lat'] ?? '').toString());
        final lng = double.tryParse((data['longitude'] ?? data['lon'] ?? data['lng'] ?? '').toString());
        if (lat != null && lng != null) return {'lat': lat, 'lng': lng};
      }
    } catch (_) {
      // ignore errors — we'll return null
    }
    return null;
  }

  /// Return a best-effort Position: prefer recent lastKnown (age <= threshold),
  /// otherwise request a fresh current position with timeout.
  /// Returns null if no location obtained.
  Future<geo.Position?> _getBestLocation({
    Duration maxLastKnownAge = const Duration(minutes: 2),
    Duration currentTimeout = const Duration(seconds: 20),
  }) async {
    try {
      // Quick check: last-known (very fast)
      final last = await geo.Geolocator.getLastKnownPosition();
      if (last != null) {
        final ts = last.timestamp;
        if (ts != null) {
          final age = DateTime.now().difference(ts);
          if (age <= maxLastKnownAge) {
            return last;
          }
        }
      }

      // Try a fresh high-accuracy request with timeout
      try {
        final pos = await geo.Geolocator.getCurrentPosition(
          desiredAccuracy: geo.LocationAccuracy.high,
          timeLimit: currentTimeout,
        );
        return pos;
      } catch (_) {}
    } catch (_) {}
    return null;
  }

  // -------------------------
  // SOS (Panic) implementation — try native Geolocator then fall back to IP
  // -------------------------
  Future<void> _sendSos() async {
    if (_phone == null || _phone!.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('home.phone_not_available'.tr())),
      );
      return;
    }

    setState(() => _sendingSos = true);

    double? lat;
    double? lng;
    String note = 'User pressed SOS';

    // Helper duplicated locally to keep SOS self-contained (fine to reuse outer one if you prefer)
    Future<geo.Position?> _getBestLocation({
      Duration maxLastKnownAge = const Duration(minutes: 2),
      Duration currentTimeout = const Duration(seconds: 20),
    }) async {
      try {
        final last = await geo.Geolocator.getLastKnownPosition();
        if (last != null) {
          final ts = last.timestamp;
          if (ts != null) {
            final age = DateTime.now().difference(ts);
            if (age <= maxLastKnownAge) {
              return last;
            }
          }
        }
        try {
          final pos = await geo.Geolocator.getCurrentPosition(
            desiredAccuracy: geo.LocationAccuracy.high,
            timeLimit: currentTimeout,
          );
          return pos;
        } catch (_) {}
      } catch (_) {}
      return null;
    }

    try {
      // 1) Permission & service checks
      try {
        final serviceEnabled = await geo.Geolocator.isLocationServiceEnabled();
        if (!serviceEnabled) {
          note = 'User pressed SOS (gps service disabled)';
        } else {
          geo.LocationPermission permission = await geo.Geolocator.checkPermission();
          if (permission == geo.LocationPermission.denied) {
            permission = await geo.Geolocator.requestPermission();
          }

          if (permission == geo.LocationPermission.denied) {
            note = 'User pressed SOS (gps permission denied)';
          } else if (permission == geo.LocationPermission.deniedForever) {
            note = 'User pressed SOS (gps permission denied forever)';
          } else {
            // 2) Get best location (recent lastKnown or fresh current)
            final best = await _getBestLocation(
              maxLastKnownAge: const Duration(minutes: 2),
              currentTimeout: const Duration(seconds: 20),
            );
            if (best != null) {
              lat = best.latitude;
              lng = best.longitude;
              note = 'User pressed SOS (gps)';
            } else {
              note = 'User pressed SOS (gps error)';
            }
          }
        }
      } catch (_) {
        note = 'User pressed SOS (gps error)';
      }

      // 3) IP fallback if still no coords
      if (lat == null || lng == null) {
        try {
          final ipLoc = await fetchIpLocation();
          if (ipLoc != null && ipLoc['lat'] != null && ipLoc['lng'] != null) {
            lat = ipLoc['lat'];
            lng = ipLoc['lng'];
            note = (note.contains('gps') ? note.replaceAll('gps', 'IP-based location') : 'User pressed SOS (IP-based location)');
          }
        } catch (_) {}
      }

      // 4) If still null or zero, prompt user before sending 0,0
      if (lat == null || lng == null || (lat == 0.0 && lng == 0.0)) {
        final proceed = await showDialog<bool>(
          context: context,
          builder: (_) => AlertDialog(
            title: Text('home.location_unavailable_title'.tr()),
            content: Text('home.location_unavailable_msg'.tr()),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: Text('home.cancel'.tr())),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: Text('home.send_anyway'.tr())),
            ],
          ),
        );

        if (proceed != true) {
          if (mounted) setState(() => _sendingSos = false);
          return;
        }

        lat = lat ?? 0.0;
        lng = lng ?? 0.0;
        if (!note.toLowerCase().contains('location')) {
          note = 'User pressed SOS (location unavailable)';
        }
      }

      // 5) Log and send
      final success = await ApiClient().sendSos(
        phone: _phone!,
        lat: lat,
        lng: lng,
        note: note,
      );

      if (success) {
        final displayNote = note.split('(').last.replaceAll(')', '');
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('home.sos_sent'.tr(namedArgs: {'note': displayNote}))),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('home.sos_failed'.tr())),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('home.sos_error'.tr(namedArgs: {'error': '$e'}))),
      );
    } finally {
      if (mounted) setState(() => _sendingSos = false);
    }
  }

  // -------------------------
  // Background tracking toggle
  // -------------------------
  Future<void> _toggleTracking(bool enable) async {
    if (enable) {
      try {
        // Initialize location service (notifications, fetch zones)
        await LocationService.instance.init();

        // Try to start GPS tracking (requests permissions if needed).
        await LocationService.instance.startTracking();

        // Optionally: start periodic coarse uploads while app is open:
        // LocationService.startForegroundTimer(const Duration(minutes: 15));

        await storage.setTrackingEnabled(true);
        if (!mounted) return;
        setState(() => _trackingEnabled = true);

        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('home.bg_enabled'.tr())));
      } catch (e) {
        // Couldn't start tracking (permissions, runtime error, etc.)
        // Save the preference anyway and inform user.
        await storage.setTrackingEnabled(true);
        if (!mounted) return;
        setState(() => _trackingEnabled = true);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('home.bg_pref_saved_but_fail'.tr(namedArgs: {'error': '$e'}))),
        );
      }
    } else {
      // Disable tracking: stop streams, timers and try to stop BackgroundFetch if present
      try {
        await LocationService.instance.stopTracking();
      } catch (_) {}
      try {
        LocationService.stopForegroundTimer();
      } catch (_) {}

      // Best-effort background_fetch stop
      try {
        await BackgroundFetch.stop();
      } catch (_) {}

      await storage.setTrackingEnabled(false);
      if (!mounted) return;
      setState(() => _trackingEnabled = false);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('home.bg_disabled'.tr())));
    }
  }

  @override
  Widget build(BuildContext context) {
    final noDid = _digitalId == null || _digitalId!.isEmpty;

    return Scaffold(
      appBar: AppBar(
        title: Text('home.title'.tr()),
        actions: [
          // Refresh translations from static JSON is immediate with tr(); this is just a language chooser
          PopupMenuButton<Locale>(
            icon: const Icon(Icons.translate),
            onSelected: (loc) async {
              await context.setLocale(loc); // EasyLocalization change
              await LocalizationService.instance.setLocale(loc); // persist
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: Locale('en'), child: Text('English')),
              PopupMenuItem(value: Locale('hi'), child: Text('हिन्दी')),
              PopupMenuItem(value: Locale('bn'), child: Text('Bengali')),
              PopupMenuItem(value: Locale('te'), child: Text('తెలుగు')),
              PopupMenuItem(value: Locale('ta'), child: Text('தமிழ்')),
              PopupMenuItem(value: Locale('mr'), child: Text('मराठी')),
              PopupMenuItem(value: Locale('gu'), child: Text('ગુજરાતી')),
              PopupMenuItem(value: Locale('kn'), child: Text('ಕನ್ನಡ')),
              PopupMenuItem(value: Locale('ml'), child: Text('മലയാളം')),
              PopupMenuItem(value: Locale('or'), child: Text('ଓଡ଼ିଆ')),
              PopupMenuItem(value: Locale('pa'), child: Text('ਪੰਜਾਬੀ')),
              PopupMenuItem(value: Locale('as'), child: Text('অসমীয়া')),
            ],
          ),
        ],
      ),

      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            Text(
              'home.welcome'.tr(),
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(child: _infoTile('home.phone'.tr(), _phone ?? '-')),
                const SizedBox(width: 12),
                Expanded(child: _infoTile('home.state'.tr(), _state)),
              ],
            ),

            // 🔹 NEW: Device registered indicator under phone/state
            const SizedBox(height: 8),
            if (_deviceId != null && _deviceId!.isNotEmpty)
              Row(
                children: [
                  const Icon(Icons.check_circle, color: Colors.green),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Device registered (ID: ${'' + _deviceId!})',
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),

            const SizedBox(height: 16),
            Text('home.your_did'.tr(), style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),

            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                border: Border.all(color: Theme.of(context).dividerColor),
                borderRadius: BorderRadius.circular(12),
              ),
              child: SelectableText(
                noDid ? 'home.not_issued'.tr() : _digitalId!,
                style: const TextStyle(fontFamily: 'monospace'),
              ),
            ),

            const SizedBox(height: 8),
            Row(
              children: [
                ElevatedButton.icon(
                  onPressed: _loading ? null : _refreshStatus,
                  icon: _loading
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Icon(Icons.refresh),
                  label: Text('home.refresh_status'.tr()),
                ),
                const SizedBox(width: 12),
                OutlinedButton.icon(
                  onPressed: noDid ? null : _copyDid,
                  icon: const Icon(Icons.copy),
                  label: Text('home.copy_did'.tr()),
                ),
              ],
            ),

            const SizedBox(height: 24),
            const Divider(),
            const SizedBox(height: 12),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pushNamed(context, '/map');
              },
              icon: const Icon(Icons.map),
              label: Text('home.open_map'.tr()),
            ),

            // -------------------------
            // Safety Score Section
            // -------------------------
            if (!noDid) ...[
              const SizedBox(height: 24),
              const Divider(),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('home.safety_score'.tr(), style: Theme.of(context).textTheme.titleMedium),
                  IconButton(
                    icon: const Icon(Icons.refresh),
                    tooltip: 'home.refresh'.tr(),
                    onPressed: () {
                      setState(() {}); // re-triggers FutureBuilder
                    },
                  ),
                ],
              ),
              const SizedBox(height: 8),
              FutureBuilder<Map<String, dynamic>>(
                future: ApiClient().fetchSafetyScore(_digitalId!),
                builder: (context, snap) {
                  if (snap.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  } else if (snap.hasError) {
                    return Text(
                      'home.error_loading_score'.tr(namedArgs: {'error': '${snap.error}'}),
                      style: const TextStyle(color: Colors.red),
                    );
                  } else if (!snap.hasData) {
                    return Text('home.no_score'.tr());
                  }

                  final data = snap.data!;
                  final score = data['score'] ?? 0;
                  final details = data['details'] as Map<String, dynamic>?;

                  return Card(
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'home.current_score'.tr(namedArgs: {'score': '$score'}),
                            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          if (details != null) ...[
                            Text('home.events'.tr(namedArgs: {'count': '${details['events_count']}'})),
                            Text('home.penalties'.tr(namedArgs: {'count': '${details['penalties']}'})),
                            Text('home.recovered'.tr(namedArgs: {'count': '${details['recovered']}'})),
                          ],
                        ],
                      ),
                    ),
                  );
                },
              ),
            ],

            const SizedBox(height: 12),
            Text('home.panic_section'.tr()),

            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: FilledButton.tonalIcon(
                    onPressed: _sendingSos ? null : _confirmAndSendSos,
                    icon: _sendingSos
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.warning),
                    label: Text('home.panic'.tr()),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _toggleTracking(!_trackingEnabled),
                    icon: Icon(_trackingEnabled ? Icons.location_on : Icons.location_off),
                    label: Text(_trackingEnabled ? 'home.tracking_on'.tr() : 'home.tracking_off'.tr()),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),
            // Change Language button (quick toggle EN <-> HI)

            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _logoutRequireOtp,
              icon: const Icon(Icons.logout),
              label: Text('home.logout_otp'.tr()),
            ),

            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _resetApp,
              icon: const Icon(Icons.restart_alt),
              label: Text('home.reset_app'.tr()),
            ),

            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: () async {
                try {
                  await LocationService.instance.simulateEnterSimple(
                    'zone-hyderabad-charminar',
                    debug: false,
                    userId: _digitalId,
                  );

                  if (!mounted) return;

                  // 🔥 Refresh Safety Score UI
                  setState(() {});

                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('home.sim_enter_ok'.tr())),
                  );
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('home.sim_enter_fail'.tr(namedArgs: {'error': '$e'}))),
                  );
                }
              },
              icon: const Icon(Icons.bug_report),
              label: Text('home.simulate_enter'.tr()),
            ),

            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: Colors.red)),
            ],
          ],
        ),
      ),
    );
  }

  // Separate confirmation to avoid accidental SOS
  Future<void> _confirmAndSendSos() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('home.confirm_sos_title'.tr()),
        content: Text('home.confirm_sos_msg'.tr()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('home.cancel'.tr())),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: Text('home.send_sos'.tr())),
        ],
      ),
    );
    if (confirmed == true) {
      await _sendSos();
    }
  }

  Widget _infoTile(String label, String value) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        border: Border.all(color: Theme.of(context).dividerColor),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelMedium),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
