import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/api_client.dart';
import '../models/profile.dart';

// ─── Auth state ───────────────────────────────────────────────────────────────

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthState {
  final AuthStatus status;
  final String? userId;
  final String? email;
  final String? role;
  final String? profileId;
  final String? firstName;

  const AuthState({
    required this.status,
    this.userId,
    this.email,
    this.role,
    this.profileId,
    this.firstName,
  });

  const AuthState.unknown() : this(status: AuthStatus.unknown);
  const AuthState.unauthenticated() : this(status: AuthStatus.unauthenticated);
}

// ─── Auth notifier ────────────────────────────────────────────────────────────

class AuthNotifier extends AsyncNotifier<AuthState> {
  @override
  Future<AuthState> build() async {
    final has = await hasToken();
    if (!has) return const AuthState.unauthenticated();
    try {
      final res = await apiClient.get('/profile/me');
      final data = res.data;
      return AuthState(
        status: AuthStatus.authenticated,
        userId: data['id'],
        email: data['email'],
        role: data['role'],
        profileId: data['profile']?['id'],
        firstName: data['profile']?['firstName'],
      );
    } catch (_) {
      await clearTokens();
      return const AuthState.unauthenticated();
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    try {
      final res = await apiClient.post('/auth/login', data: {
        'email': email,
        'password': password,
      });
      await saveTokens(res.data['accessToken'], res.data['refreshToken']);
      final user = res.data['user'];
      state = AsyncValue.data(AuthState(
        status: AuthStatus.authenticated,
        userId: user['id'],
        email: user['email'],
        role: user['role'],
        profileId: user['profileId'],
        firstName: user['firstName'],
      ));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    List<String>? conditions,
  }) async {
    state = const AsyncValue.loading();
    try {
      final res = await apiClient.post('/auth/register', data: {
        'email': email,
        'password': password,
        'firstName': firstName,
        'lastName': lastName,
        'role': 'PATIENT',
        if (conditions != null && conditions.isNotEmpty) 'conditions': conditions,
      });
      await saveTokens(res.data['accessToken'], res.data['refreshToken']);
      final user = res.data['user'];
      state = AsyncValue.data(AuthState(
        status: AuthStatus.authenticated,
        userId: user['id'],
        email: user['email'],
        role: user['role'],
        profileId: user['profileId'],
        firstName: user['firstName'],
      ));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  Future<void> logout() async {
    try {
      await apiClient.post('/auth/logout');
    } catch (_) {}
    await clearTokens();
    state = const AsyncValue.data(AuthState.unauthenticated());
  }
}

final authProvider = AsyncNotifierProvider<AuthNotifier, AuthState>(
  AuthNotifier.new,
);

// ─── Profile provider ─────────────────────────────────────────────────────────

final profileProvider = FutureProvider<UserProfile?>((ref) async {
  final auth = await ref.watch(authProvider.future);
  if (auth.status != AuthStatus.authenticated) return null;
  try {
    final res = await apiClient.get('/profile/me');
    return UserProfile.fromJson(res.data);
  } catch (_) {
    return null;
  }
});
