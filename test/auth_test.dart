import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';

import 'package:congo_commerce_flutter/core/models/user_model.dart';
import 'package:congo_commerce_flutter/core/providers/providers.dart';
import 'package:congo_commerce_flutter/core/services/auth_service.dart';
import 'package:congo_commerce_flutter/core/services/token_storage.dart';
import 'package:congo_commerce_flutter/core/services/api_client.dart';
import 'package:congo_commerce_flutter/features/auth/screens/login_screen.dart';
import 'package:congo_commerce_flutter/routes/app_router.dart';

/// Fake auth service that answers without network, so the routing guard can be
/// driven deterministically.
class _FakeAuthService implements AuthService {
  _FakeAuthService(this.user);

  final UserModel? user;
  Object? failWith;

  @override
  Future<UserModel> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    if (failWith != null) throw failWith!;
    return user ?? _demoUser(email);
  }

  @override
  Future<UserModel> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    if (failWith != null) throw failWith!;
    return user ?? _demoUser(email);
  }

  @override
  Future<UserModel> getCurrentUser() async {
    if (failWith != null) throw failWith!;
    return user ?? _demoUser('me@example.com');
  }

  @override
  Future<bool> refreshToken() async => false;

  @override
  Future<void> logout() async {}

  @override
  Future<void> forgotPassword(String email) async {}

  @override
  Future<void> resetPassword({
    required String token,
    required String password,
    required String passwordConfirm,
  }) async {}

  @override
  Future<void> verifyEmail(String token) async {}

  @override
  Future<void> resendVerificationEmail() async {}

  static UserModel _demoUser(String email) =>
      UserModel(id: 'u1', email: email, firstName: 'Test');
}

/// Waits for AuthNotifier's constructor-time session restore to settle.
Future<void> _pumpAuthState(ProviderContainer container) async {
  for (var i = 0; i < 50; i++) {
    final state = container.read(authNotifierProvider);
    if (state != AuthState.unknown) return;
    await Future<void>.delayed(const Duration(milliseconds: 10));
  }
  fail('auth state never left AuthState.unknown');
}

