// lib/pages/registration_page.dart
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:tourist_safety_app/models.dart';

import '../services/api_client.dart';
import '../services/storage_service.dart';

String normalizePhone(String? p) {
  if (p == null) return '';
  return p.replaceAll(RegExp(r'\D+'), '');
}

class RegistrationPage extends StatefulWidget {
  const RegistrationPage({super.key});

  @override
  State<RegistrationPage> createState() => _RegistrationPageState();
}

class _ItineraryItem {
  DateTime? date;
  final TextEditingController locationCtrl = TextEditingController();
  final TextEditingController activityCtrl = TextEditingController();

  void dispose() {
    locationCtrl.dispose();
    activityCtrl.dispose();
  }

  Map<String, String>? toMap() {
    if (date == null) return null;
    final dateStr = DateFormat('yyyy-MM-dd').format(date!);
    final loc = locationCtrl.text.trim();
    final act = activityCtrl.text.trim();
    if (loc.isEmpty) return null;
    return {"date": dateStr, "location": loc, "activity": act};
  }
}

class _RegistrationPageState extends State<RegistrationPage> {
  final _formKey = GlobalKey<FormState>();
  final _loginPhoneCtrl = TextEditingController(); // phone used for registration
  final _nameCtrl = TextEditingController();
  final _kycCtrl = TextEditingController();
  final _emergencyCtrl = TextEditingController();
  final _deviceIdCtrl = TextEditingController(); // 🔹 NEW: device unique ID

  DateTime? _startDate;
  DateTime? _endDate;
  bool _submitting = false;
  String? _error;

  final List<_ItineraryItem> _itinerary = [];

  @override
  void initState() {
    super.initState();
    _prefill();
  }

  Future<void> _prefill() async {
    final savedPhone = await SecureStorage().getPhone();
    if (savedPhone != null && savedPhone.isNotEmpty) {
      _loginPhoneCtrl.text = savedPhone;
    }
    final now = DateTime.now();
    setState(() {
      _startDate = DateTime(now.year, now.month, now.day);
      _endDate = _startDate!.add(const Duration(days: 1));
    });
  }

  @override
  void dispose() {
    _loginPhoneCtrl.dispose();
    _nameCtrl.dispose();
    _kycCtrl.dispose();
    _emergencyCtrl.dispose();
    _deviceIdCtrl.dispose(); // 🔹 dispose
    for (final it in _itinerary) {
      it.dispose();
    }
    super.dispose();
  }

