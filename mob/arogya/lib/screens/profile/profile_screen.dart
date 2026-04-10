import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/constants.dart';
import '../../providers/auth_provider.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(profileProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: profile.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(child: Text('Error: $e')),
        data: (user) {
          if (user == null) return const Center(child: Text('No profile data'));

          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Avatar + name
              Center(
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 44,
                      backgroundColor: const Color(kBrandGreen),
                      child: Text(
                        user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : '?',
                        style: const TextStyle(fontSize: 36, color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(user.fullName, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    if (user.abhaId != null)
                      Text('ABHA: ${user.abhaId}', style: TextStyle(color: Colors.grey[600], fontSize: 13)),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Info card
              Card(
                child: Column(
                  children: [
                    _InfoTile(icon: Icons.phone_outlined, label: 'Phone', value: user.phone ?? 'Not set'),
                    _InfoTile(icon: Icons.wc_outlined, label: 'Gender', value: user.gender ?? 'Not set'),
                    _InfoTile(
                      icon: Icons.cake_outlined,
                      label: 'Date of Birth',
                      value: user.dateOfBirth ?? 'Not set',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Conditions
              if (user.conditions.isNotEmpty) ...[
                const Text('My Conditions', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: user.conditions
                      .where((c) => c.isActive)
                      .map((c) => Chip(
                            label: Text(c.label, style: const TextStyle(fontSize: 12)),
                            backgroundColor: const Color(kBrandLight),
                            side: BorderSide.none,
                          ))
                      .toList(),
                ),
                const SizedBox(height: 16),
              ],

              // Logout button
              OutlinedButton.icon(
                icon: const Icon(Icons.logout),
                label: const Text('Sign out'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red,
                  side: const BorderSide(color: Colors.red),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
                onPressed: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) context.go('/login');
                },
              ),
            ],
          );
        },
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  const _InfoTile({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) => ListTile(
        leading: Icon(icon, color: Colors.grey[600], size: 20),
        title: Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        subtitle: Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
        dense: true,
      );
}
