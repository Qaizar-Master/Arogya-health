class PatientCondition {
  final String id;
  final String conditionType;
  final String? severity;
  final bool isActive;

  const PatientCondition({
    required this.id,
    required this.conditionType,
    this.severity,
    required this.isActive,
  });

  factory PatientCondition.fromJson(Map<String, dynamic> j) => PatientCondition(
        id: j['id'],
        conditionType: j['conditionType'],
        severity: j['severity'],
        isActive: j['isActive'] ?? true,
      );

  String get label {
    const labels = {
      'DIABETES_T1': 'Type 1 Diabetes',
      'DIABETES_T2': 'Type 2 Diabetes',
      'HYPERTENSION': 'Hypertension',
      'CKD': 'Chronic Kidney Disease',
      'HEART_DISEASE': 'Heart Disease',
      'COPD': 'COPD',
      'ASTHMA': 'Asthma',
      'OTHER': 'Other',
    };
    return labels[conditionType] ?? conditionType;
  }
}

class UserProfile {
  final String id;
  final String userId;
  final String firstName;
  final String lastName;
  final String? phone;
  final String? gender;
  final String? dateOfBirth;
  final String? abhaId;
  final List<PatientCondition> conditions;
  final int unreadAlerts;

  const UserProfile({
    required this.id,
    required this.userId,
    required this.firstName,
    required this.lastName,
    this.phone,
    this.gender,
    this.dateOfBirth,
    this.abhaId,
    required this.conditions,
    required this.unreadAlerts,
  });

  String get fullName => '$firstName $lastName';

  factory UserProfile.fromJson(Map<String, dynamic> j) {
    final profile = j['profile'] ?? j;
    return UserProfile(
      id: profile['id'],
      userId: profile['userId'] ?? j['id'] ?? '',
      firstName: profile['firstName'] ?? '',
      lastName: profile['lastName'] ?? '',
      phone: profile['phone'],
      gender: profile['gender'],
      dateOfBirth: profile['dateOfBirth'],
      abhaId: profile['abhaId'],
      conditions: (profile['conditions'] as List? ?? [])
          .map((c) => PatientCondition.fromJson(c))
          .toList(),
      unreadAlerts: profile['_count']?['alerts'] ?? 0,
    );
  }
}
