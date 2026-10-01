import 'package:dio/dio.dart';
import '../models/product_model.dart';
import '../config/app_constants.dart';
import 'api_client.dart';

/// Repository for product data
class ProductRepository {
  final ApiClient _apiClient;
  
  ProductRepository(this._apiClient);
  
  /// Fetch products with optional filters
  Future<List<ProductModel>> fetchProducts({
    String? category,
    String? searchQuery,
    double? minPrice,
    double? maxPrice,
    double? minRating,
    bool? inStockOnly,
    String? origin, // 'local' or 'international'
    int page = 1,
    int pageSize = AppConstants.defaultPageSize,
    String? sortBy, // 'relevance', 'new', 'sold', 'price_asc', 'price_desc', 'rating'
  }) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '/products',
        queryParameters: {
          if (category != null) 'category': category,
          if (searchQuery != null && searchQuery.isNotEmpty) 'q': searchQuery,
          if (minPrice != null) 'min_price': minPrice,
          if (maxPrice != null) 'max_price': maxPrice,
          if (minRating != null) 'min_rating': minRating,
          if (inStockOnly != null) 'in_stock': inStockOnly,
          if (origin != null) 'origin': origin,
          'page': page,
          'page_size': pageSize,
          if (sortBy != null) 'sort': sortBy,
        },
      );
      
      final data = response.data ?? [];
      return data
          .map((json) => ProductModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch single product by ID or slug
  Future<ProductModel> fetchProduct(String idOrSlug) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/products/$idOrSlug',
      );
      return ProductModel.fromJson(response.data!);
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch featured products
  Future<List<ProductModel>> fetchFeatured() async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '/products',
        queryParameters: {'featured': true, 'page_size': 12},
      );
      return (response.data ?? [])
          .map((json) => ProductModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch flash sale products
  Future<List<ProductModel>> fetchFlashSales() async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '/products',
        queryParameters: {'flash_sale': true, 'page_size': 12},
      );
      return (response.data ?? [])
          .map((json) => ProductModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch trending products (most sold)
  Future<List<ProductModel>> fetchTrending({int limit = 12}) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '/products',
        queryParameters: {'sort': 'sold', 'page_size': limit},
      );
      return (response.data ?? [])
          .map((json) => ProductModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch new arrivals
  Future<List<ProductModel>> fetchNewArrivals({int limit = 12}) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '/products',
        queryParameters: {'sort': 'new', 'page_size': limit},
      );
      return (response.data ?? [])
          .map((json) => ProductModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch similar products
  Future<List<ProductModel>> fetchSimilar(String productId, {int limit = 8}) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '/products/$productId/similar',
        queryParameters: {'page_size': limit},
      );
      return (response.data ?? [])
          .map((json) => ProductModel.fromJson(json as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch categories
  Future<List<Map<String, dynamic>>> fetchCategories() async {
    try {
      final response = await _apiClient.get<List<dynamic>>('/categories');
      return (response.data ?? []).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Fetch product reviews
  Future<List<Map<String, dynamic>>> fetchReviews(String productId) async {
    try {
      final response = await _apiClient.get<List<dynamic>>(
        '/products/$productId/reviews',
      );
      return (response.data ?? []).cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      throw _handleError(e);
    }
  }
  
  /// Handle Dio errors and convert to readable messages
  Exception _handleError(DioException e) {
    switch (e.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.sendTimeout:
      case DioExceptionType.receiveTimeout:
        return Exception('Network timeout. Please check your connection.');
      case DioExceptionType.connectionError:
        return Exception('No internet connection.');
      case DioExceptionType.badResponse:
        final status = e.response?.statusCode ?? 0;
        if (status == 401) return Exception('Please sign in to continue.');
        if (status == 403) return Exception('Access denied.');
        if (status == 404) return Exception('Not found.');
        if (status >= 500) return Exception('Server error. Please try again later.');
        return Exception('Request failed ($status).');
      default:
        return Exception('Something went wrong.');
    }
  }
}