// lib/pages/login_page.dart
import 'package:flutter/material.dart';

import '../services/api_client.dart';
import '../services/storage_service.dart';

String normalizePhone(String? p) {
  if (p == null) return '';
  return p.replaceAll(RegExp(r'\D+'), '');
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _phoneCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();

  bool _otpSent = false;
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _phoneCtrl.dispose();
    _otpCtrl.dispose();
    super.dispose();
  }

  Future<void> _requestOtp() async {
    final rawPhone = _phoneCtrl.text.trim();
    final phone = normalizePhone(rawPhone);
    if (phone.length < 8) {
      setState(() => _error = 'Enter a valid phone number');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      await ApiClient().sendOtp(phone: phone);
      await SecureStorage().savePhone(phone);
      setState(() => _otpSent = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _verifyOtp() async {
    final rawPhone = _phoneCtrl.text.trim();
    final phone = normalizePhone(rawPhone);
    final code = _otpCtrl.text.trim();
    if (code.length != 6) {
      setState(() => _error = 'Enter the 6-digit OTP you received');
      return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final outcome = await ApiClient().verifyOtpNormalized(phone: phone, code: code);

      await SecureStorage().savePhone(phone);

      if (outcome.registered) {
        var did = outcome.digitalId;
        if (did == null || did.isEmpty) {
          try {
            final st = await ApiClient().status(phone);
            did = st.digitalId;
          } catch (e) {
            debugPrint('[Login] status fetch failed after verify: $e');
          }
        }

        if (did != null && did.isNotEmpty) {
          await SecureStorage().saveDigitalId(did);
          await SecureStorage().setRequireOtp(false);
          if (!mounted) return;
          Navigator.of(context).pushReplacementNamed('/home');
          return;
        } else {
          setState(() => _error = 'OTP verified but Digital ID not found.');
          return;
        }
      }

      // Not registered -> check status
      try {
        final status = await ApiClient().status(phone);
        if (status.digitalId != null && status.digitalId!.isNotEmpty) {
          await SecureStorage().saveDigitalId(status.digitalId!);
          await SecureStorage().setRequireOtp(false);
          if (!mounted) return;
          Navigator.of(context).pushReplacementNamed('/home');
          return;
        }

        // status exists but no DID -> go to registration
        _goToRegistrationWithMessage();
      } catch (e) {
        debugPrint('[Login] status call failed or user not found: $e');
        _goToRegistrationWithMessage();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  void _goToRegistrationWithMessage() {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Number not registered — please complete registration.')),
    );
    Navigator.of(context).pushReplacementNamed('/register');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login with OTP')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: _phoneCtrl,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Mobile number',
                border: OutlineInputBorder(),
              ),
              enabled: !_otpSent && !_loading,
            ),
            const SizedBox(height: 12),
            if (_otpSent)
              TextField(
                controller: _otpCtrl,
                keyboardType: TextInputType.number,
                maxLength: 6,
                decoration: const InputDecoration(
                  labelText: 'Enter OTP',
                  border: OutlineInputBorder(),
                ),
                enabled: !_loading,
              ),
            const SizedBox(height: 12),
            if (_error != null)
              Text(_error!, style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: _otpSent
                  ? FilledButton(
                      onPressed: _loading ? null : _verifyOtp,
                      child: _loading
                          ? const CircularProgressIndicator()
                          : const Text('Verify & Continue'),
                    )
                  : FilledButton.tonal(
                      onPressed: _loading ? null : _requestOtp,
                      child: _loading
                          ? const CircularProgressIndicator()
                          : const Text('Send OTP'),
                    ),
            ),
            if (_otpSent) ...[
              const SizedBox(height: 8),
              TextButton(
                onPressed: _loading ? null : _requestOtp,
                child: const Text('Resend OTP'),
              ),
            ]
          ],
        ),
      ),
    );
  }
}
