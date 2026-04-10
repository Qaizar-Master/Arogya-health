class AlertModel {
  final String id;
  final String type;
  final String severity;
  final String message;
  final bool isRead;
  final DateTime createdAt;

  const AlertModel({
    required this.id,
    required this.type,
    required this.severity,
    required this.message,
    required this.isRead,
    required this.createdAt,
  });

  factory AlertModel.fromJson(Map<String, dynamic> j) => AlertModel(
        id: j['id'],
        type: j['type'],
        severity: j['severity'],
        message: j['message'],
        isRead: j['isRead'] ?? false,
        createdAt: DateTime.parse(j['createdAt']),
      );
}
