// lib/pages/map_page.dart
import 'dart:async';
import 'dart:math'; // for distance calc

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart' as geo;
import 'package:google_maps_flutter/google_maps_flutter.dart';

import '../location/location_service.dart';

class MapPage extends StatefulWidget {
  const MapPage({super.key});

  @override
  State<MapPage> createState() => _MapPageState();
}

class _MapPageState extends State<MapPage> {
  final Completer<GoogleMapController> _ctrl = Completer();

  Set<Circle> _circles = {};
  Set<Marker> _markers = {};
  LatLng _initial = const LatLng(17.3850, 78.4867); // Hyderabad fallback

  bool _loading = true;
  String? _error;

  // auto-follow mode: if true, map recenters as location updates arrive.
  bool _autoFollow = false;
  StreamSubscription<geo.Position>? _followSub;

  // throttle state
  DateTime _lastMove = DateTime.fromMillisecondsSinceEpoch(0);
  LatLng? _lastLatLng;

  @override
  void initState() {
    super.initState();
    _loadZones();
  }

  @override
  void dispose() {
    _followSub?.cancel();
    super.dispose();
  }

  /// Returns a best-effort location:
  /// - Uses lastKnown if recent
  /// - Otherwise requests a fresh fix with timeout
  Future<geo.Position?> getBestLocation({
    Duration maxLastKnownAge = const Duration(minutes: 2),
    Duration currentTimeout = const Duration(seconds: 30),
  }) async {
    final last = await geo.Geolocator.getLastKnownPosition();
    if (last != null && last.timestamp != null) {
      final age = DateTime.now().difference(last.timestamp!);
      if (age <= maxLastKnownAge) {
        return last; // recent enough
      }
    }

    try {
      return await geo.Geolocator.getCurrentPosition(
        desiredAccuracy: geo.LocationAccuracy.high,
        timeLimit: currentTimeout,
      );
    } catch (_) {
      return null;
    }
  }

  Future<void> _loadZones() async {
    try {
      setState(() {
        _loading = true;
        _error = null;
      });

      await LocationService.instance.fetchZones();
      final zones = LocationService.instance.getZones();

      if (zones.isEmpty) {
        setState(() {
          _loading = false;
          _error = 'No zones found from backend';
        });
        return;
      }

      final cs = <Circle>{};
      final ms = <Marker>{};

      for (final z in zones) {
        final id = z['id'].toString();
        final lat = (z['lat'] as num).toDouble();
        final lng = (z['lng'] as num).toDouble();
        final radius = (z['radius_m'] as num).toDouble();

        cs.add(Circle(
          circleId: CircleId(id),
          center: LatLng(lat, lng),
          radius: radius,
          fillColor: (z['severity'] == 'high')
              ? Colors.red.withOpacity(0.25)
              : Colors.orange.withOpacity(0.18),
          strokeColor: (z['severity'] == 'high') ? Colors.red : Colors.orange,
          strokeWidth: 2,
        ));

        ms.add(Marker(
          markerId: MarkerId('m-$id'),
          position: LatLng(lat, lng),
          infoWindow: InfoWindow(
            title: z['name'] ?? 'Zone $id',
            snippet: z['description'] ?? '',
          ),
        ));
      }

      setState(() {
        _circles = cs;
        _markers = ms;

        if (zones.isNotEmpty) {
          _initial = LatLng(
            (zones.first['lat'] as num).toDouble(),
            (zones.first['lng'] as num).toDouble(),
          );
        }

        _loading = false;
      });
    } catch (e) {
      setState(() {
        _loading = false;
        _error = 'Failed to load zones: $e';
      });
    }
  }

