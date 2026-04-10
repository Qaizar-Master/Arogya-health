import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/medication.dart';

final medicationsProvider = FutureProvider<List<Medication>>((ref) async {
  final res = await apiClient.get('/medications/me');
  final data = res.data;
  final list = (data is List ? data : data['data'] as List? ?? []);
  return list.map((m) => Medication.fromJson(m as Map<String, dynamic>)).toList();
});

class MedicationsScreen extends ConsumerWidget {
  const MedicationsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final meds = ref.watch(medicationsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Medications')),
      body: meds.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.medication_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No medications found', style: TextStyle(color: Colors.grey)),
                  SizedBox(height: 8),
                  Text('Your doctor will prescribe medications here', style: TextStyle(color: Colors.grey, fontSize: 13)),
                ],
              ),
            );
          }

          final active = list.where((m) => m.active).toList();
          final inactive = list.where((m) => !m.active).toList();

          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(medicationsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (active.isNotEmpty) ...[
                  const _SectionHeader(title: 'Active'),
                  ...active.map((m) => _MedCard(med: m)),
                ],
                if (inactive.isNotEmpty) ...[
                  const SizedBox(height: 8),
                  const _SectionHeader(title: 'Past'),
                  ...inactive.map((m) => _MedCard(med: m)),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _SectionHeader extends StatelessWidget {
  final String title;
  const _SectionHeader({required this.title});

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 8),
        child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
      );
}

class _MedCard extends StatelessWidget {
  final Medication med;
  const _MedCard({required this.med});

  @override
  Widget build(BuildContext context) {
    final fmt = DateFormat('dd MMM yyyy');
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: med.active ? const Color(kBrandLight) : Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                Icons.medication,
                color: med.active ? const Color(kBrandGreen) : Colors.grey,
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
                        child: Text(med.name, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                      ),
                      if (!med.active)
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: const Text('Stopped', style: TextStyle(fontSize: 10, color: Colors.grey)),
                        ),
                    ],
                  ),
                  if (med.genericName != null)
                    Text(med.genericName!, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  const SizedBox(height: 6),
                  Wrap(
                    spacing: 6,
                    runSpacing: 4,
                    children: [
                      _Tag('${med.dosage} · ${med.frequency}', Colors.blue),
                      _Tag(med.route, Colors.teal),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Since ${fmt.format(med.startDate)}${med.endDate != null ? ' → ${fmt.format(med.endDate!)}' : ''}',
                    style: TextStyle(color: Colors.grey[500], fontSize: 11),
                  ),
                  if (med.prescribedBy != null)
                    Text('By ${med.prescribedBy}', style: TextStyle(color: Colors.grey[500], fontSize: 11)),
                  if (med.notes != null) ...[
                    const SizedBox(height: 4),
                    Text(med.notes!, style: TextStyle(color: Colors.grey[600], fontSize: 12, fontStyle: FontStyle.italic)),
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

class _Tag extends StatelessWidget {
  final String label;
  final Color color;
  const _Tag(this.label, this.color);

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(4),
        ),
        child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w500)),
      );
}
