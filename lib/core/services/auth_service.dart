import 'package:dio/dio.dart';
import '../config/app_constants.dart';
import '../models/user_model.dart';
import 'token_storage.dart';

/// Raised when the backend rejects credentials or blocks a sign-in.
///
/// Carries the server's own reason so the UI can surface it verbatim instead of
/// a generic "something went wrong".
class AuthFailure implements Exception {
  final String message;
  final int? statusCode;

  const AuthFailure(this.message, {this.statusCode});

  @override
  String toString() => message;
}

/// Auth service for Base44 authentication.
///
/// The data layer is the Base44 entity API rather than REST auth routes: the
/// app authenticates through the platform's session cookie / bearer token that
/// @base44/sdk manages in the React build. Endpoint paths below are the assumed
/// REST shape and MUST be confirmed against the deployed app before this
/// client is trusted with real credentials.
class AuthService {
  final Dio _dio;
  final TokenStorage _tokens;

  AuthService({TokenStorage? tokens})
      : _tokens = tokens ?? SecureTokenStorage(),
        _dio = Dio(
    BaseOptions(
      baseUrl: AppConstants.baseUrl,
      connectTimeout: AppConstants.connectTimeout,
      receiveTimeout: AppConstants.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );

  /// Persist the token pair from a login/register/refresh payload.
  /// Returns the authenticated user, or null when the payload carried no user.
  Future<UserModel?> _consumeAuthPayload(
    Map<String, dynamic> data, {
    required bool rememberMe,
    String? email,
  }) async {
    final accessToken = data['access_token'] as String?;
    final refreshToken = data['refresh_token'] as String?;
    final expiresIn = data['expires_in'] as int? ?? 3600;

    if (accessToken != null && accessToken.isNotEmpty) {
      await _tokens.saveAccessToken(
        accessToken,
        DateTime.now().add(Duration(seconds: expiresIn)),
      );
      if (refreshToken != null && refreshToken.isNotEmpty) {
        await _tokens.saveRefreshToken(refreshToken);
      }
    }

    if (rememberMe && email != null) {
      await _tokens.saveUserEmail(email);
      await _tokens.saveRememberMe(true);
    }

    final userData = data['user'];
    if (userData is Map<String, dynamic>) return UserModel.fromJson(userData);
    return null;
  }

  /// Login with email and password.
  ///
  /// Throws [AuthFailure] on rejection so the UI can show the server's reason
  /// rather than a generic message.
  Future<UserModel> login({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/login',
        data: {
          'email': email,
          'password': password,
          'remember_me': rememberMe,
        },
      );

      final status = response.statusCode ?? 0;
      final data = response.data is Map
          ? response.data as Map<String, dynamic>
          : <String, dynamic>{};

      if (status < 200 || status >= 300) {
        throw AuthFailure(
          data['message'] as String? ??
              data['error'] as String? ??
              'Sign-in failed (HTTP $status).',
          statusCode: status,
        );
      }

      final user = await _consumeAuthPayload(
        data,
        rememberMe: rememberMe,
        email: email,
      );

      if (user != null) return user;

      // Some deployments return only tokens here; resolve the user separately.
      final me = await getCurrentUser();
      if (rememberMe) {
        await _tokens.saveUserEmail(email);
        await _tokens.saveRememberMe(true);
      }
      return me;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }
  
  /// Register a new user.
  ///
  /// Persists tokens when the response carries them; when the backend only
  /// creates the account, the user is resolved with [getCurrentUser] so the
  /// caller always gets a real [UserModel] or an [AuthFailure].
  Future<UserModel> register({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/register',
        data: {
          'email': email,
          'password': password,
          'first_name': firstName,
          'last_name': lastName,
          'phone': phone,
        },
      );

      final status = response.statusCode ?? 0;
      final data = response.data is Map
          ? response.data as Map<String, dynamic>
          : <String, dynamic>{};

      if (status < 200 || status >= 300) {
        throw AuthFailure(
          data['message'] as String? ??
              data['error'] as String? ??
              'Registration failed (HTTP $status).',
          statusCode: status,
        );
      }

      final user = await _consumeAuthPayload(data, rememberMe: false);
      if (user != null) return user;

      final me = await getCurrentUser();
      await _tokens.saveUserEmail(email);
      await _tokens.saveRememberMe(true);
      return me;
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }
  
  /// Refresh access token using refresh token.
  ///
  /// Persists the new access/refresh pair to [TokenStorage] and returns true
  /// when the session is usable again, false when the refresh token is gone
  /// or rejected. Never throws: callers treat a failed refresh as "sign out".
  Future<bool> refreshToken() async {
    final current = await _tokens.getRefreshToken();
    if (current == null || current.isEmpty) return false;

    // A throwaway client: reusing _dio would re-enter the onError interceptor
    // that called us, which can recurse.
    final refreshDio = Dio(
      BaseOptions(
        baseUrl: AppConstants.baseUrl,
        connectTimeout: AppConstants.connectTimeout,
        receiveTimeout: AppConstants.receiveTimeout,
        headers: {'Content-Type': 'application/json'},
      ),
    );

    try {
      final response = await refreshDio.post(
        '/auth/refresh',
        data: {'refresh_token': current},
      );

      if (response.statusCode != 200 || response.data is! Map) return false;
      final data = response.data as Map<String, dynamic>;

      final accessToken = data['access_token'] as String?;
      if (accessToken == null || accessToken.isEmpty) return false;

      final expiresIn = data['expires_in'] as int? ?? 3600;
      await _tokens.saveAccessToken(
        accessToken,
        DateTime.now().add(Duration(seconds: expiresIn)),
      );

      final newRefresh = data['refresh_token'] as String?;
      if (newRefresh != null && newRefresh.isNotEmpty) {
        await _tokens.saveRefreshToken(newRefresh);
      }

      return true;
    } on DioException {
      return false;
    }
  }
  
  /// Logout current user
  Future<void> logout() async {
    try {
      await _dio.post('/auth/logout');
    } on DioException {
      // Ignore logout errors - we clear local state anyway
    }
  }
  
  /// Get current user profile
  Future<UserModel> getCurrentUser() async {
    try {
      final response = await _dio.get('/auth/me');
      
      if (response.statusCode == 200 && response.data != null) {
        return UserModel.fromJson(response.data as Map<String, dynamic>);
      }
      
      throw Exception('Failed to get user');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }
  
  /// Send password reset email
  Future<void> forgotPassword(String email) async {
    try {
      await _dio.post('/auth/forgot-password', data: {'email': email});
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }
  
  /// Reset password with token
  Future<void> resetPassword({
    required String token,
    required String password,
    required String passwordConfirm,
  }) async {
    try {
      await _dio.post(
        '/auth/reset-password',
        data: {
          'token': token,
          'password': password,
          'password_confirm': passwordConfirm,
        },
      );
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }
  
  /// Verify email with token
  Future<void> verifyEmail(String token) async {
    try {
      await _dio.post('/auth/verify-email', data: {'token': token});
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }
  
  /// Resend verification email
  Future<void> resendVerificationEmail() async {
    try {
      await _dio.post('/auth/resend-verification');
    } on DioException catch (e) {
      throw _handleDioError(e);
    }
  }
  
  /// Handle Dio errors and convert to meaningful exceptions
  Exception _handleDioError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return Exception('Network timeout. Please check your connection.');
      case DioExceptionType.connectionError:
        return Exception('No internet connection. Please check your network.');
      case DioExceptionType.badResponse:
        final status = e.response?.statusCode ?? 0;
        final message = e.response?.data is Map
            ? (e.response!.data['message'] as String? ?? 'Request failed')
            : e.message ?? 'Request failed';
        
        switch (status) {
          case 400:
            return Exception(message);
          case 401:
            return Exception('Invalid credentials. Please check your email and password.');
          case 403:
            return Exception('Access denied. Your account may be suspended.');
          case 404:
            return Exception('Service not found. Please try again later.');
          case 422:
            return Exception(message); // Validation errors
          case 429:
            return Exception('Too many requests. Please wait a moment and try again.');
          case 500:
            return Exception('Server error. Please try again later.');
          case 503:
            return Exception('Service temporarily unavailable. Please try again later.');
          default:
            return Exception('Request failed ($status): $message');
        }
      case DioExceptionType.cancel:
        return Exception('Request cancelled.');
      default:
        return Exception('An unexpected error occurred: ${e.message}');
    }
  }
}