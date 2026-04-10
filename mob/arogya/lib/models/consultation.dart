class Consultation {
  final String id;
  final DateTime scheduledAt;
  final DateTime? completedAt;
  final String status;
  final String? chiefComplaint;
  final String? visitType;
  final String? doctorFirstName;
  final String? doctorLastName;
  final String? doctorSpeciality;

  const Consultation({
    required this.id,
    required this.scheduledAt,
    this.completedAt,
    required this.status,
    this.chiefComplaint,
    this.visitType,
    this.doctorFirstName,
    this.doctorLastName,
    this.doctorSpeciality,
  });

  String get doctorName =>
      (doctorFirstName != null && doctorLastName != null)
          ? 'Dr. $doctorFirstName $doctorLastName'
          : 'Doctor';

  factory Consultation.fromJson(Map<String, dynamic> j) => Consultation(
        id: j['id'],
        scheduledAt: DateTime.parse(j['scheduledAt']),
        completedAt:
            j['completedAt'] != null ? DateTime.parse(j['completedAt']) : null,
        status: j['status'],
        chiefComplaint: j['chiefComplaint'],
        visitType: j['visitType'],
        doctorFirstName: j['doctor']?['firstName'],
        doctorLastName: j['doctor']?['lastName'],
        doctorSpeciality: j['doctor']?['speciality'],
      );
}
