import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/vital_log.dart';

final vitalsProvider = FutureProvider<List<VitalLog>>((ref) async {
  final res = await apiClient.get('/vitals/me?limit=30');
  return (res.data['data'] as List).map((v) => VitalLog.fromJson(v)).toList();
});

class VitalsScreen extends ConsumerWidget {
  const VitalsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final vitals = ref.watch(vitalsProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Vitals')),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.go('/vitals/log'),
        backgroundColor: const Color(kBrandGreen),
        icon: const Icon(Icons.add, color: Colors.white),
        label: const Text('Log Reading', style: TextStyle(color: Colors.white)),
      ),
      body: vitals.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.monitor_heart_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No vitals logged yet', style: TextStyle(color: Colors.grey)),
                  SizedBox(height: 8),
                  Text('Tap + to log your first reading', style: TextStyle(color: Colors.grey, fontSize: 13)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(vitalsProvider),
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _VitalChart(vitals: list, field: 'bloodGlucose', label: 'Blood Glucose', unit: 'mg/dL', min: 70, max: 140),
                _VitalChart(vitals: list, field: 'systolicBP', label: 'Systolic BP', unit: 'mmHg', min: 90, max: 140),
                _VitalChart(vitals: list, field: 'heartRate', label: 'Heart Rate', unit: 'bpm', min: 50, max: 100),
                _VitalChart(vitals: list, field: 'spo2', label: 'SpO₂', unit: '%', min: 95, max: 100),
                const SizedBox(height: 16),
                const Text('Recent Readings', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                ...list.map((v) => _VitalListTile(vital: v)),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _VitalChart extends StatelessWidget {
  final List<VitalLog> vitals;
  final String field;
  final String label;
  final String unit;
  final double min;
  final double max;

  const _VitalChart({
    required this.vitals,
    required this.field,
    required this.label,
    required this.unit,
    required this.min,
    required this.max,
  });

  double? _getValue(VitalLog v) {
    switch (field) {
      case 'bloodGlucose': return v.bloodGlucose;
      case 'systolicBP': return v.systolicBP?.toDouble();
      case 'heartRate': return v.heartRate?.toDouble();
      case 'spo2': return v.spo2?.toDouble();
      default: return null;
    }
  }

  @override
  Widget build(BuildContext context) {
    final points = vitals
        .where((v) => _getValue(v) != null)
        .take(14)
        .toList()
        .reversed
        .toList();

    if (points.isEmpty) return const SizedBox.shrink();

    final spots = points.asMap().entries
        .map((e) => FlSpot(e.key.toDouble(), _getValue(e.value)!))
        .toList();

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                Text('Normal: $min–$max $unit', style: TextStyle(color: Colors.grey[600], fontSize: 11)),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              height: 100,
              child: LineChart(LineChartData(
                minY: min * 0.8,
                maxY: max * 1.2,
                gridData: const FlGridData(show: false),
                borderData: FlBorderData(show: false),
                titlesData: const FlTitlesData(show: false),
                lineBarsData: [
                  LineChartBarData(
                    spots: spots,
                    isCurved: true,
                    color: const Color(kBrandGreen),
                    barWidth: 2,
                    dotData: FlDotData(
                      getDotPainter: (spot, _, __, ___) {
                        final outOfRange = spot.y < min || spot.y > max;
                        return FlDotCirclePainter(
                          radius: 3,
                          color: outOfRange ? Colors.red : const Color(kBrandGreen),
                          strokeWidth: 1,
                          strokeColor: Colors.white,
                        );
                      },
                    ),
                    belowBarData: BarAreaData(
                      show: true,
                      color: const Color(kBrandGreen).withOpacity(0.1),
                    ),
                  ),
                ],
              )),
            ),
            const SizedBox(height: 4),
            Text(
              'Latest: ${_getValue(points.last)?.toStringAsFixed(1)} $unit',
              style: TextStyle(
                color: (_getValue(points.last) ?? 0) < min || (_getValue(points.last) ?? 0) > max
                    ? Colors.red
                    : const Color(kBrandGreen),
                fontWeight: FontWeight.w600,
                fontSize: 12,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VitalListTile extends StatelessWidget {
  final VitalLog vital;
  const _VitalListTile({required this.vital});

  @override
  Widget build(BuildContext context) {
    final values = <String>[];
    if (vital.bloodGlucose != null) values.add('BG: ${vital.bloodGlucose!.toStringAsFixed(0)} mg/dL');
    if (vital.systolicBP != null && vital.diastolicBP != null) values.add('BP: ${vital.systolicBP}/${vital.diastolicBP}');
    if (vital.heartRate != null) values.add('HR: ${vital.heartRate} bpm');
    if (vital.spo2 != null) values.add('SpO₂: ${vital.spo2}%');
    if (vital.weight != null) values.add('Wt: ${vital.weight!.toStringAsFixed(1)} kg');
    if (vital.temperature != null) values.add('Temp: ${vital.temperature!.toStringAsFixed(1)}°C');

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Text(
                  DateFormat('dd\nMMM').format(vital.recordedAt),
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                ),
                Text(
                  DateFormat('h:mm a').format(vital.recordedAt),
                  style: TextStyle(color: Colors.grey[500], fontSize: 10),
                ),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Wrap(
                spacing: 8,
                runSpacing: 4,
                children: values
                    .map((v) => Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.grey[100],
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(v, style: const TextStyle(fontSize: 12)),
                        ))
                    .toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
