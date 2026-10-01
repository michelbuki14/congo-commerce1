import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Abstraction over secure key/value persistence for auth tokens.
///
/// Platform-backed by flutter_secure_storage (Android Keystore, iOS/macOS
/// Keychain, Windows DPAPI). Exists as an interface so tests can substitute
/// [InMemoryTokenStorage] -- flutter_secure_storage ships no test
/// implementation, so any code touching it directly under `flutter test`
/// throws MissingPluginException.
abstract class TokenStorage {
  Future<void> saveAccessToken(String token, DateTime expiresAt);
  Future<String?> getAccessToken();
  Future<void> saveRefreshToken(String token);
  Future<String?> getRefreshToken();
  Future<void> saveUserEmail(String email);
  Future<String?> getUserEmail();
  Future<void> saveRememberMe(bool remember);
  Future<bool> getRememberMe();
  Future<bool> isTokenExpired();
  Future<void> clearAll();
  Future<void> clearAllData();
  Future<Map<String, String>> getAll();
}

/// Concrete implementation backed by the platform keystore.
///
/// On Android and iOS this is hardware/OS-backed. On other platforms it
/// degrades to SharedPreferences, which is not encrypted at rest and must NOT
/// be used for tokens on a device you care about. The package is
/// intentionally falls back on Windows because its Windows backend includes
/// `atlstr.h` and needs the ATL component of the Visual Studio C++ workload.
class SecureTokenStorage implements TokenStorage {
  const SecureTokenStorage();

  static const String accessKey = 'access_token';
  static const String refreshKey = 'refresh_token';
  static const String expiryKey = 'token_expiry';
  static const String emailKey = 'user_email';
  static const String rememberKey = 'remember_me';

  static Future<void> _write(String key, String value) async {
    if (_useKeystore) {
      await const FlutterSecureStorage().write(key: key, value: value);
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(key, value);
    }
  }

  static Future<String?> _read(String key) async {
    if (_useKeystore) {
      return const FlutterSecureStorage().read(key: key);
    }
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(key);
  }

  static Future<void> _delete(String key) async {
    if (_useKeystore) {
      await const FlutterSecureStorage().delete(key: key);
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(key);
    }
  }

  /// True where the platform keystore is available to this build.
  ///
  /// Not const: `defaultTargetPlatform` is a getter, not a compile-time
  /// constant. Reading it lazily is correct -- it is fixed for the process.
  static bool get _useKeystore =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS ||
          defaultTargetPlatform == TargetPlatform.macOS);

  @override
  Future<void> saveAccessToken(String token, DateTime expiresAt) async {
    await _write(accessKey, token);
    await _write(expiryKey, expiresAt.toIso8601String());
  }

  @override
  Future<String?> getAccessToken() => _read(accessKey);

  @override
  Future<void> saveRefreshToken(String token) => _write(refreshKey, token);

  @override
  Future<String?> getRefreshToken() => _read(refreshKey);

  @override
  Future<void> saveUserEmail(String email) => _write(emailKey, email);

  @override
  Future<String?> getUserEmail() => _read(emailKey);

  @override
  Future<void> saveRememberMe(bool remember) =>
      _write(rememberKey, remember.toString());

  @override
  Future<bool> getRememberMe() async => await _read(rememberKey) == 'true';

  /// Treated as expired five minutes before the recorded expiry so an
  /// in-flight request cannot be issued with a token that lapses mid-flight.
  @override
  Future<bool> isTokenExpired() async {
    final expiryStr = await _read(expiryKey);
    if (expiryStr == null) return true;
    final expiry = DateTime.tryParse(expiryStr);
    if (expiry == null) return true;
    return DateTime.now().isAfter(expiry.subtract(const Duration(minutes: 5)));
  }

  /// Clears the token triple only, leaving remembered email and preferences.
  @override
  Future<void> clearAll() async {
    await _delete(accessKey);
    await _delete(refreshKey);
    await _delete(expiryKey);
  }

  @override
  Future<void> clearAllData() async {
    if (_useKeystore) {
      await const FlutterSecureStorage().deleteAll();
    } else {
      final prefs = await SharedPreferences.getInstance();
      await prefs.clear();
    }
  }

  @override
  Future<Map<String, String>> getAll() async {
    if (_useKeystore) return const FlutterSecureStorage().readAll();
    final prefs = await SharedPreferences.getInstance();
    return prefs.getKeys().fold<Map<String, String>>(
      <String, String>{},
      (acc, key) => acc..[key] = prefs.getString(key) ?? '',
    );
  }
}

/// In-memory implementation for tests and platforms without a keystore.
class InMemoryTokenStorage implements TokenStorage {
  final Map<String, String> _values = <String, String>{};

  @override
  Future<void> saveAccessToken(String token, DateTime expiresAt) async {
    _values[SecureTokenStorage.accessKey] = token;
    _values[SecureTokenStorage.expiryKey] = expiresAt.toIso8601String();
  }

  @override
  Future<String?> getAccessToken() async => _values[SecureTokenStorage.accessKey];

  @override
  Future<void> saveRefreshToken(String token) async =>
      _values[SecureTokenStorage.refreshKey] = token;

  @override
  Future<String?> getRefreshToken() async =>
      _values[SecureTokenStorage.refreshKey];

  @override
  Future<void> saveUserEmail(String email) async =>
      _values[SecureTokenStorage.emailKey] = email;

  @override
  Future<String?> getUserEmail() async =>
      _values[SecureTokenStorage.emailKey];

  @override
  Future<void> saveRememberMe(bool remember) async =>
      _values[SecureTokenStorage.rememberKey] = remember.toString();

  @override
  Future<bool> getRememberMe() async =>
      _values[SecureTokenStorage.rememberKey] == 'true';

  @override
  Future<bool> isTokenExpired() async {
    final expiryStr = _values[SecureTokenStorage.expiryKey];
    if (expiryStr == null) return true;
    final expiry = DateTime.tryParse(expiryStr);
    if (expiry == null) return true;
    return DateTime.now().isAfter(expiry.subtract(const Duration(minutes: 5)));
  }

  @override
  Future<void> clearAll() async {
    _values.remove(SecureTokenStorage.accessKey);
    _values.remove(SecureTokenStorage.refreshKey);
    _values.remove(SecureTokenStorage.expiryKey);
  }

  @override
  Future<void> clearAllData() async => _values.clear();

  @override
  Future<Map<String, String>> getAll() async =>
      Map<String, String>.from(_values);
}