  /// Custom GPS recenter button
  Future<void> _goToMyLocation() async {
    try {
      final serviceEnabled = await geo.Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location services are disabled.')),
          );
        }
        return;
      }

      geo.LocationPermission permission = await geo.Geolocator.checkPermission();
      if (permission == geo.LocationPermission.denied) {
        permission = await geo.Geolocator.requestPermission();
      }
      if (permission == geo.LocationPermission.denied ||
          permission == geo.LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied.')),
          );
        }
        return;
      }

      final pos = await getBestLocation();
      if (pos == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Could not fetch GPS location')),
          );
        }
        return;
      }

      final controller = await _ctrl.future;
      await Future.delayed(const Duration(milliseconds: 40)); // avoid race
      await controller.moveCamera(
        CameraUpdate.newLatLngZoom(LatLng(pos.latitude, pos.longitude), 16),
      );
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not get location: $e')),
        );
      }
    }
  }

  /// Toggle follow mode with throttling
  Future<void> _toggleFollow() async {
    if (_autoFollow) {
      await _followSub?.cancel();
      _followSub = null;
      setState(() => _autoFollow = false);
      return;
    }

    try {
      final serviceEnabled = await geo.Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Enable location services to follow.')),
          );
        }
        return;
      }

      geo.LocationPermission permission = await geo.Geolocator.checkPermission();
      if (permission == geo.LocationPermission.denied) {
        permission = await geo.Geolocator.requestPermission();
      }
      if (permission == geo.LocationPermission.denied ||
          permission == geo.LocationPermission.deniedForever) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Location permission denied.')),
          );
        }
        return;
      }

      _followSub = geo.Geolocator.getPositionStream(
        locationSettings: const geo.LocationSettings(
          accuracy: geo.LocationAccuracy.bestForNavigation,
          distanceFilter: 5,
        ),
      ).listen((geo.Position p) async {
        try {
          final now = DateTime.now();
          final cur = LatLng(p.latitude, p.longitude);

          final timeDeltaMs = now.difference(_lastMove).inMilliseconds;
          bool shouldMove = false;

          if (_lastLatLng == null) {
            shouldMove = true;
          } else {
            final dx = (cur.latitude - _lastLatLng!.latitude) * 111000;
            final dy = (cur.longitude - _lastLatLng!.longitude) *
                (111000 * cos(cur.latitude * (pi / 180)));
            final dist = sqrt(dx * dx + dy * dy);
            if (dist >= 5.0) shouldMove = true;
          }

          if (!shouldMove && timeDeltaMs < 800) return;

          _lastMove = now;
          _lastLatLng = cur;

          final controller = await _ctrl.future;
          await controller.moveCamera(
            CameraUpdate.newLatLngZoom(cur, 16),
          );
        } catch (_) {}
      });

      setState(() => _autoFollow = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Could not start follow mode: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Danger Zones Map')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!, style: const TextStyle(color: Colors.red)))
              : GoogleMap(
                  initialCameraPosition: CameraPosition(target: _initial, zoom: 14),
                  circles: _circles,
                  markers: _markers,
                  myLocationEnabled: true,
                  myLocationButtonEnabled: false, // custom button instead
                  onMapCreated: (c) {
                    if (!_ctrl.isCompleted) _ctrl.complete(c);
                  },
                ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            heroTag: 'refresh_zones',
            onPressed: _loadZones,
            child: const Icon(Icons.refresh),
            tooltip: 'Reload zones',
          ),
          const SizedBox(height: 12),
          FloatingActionButton(
            heroTag: 'goto_my_loc',
            onPressed: _goToMyLocation,
            child: const Icon(Icons.my_location),
            tooltip: 'Go to my location',
          ),
          const SizedBox(height: 12),
          FloatingActionButton(
            heroTag: 'toggle_follow',
            onPressed: _toggleFollow,
            backgroundColor: _autoFollow ? Colors.green : null,
            child: Icon(_autoFollow ? Icons.location_searching : Icons.follow_the_signs),
            tooltip: _autoFollow ? 'Stop following' : 'Follow my location',
          ),
        ],
      ),
    );
  }
}
