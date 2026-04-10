class Medication {
  final String id;
  final String name;
  final String? genericName;
  final String dosage;
  final String frequency;
  final String route;
  final DateTime startDate;
  final DateTime? endDate;
  final String? prescribedBy;
  final bool active;
  final String? notes;

  const Medication({
    required this.id,
    required this.name,
    this.genericName,
    required this.dosage,
    required this.frequency,
    required this.route,
    required this.startDate,
    this.endDate,
    this.prescribedBy,
    required this.active,
    this.notes,
  });

  factory Medication.fromJson(Map<String, dynamic> j) => Medication(
        id: j['id'],
        name: j['name'],
        genericName: j['genericName'],
        dosage: j['dosage'],
        frequency: j['frequency'],
        route: j['route'] ?? 'oral',
        startDate: DateTime.parse(j['startDate']),
        endDate: j['endDate'] != null ? DateTime.parse(j['endDate']) : null,
        prescribedBy: j['prescribedBy'],
        active: j['active'] ?? true,
        notes: j['notes'],
      );
}
