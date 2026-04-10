import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../core/api_client.dart';
import '../../models/alert_model.dart';

final alertsProvider = FutureProvider<List<AlertModel>>((ref) async {
  final res = await apiClient.get('/alerts/me?limit=50');
  final data = res.data;
  final list = data['alerts'] as List? ?? [];
  return list.map((a) => AlertModel.fromJson(a as Map<String, dynamic>)).toList();
});

class AlertsScreen extends ConsumerWidget {
  const AlertsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final alerts = ref.watch(alertsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          alerts.when(
            data: (list) {
              final unread = list.where((a) => !a.isRead).length;
              if (unread == 0) return const SizedBox.shrink();
              return TextButton(
                onPressed: () async {
                  await apiClient.patch('/alerts/me/read-all');
                  ref.invalidate(alertsProvider);
                },
                child: const Text('Mark all read'),
              );
            },
            loading: () => const SizedBox.shrink(),
            error: (_, __) => const SizedBox.shrink(),
          ),
        ],
      ),
      body: alerts.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (list) {
          if (list.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.notifications_none, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('No alerts', style: TextStyle(color: Colors.grey)),
                ],
              ),
            );
          }
          return RefreshIndicator(
            onRefresh: () async => ref.invalidate(alertsProvider),
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: list.length,
              itemBuilder: (_, i) => _AlertTile(
                alert: list[i],
                onRead: () async {
                  if (!list[i].isRead) {
                    await apiClient.patch('/alerts/${list[i].id}/read');
                    ref.invalidate(alertsProvider);
                  }
                },
              ),
            ),
          );
        },
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  final AlertModel alert;
  final VoidCallback onRead;
  const _AlertTile({required this.alert, required this.onRead});

  Color get _color {
    switch (alert.severity) {
      case 'CRITICAL': return Colors.red;
      case 'HIGH': return Colors.orange;
      case 'MEDIUM': return Colors.amber;
      default: return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dismissible(
      key: ValueKey(alert.id),
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: 16),
        decoration: BoxDecoration(
          color: Colors.green.withOpacity(0.2),
          borderRadius: BorderRadius.circular(10),
        ),
        child: const Icon(Icons.done, color: Colors.green),
      ),
      onDismissed: (_) => onRead(),
      child: Card(
        margin: const EdgeInsets.only(bottom: 8),
        color: alert.isRead ? null : _color.withOpacity(0.04),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(10),
          side: alert.isRead ? BorderSide.none : BorderSide(color: _color.withOpacity(0.3)),
        ),
        child: ListTile(
          onTap: onRead,
          leading: CircleAvatar(
            backgroundColor: _color.withOpacity(0.1),
            child: Icon(Icons.warning_amber, color: _color, size: 20),
          ),
          title: Text(alert.message, style: TextStyle(fontSize: 13, fontWeight: alert.isRead ? FontWeight.normal : FontWeight.w600)),
          subtitle: Text(
            DateFormat('dd MMM yyyy, h:mm a').format(alert.createdAt),
            style: const TextStyle(fontSize: 11),
          ),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: _color.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(alert.severity, style: TextStyle(color: _color, fontSize: 10, fontWeight: FontWeight.w600)),
              ),
              if (!alert.isRead) ...[
                const SizedBox(height: 4),
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(color: _color, shape: BoxShape.circle),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