void main() {
  group('AuthState transitions', () {
    test('starts unknown then resolves to unauthenticated with no stored session',
        () async {
      final container = ProviderContainer(
        overrides: [tokenStorageProvider.overrideWithValue(InMemoryTokenStorage())],
      );
      addTearDown(container.dispose);

      // AuthNotifier resolves asynchronously in its constructor; poll the
      // provider until it settles rather than reading a snapshot.
      await _pumpAuthState(container);
      expect(container.read(authNotifierProvider), AuthState.unauthenticated);
    });

    test('login failure leaves the state unauthenticated and rethrows', () async {
      final container = ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(InMemoryTokenStorage()),
          authServiceProvider.overrideWithValue(
            _FakeAuthService(null)..failWith = const AuthFailure('Bad credentials'),
          ),
        ],
      );
      addTearDown(container.dispose);

      await expectLater(
        container.read(authNotifierProvider.notifier).login(
          email: 'a@b.com',
          password: 'wrong',
        ),
        throwsA(isA<AuthFailure>()),
      );
      expect(container.read(authNotifierProvider), AuthState.unauthenticated);
    });

    test('login success sets current user and authenticated state', () async {
      final container = ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(InMemoryTokenStorage()),
          authServiceProvider.overrideWithValue(
            _FakeAuthService(
              const UserModel(id: 'u9', email: 'ok@x.com', firstName: 'Ok'),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      await container.read(authNotifierProvider.notifier).login(
        email: 'ok@x.com',
        password: 'secret12',
      );

      expect(container.read(authNotifierProvider), AuthState.authenticated);
      expect(container.read(currentUserProvider)?.email, 'ok@x.com');
    });
  });

  group('Router auth guard', () {
    testWidgets('unauthenticated user is redirected to /login', (tester) async {
      final container = ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(InMemoryTokenStorage()),
          authServiceProvider.overrideWithValue(_FakeAuthService(null)),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      expect(router.routerDelegate.currentConfiguration.uri.toString(), '/login');
    });

    testWidgets('signing in navigates from /login to /', (tester) async {
      final container = ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(InMemoryTokenStorage()),
          authServiceProvider.overrideWithValue(
            _FakeAuthService(
              const UserModel(id: 'u9', email: 'ok@x.com', firstName: 'Ok'),
            ),
          ),
        ],
      );
      addTearDown(container.dispose);

      final router = container.read(appRouterProvider);
      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: MaterialApp.router(routerConfig: router),
        ),
      );
      await tester.pumpAndSettle();

      // Should be sitting on /login.
      expect(router.routerDelegate.currentConfiguration.uri.toString(), '/login');

      // Drive the notifier the way LoginScreen does.
      await container.read(authNotifierProvider.notifier).login(
        email: 'ok@x.com',
        password: 'secret12',
      );
      await tester.pumpAndSettle();

      // The guard must have followed the sign-in away from /login.
      expect(router.routerDelegate.currentConfiguration.uri.toString(), '/');
    });
  });

  group('LoginScreen', () {
    testWidgets('rejects an email without @', (tester) async {
      final container = ProviderContainer(
        overrides: [
          tokenStorageProvider.overrideWithValue(InMemoryTokenStorage()),
          authServiceProvider.overrideWithValue(_FakeAuthService(null)),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: LoginScreen()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'not-an-email',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.tap(find.text('Sign in'));
      await tester.pumpAndSettle();

      expect(find.text('Invalid email'), findsOneWidget);
      // No navigation should have happened.
      expect(find.text('Sign in'), findsOneWidget);
    });

    testWidgets('surfaces the server reason on a failed sign-in',
        (tester) async {
      final container = ProviderContainer(
        overrides: [
          authServiceProvider.overrideWithValue(
            _FakeAuthService(null)..failWith = const AuthFailure('Incorrect email or password'),
          ),
        ],
      );
      addTearDown(container.dispose);

      await tester.pumpWidget(
        UncontrolledProviderScope(
          container: container,
          child: const MaterialApp(home: LoginScreen()),
        ),
      );
      await tester.pumpAndSettle();

      await tester.enterText(
        find.widgetWithText(TextFormField, 'Email'),
        'a@b.com',
      );
      await tester.enterText(
        find.widgetWithText(TextFormField, 'Password'),
        'password123',
      );
      await tester.tap(find.text('Sign in'));
      await tester.pumpAndSettle();

      expect(find.text('Incorrect email or password'), findsOneWidget);
    });
  });

  group('TokenStorage', () {
    late InMemoryTokenStorage tokens;

    setUp(() => tokens = InMemoryTokenStorage());

    test('round-trips and clears the access token', () async {
      await tokens.saveAccessToken('tok-123',
          DateTime.now().add(const Duration(hours: 1)));
      expect(await tokens.getAccessToken(), 'tok-123');

      await tokens.clearAll();
      expect(await tokens.getAccessToken(), isNull);
    });

    test('isTokenExpired is true when nothing is stored', () async {
      expect(await tokens.isTokenExpired(), isTrue);
    });

    test('a freshly stored token is not expired', () async {
      await tokens.saveAccessToken('tok-live',
          DateTime.now().add(const Duration(hours: 1)));
      expect(await tokens.isTokenExpired(), isFalse);
    });

    test('a token inside the five-minute window counts as expired', () async {
      await tokens.saveAccessToken('tok-soon',
          DateTime.now().add(const Duration(minutes: 2)));
      expect(await tokens.isTokenExpired(), isTrue);
    });

    test('clearAll keeps the remembered email', () async {
      await tokens.saveUserEmail('keep@x.com');
      await tokens.saveRememberMe(true);
      await tokens.saveAccessToken('t',
          DateTime.now().add(const Duration(hours: 1)));

      await tokens.clearAll();

      expect(await tokens.getAccessToken(), isNull);
      expect(await tokens.getUserEmail(), 'keep@x.com');
      expect(await tokens.getRememberMe(), isTrue);
    });
  });

  test('ApiClient injects the bearer token on outgoing requests', () async {
    // Asserting on the interceptor wiring: a request made while a token is
    // stored must carry Authorization: Bearer <token>.
    final tokens = InMemoryTokenStorage();
    await tokens.saveAccessToken('tok-abc',
        DateTime.now().add(const Duration(hours: 1)));
    final client = ApiClient(tokens: tokens);

    // The interceptor runs before the network call; use an unreachable URL and
    // inspect the error's request options for the header.
    Object? captured;
    try {
      await client.dio.get('http://127.0.0.1:1/does-not-exist');
    } on DioException catch (e) {
      captured = e.requestOptions.headers['Authorization'];
    } catch (e) {
      captured = null;
    }

    expect(captured, 'Bearer tok-abc');
  });
}