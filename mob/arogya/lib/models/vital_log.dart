class VitalLog {
  final String id;
  final DateTime recordedAt;
  final double? bloodGlucose;
  final int? systolicBP;
  final int? diastolicBP;
  final int? heartRate;
  final double? weight;
  final int? spo2;
  final double? temperature;
  final double? hba1c;
  final double? creatinine;
  final double? egfr;
  final double? cholesterol;
  final String? notes;
  final String source;

  const VitalLog({
    required this.id,
    required this.recordedAt,
    this.bloodGlucose,
    this.systolicBP,
    this.diastolicBP,
    this.heartRate,
    this.weight,
    this.spo2,
    this.temperature,
    this.hba1c,
    this.creatinine,
    this.egfr,
    this.cholesterol,
    this.notes,
    required this.source,
  });

  factory VitalLog.fromJson(Map<String, dynamic> j) => VitalLog(
        id: j['id'],
        recordedAt: DateTime.parse(j['recordedAt']),
        bloodGlucose: (j['bloodGlucose'] as num?)?.toDouble(),
        systolicBP: j['systolicBP'] as int?,
        diastolicBP: j['diastolicBP'] as int?,
        heartRate: j['heartRate'] as int?,
        weight: (j['weight'] as num?)?.toDouble(),
        spo2: j['spo2'] as int?,
        temperature: (j['temperature'] as num?)?.toDouble(),
        hba1c: (j['hba1c'] as num?)?.toDouble(),
        creatinine: (j['creatinine'] as num?)?.toDouble(),
        egfr: (j['egfr'] as num?)?.toDouble(),
        cholesterol: (j['cholesterol'] as num?)?.toDouble(),
        notes: j['notes'],
        source: j['source'] ?? 'MANUAL',
      );

  Map<String, dynamic> toJson() => {
        if (bloodGlucose != null) 'bloodGlucose': bloodGlucose,
        if (systolicBP != null) 'systolicBP': systolicBP,
        if (diastolicBP != null) 'diastolicBP': diastolicBP,
        if (heartRate != null) 'heartRate': heartRate,
        if (weight != null) 'weight': weight,
        if (spo2 != null) 'spo2': spo2,
        if (temperature != null) 'temperature': temperature,
        if (hba1c != null) 'hba1c': hba1c,
        if (creatinine != null) 'creatinine': creatinine,
        if (egfr != null) 'egfr': egfr,
        if (cholesterol != null) 'cholesterol': cholesterol,
        if (notes != null) 'notes': notes,
        'source': source,
        'recordedAt': recordedAt.toIso8601String(),
      };
}
