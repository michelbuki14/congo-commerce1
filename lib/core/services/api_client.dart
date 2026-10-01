import 'package:dio/dio.dart';
import '../config/app_constants.dart';
import 'token_storage.dart';

/// HTTP client for the Base44 backend.
///
/// Injects the stored bearer token on every request and transparently retries
/// once through a token refresh when the server answers 401.
class ApiClient {
  late final Dio _dio;
  final TokenStorage _tokens;

  ApiClient({TokenStorage? tokens})
      : _tokens = tokens ?? SecureTokenStorage() {
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

    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokens.getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          final status = error.response?.statusCode;
          final path = error.requestOptions.path;
          final isAuthCall =
              path == '/auth/refresh' ||
              path == '/auth/login' ||
              path == '/auth/register';

          if (status == 401 && !isAuthCall) {
            final refreshed = await _refreshToken();
            if (refreshed) {
              final token = await _tokens.getAccessToken();
              if (token != null) {
                error.requestOptions.headers['Authorization'] = 'Bearer $token';
                try {
                  final retry = await _dio.fetch(error.requestOptions);
                  return handler.resolve(retry);
                } on DioException {
                  // Fall through to the original error below.
                }
              }
            }
          }
          handler.next(error);
        },
      ),
    );
  }

  /// Exchanges the refresh token for a new pair and persists it.
  Future<bool> _refreshToken() async {
    final current = await _tokens.getRefreshToken();
    if (current == null || current.isEmpty) return false;

    // A throwaway client: reusing _dio re-enters this interceptor, which can
    // recurse.
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

  Dio get dio => _dio;

  Future<Response<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) =>
      _dio.get<T>(path, queryParameters: queryParameters, options: options);

  Future<Response<T>> post<T>(
    String path, {
    Object? data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) =>
      _dio.post<T>(path,
          data: data, queryParameters: queryParameters, options: options);

  Future<Response<T>> put<T>(
    String path, {
    Object? data,
    Options? options,
  }) =>
      _dio.put<T>(path, data: data, options: options);

  Future<Response<T>> patch<T>(
    String path, {
    Object? data,
    Options? options,
  }) =>
      _dio.patch<T>(path, data: data, options: options);

  Future<Response<T>> delete<T>(
    String path, {
    Object? data,
    Options? options,
  }) =>
      _dio.delete<T>(path, data: data, options: options);
}
