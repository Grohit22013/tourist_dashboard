// lib/location/sos_button.dart
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import '../services/storage_service.dart';

class SOSButton extends StatefulWidget {
  final String apiBase;
  const SOSButton({Key? key, required this.apiBase}) : super(key: key);

  @override
  _SOSButtonState createState() => _SOSButtonState();
}

class _SOSButtonState extends State<SOSButton> {
  bool _sending = false;

  /// Fetch coarse location from IP-based geolocation API.
  Future<Map<String, double>?> _fetchIpLocation() async {
    try {
      final res = await http.get(Uri.parse('https://ipapi.co/json/')).timeout(const Duration(seconds: 6));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body) as Map<String, dynamic>;
        final lat = double.tryParse((data['latitude'] ?? data['lat'] ?? '').toString());
        final lng = double.tryParse((data['longitude'] ?? data['lon'] ?? data['lng'] ?? '').toString());
        if (lat != null && lng != null) return {'lat': lat, 'lng': lng};
      }
    } catch (_) {}
    return null;
  }

  Future<void> _sendSos() async {
    setState(() => _sending = true);
    try {
      final phone = await SecureStorage().getPhone();
      final token = await SecureStorage().getToken.call(); // implement if you keep token
      final ipLoc = await _fetchIpLocation();

      final body = jsonEncode({
        "phone_number": phone,
        "lat": ipLoc?['lat'],
        "lng": ipLoc?['lng'],
        "timestamp": DateTime.now().toUtc().toIso8601String(),
        "note": "User pressed SOS (IP-based)",
      });

      final headers = {"Content-Type": "application/json"};
      if (token != null) headers["Authorization"] = "Bearer $token";

      final res = await http.post(
        Uri.parse("${widget.apiBase}/alerts/sos"),
        headers: headers,
        body: body,
      );

      if (res.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("SOS sent")));
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Failed to send SOS")));
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Error sending SOS: $e")));
    } finally {
      setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.red,
        padding: const EdgeInsets.all(16),
        shape: const CircleBorder(),
      ),
      onPressed: _sending ? null : _sendSos,
      child: _sending
          ? const CircularProgressIndicator()
          : const Icon(Icons.warning, size: 40),
    );
  }
}