  Future<void> _pickDate({required bool isStart}) async {
    final now = DateTime.now();
    final initial =
        isStart ? (_startDate ?? now) : (_endDate ?? now.add(const Duration(days: 1)));
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) {
      setState(() {
        if (isStart) {
          _startDate = DateTime(picked.year, picked.month, picked.day);
          if (_endDate != null && _endDate!.isBefore(_startDate!)) {
            _endDate = _startDate!.add(const Duration(days: 1));
          }
        } else {
          _endDate = DateTime(picked.year, picked.month, picked.day);
        }
      });
    }
  }

  Future<void> _pickItineraryItemDate(int index) async {
    final now = DateTime.now();
    final initial = _itinerary[index].date ?? now;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 3),
    );
    if (picked != null) {
      setState(() {
        _itinerary[index].date = DateTime(picked.year, picked.month, picked.day);
      });
    }
  }

  void _addItineraryItem() {
    setState(() {
      _itinerary.add(_ItineraryItem());
    });
  }

  void _removeItineraryItem(int index) {
    setState(() {
      _itinerary[index].dispose();
      _itinerary.removeAt(index);
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_startDate == null || _endDate == null) {
      setState(() => _error = 'Please select your visit dates');
      return;
    }
    if (_endDate!.isBefore(_startDate!)) {
      setState(() => _error = 'End date cannot be before start date');
      return;
    }

    // validate itinerary items
    final itineraryList = <Map<String, String>>[];
    for (var i = 0; i < _itinerary.length; i++) {
      final map = _itinerary[i].toMap();
      if (map == null) {
        setState(() => _error = 'Itinerary item ${i + 1} incomplete (date + location required)');
        return;
      }
      if ((map['location']?.length ?? 0) > 200 ||
          (map['activity']?.length ?? 0) > 500) {
        setState(() => _error = 'Itinerary item ${i + 1} too large');
        return;
      }
      itineraryList.add(map);
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final rawPhone = _loginPhoneCtrl.text.trim();
      final phone = normalizePhone(rawPhone);
      if (phone.isEmpty || phone.length < 8) {
        throw Exception('Enter a valid mobile number for registration');
      }

      final emergency = normalizePhone(_emergencyCtrl.text.trim());
      final deviceId = _deviceIdCtrl.text.trim();

      if (deviceId.isEmpty) {
        throw Exception('Please enter the unique ID of your device');
      }

      // DEBUG
      // ignore: avoid_print
      print(
          '[DEBUG] registerTourist -> phone=$phone, fullName=${_nameCtrl.text.trim()}, itineraryCount=${itineraryList.length}, deviceId=$deviceId');

      final api = ApiClient();

      // 1) Register tourist (stores profile + on-chain anchor)
      final registerDid = await api.registerTourist(
        phone: phone,
        fullName: _nameCtrl.text.trim(),
        kycId: _kycCtrl.text.trim(),
        visitStart: _startDate!,
        visitEnd: _endDate!,
        emergencyPhone: emergency,
        itinerary: itineraryList,
      );

      // 2) Issue Digital ID + bind hardware device (v2 endpoint)
      RegistrationStatus didStatus;
      try {
        didStatus = await api.issueDigitalId(
          phone,
          deviceId: deviceId,
          deviceType: 'tourist_device_v1',
        );
      } catch (e) {
        setState(() =>
            _error = 'Digital ID / device binding failed. Please try again.\n$e');
        return;
      }

      final digitalId =
          (didStatus.digitalId != null && didStatus.digitalId!.isNotEmpty)
              ? didStatus.digitalId!
              : registerDid;

      // persist DID + phone + device ID
      await SecureStorage().saveDigitalId(digitalId);
      await SecureStorage().savePhone(phone);
      await SecureStorage().saveDeviceId(deviceId); // 🔹 store device

      if (!mounted) return;
      Navigator.of(context).pushReplacementNamed('/home');
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _submitting = false);
    }
  }

  Future<void> _resetApp() async {
    await SecureStorage().clear(); // wipes DID + phone + device
    if (!mounted) return;
    Navigator.of(context).pushReplacementNamed('/login'); // back to OTP
  }

  @override
  Widget build(BuildContext context) {
    final df = DateFormat('dd MMM yyyy');

    return Scaffold(
      appBar: AppBar(title: const Text('Tourist Registration')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // explicit phone field for registration (prefilled but editable)
              TextFormField(
                controller: _loginPhoneCtrl,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Mobile number (used for registration)',
                  border: OutlineInputBorder(),
                ),
                autofillHints: const [AutofillHints.telephoneNumber],
                validator: (v) {
                  final p = normalizePhone(v);
                  if (p.isEmpty || p.length < 8) return 'Enter a valid mobile number';
                  return null;
                },
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _nameCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  border: OutlineInputBorder(),
                ),
                autofillHints: const [AutofillHints.name],
                validator: (v) =>
                    (v == null || v.trim().length < 3) ? 'Enter your full name' : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _kycCtrl,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'KYC ID (Passport/Aadhaar)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Enter KYC ID' : null,
              ),
              const SizedBox(height: 12),

              TextFormField(
                controller: _emergencyCtrl,
                keyboardType: TextInputType.phone,
                textInputAction: TextInputAction.next,
                decoration: const InputDecoration(
                  labelText: 'Emergency Contact (Phone)',
                  border: OutlineInputBorder(),
                ),
                autofillHints: const [AutofillHints.telephoneNumber],
                validator: (v) =>
                    (v == null || normalizePhone(v).length < 8) ? 'Enter emergency phone' : null,
              ),
              const SizedBox(height: 12),

              // 🔹 NEW: Device Unique ID field
              TextFormField(
                controller: _deviceIdCtrl,
                textInputAction: TextInputAction.done,
                decoration: const InputDecoration(
                  labelText: 'Device Unique ID (LoRa / ESP node ID)',
                  border: OutlineInputBorder(),
                ),
                validator: (v) {
                  if (v == null || v.trim().isEmpty) {
                    return 'Enter the unique ID printed/configured on your device';
                  }
                  if (v.trim().length < 3) {
                    return 'Device ID looks too short';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _pickDate(isStart: true),
                      child: Text(
                        _startDate == null
                            ? 'Select Start Date'
                            : 'Start: ${df.format(_startDate!)}',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _pickDate(isStart: false),
                      child: Text(
                        _endDate == null
                            ? 'Select End Date'
                            : 'End: ${df.format(_endDate!)}',
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16),
              // Itinerary section
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Itinerary (optional)',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                  ),
                  TextButton.icon(
                    onPressed: _addItineraryItem,
                    icon: const Icon(Icons.add),
                    label: const Text('Add item'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              ..._itinerary.asMap().entries.map((entry) {
                final idx = entry.key;
                final it = entry.value;
                return Card(
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  child: Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => _pickItineraryItemDate(idx),
                                child: Text(
                                  it.date == null
                                      ? 'Pick date'
                                      : DateFormat('dd MMM yyyy').format(it.date!),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            IconButton(
                              onPressed: () => _removeItineraryItem(idx),
                              icon: const Icon(Icons.delete, color: Colors.red),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: it.locationCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Location / Place',
                            border: OutlineInputBorder(),
                          ),
                        ),
                        const SizedBox(height: 8),
                        TextFormField(
                          controller: it.activityCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Activity (optional)',
                            border: OutlineInputBorder(),
                          ),
                          maxLines: 2,
                        ),
                      ],
                    ),
                  ),
                );
              }).toList(),
              const SizedBox(height: 16),

              if (_error != null)
                Text(
                  _error!,
                  style: const TextStyle(color: Colors.red),
                ),
              const SizedBox(height: 8),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _submitting ? null : _submit,
                  child: _submitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Register & Get Digital ID'),
                ),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: _submitting ? null : _resetApp,
                child: const Text('Reset App (Switch Number)'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
