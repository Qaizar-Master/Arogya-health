import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/theme.dart';
import 'router/app_router.dart';

void main() {
  runApp(const ProviderScope(child: ArogyaApp()));
}

class ArogyaApp extends ConsumerWidget {
  const ArogyaApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);
    return MaterialApp.router(
      title: 'Arogya',
      theme: arogyaTheme,
      routerConfig: router,
      debugShowCheckedModeBanner: false,
    );
  }
}
