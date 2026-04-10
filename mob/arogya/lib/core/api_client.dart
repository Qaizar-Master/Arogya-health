import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'constants.dart';

const _storage = FlutterSecureStorage();

final apiClient = _buildClient();

Dio _buildClient() {
  final dio = Dio(BaseOptions(
    baseUrl: kBaseUrl,
    connectTimeout: const Duration(seconds: 15),
    receiveTimeout: const Duration(seconds: 30),
    headers: {'Content-Type': 'application/json'},
  ));

  // Attach access token to every request
  dio.interceptors.add(InterceptorsWrapper(
    onRequest: (options, handler) async {
      final token = await _storage.read(key: 'access_token');
      if (token != null) {
        options.headers['Authorization'] = 'Bearer $token';
      }
      handler.next(options);
    },
    onError: (error, handler) async {
      if (error.response?.statusCode == 401) {
        // Try token refresh
        final refreshed = await _tryRefresh();
        if (refreshed) {
          final token = await _storage.read(key: 'access_token');
          error.requestOptions.headers['Authorization'] = 'Bearer $token';
          final retry = await apiClient.fetch(error.requestOptions);
          return handler.resolve(retry);
        }
        // Refresh failed — clear tokens
        await _storage.deleteAll();
      }
      handler.next(error);
    },
  ));

  return dio;
}

Future<bool> _tryRefresh() async {
  try {
    final refreshToken = await _storage.read(key: 'refresh_token');
    if (refreshToken == null) return false;

    final res = await Dio().post(
      '$kBaseUrl/auth/refresh',
      data: {'refreshToken': refreshToken},
    );
    await _storage.write(key: 'access_token', value: res.data['accessToken']);
    await _storage.write(key: 'refresh_token', value: res.data['refreshToken']);
    return true;
  } catch (_) {
    return false;
  }
}

Future<void> saveTokens(String accessToken, String refreshToken) async {
  await _storage.write(key: 'access_token', value: accessToken);
  await _storage.write(key: 'refresh_token', value: refreshToken);
}

Future<void> clearTokens() async => _storage.deleteAll();

Future<bool> hasToken() async =>
    (await _storage.read(key: 'access_token')) != null;
