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

  final vitals = (results[0].data['data'] as List?)
          ?.map((v) => VitalLog.fromJson(v))
          .toList() ??
      [];
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
      backgroundColor: const Color(0xFFF2F5F1),
      body: SafeArea(
        child: RefreshIndicator(
          color: const Color(kBrandGreen),
          onRefresh: () async => ref.invalidate(_dashboardProvider),
          child: CustomScrollView(
            slivers: [
              SliverToBoxAdapter(
                  child: _Header(auth: auth, dashboard: dashboard)),
              SliverPadding(
                padding: const EdgeInsets.fromLTRB(20, 0, 20, 32),
                sliver: SliverList(
                  delegate: SliverChildListDelegate([
                    dashboard.when(
                      loading: () => const _LoadingSkeleton(),
                      error: (e, _) => _ErrorCard(error: e),
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
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }
}

class _Header extends StatelessWidget {
  final dynamic auth;
  final AsyncValue<Map<String, dynamic>> dashboard;

  const _Header({required this.auth, required this.dashboard});

  String get _greeting {
    final h = DateTime.now().hour;
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2E7D52), Color(kBrandGreen)],
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
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
                    _greeting,
                    style: const TextStyle(
                      color: Colors.white60,
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      letterSpacing: 0.3,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    auth?.firstName ?? 'Patient',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                      letterSpacing: -0.5,
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  dashboard.when(
                    data: (d) {
                      final count = (d['alerts'] as List).length;
                      return GestureDetector(
                        onTap: () => context.go('/alerts'),
                        child: Stack(
                          clipBehavior: Clip.none,
                          children: [
                            Container(
                              width: 44,
                              height: 44,
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.15),
                                borderRadius: BorderRadius.circular(14),
                              ),
                              child: const Icon(Icons.notifications_outlined,
                                  color: Colors.white, size: 22),
                            ),
                            if (count > 0)
                              Positioned(
                                top: -4,
                                right: -4,
                                child: Container(
                                  width: 18,
                                  height: 18,
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFF5252),
                                    borderRadius: BorderRadius.circular(9),
                                    border: Border.all(
                                        color: const Color(kBrandGreen),
                                        width: 1.5),
                                  ),
                                  child: Center(
                                    child: Text(
                                      '$count',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 9,
                                        fontWeight: FontWeight.w800,
                                      ),
                                    ),
                                  ),
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                    loading: () => Container(
                      width: 44,
                      height: 44,
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: const Icon(Icons.notifications_outlined,
                          color: Colors.white, size: 22),
                    ),
                    error: (_, __) => const SizedBox.shrink(),
                  ),
                  const SizedBox(width: 10),
                  Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(Icons.person_outline_rounded,
                        color: Colors.white, size: 22),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 20),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.15),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              children: [
                const Icon(Icons.favorite_rounded,
                    color: Colors.white, size: 18),
                const SizedBox(width: 10),
                const Text(
                  'Health score: ',
                  style: TextStyle(color: Colors.white70, fontSize: 13),
                ),
                const Text(
                  'Good',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const Spacer(),
                Text(
                  DateFormat('EEE, dd MMM').format(DateTime.now()),
                  style: const TextStyle(color: Colors.white60, fontSize: 12),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _LoadingSkeleton extends StatelessWidget {
  const _LoadingSkeleton();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final cardW = (constraints.maxWidth - 12) / 2;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 24),
            Row(children: [
              _SkeletonBox(width: cardW, height: 110, borderRadius: 20),
              const SizedBox(width: 12),
              _SkeletonBox(width: cardW, height: 110, borderRadius: 20),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              _SkeletonBox(width: cardW, height: 110, borderRadius: 20),
              const SizedBox(width: 12),
              _SkeletonBox(width: cardW, height: 110, borderRadius: 20),
            ]),
            const SizedBox(height: 24),
            _SkeletonBox(
                width: constraints.maxWidth, height: 90, borderRadius: 16),
          ],
        );
      },
    );
  }
}

class _SkeletonBox extends StatefulWidget {
  final double width;
  final double height;
  final double borderRadius;
  const _SkeletonBox(
      {required this.width, required this.height, required this.borderRadius});

  @override
  State<_SkeletonBox> createState() => _SkeletonBoxState();
}

class _SkeletonBoxState extends State<_SkeletonBox>
    with SingleTickerProviderStateMixin {
  late AnimationController _ctrl;
  late Animation<double> _anim;

  @override
  void initState() {
    super.initState();
    _ctrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1000))
      ..repeat(reverse: true);
    _anim = Tween<double>(begin: 0.5, end: 1.0).animate(_ctrl);
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => FadeTransition(
        opacity: _anim,
        child: Container(
          width: widget.width,
          height: widget.height,
          decoration: BoxDecoration(
            color: Colors.grey.shade200,
            borderRadius: BorderRadius.circular(widget.borderRadius),
          ),
        ),
      );
}

class _ErrorCard extends StatelessWidget {
  final Object error;
  const _ErrorCard({required this.error});

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(top: 24),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.red.shade50,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.red.shade100),
        ),
        child: Row(
          children: [
            Icon(Icons.error_outline_rounded, color: Colors.red.shade400),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                'Could not load dashboard. Pull down to retry.',
                style: TextStyle(color: Colors.red.shade700, fontSize: 13),
              ),
            ),
          ],
        ),
      );
}

class _DashboardContent extends StatelessWidget {
  final Map<String, dynamic> data;
  const _DashboardContent({required this.data});

