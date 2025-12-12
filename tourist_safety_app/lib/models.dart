/// Central DTO / model definitions used by ApiClient and pages.

/// Response from /tourists/register
class TouristRegistrationResponse {
  final String digitalId;

  const TouristRegistrationResponse(this.digitalId);

  factory TouristRegistrationResponse.fromJson(Map<String, dynamic> json) {
    return TouristRegistrationResponse(
      json['digital_id']?.toString() ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
        'digital_id': digitalId,
      };
}

/// Legacy OTP verify response (if using /auth/* endpoints)
class OtpVerifyResult {
  final bool isRegistered;
  final String? digitalId; // present only if already registered

  const OtpVerifyResult({
    required this.isRegistered,
    this.digitalId,
  });

  factory OtpVerifyResult.fromJson(Map<String, dynamic> json) {
    return OtpVerifyResult(
      isRegistered: json['is_registered'] == true,
      digitalId: json['digital_id']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'is_registered': isRegistered,
        'digital_id': digitalId,
      };
}

/// Unified result for OTP verify regardless of backend shape.
class VerifyOutcome {
  /// true when a DID exists (DIGITAL_ID_ISSUED)
  final bool registered;

  /// DID / tx hash, if issued
  final String? digitalId;

  /// e.g. NEW, OTP_VERIFIED, KYC_SUBMITTED, KYC_APPROVED, DIGITAL_ID_ISSUED
  final String state;

  const VerifyOutcome({
    required this.registered,
    required this.state,
    this.digitalId,
  });

  Map<String, dynamic> toJson() => {
        'registered': registered,
        'state': state,
        'digital_id': digitalId,
      };
}

/// Unified registration status used in /tourists/verify-otp, /status, /kyc/*, issue-digital-id.
class RegistrationStatus {
  final String phoneNumber;
  final String state; // NEW, OTP_VERIFIED, KYC_SUBMITTED, KYC_APPROVED, DIGITAL_ID_ISSUED
  final String? digitalId;

  const RegistrationStatus({
    required this.phoneNumber,
    required this.state,
    this.digitalId,
  });

  factory RegistrationStatus.fromJson(Map<String, dynamic> json) {
    return RegistrationStatus(
      phoneNumber: json['phone_number']?.toString() ?? '',
      state: json['state']?.toString() ?? '',
      digitalId: json['digital_id']?.toString(),
    );
  }

  Map<String, dynamic> toJson() => {
        'phone_number': phoneNumber,
        'state': state,
        'digital_id': digitalId,
      };
}
