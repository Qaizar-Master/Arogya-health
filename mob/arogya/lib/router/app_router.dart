import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/signup_screen.dart';
import '../screens/home/home_screen.dart';
import '../screens/vitals/vitals_screen.dart';
import '../screens/vitals/log_vital_screen.dart';
import '../screens/medications/medications_screen.dart';
import '../screens/consultations/consultations_screen.dart';
import '../screens/alerts/alerts_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../widgets/app_shell.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/home',
    redirect: (context, state) {
      final status = authState.value?.status ?? AuthStatus.unknown;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/signup';

      if (status == AuthStatus.unknown) return null;
      if (status == AuthStatus.unauthenticated && !isAuthRoute) return '/login';
      if (status == AuthStatus.authenticated && isAuthRoute) return '/home';
      return null;
    },
    routes: [
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/signup', builder: (_, __) => const SignupScreen()),

      // Shell route — bottom nav wraps these
      ShellRoute(
        builder: (context, state, child) => AppShell(child: child),
        routes: [
          GoRoute(
            path: '/home',
            builder: (_, __) => const HomeScreen(),
          ),
          GoRoute(
            path: '/vitals',
            builder: (_, __) => const VitalsScreen(),
            routes: [
              GoRoute(
                path: 'log',
                builder: (_, __) => const LogVitalScreen(),
              ),
            ],
          ),
          GoRoute(
            path: '/medications',
            builder: (_, __) => const MedicationsScreen(),
          ),
          GoRoute(
            path: '/consultations',
            builder: (_, __) => const ConsultationsScreen(),
          ),
          GoRoute(
            path: '/alerts',
            builder: (_, __) => const AlertsScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (_, __) => const ProfileScreen(),
          ),
        ],
      ),
    ],
  );
});
