import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../core/constants.dart';
import '../../models/alert_model.dart';
import '../../models/consultation.dart';
import '../../models/vital_log.dart';
import '../../providers/auth_provider.dart';

final _dashboardProvider = FutureProvider<Map<String, dynamic>>((ref) async {
  ref.watch(authProvider);
  final results = await Future.wait([
    apiClient.get('/vitals/me?limit=1'),
    apiClient.get('/alerts/me?unread=true&limit=5'),
    apiClient.get('/consultations/me'),
  ]);

  final vitals = (results[0].data['data'] as List?)?.map((v) => VitalLog.fromJson(v)).toList() ?? [];
  final alertData = results[1].data['alerts'] as List? ?? [];
  final alerts = alertData.map((a) => AlertModel.fromJson(a)).toList();
  final consultData = results[2].data as List? ?? [];
  final consults = consultData.map((c) => Consultation.fromJson(c)).toList()
    ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));

  return {'vitals': vitals, 'alerts': alerts, 'consults': consults};
});

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authProvider).value;
    final dashboard = ref.watch(_dashboardProvider);

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () async => ref.invalidate(_dashboardProvider),
          child: CustomScrollView(
            slivers: [
              // Header
              SliverToBoxAdapter(
                child: Container(
                  color: const Color(kBrandGreen),
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _greeting(),
                                style: const TextStyle(color: Colors.white70, fontSize: 13),
                              ),
                              Text(
                                auth?.firstName ?? 'Patient',
                                style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                          GestureDetector(
                            onTap: () => context.go('/alerts'),
                            child: dashboard.when(
                              data: (d) {
                                final count = (d['alerts'] as List).length;
                                return Badge(
                                  isLabelVisible: count > 0,
                                  label: Text('$count'),
                                  child: const Icon(Icons.notifications_outlined, color: Colors.white, size: 28),
                                );
                              },
                              loading: () => const Icon(Icons.notifications_outlined, color: Colors.white, size: 28),
                              error: (_, __) => const Icon(Icons.notifications_outlined, color: Colors.white, size: 28),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Content
              SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    dashboard.when(
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (e, _) => Center(child: Text('Error: $e')),
                      data: (d) => _DashboardContent(data: d),
                    ),
                  ]),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _greeting() {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning,';
    if (h < 17) return 'Good afternoon,';
    return 'Good evening,';
  }
}

class _DashboardContent extends StatelessWidget {
  final Map<String, dynamic> data;
  const _DashboardContent({required this.data});

  @override
  Widget build(BuildContext context) {
    final alerts = data['alerts'] as List<AlertModel>;
    final consults = data['consults'] as List<Consultation>;
    final upcoming = consults.where((c) => c.status == 'SCHEDULED' && c.scheduledAt.isAfter(DateTime.now())).toList();
    final recentVital = (data['vitals'] as List<VitalLog>).isNotEmpty ? (data['vitals'] as List<VitalLog>).first : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Quick stats row
        Row(children: [
          _StatCard(
            icon: Icons.monitor_heart,
            label: 'Vitals',
            value: recentVital != null ? 'Updated' : 'No data',
            color: Colors.blue,
            onTap: () => context.go('/vitals'),
          ),
          const SizedBox(width: 12),
          _StatCard(
            icon: Icons.notifications_active,
            label: 'Alerts',
            value: '${alerts.length} unread',
            color: alerts.isEmpty ? Colors.green : Colors.orange,
            onTap: () => context.go('/alerts'),
          ),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          _StatCard(
            icon: Icons.medication,
            label: 'Medications',
            value: 'View all',
            color: Colors.purple,
            onTap: () => context.go('/medications'),
          ),
          const SizedBox(width: 12),
          _StatCard(
            icon: Icons.calendar_today,
            label: 'Consultations',
            value: upcoming.isEmpty ? 'None scheduled' : DateFormat('dd MMM').format(upcoming.first.scheduledAt),
            color: Colors.teal,
            onTap: () => context.go('/consultations'),
          ),
        ]),
        const SizedBox(height: 24),

        // Upcoming consultation
        if (upcoming.isNotEmpty) ...[
          const Text('Upcoming Consultation', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
          const SizedBox(height: 8),
          Card(
            child: ListTile(
              leading: const CircleAvatar(
                backgroundColor: Color(kBrandLight),
                child: Icon(Icons.stethoscope, color: Color(kBrandGreen)),
              ),
              title: Text(upcoming.first.doctorName, style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text(
                '${DateFormat('dd MMM yyyy, h:mm a').format(upcoming.first.scheduledAt)} · ${upcoming.first.visitType ?? 'in-person'}',
              ),
              trailing: upcoming.first.chiefComplaint != null
                  ? Text(upcoming.first.chiefComplaint!, style: const TextStyle(fontSize: 11, color: Colors.grey))
                  : null,
            ),
          ),
          const SizedBox(height: 24),
        ],

        // Recent alerts
        if (alerts.isNotEmpty) ...[
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Recent Alerts', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              TextButton(onPressed: () => context.go('/alerts'), child: const Text('View all')),
            ],
          ),
          const SizedBox(height: 8),
          ...alerts.take(3).map((a) => _AlertTile(alert: a)),
        ],
      ],
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  final VoidCallback onTap;

  const _StatCard({required this.icon, required this.label, required this.value, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(icon, color: color, size: 24),
                  const SizedBox(height: 8),
                  Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 11)),
                  const SizedBox(height: 2),
                  Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                ],
              ),
            ),
          ),
        ),
      );
}

class _AlertTile extends StatelessWidget {
  final AlertModel alert;
  const _AlertTile({required this.alert});

  Color get _color {
    switch (alert.severity) {
      case 'CRITICAL': return Colors.red;
      case 'HIGH': return Colors.orange;
      case 'MEDIUM': return Colors.amber;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 8),
        child: ListTile(
          leading: Icon(Icons.warning_amber, color: _color),
          title: Text(alert.message, style: const TextStyle(fontSize: 13)),
          subtitle: Text(DateFormat('dd MMM, h:mm a').format(alert.createdAt), style: const TextStyle(fontSize: 11)),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(color: _color.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
            child: Text(alert.severity, style: TextStyle(color: _color, fontSize: 10, fontWeight: FontWeight.w600)),
          ),
        ),
      );
}