  @override
  Widget build(BuildContext context) {
    final alerts = data['alerts'] as List<AlertModel>;
    final consults = data['consults'] as List<Consultation>;
    final upcoming = consults
        .where((c) =>
            c.status == 'SCHEDULED' && c.scheduledAt.isAfter(DateTime.now()))
        .toList();
    final recentVital = (data['vitals'] as List<VitalLog>).isNotEmpty
        ? (data['vitals'] as List<VitalLog>).first
        : null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: 24),
        _sectionLabel('Quick Access'),
        const SizedBox(height: 12),
        Row(children: [
          _StatCard(
            icon: Icons.monitor_heart_rounded,
            label: 'Vitals',
            value: recentVital != null ? 'Updated' : 'No data',
            accentColor: const Color(0xFF3B82F6),
            bgColor: const Color(0xFFEFF6FF),
            onTap: () => context.go('/vitals'),
          ),
          const SizedBox(width: 12),
          _StatCard(
            icon: Icons.notifications_active_rounded,
            label: 'Alerts',
            value: '${alerts.length} unread',
            accentColor: alerts.isEmpty
                ? const Color(0xFF10B981)
                : const Color(0xFFF59E0B),
            bgColor: alerts.isEmpty
                ? const Color(0xFFECFDF5)
                : const Color(0xFFFFFBEB),
            onTap: () => context.go('/alerts'),
          ),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          _StatCard(
            icon: Icons.medication_rounded,
            label: 'Medications',
            value: 'View all',
            accentColor: const Color(0xFF8B5CF6),
            bgColor: const Color(0xFFF5F3FF),
            onTap: () => context.go('/medications'),
          ),
          const SizedBox(width: 12),
          _StatCard(
            icon: Icons.calendar_today_rounded,
            label: 'Consultations',
            value: upcoming.isEmpty
                ? 'None scheduled'
                : DateFormat('dd MMM').format(upcoming.first.scheduledAt),
            accentColor: const Color(0xFF0D9488),
            bgColor: const Color(0xFFF0FDFA),
            onTap: () => context.go('/consultations'),
          ),
        ]),
        if (upcoming.isNotEmpty) ...[
          const SizedBox(height: 28),
          _sectionLabel('Upcoming Consultation'),
          const SizedBox(height: 12),
          _ConsultationCard(consult: upcoming.first),
        ],
        if (alerts.isNotEmpty) ...[
          const SizedBox(height: 28),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _sectionLabel('Recent Alerts'),
              GestureDetector(
                onTap: () => context.go('/alerts'),
                child: Text(
                  'View all',
                  style: TextStyle(
                    color: const Color(kBrandGreen),
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          ...alerts.take(3).map((a) => _AlertTile(alert: a)),
        ],
      ],
    );
  }

  Widget _sectionLabel(String text) => Text(
        text,
        style: const TextStyle(
          fontSize: 15,
          fontWeight: FontWeight.w800,
          color: Color(0xFF1A1A1A),
          letterSpacing: -0.2,
        ),
      );
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color accentColor;
  final Color bgColor;
  final VoidCallback onTap;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.accentColor,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) => Expanded(
        child: GestureDetector(
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 12,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: bgColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(icon, color: accentColor, size: 20),
                ),
                const SizedBox(height: 14),
                Text(
                  label,
                  style: TextStyle(
                    color: Colors.grey.shade500,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    letterSpacing: 0.3,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  value,
                  style: const TextStyle(
                    fontWeight: FontWeight.w700,
                    fontSize: 13,
                    color: Color(0xFF1A1A1A),
                  ),
                ),
              ],
            ),
          ),
        ),
      );
}

class _ConsultationCard extends StatelessWidget {
  final Consultation consult;
  const _ConsultationCard({required this.consult});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2E7D52), Color(kBrandGreen)],
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(kBrandGreen).withOpacity(0.3),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              borderRadius: BorderRadius.circular(14),
            ),
            child:
                const Icon(Icons.person_rounded, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  consult.doctorName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  DateFormat('EEE, dd MMM • h:mm a')
                      .format(consult.scheduledAt),
                  style: const TextStyle(color: Colors.white70, fontSize: 12),
                ),
                if (consult.visitType != null) ...[
                  const SizedBox(height: 6),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      consult.visitType!.toUpperCase(),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
          const Icon(Icons.chevron_right_rounded, color: Colors.white60),
        ],
      ),
    );
  }
}

class _AlertTile extends StatelessWidget {
  final AlertModel alert;
  const _AlertTile({required this.alert});

  Color get _color {
    switch (alert.severity) {
      case 'CRITICAL':
        return const Color(0xFFEF4444);
      case 'HIGH':
        return const Color(0xFFF97316);
      case 'MEDIUM':
        return const Color(0xFFF59E0B);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  Color get _bgColor {
    switch (alert.severity) {
      case 'CRITICAL':
        return const Color(0xFFFEF2F2);
      case 'HIGH':
        return const Color(0xFFFFF7ED);
      case 'MEDIUM':
        return const Color(0xFFFFFBEB);
      default:
        return const Color(0xFFF8FAFC);
    }
  }

  @override
  Widget build(BuildContext context) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.04),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                color: _bgColor,
                borderRadius: BorderRadius.circular(11),
              ),
              child: Icon(Icons.warning_amber_rounded, color: _color, size: 18),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    alert.message,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    DateFormat('dd MMM, h:mm a').format(alert.createdAt),
                    style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: _bgColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                alert.severity,
                style: TextStyle(
                  color: _color,
                  fontSize: 10,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.3,
                ),
              ),
            ),
          ],
        ),
      );
}
