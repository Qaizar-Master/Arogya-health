import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/consultation.dart';

final consultationsProvider = FutureProvider<List<Consultation>>((ref) async {
  final res = await apiClient.get('/consultations/me');
  final data = res.data;
  final list = (data is List ? data : data['data'] as List? ?? []);
  return (list as List)
      .map((c) => Consultation.fromJson(c as Map<String, dynamic>))
      .toList()
    ..sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
});

class ConsultationsScreen extends ConsumerWidget {
  const ConsultationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final consults = ref.watch(consultationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Consultations')),
      body: consults.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.safety_check, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No consultations yet', style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }

          final upcoming = list
              .where((c) => c.status == 'SCHEDULED' && c.scheduledAt.isAfter(DateTime.now()))
              .toList();
          final past = list
              .where((c) => !(c.status == 'SCHEDULED' && c.scheduledAt.isAfter(DateTime.now())))
              .toList();

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(consultationsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (upcoming.isNotEmpty) ...[
                  const Text('Upcoming', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 8),
                  ...upcoming.map((c) => _ConsultCard(consult: c)),
                  const SizedBox(height: 16),
                ],
                if (past.isNotEmpty) ...[
                  const Text('Past', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                  const SizedBox(height: 8),
                  ...past.map((c) => _ConsultCard(consult: c)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _ConsultCard extends StatelessWidget {
  final Consultation consult;
  const _ConsultCard({required this.consult});

  Color get _statusColor {
    switch (consult.status) {
      case 'SCHEDULED': return Colors.blue;
      case 'COMPLETED': return Colors.green;
      case 'CANCELLED': return Colors.red;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd MMM yyyy, h:mm a');
    final isUpcoming = consult.status == 'SCHEDULED' && consult.scheduledAt.isAfter(DateTime.now());

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: isUpcoming
            ? BorderSide(color: const Color(kBrandGreen).withOpacity(0.4), width: 1.5)
            : BorderSide.none,
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: isUpcoming ? const Color(kBrandLight) : Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.safety_check,
                color: isUpcoming ? const Color(kBrandGreen) : Colors.grey,
                size: 22,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(consult.doctorName,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _statusColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          consult.status,
                          style: TextStyle(color: _statusColor, fontSize: 10, fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  if (consult.doctorSpeciality != null)
                    Text(consult.doctorSpeciality!, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  const SizedBox(height: 6),
                  Row(
                    children: [
                      const Icon(Icons.calendar_today, size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(fmt.format(consult.scheduledAt), style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                    ],
                  ),
                  if (consult.visitType != null) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          consult.visitType == 'telemedicine' ? Icons.videocam_outlined : Icons.local_hospital_outlined,
                          size: 12,
                          color: Colors.grey,
                        ),
                        const SizedBox(width: 4),
                        Text(consult.visitType!, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                      ],
                    ),
                  ],
                  if (consult.chiefComplaint != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      consult.chiefComplaint!,
                      style: TextStyle(color: Colors.grey[700], fontSize: 12, fontStyle: FontStyle.italic),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
